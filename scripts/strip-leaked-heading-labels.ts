/**
 * strip-leaked-heading-labels.ts — Brief 155: strip a leaked content-outline
 * label (`H1: `, `H2: `, …) off the FRONT of CMS heading fields.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * A batch of city / city-service copy was authored from an outline where every
 * heading line was prefixed with its intended tag (`H1: …`, `H2: …`). The label
 * was pasted into the CMS field along with the copy, so the template dutifully
 * renders the literal string `H1:` inside the visible <h1> on pages like
 * /tinley-park and /joliet/water-heater-repair. It is a DATA defect, not a
 * template bug. All 43 rows in the July-23 scoping snapshot carry `version = 0`
 * and a null `updated_by_email` — no human editor has ever saved them, which is
 * what makes a script-driven fix safe here (see the root-cause note below).
 *
 * ── THE REGEX IS THE WHOLE CONTRACT ────────────────────────────────────────
 * Strip ONE leading label token, nothing else:
 *
 *   ^\s*(?:<[^>]*>\s*)?[Hh][1-6]\s*[:.\-–—]\s*   (anchored at the start, one occurrence)
 *
 * No internal-whitespace trim, no case normalization, no dash/entity/smart-quote
 * changes, no re-wording. A field that does not match is left byte-identical.
 * The exact same source string drives both the SQL detection query (Postgres's
 * `~` operator understands this syntax as-is — non-capturing groups included)
 * and the JS `.replace()` that computes the actual new value, so detection and
 * application can never disagree.
 *
 * ── TWO SEPARATE JOBS ───────────────────────────────────────────────────────
 * 1. TRACK A — DETECT (always runs, in every mode): a schema-driven sweep of
 *    every text/varchar/jsonb column of every CMS content table (discovered via
 *    information_schema, not hard-coded — a column added since the July scoping
 *    pass is never silently missed), reported so the true current count is
 *    known even though this brief's counts were scoped from a month-old dump.
 *    Includes a REPORT-ONLY heuristic sweep for the "mid-field" case (a label
 *    appearing after an HTML tag close or inside a JSON string, not at the very
 *    start of the column) — those are listed, never edited; editing an HTML or
 *    JSON body is a different risk class than swapping a plain heading string.
 *
 * 2. TRACK B — FIX (only in --commit): writes ONLY the four target columns
 *    listed in DEFAULT_TARGETS below, plus any column Track A's own leading-match
 *    sweep proves is affected (auto-added to the write scope at runtime — see the
 *    write-scope resolution in `main()` — so this script does not need to be
 *    re-edited every time new content ships; the console output says so
 *    explicitly whenever it happens). `page_drafts` gets the same fix, but ONLY
 *    for the JSON keys that
 *    map onto one of the four target columns (Track A §5) — an unpublished
 *    draft that still carries the label would re-leak it the moment someone
 *    clicks Save in that editor.
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 *  - Dry run by default; `commit` applies. In the pipeline (JBP_PIPELINE/CI) a
 *    run with neither flag REFUSES to start (scripts/lib/run-mode.ts) rather
 *    than silently dry-running and reporting a green, no-op deploy — the Brief
 *    146 failure mode this repo's guard exists to prevent.
 *  - Every write is gated on the OLD value it read (`WHERE id = $1 AND col =
 *    $2`), so a concurrent editor save between the scan and the write is
 *    skipped and logged (skipped-guard), never clobbered.
 *  - Backs every changed value up to `brief155_heading_label_backup` first.
 *  - IDEMPOTENT: once a field no longer matches the regex, it is not touched
 *    again — a second `--commit` run reports `0 changed`.
 *  - `version` / `updated_at` / `updated_by*` are DELIBERATELY left untouched.
 *    All 43 target rows are `version = 0` with no editor history, so there is
 *    no plausible open editor tab holding a stale version number for one of
 *    them; every editor GET re-reads the column fresh, and the save routes
 *    guard on `version = $expectedVersion`, which a page it never opens cannot
 *    desync. Leaving version alone is the brief's own stated preference — see
 *    the implementation report for what was traced/verified to support it.
 *  - `page_archives` is a historical/audit record (created by admins
 *    archiving a page snapshot), the same class as `page_changelog` /
 *    `template_switch_archive` in Brief 126 — scanned and reported, NEVER
 *    written.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/strip-leaked-heading-labels.ts
 *   npx ts-node --project tsconfig.scripts.json scripts/strip-leaked-heading-labels.ts --commit
 *   npx ts-node --project tsconfig.scripts.json scripts/strip-leaked-heading-labels.ts --dry-run   (explicit, honoured in CI)
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { resolveRunMode, announceMode, verdict } from './lib/run-mode';

// ── env / pool (same pattern as fix-brief-147-meta-title-suffix.ts) ────────
const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const SCRIPT = 'strip-leaked-heading-labels';
const mode = resolveRunMode(SCRIPT);

// ── the contract ─────────────────────────────────────────────────────────
const LEADING_LABEL_RE = /^\s*(?:<[^>]*>\s*)?[Hh][1-6]\s*[:.\-–—]\s*/;
const LEADING_LABEL_PG = String.raw`^\s*(?:<[^>]*>\s*)?[Hh][1-6]\s*[:.\-–—]\s*`;
/**
 * REPORT-ONLY heuristic: the same label token immediately after an HTML tag
 * close (`>…`) or a JSON string-open quote (`"…`) — i.e. the start of a new
 * text node / string value that is NOT the start of the whole column. Never
 * used to write anything (see Track A §4 in the brief).
 */
