/**
 * Brief 147 (Track C) — strip the duplicated brand suffix out of every stored CMS
 * `meta_title`.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * The root layout appends the brand to every page title through Next's
 * `metadata.title.template` (`"%s | J. Blanton Plumbing"`). Most stored meta-titles
 * ALREADY end in it, so `/kitchen-plumbing` and its siblings shipped
 * `"Kitchen Plumbing in Chicagoland | J. Blanton Plumbing | J. Blanton Plumbing"`.
 *
 * Brief 146 §6.1 fixed the RENDER: `pageTitle()` strips a trailing brand suffix at
 * the boundary, so no page emits a doubled title today, and it keeps holding for
 * whatever an editor types tomorrow. That fix stays — this script does not replace
 * it. What it does is clean up the STORED values, which still show the redundant
 * suffix to any editor who opens the meta-title field and reasonably concludes the
 * suffix is required. Both together: the data is clean, and the render is immune.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────
 * Strip a TRAILING brand suffix only, using the SAME `pageTitle()` helper the
 * render path uses so stored and rendered values can never disagree. A title with
 * the brand MID-string is marketing copy and is left exactly as it is:
 *
 *   "Garbage Disposal Replacement Services | J. Blanton Plumbing - Serving …"  → untouched
 *   "Kitchen Plumbing in Chicagoland | J. Blanton Plumbing"                    → suffix stripped
 *   "Commercial Drain Services in Chicago| J. Blanton Plumbing"                → stripped (no space before the pipe)
 *   "J. Blanton Plumbing"                                                      → untouched (would leave an empty title)
 *
 * Deviation from the brief worth stating: `pageTitle()` strips EVERY trailing
 * repetition, not literally one, because leaving a second copy behind would leave
 * the defect in place on that row. No stored value carries two today.
 *
 * NO OTHER WORDING CHANGES. Titles are marketing-owned copy.
 *
 * ── WHAT IS NOT WRITTEN ─────────────────────────────────────────────────────
 * `cms_articles.title` is the article's on-page HEADLINE (the H1 and the feed
 * card), not a meta title — it only reaches `<title>` as a fallback, where
 * `pageTitle()` already handles it. Rewriting it would change visible copy, so it
 * is SCANNED AND REPORTED, never modified.
 *
 * `version` and `updated_at` are deliberately NOT bumped. This is a cosmetic
 * normalization that changes no rendered output, so it must not look like an edit
 * in the CMS, must not move sitemap `<lastmod>` values for 200+ pages, and must not
 * invalidate the optimistic-lock token of an editor who has a page open (see
 * Track B — that is exactly the false "changed by someone else" conflict this brief
 * is fixing elsewhere).
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * Dry run unless invoked with `commit`; in the pipeline it refuses to run without
 * an explicit choice (scripts/lib/run-mode.ts).
 * Backup-first: every changed value into `brief147_meta_title_backup` + a JSON file.
 * Schema-tolerant: a missing table or column is a skip, not a crash.
 * IDEMPOTENT: after a commit nothing ends in the suffix, so re-runs write nothing —
 * safe on every deploy.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/fix-brief-147-meta-title-suffix.ts
 *   # apply:
 *   ... scripts/fix-brief-147-meta-title-suffix.ts commit
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { BRAND_SUFFIX, pageTitle } from '@/lib/seo';
import { resolveRunMode, announceMode, verdict } from './lib/run-mode';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const SCRIPT = 'fix-brief-147-meta-title-suffix';
const mode = resolveRunMode(SCRIPT);

interface Source {
  table: string;
  column: string;
  /** Columns that identify the row in the report (also the UPDATE predicate). */
  keys: string[];
  /** Report-only: scanned and listed, never written. */
  readOnly?: boolean;
  note?: string;
}

/**
 * Every CMS table carrying a meta-title, per the brief. `emergency_plumbing_page`
 * is a singleton keyed on `id` (Brief 145 installed a UNIQUE INDEX on `(true)`).
 */
const SOURCES: Source[] = [
  { table: 'sub_service_pages', column: 'meta_title', keys: ['slug'] },
  { table: 'service_category_pages', column: 'meta_title', keys: ['slug'] },
  { table: 'main_pages', column: 'meta_title', keys: ['slug'] },
  { table: 'emergency_plumbing_page', column: 'meta_title', keys: ['id'] },
  { table: 'city_pages', column: 'meta_title', keys: ['city_slug'] },
  { table: 'city_service_pages', column: 'meta_title', keys: ['city_slug', 'service_slug'] },
  { table: 'cms_articles', column: 'meta_title', keys: ['slug'] },
  {
    table: 'cms_articles',
    column: 'title',
    keys: ['slug'],
    readOnly: true,
    note: 'the article HEADLINE (H1 + feed card), not a meta title — reported only',
  },
];

interface Change {
  table: string;
  column: string;
  key: string;
  before: string;
  after: string;
  readOnly: boolean;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return (r.rowCount ?? 0) > 0;
}