const MID_FIELD_LABEL_PG = String.raw`(>|")\s*[Hh][1-6]\s*[:.\-–—]\s*`;

// ── Track A: every table to sweep, columns discovered via information_schema ─
const SWEEP_TABLES = [
  'city_pages',
  'city_service_pages',
  'main_pages',
  'sub_service_pages',
  'service_category_pages',
  'service_subcategories',
  'cms_articles',
  'global_content',
  'emergency_plumbing_page',
  'page_drafts',
  'page_archives',
];

/** Historical/audit tables — scanned and reported, NEVER written (Brief 126 rule). */
const REPORT_ONLY_TABLES = new Set(['page_archives']);

/** Best-effort human-readable row identifier per table, for the report only. */
const IDENTIFIER_EXPR: Record<string, string> = {
  city_pages: 'city_slug',
  city_service_pages: `city_slug || '/' || service_slug`,
  main_pages: 'slug',
  sub_service_pages: 'slug',
  service_category_pages: 'slug',
  service_subcategories: 'page_slug',
  cms_articles: 'slug',
  global_content: `'(singleton)'`,
  emergency_plumbing_page: `'(singleton)'`,
  page_drafts: `page_type || ':' || page_slug`,
  page_archives: `page_type || ':' || slug`,
};

// ── Track B: the default write scope (brief §Track B step 2) ───────────────
interface TargetColumn {
  table: string;
  column: string;
}
const DEFAULT_TARGETS: TargetColumn[] = [
  { table: 'city_pages', column: 'hero_heading_line1' },
  { table: 'city_pages', column: 'hero_heading_line2' },
  { table: 'city_service_pages', column: 'service_intro_heading' },
  { table: 'city_service_pages', column: 'secondary_heading' },
];

/**
 * page_drafts.content is JSONB keyed in camelCase by the editor's own field
 * names (see src/lib/cms/city-pages.ts / city-service-pages.ts). Maps each
 * page_type family onto the JSON key that feeds one of the four DEFAULT
 * target columns above — Track A §5's "only where the draft's page_type/
 * page_slug maps to one of the four target columns" rule.
 */
const DRAFT_KEY_MAP: Record<string, Array<{ jsonKey: string; table: string; column: string }>> = {
  city: [
    { jsonKey: 'heroHeadingLine1', table: 'city_pages', column: 'hero_heading_line1' },
    { jsonKey: 'heroHeadingLine2', table: 'city_pages', column: 'hero_heading_line2' },
  ],
  'city-coverage': [
    { jsonKey: 'heroHeadingLine1', table: 'city_pages', column: 'hero_heading_line1' },
    { jsonKey: 'heroHeadingLine2', table: 'city_pages', column: 'hero_heading_line2' },
  ],
  'city-local': [
    { jsonKey: 'heroHeadingLine1', table: 'city_pages', column: 'hero_heading_line1' },
    { jsonKey: 'heroHeadingLine2', table: 'city_pages', column: 'hero_heading_line2' },
  ],
  'local-office-v2': [
    { jsonKey: 'heroHeadingLine1', table: 'city_pages', column: 'hero_heading_line1' },
    { jsonKey: 'heroHeadingLine2', table: 'city_pages', column: 'hero_heading_line2' },
  ],
  'city-service': [
    { jsonKey: 'serviceIntroHeading', table: 'city_service_pages', column: 'service_intro_heading' },
    { jsonKey: 'secondaryHeading', table: 'city_service_pages', column: 'secondary_heading' },
  ],
};

// ── types ────────────────────────────────────────────────────────────────
interface LeadingHit {
  table: string;
  column: string;
  id: number;
  identifier: string;
  value: string;
}
interface MidFieldHit {
  table: string;
  column: string;
  id: number;
  identifier: string;
  snippet: string;
}
interface Change {
  table: string;
  column: string;
  id: number;
  identifier: string;
  before: string;
  after: string;
}
interface DraftChange {
  id: number;
  pageType: string;
  pageSlug: string;
  jsonKey: string;
  mapsToTable: string;
  mapsToColumn: string;
  before: string;
  after: string;
}

function truncate(s: string, n = 100): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}

// ── Track A: discover columns ───────────────────────────────────────────
async function discoverColumns(): Promise<Array<{ table: string; column: string; dataType: string }>> {
  const res = await pool.query<{ table_name: string; column_name: string; data_type: string }>(
    `SELECT table_name, column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1)
        AND data_type IN ('text', 'character varying', 'jsonb')
        AND column_name NOT IN ('id')
      ORDER BY table_name, column_name`,
    [SWEEP_TABLES]
  );
  return res.rows.map((r) => ({ table: r.table_name, column: r.column_name, dataType: r.data_type }));
}

async function existingTables(): Promise<Set<string>> {
  const res = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [SWEEP_TABLES]
  );
  return new Set(res.rows.map((r) => r.table_name));
}

async function sweepLeading(table: string, column: string): Promise<LeadingHit[]> {
  const idExpr = IDENTIFIER_EXPR[table] ?? `id::text`;
  const res = await pool.query<{ id: number; identifier: string; value: string }>(
    `SELECT id, (${idExpr})::text AS identifier, ${column}::text AS value
       FROM ${table}
      WHERE ${column} IS NOT NULL
        AND ${column}::text <> ''
        AND ${column}::text ~ $1
      ORDER BY id`,
    [LEADING_LABEL_PG]
  );
  return res.rows.map((r) => ({ table, column, id: r.id, identifier: r.identifier, value: r.value }));
}