async function main() {
  announceMode(SCRIPT, mode);
  console.log(`stripping a TRAILING "${BRAND_SUFFIX}" suffix only; mid-string brand names stay.\n`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS brief147_meta_title_backup (
      id            SERIAL PRIMARY KEY,
      source_table  TEXT NOT NULL,
      source_column TEXT NOT NULL,
      row_key       TEXT NOT NULL,
      old_value     TEXT NOT NULL,
      new_value     TEXT NOT NULL,
      backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

  const changes: Change[] = [];
  const skipped: string[] = [];

  for (const src of SOURCES) {
    if (!(await columnExists(src.table, src.column))) {
      skipped.push(`${src.table}.${src.column} (no such table/column on this database)`);
      continue;
    }
    const keyList = src.keys.join(", '/', ");
    const rows = await pool.query<{ row_key: string; value: string }>(
      `SELECT concat(${keyList}) AS row_key, ${src.column} AS value
         FROM ${src.table}
        WHERE ${src.column} IS NOT NULL AND ${src.column} <> ''
        ORDER BY ${src.keys.join(', ')}`
    );
    let hit = 0;
    for (const r of rows.rows) {
      const after = pageTitle(r.value);
      // Skip when there is no suffix to strip. `after === value.trim()` means the
      // only difference is surrounding whitespace — not a suffix — and this script
      // must not silently reflow 9,700+ marketing-owned titles over a stray space.
      if (after === r.value || after === r.value.trim()) continue;
      hit++;
      changes.push({
        table: src.table,
        column: src.column,
        key: r.row_key,
        before: r.value,
        after,
        readOnly: !!src.readOnly,
      });
    }
    console.log(
      `${src.table}.${src.column}: ${rows.rowCount} non-empty, ${hit} with a trailing suffix` +
        (src.readOnly ? `  [REPORT ONLY — ${src.note}]` : '')
    );
  }

  if (skipped.length) {
    console.log('\nskipped:');
    for (const s of skipped) console.log(`  ${s}`);
  }

  const writable = changes.filter((c) => !c.readOnly);
  const reportOnly = changes.filter((c) => c.readOnly);

  if (changes.length === 0) {
    console.log('\nnothing to strip — no stored meta-title ends in the brand suffix.');
    verdict(SCRIPT, 'ALREADY-APPLIED', 'no trailing suffixes remain');
    return;
  }

  console.log(`\n${writable.length} row(s) to change:`);
  for (const c of writable) {
    console.log(`  ${c.table}.${c.column} [${c.key}]`);
    console.log(`      before: ${c.before}`);
    console.log(`      after:  ${c.after}`);
  }
  if (reportOnly.length) {
    console.log('');
    console.log('!'.repeat(72));
    console.log(`${reportOnly.length} row(s) end in the brand suffix in a REPORT-ONLY column.`);
    console.log('These are visible on-page copy, so nothing is written. Marketing decides:');
    for (const c of reportOnly) console.log(`  ${c.table}.${c.column} [${c.key}]: ${c.before}`);
    console.log('!'.repeat(72));
  }

  if (mode !== 'commit') {
    console.log(`\nNo changes were written. Re-run with \`commit\` to apply.`);
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${writable.length} row(s) would change`);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const c of writable) {
      await client.query(
        `INSERT INTO brief147_meta_title_backup (source_table, source_column, row_key, old_value, new_value)
         VALUES ($1,$2,$3,$4,$5)`,
        [c.table, c.column, c.key, c.before, c.after]
      );
      // Gate the UPDATE on the exact old value: a concurrent editor save between the
      // scan and the write is then skipped rather than clobbered. `version` and
      // `updated_at` are deliberately left alone (see the header).
      const res = await client.query(
        `UPDATE ${c.table} SET ${c.column} = $1 WHERE ${c.column} = $2`,
        [c.after, c.before]
      );
      if ((res.rowCount ?? 0) === 0) {
        throw new Error(
          `${c.table}.${c.column} [${c.key}] did not update — the value changed under us. ` +
            'Nothing has been committed; re-run the script.'
        );
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  // ── Verify: nothing writable still ends in the suffix ──────────────────────
  let remaining = 0;
  for (const src of SOURCES) {
    if (src.readOnly) continue;
    if (!(await columnExists(src.table, src.column))) continue;
    const rows = await pool.query<{ value: string }>(
      `SELECT ${src.column} AS value FROM ${src.table} WHERE ${src.column} IS NOT NULL AND ${src.column} <> ''`
    );
    remaining += rows.rows.filter((r) => pageTitle(r.value) !== r.value).length;
  }
  if (remaining > 0) throw new Error(`verify failed: ${remaining} value(s) still end in the suffix.`);
  console.log(`\nverify: ${writable.length} row(s) stripped; 0 writable values still end in the suffix.`);

  const dir = join(process.cwd(), 'scripts', 'backups');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(dir, `brief-147-meta-title-suffix-${mode}-${stamp}.json`);
  writeFileSync(file, JSON.stringify({ mode, generated: stamp, changed: writable, reportOnly }, null, 2));
  console.log(`log: ${file}`);
  verdict(SCRIPT, 'APPLIED', `${writable.length} meta_title value(s) stripped`);
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