async function sweepMidField(table: string, column: string, alreadyLeadingIds: Set<number>): Promise<MidFieldHit[]> {
  const idExpr = IDENTIFIER_EXPR[table] ?? `id::text`;
  const res = await pool.query<{ id: number; identifier: string; value: string }>(
    `SELECT id, (${idExpr})::text AS identifier, ${column}::text AS value
       FROM ${table}
      WHERE ${column} IS NOT NULL
        AND ${column}::text <> ''
        AND ${column}::text ~ $1
      ORDER BY id`,
    [MID_FIELD_LABEL_PG]
  );
  return res.rows
    .filter((r) => !alreadyLeadingIds.has(r.id))
    .map((r) => {
      // MID_FIELD_LABEL_PG is written as a Postgres ARE source string, but it is
      // plain regex syntax with no Postgres-specific escaping, so it is also a
      // valid JS RegExp source as-is.
      const m = r.value.match(new RegExp(MID_FIELD_LABEL_PG, 'i'));
      const at = m?.index ?? 0;
      const snippet = r.value.slice(Math.max(0, at - 20), at + 60);
      return { table, column, id: r.id, identifier: r.identifier, snippet: truncate(snippet, 90) };
    });
}

// ── Track A §5: page_drafts ─────────────────────────────────────────────
async function sweepDrafts(): Promise<DraftChange[]> {
  const res = await pool.query<{ id: number; page_type: string; page_slug: string; content: unknown }>(
    `SELECT id, page_type, page_slug, content FROM page_drafts WHERE page_type = ANY($1)`,
    [Object.keys(DRAFT_KEY_MAP)]
  );
  const out: DraftChange[] = [];
  for (const row of res.rows) {
    const mapping = DRAFT_KEY_MAP[row.page_type];
    if (!mapping) continue;
    const content = (row.content && typeof row.content === 'object' ? row.content : {}) as Record<string, unknown>;
    for (const { jsonKey, table, column } of mapping) {
      const val = content[jsonKey];
      if (typeof val === 'string' && LEADING_LABEL_RE.test(val)) {
        out.push({
          id: row.id,
          pageType: row.page_type,
          pageSlug: row.page_slug,
          jsonKey,
          mapsToTable: table,
          mapsToColumn: column,
          before: val,
          after: val.replace(LEADING_LABEL_RE, ''),
        });
      }
    }
  }
  return out;
}

// ── report helper for the "wrong city name" adjacent finding (§Adjacent 1) ──
async function sweepAlgonquin(): Promise<{ cityPages: Array<Record<string, unknown>>; cityServicePages: Array<Record<string, unknown>> }> {
  const cityPages = await pool.query(
    `SELECT id, city_slug, hero_heading_line1, hero_heading_line2
       FROM city_pages
      WHERE city_slug NOT ILIKE '%algonquin%'
        AND (hero_heading_line1 ILIKE '%algonquin%' OR hero_heading_line2 ILIKE '%algonquin%' OR content_body ILIKE '%algonquin%')
      ORDER BY id`
  );
  const cityServicePages = await pool.query(
    `SELECT id, city_slug, service_slug
       FROM city_service_pages
      WHERE city_slug NOT ILIKE '%algonquin%'
        AND (service_intro_heading ILIKE '%algonquin%' OR secondary_heading ILIKE '%algonquin%'
             OR service_intro_paragraphs::text ILIKE '%algonquin%' OR secondary_paragraphs::text ILIKE '%algonquin%')
      ORDER BY id`
  );
  return { cityPages: cityPages.rows, cityServicePages: cityServicePages.rows };
}

// ── main ─────────────────────────────────────────────────────────────────
async function main() {
  announceMode(SCRIPT, mode);
  console.log('BRIEF 155 — strip a leading H1:/H2: label off CMS heading fields.');
  console.log(`pattern: ${LEADING_LABEL_PG}\n`);

  // ---- Track A: discover + sweep every column -----------------------------
  const present = await existingTables();
  const missing = SWEEP_TABLES.filter((t) => !present.has(t));
  if (missing.length) {
    console.log(`tables not present on this database (skipped): ${missing.join(', ')}\n`);
  }

  const columns = await discoverColumns();
  console.log(`Track A — sweeping ${columns.length} text/varchar/jsonb column(s) across ${present.size} table(s)…\n`);

  const allLeading: LeadingHit[] = [];
  const allMidField: MidFieldHit[] = [];
  let scannedRows = 0;
  const scannedTableCounts = new Map<string, number>();

  for (const { table, column, dataType } of columns) {
    const leading = await sweepLeading(table, column);
    allLeading.push(...leading);
    const leadingIds = new Set(leading.map((h) => h.id));
    const midField = await sweepMidField(table, column, leadingIds);
    allMidField.push(...midField);

    if (!scannedTableCounts.has(table)) {
      const c = await pool.query(`SELECT count(*)::int AS n FROM ${table}`);
      scannedTableCounts.set(table, c.rows[0].n);
      scannedRows += c.rows[0].n;
    }

    if (leading.length || midField.length) {
      console.log(`  ${table}.${column} (${dataType}): ${leading.length} leading match(es), ${midField.length} mid-field candidate(s)`);
      for (const h of leading) console.log(`      LEADING  id=${h.id} [${h.identifier}] "${truncate(h.value, 80)}"`);
      for (const h of midField) console.log(`      MIDFIELD id=${h.id} [${h.identifier}] …"${h.snippet}"…  [REPORT ONLY — not auto-fixed]`);
    }
  }

  if (allLeading.length === 0) {
    console.log('  (no leading-position label matches anywhere in the swept tables)');
  }
  if (allMidField.length === 0) {
    console.log('  (no mid-field label candidates found)');
  } else {
    console.log(
      `\n${allMidField.length} mid-field candidate(s) found — HTML/JSON body cases. These are NEVER auto-fixed ` +
        `(editing an HTML or JSON body is a different risk class). Marketing/engineering must decide case by case.`
    );
  }

  // ---- Track B: resolve the write scope ------------------------------------
  const defaultKey = (t: TargetColumn) => `${t.table}.${t.column}`;
  const defaultSet = new Set(DEFAULT_TARGETS.map(defaultKey));
  const extraTargets: TargetColumn[] = [];
  for (const hit of allLeading) {
    const key = `${hit.table}.${hit.column}`;
    if (defaultSet.has(key)) continue;
    if (REPORT_ONLY_TABLES.has(hit.table)) continue;
    if (hit.table === 'page_drafts') continue; // handled separately below
    const col = columns.find((c) => c.table === hit.table && c.column === hit.column);
    if (col?.dataType === 'jsonb') continue; // structural edit — out of scope, report only
    if (!extraTargets.some((t) => defaultKey(t) === key)) extraTargets.push({ table: hit.table, column: hit.column });
  }
  if (extraTargets.length) {
    console.log(
      `\nTrack A proved ${extraTargets.length} additional column(s) affected beyond the brief's default four — ` +
        `adding to the write scope: ${extraTargets.map(defaultKey).join(', ')}`
    );
  }
  const targets = [...DEFAULT_TARGETS, ...extraTargets];

  const changes: Change[] = [];
  for (const t of targets) {
    for (const hit of allLeading.filter((h) => h.table === t.table && h.column === t.column)) {
      const after = hit.value.replace(LEADING_LABEL_RE, '');
      if (after !== hit.value) {
        changes.push({ table: t.table, column: t.column, id: hit.id, identifier: hit.identifier, before: hit.value, after });
      }
    }
  }

  const draftChanges = (await sweepDrafts()).filter((d) =>
    targets.some((t) => t.table === d.mapsToTable && t.column === d.mapsToColumn)
  );

  console.log(`\nTrack B — write scope: ${targets.map(defaultKey).join(', ')}`);
  console.log(`  live-table changes to apply : ${changes.length}`);
  console.log(`  page_drafts changes to apply: ${draftChanges.length}`);
  for (const c of changes) {
    console.log(`    ${c.table} id=${c.id} [${c.identifier}] ${c.column} | ${truncate(c.before, 45)} → ${truncate(c.after, 45)}`);
  }
  for (const d of draftChanges) {
    console.log(
      `    page_drafts id=${d.id} [${d.pageType}:${d.pageSlug}] content.${d.jsonKey} | ${truncate(d.before, 45)} → ${truncate(d.after, 45)}`
    );
  }

  // ---- Adjacent findings (report only, per the brief) ----------------------
  console.log('\n── Adjacent findings (REPORT ONLY — nothing below this line is written) ──');
  const algonquin = await sweepAlgonquin();
  console.log(
    `\n1. Wrong-city-name sweep for "Algonquin": ${algonquin.cityPages.length} city_pages row(s), ` +
      `${algonquin.cityServicePages.length} city_service_pages row(s) mention Algonquin outside an Algonquin-slugged row.`
  );
  for (const r of algonquin.cityPages as Array<{ id: number; city_slug: string; hero_heading_line2: string | null }>) {
    console.log(`     city_pages id=${r.id} [${r.city_slug}] hero_heading_line2: "${truncate(r.hero_heading_line2 ?? '', 90)}"`);
  }
  for (const r of algonquin.cityServicePages as Array<{ id: number; city_slug: string; service_slug: string }>) {
    console.log(`     city_service_pages id=${r.id} [${r.city_slug}/${r.service_slug}]`);
  }

  const bareCount = changes.filter((c) => c.table === 'city_service_pages' && !/[–—-]\s*\S/.test(c.after)).length;
  console.log(
    `\n2. Heading pattern drift: of ${changes.filter((c) => c.table === 'city_service_pages').length} affected ` +
      `city_service_pages headings, ${bareCount} are bare (no "– … Near Me" tail) after stripping the label — not a ` +
      `defect, just noted for Marketing's later normalization pass.`
  );

  console.log(
    '\n3. Root cause: the affected rows carry created_at = 2026-03-30 and an empty page_changelog history for every ' +
      'id checked, which predates this repo\'s git history (first commit 2026-06-04) entirely — the batch was bulk-' +
      'inserted straight into the database before the Next.js rebuild existed, not by anything in scripts/. No import ' +
      'or seed path currently in this repo (seed-cms.ts, migrate-city-service-cms.ts, etc.) ingests freeform outline ' +
      'text into a heading column — they take discrete values or hardcoded defaults — so no CURRENT path can ' +
      'reintroduce this defect. The risk would only return with a future bulk content import that pastes outline text ' +
      '(e.g. a spreadsheet column literally titled "H1") straight into a CMS field without stripping the label first; ' +
      'that import does not exist yet, so it is a guard for a later brief, not a fix for this one.'
  );

  // ---- verdict tallies -------------------------------------------------------
  // Denominator mirrors the brief's own framing ("43 rows... out of 9965 rows in
  // the two tables"): total ROWS in the tables actually in the write scope, not
  // the full 11-table Track A sweep (that total is reported separately above).
  const targetTableNames = [...new Set(targets.map((t) => t.table))];
  const scannedTargetRows = targetTableNames.reduce((sum, t) => sum + (scannedTableCounts.get(t) ?? 0), 0);
  const matched = changes.length + draftChanges.length;
  console.log(
    `\nTrack A total: ${scannedRows} row(s) scanned across all ${present.size} swept table(s); ` +
      `${allLeading.length} leading match(es), ${allMidField.length} mid-field candidate(s) found anywhere.`
  );

  if (mode !== 'commit') {
    console.log(
      `\n${matched} would change, ${scannedTargetRows - changes.length} already clean ` +
        `(of ${scannedTargetRows} rows in the ${targetTableNames.join(' + ')} write scope; ${draftChanges.length} ` +
        `additional page_drafts field(s) would also change).`
    );
    console.log('\nNo changes were written. Re-run with `commit` to apply.');
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${matched} field(s) would change`);
    return;
  }

  if (matched === 0) {
    console.log('\nnothing to strip — no target field carries a leading label.');
    verdict(SCRIPT, 'ALREADY-APPLIED', 'no leading label matches remain');
    return;
  }

  // ---- commit ----------------------------------------------------------------
  await pool.query(`
    CREATE TABLE IF NOT EXISTS brief155_heading_label_backup (
      id            SERIAL PRIMARY KEY,
      source_table  TEXT NOT NULL,
      source_column TEXT NOT NULL,
      row_id        INTEGER NOT NULL,
      row_key       TEXT NOT NULL,
      old_value     TEXT NOT NULL,
      new_value     TEXT NOT NULL,
      backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  let updated = 0;
  let skippedGuard = 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const c of changes) {
      await client.query(
        `INSERT INTO brief155_heading_label_backup (source_table, source_column, row_id, row_key, old_value, new_value)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [c.table, c.column, c.id, c.identifier, c.before, c.after]
      );
      // Guarded on the exact old value — never on version, per the Track B §6
      // decision (see the implementation report). A concurrent editor save
      // between the scan above and this write means 0 rows match and this
      // row is skipped, not clobbered.
      const res = await client.query(`UPDATE ${c.table} SET ${c.column} = $1 WHERE id = $2 AND ${c.column} = $3`, [
        c.after,
        c.id,
        c.before,
      ]);
      if ((res.rowCount ?? 0) === 0) {
        console.log(`  SKIPPED (guard) ${c.table} id=${c.id} ${c.column} — value changed under us since the scan`);
        skippedGuard++;
      } else {
        updated++;
      }
    }

    for (const d of draftChanges) {
      await client.query(
        `INSERT INTO brief155_heading_label_backup (source_table, source_column, row_id, row_key, old_value, new_value)
         VALUES ('page_drafts', $1, $2, $3, $4, $5)`,
        [d.jsonKey, d.id, `${d.pageType}:${d.pageSlug}`, d.before, d.after]
      );
      const res = await client.query(
        `UPDATE page_drafts
            SET content = jsonb_set(content, $1::text[], to_jsonb($2::text))
          WHERE id = $3 AND content ->> $4 = $5`,
        [`{${d.jsonKey}}`, d.after, d.id, d.jsonKey, d.before]
      );
      if ((res.rowCount ?? 0) === 0) {
        console.log(`  SKIPPED (guard) page_drafts id=${d.id} content.${d.jsonKey} — value changed under us since the scan`);
        skippedGuard++;
      } else {
        updated++;
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // ---- verify: nothing in the write scope still matches (excluding skips) ---
  let remaining = 0;
  for (const t of targets) {
    const rows = await sweepLeading(t.table, t.column);
    remaining += rows.length;
  }
  const remainingDrafts = (await sweepDrafts()).filter((d) =>
    targets.some((t) => t.table === d.mapsToTable && t.column === d.mapsToColumn)
  ).length;
  remaining += remainingDrafts;

  if (remaining > 0 && remaining > skippedGuard) {
    throw new Error(
      `verify failed: ${remaining} value(s) in the write scope still match the label pattern (expected at most ${skippedGuard} from guard skips).`
    );
  }

  const dir = join(process.cwd(), 'scripts', 'backups');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(dir, `brief-155-heading-labels-${stamp}.json`);
  writeFileSync(
    file,
    JSON.stringify(
      { mode, generated: stamp, changes, draftChanges, midFieldReportOnly: allMidField, algonquinReportOnly: algonquin },
      null,
      2
    )
  );
  console.log(`\nlog: ${file}`);
  console.log(`\n${updated} changed, ${scannedTargetRows - matched} already clean.`);
  console.log(`\nBRIEF-155: scanned ${scannedRows}, matched ${matched}, updated ${updated}, already-clean ${scannedTargetRows - matched}, skipped-guard ${skippedGuard}`);
  verdict(SCRIPT, 'APPLIED', `${updated} field(s) stripped, ${skippedGuard} skipped-guard`);
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    verdict(SCRIPT, 'FAILED', e instanceof Error ? e.message.split('\n')[0] : String(e));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
