/**
 * backfill-brief131-city-content.ts — Brief 140: give the 21 Brief-131
 * coverage-area city pages their legacy "We've Got You Covered" body copy.
 *
 * ── WHY ────────────────────────────────────────────────────────────────────
 * Brief 131 (Track A) registered 21 new coverage-area cities so their bare
 * `/{slug}` URLs would 200 at cutover and absorb the 301 equity from the flat
 * `-il-sewer-rodding` sources and the `/sewer-service/{id}` geo set. But it
 * registered routes only — none of the 21 has a `city_pages` row, because the
 * Brief-50 importer keyed off WordPress pages carrying `jb_type=city_overview`
 * and NONE of these 21 has one (verified against the export, 2026-08-05).
 *
 * With no row, `[city]/page.tsx` gets `db === null`, and with no
 * `src/lib/content/cities/*` file either, `content?.coveredBody` is undefined —
 * so `CoverageAreaCity` renders the section as a heading + image with an empty
 * text column. That is a soft-404 shape on exactly the pages the redirects point
 * content-rich legacy URLs at.
 *
 * This is CONTENT ONLY. It creates the missing `city_pages` rows and fills
 * `content_body` (→ `coveredBody`). Every other column is left at its default
 * empty/`NULL` value, which is deliberate: the coverage-area merge in
 * `[city]/page.tsx` is `db.<col> || staticBase.<col>` for each field, so an
 * empty column falls through to exactly the value the page renders today. The
 * H1, hero image, callout, manplumber block and FAQs are therefore unchanged —
 * only the previously-empty body appears.
 *
 * ── SOURCES ────────────────────────────────────────────────────────────────
 * 19 of 21 have a flat legacy page `{slug}-il-sewer-rodding` (post_type=page,
 * status=publish, template page-city.php). Its body is in `content:encoded` —
 * the ACF `city_content` meta on those pages is an empty field REFERENCE
 * (`field_city_content`), not content. Shape is three `<h2>` sections
 * (Sewer Rodding / Sewer Camera / Hydro Jetting), each with 1–2 `<p>`, with
 * `<br />` separators from wpautop. Verified byte-for-byte against what live
 * serves for lake-view-east, old-town and bucktown.
 *
 * Willowbrook and Harwood Heights have NO flat page (they entered Brief 131 via
 * the `/sewer-service/{id}` geo list) and `/{slug}` 404s on live, so there is no
 * live rendering to mirror. Per the brief's fallback rule they take their copy
 * from their own `jb_sewer` posts, resolved by `_jb_sewer_city` — the closest
 * equivalent to sewer rodding in that set is `_jb_sewer_service = 'sewer rooter'`
 * (the set has 51 services per city and no 'sewer rodding' entry). That content
 * is newline-separated plain text with no headings, so it is wrapped one `<p>`
 * per line — the same transform WordPress's own `wpautop` applies when it
 * renders those posts. No headings are added and no copy is invented.
 *
 * Heading tags are inserted EXACTLY as the legacy source carries them (Marketing
 * decision 2026-08-05): no promotion, no demotion, no added H1. The per-city
 * tag inventory this script prints is the input for the later heading-hierarchy
 * diagnose (interacts with Brief 137, which works at the TEMPLATE level only).
 *
 * ── TWO PHASES ─────────────────────────────────────────────────────────────
 * The 146 MB WordPress export is a local-machine file that staging/production
 * boxes do not have (same caveat as the Brief 50 importers), so extraction and
 * insertion are separate:
 *
 *   --extract   stream the XML → write scripts/data/brief140-city-content.json
 *               (committed, reviewable, deterministic). Needs the export.
 *   (default)   read that JSON → write the DB. Runs anywhere. DRY RUN unless
 *               --commit is passed.
 *   --rollback  undo a committed run using brief140_backfill_log.
 *
 * ── SAFETY ─────────────────────────────────────────────────────────────────
 *  - Allow-listed to exactly the 21 slugs. Alsip and the other 227 Brief-50
 *    cities can never be touched: every write names one slug from CITIES.
 *  - IDEMPOTENT. A row whose `content_body` is already non-empty is skipped and
 *    logged; a second `--commit` run makes zero changes.
 *  - Single transaction; every action recorded in `brief140_backfill_log` so
 *    --rollback can restore the exact prior state (delete rows this script
 *    created, re-empty fields it filled) without clobbering later edits.
 *  - HTML runs through the shared Brief 73 allow-list (`sanitizeCmsHtml`) — the
 *    same sanitizer `updateCityCmsContent` applies on the CMS write path — and
 *    internal links are rewritten to root-relative form first.
 *
 * Usage — `-r tsconfig-paths/register` is REQUIRED (this script imports the
 * shared sanitizer from `src/`, which resolves `@/…` path aliases):
 *
 *   # 1. regenerate the extracted content from the WP export (local machine only)
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/backfill-brief131-city-content.ts --extract
 *   # 2. preview the DB writes
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/backfill-brief131-city-content.ts
 *   # 3. apply
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/backfill-brief131-city-content.ts --commit
 *   # undo
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/backfill-brief131-city-content.ts --rollback
 */

import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { Pool } from 'pg';
import { sanitizeCmsHtml } from '../src/lib/cms/sanitize';

const XML_PATH =
  'C:/Users/marke/OneDrive/Documents/Claude/Projects/JBP Web Migration/jblantonplumbing.WordPress.2026-06-26.xml';

const DATA_PATH = join(__dirname, 'data', 'brief140-city-content.json');

/** Marker written to `city_pages.created_by` for rows this script creates. */
const CREATED_BY = 'brief-140-backfill';

// ── env / pool (same pattern as the other migration scripts) ────────────────
const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const envGet = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: envGet('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

// ── the allow-list ─────────────────────────────────────────────────────────
/**
 * Exactly the 21 cities Brief 131 Track A added to `CITY_REGISTRY` (its report
 * §1). `flatPage` cities read `content:encoded` off `{value}`; `sewerService`
 * cities read their `jb_sewer` post matched on `_jb_sewer_city` = `sewerCity`
 * and `_jb_sewer_service` = `sewerService` (the fallback rule).
 */
type CitySource =
  | { slug: string; kind: 'flat-page'; postName: string }
  | { slug: string; kind: 'jb-sewer'; sewerCity: string; sewerService: string };

const CITIES: CitySource[] = [
  { slug: 'bucktown',         kind: 'flat-page', postName: 'bucktown-il-sewer-rodding' },
  { slug: 'buena-park',       kind: 'flat-page', postName: 'buena-park-il-sewer-rodding' },
  { slug: 'deerfield',        kind: 'flat-page', postName: 'deerfield-il-sewer-rodding' },
  { slug: 'gold-coast',       kind: 'flat-page', postName: 'gold-coast-il-sewer-rodding' },
  { slug: 'grayslake',        kind: 'flat-page', postName: 'grayslake-il-sewer-rodding' },
  // No flat page in the export and /harwood-heights 404s on live — fallback rule.
  { slug: 'harwood-heights',  kind: 'jb-sewer',  sewerCity: 'Harwood Heights', sewerService: 'sewer rooter' },
  { slug: 'hyde-park',        kind: 'flat-page', postName: 'hyde-park-il-sewer-rodding' },
  { slug: 'lake-view-east',   kind: 'flat-page', postName: 'lake-view-east-il-sewer-rodding' },
  { slug: 'north-barrington', kind: 'flat-page', postName: 'north-barrington-il-sewer-rodding' },
  { slug: 'north-halsted',    kind: 'flat-page', postName: 'north-halsted-il-sewer-rodding' },
  { slug: 'old-town',         kind: 'flat-page', postName: 'old-town-il-sewer-rodding' },
  { slug: 'river-grove',      kind: 'flat-page', postName: 'river-grove-il-sewer-rodding' },
  { slug: 'riverwoods',       kind: 'flat-page', postName: 'riverwoods-il-sewer-rodding' },
  { slug: 'sauganash',        kind: 'flat-page', postName: 'sauganash-il-sewer-rodding' },
  { slug: 'sheridan-park',    kind: 'flat-page', postName: 'sheridan-park-il-sewer-rodding' },
  { slug: 'third-lake',       kind: 'flat-page', postName: 'third-lake-il-sewer-rodding' },
  { slug: 'tower-lakes',      kind: 'flat-page', postName: 'tower-lakes-il-sewer-rodding' },
  { slug: 'wadsworth',        kind: 'flat-page', postName: 'wadsworth-il-sewer-rodding' },
  { slug: 'west-lakeview',    kind: 'flat-page', postName: 'west-lakeview-il-sewer-rodding' },
  // No flat page in the export and /willowbrook 404s on live — fallback rule.
  { slug: 'willowbrook',      kind: 'jb-sewer',  sewerCity: 'Willowbrook', sewerService: 'sewer rooter' },
  { slug: 'wrigleyville',     kind: 'flat-page', postName: 'wrigleyville-il-sewer-rodding' },
];

// ── extracted-content file shape ───────────────────────────────────────────
interface ExtractedCity {
  slug: string;
  sourceKind: 'flat-page' | 'jb-sewer';
  /** WP `post_name` of the post the copy came from. */
  sourcePostName: string;
  wpPostId: string;
  wpStatus: string;
  wpTitle: string;
  /** Sanitized, link-normalized HTML destined for `city_pages.content_body`. */
  html: string;
  /** Heading inventory for the later heading-hierarchy diagnose (Brief 137). */
  headings: Array<{ tag: string; text: string }>;
  paragraphCount: number;
  /** Set when the source needed a structural transform (see wpautop below). */
  transform?: string;
  /** Candidate posts considered, when the source slug was ambiguous. */
  duplicateCandidates?: string[];
}
interface ExtractedFile {
  brief: string;
  source: string;
  note: string;
  cities: ExtractedCity[];
}

// ── XML helpers (same shape as scripts/migrate-wp-cities.ts) ────────────────
function extractTag(xml: string, tag: string): string {
  const escaped = tag.replace(':', '\\:').replace('/', '\\/');
  const cdataRe = new RegExp(`<${escaped}><!\\[CDATA\\[[\\s\\S]*?\\]\\]></${escaped}>`);
  const cdata = cdataRe.exec(xml);
  if (cdata) return cdata[0].replace(/^.*?<!\[CDATA\[/, '').replace(/\]\]>.*$/, '');
  const plain = new RegExp(`<${escaped}>([\\s\\S]*?)</${escaped}>`).exec(xml);
  return plain ? plain[1] : '';
}

function getPostMeta(itemXml: string): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const block of itemXml.split('</wp:postmeta>')) {
    const k = block.match(/<wp:meta_key>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/wp:meta_key>/);
    const v = block.match(/<wp:meta_value>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/wp:meta_value>/);
    if (k && v) meta[k[1].trim()] = v[1].trim();
  }
  return meta;
}

async function parseItems(xmlPath: string, onItem: (xml: string) => void): Promise<void> {
  const stream = createReadStream(xmlPath, { encoding: 'utf8', highWaterMark: 1024 * 1024 });
  let buffer = '';
  for await (const chunk of stream) {
    buffer += chunk;
    for (;;) {
      const start = buffer.indexOf('<item>');
      if (start === -1) { buffer = buffer.length > 200 ? buffer.slice(-200) : buffer; break; }
      const end = buffer.indexOf('</item>', start);
      if (end === -1) break;
      onItem(buffer.substring(start, end + 7));
      buffer = buffer.slice(end + 7);
    }
  }
}

// ── content normalization ──────────────────────────────────────────────────
/**
 * Rewrite internal links to root-relative form: `https://jblantonplumbing.com/x`,
 * protocol-relative `//jblantonplumbing.com/x` and bare relative `x/y` all become
 * `/x…`. External hosts, `mailto:`, `tel:` and in-page `#anchors` are left alone.
 */
function normalizeLinks(html: string): string {
  return html.replace(/(<a\b[^>]*?\bhref=)(["'])(.*?)\2/gi, (_m, pre: string, q: string, href: string) => {
    let out = href.trim();
    out = out.replace(/^https?:\/\/(www\.)?jblantonplumbing\.com/i, '');
    out = out.replace(/^\/\/(www\.)?jblantonplumbing\.com/i, '');
    if (out === '') out = '/';
    const isAbsoluteOther = /^[a-z][a-z0-9+.-]*:/i.test(out) || out.startsWith('//');
    if (!isAbsoluteOther && !out.startsWith('/') && !out.startsWith('#')) out = `/${out}`;
    return `${pre}${q}${out}${q}`;
  });
}

/**
 * Wrap newline-separated plain text one `<p>` per line — what WordPress's own
 * `wpautop` does when it renders a `jb_sewer` post body. Used ONLY for the two
 * fallback cities, whose source carries no markup at all; the 19 flat-page
 * sources already arrive as `<h2>`/`<p>` and are never passed through here.
 * Interior `<br />` runs are preserved untouched.
 */
function wpautop(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line}</p>`)
    .join('');
}

function inventoryHeadings(html: string): Array<{ tag: string; text: string }> {
  const out: Array<{ tag: string; text: string }> = [];
  const re = /<(h[1-6])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out.push({ tag: m[1].toLowerCase(), text: m[2].replace(/<[^>]*>/g, '').trim() });
  }
  return out;
}

function countParagraphs(html: string): number {
  return (html.match(/<p\b/gi) ?? []).length;
}

/** Full pipeline: link-normalize, then sanitize through the shared allow-list. */
function prepare(raw: string): string {
  return sanitizeCmsHtml(normalizeLinks(raw)).trim();
}

// ── PHASE 1: extract ───────────────────────────────────────────────────────
async function extract(): Promise<void> {
  if (!existsSync(XML_PATH)) {
    throw new Error(
      `WordPress export not found at ${XML_PATH}. --extract only runs on a machine that has it; ` +
        `the insertion phase reads the committed ${DATA_PATH} instead.`
    );
  }
  console.log('Brief 140 — extracting legacy body copy from the WP export…');

  const flatWanted = new Map<string, CitySource>();
  for (const c of CITIES) if (c.kind === 'flat-page') flatWanted.set(c.postName, c);
  const sewerWanted = CITIES.filter((c): c is Extract<CitySource, { kind: 'jb-sewer' }> => c.kind === 'jb-sewer');

  type Candidate = { postName: string; postId: string; status: string; title: string; content: string };
  const flatHits = new Map<string, Candidate[]>();   // keyed by city slug
  const sewerHits = new Map<string, Candidate[]>();  // keyed by city slug

  await parseItems(XML_PATH, (itemXml) => {
    const postType = extractTag(itemXml, 'wp:post_type');
    const postName = extractTag(itemXml, 'wp:post_name');
    const status = extractTag(itemXml, 'wp:status');
    if (status !== 'publish') return;

    if (postType === 'page') {
      // Duplicate-slug rule: `foo-2` variants resolve to the same base slug and
      // are collected as candidates so the choice is explicit + reported.
      const base = postName.replace(/-\d+$/, '');
      const target = flatWanted.get(postName) ?? flatWanted.get(base);
      if (!target) return;
      const list = flatHits.get(target.slug) ?? [];
      list.push({
        postName, status, postId: extractTag(itemXml, 'wp:post_id'),
        title: extractTag(itemXml, 'title'), content: extractTag(itemXml, 'content:encoded'),
      });
      flatHits.set(target.slug, list);
      return;
    }

    if (postType === 'jb_sewer' && sewerWanted.length > 0) {
      const meta = getPostMeta(itemXml);
      const city = meta['_jb_sewer_city'] ?? '';
      const service = meta['_jb_sewer_service'] ?? '';
      const target = sewerWanted.find((c) => c.sewerCity === city && c.sewerService === service);
      if (!target) return;
      const list = sewerHits.get(target.slug) ?? [];
      list.push({
        postName, status, postId: extractTag(itemXml, 'wp:post_id'),
        title: extractTag(itemXml, 'title'), content: extractTag(itemXml, 'content:encoded'),
      });
      sewerHits.set(target.slug, list);
    }
  });

  const cities: ExtractedCity[] = [];
  const unresolved: string[] = [];

  for (const spec of CITIES) {
    const hits = (spec.kind === 'flat-page' ? flatHits : sewerHits).get(spec.slug) ?? [];
    if (hits.length === 0) {
      unresolved.push(spec.slug);
      console.log(`  ✗ ${spec.slug.padEnd(18)} NO SOURCE FOUND — left untouched, flagged`);
      continue;
    }
    // Deterministic pick: exact post_name match first (the un-suffixed slug live
    // actually serves), else the lowest wp:post_id.
    const exact = spec.kind === 'flat-page' ? hits.find((h) => h.postName === spec.postName) : undefined;
    const chosen = exact ?? [...hits].sort((a, b) => Number(a.postId) - Number(b.postId))[0];

    const isPlainText = spec.kind === 'jb-sewer';
    const html = prepare(isPlainText ? wpautop(chosen.content) : chosen.content);
    if (!html) {
      unresolved.push(spec.slug);
      console.log(`  ✗ ${spec.slug.padEnd(18)} source found but empty after sanitize — left untouched`);
      continue;
    }

    const entry: ExtractedCity = {
      slug: spec.slug,
      sourceKind: spec.kind,
      sourcePostName: chosen.postName,
      wpPostId: chosen.postId,
      wpStatus: chosen.status,
      wpTitle: chosen.title,
      html,
      headings: inventoryHeadings(html),
      paragraphCount: countParagraphs(html),
    };
    if (isPlainText) {
      entry.transform = 'wpautop (one <p> per source line; source carries no markup)';
    }
    if (hits.length > 1) {
      entry.duplicateCandidates = hits.map((h) => `${h.postName}#${h.postId}`);
    }
    cities.push(entry);

    const tags = entry.headings.map((h) => h.tag).join(',') || '(none)';
    console.log(
      `  ✓ ${spec.slug.padEnd(18)} ${chosen.postName}#${chosen.postId} → ${html.length} chars, ` +
        `headings=[${tags}], p=${entry.paragraphCount}` +
        (hits.length > 1 ? ` (${hits.length} candidates)` : '')
    );
  }

  const out: ExtractedFile = {
    brief: 'brief-140',
    source: 'jblantonplumbing.WordPress.2026-06-26.xml',
    note:
      'Generated by scripts/backfill-brief131-city-content.ts --extract. Sanitized through ' +
      'src/lib/cms/sanitize.ts (Brief 73 allow-list) with internal links rewritten root-relative. ' +
      'Heading tags are the legacy source tags, verbatim — do not normalize here (Brief 137 owns ' +
      'heading hierarchy, at the template level).',
    cities,
  };
  mkdirSync(dirname(DATA_PATH), { recursive: true });
  writeFileSync(DATA_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');

  console.log(`\nWrote ${cities.length}/${CITIES.length} cities → ${DATA_PATH}`);
  if (unresolved.length) console.log(`UNRESOLVED (no source, not backfilled): ${unresolved.join(', ')}`);
}

// ── PHASE 2: insert ────────────────────────────────────────────────────────
async function insert(commit: boolean): Promise<void> {
  if (!existsSync(DATA_PATH)) {
    throw new Error(`Missing ${DATA_PATH}. Run with --extract first (needs the WP export).`);
  }
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf8')) as ExtractedFile;
  const allowed = new Set(CITIES.map((c) => c.slug));
  // Belt-and-braces: never write a slug that is not on the allow-list, even if
  // the JSON file were edited by hand.
  const payload = data.cities.filter((c) => allowed.has(c.slug));
  const rejected = data.cities.filter((c) => !allowed.has(c.slug)).map((c) => c.slug);
  if (rejected.length) console.log(`IGNORED (not on the 21-slug allow-list): ${rejected.join(', ')}`);

  console.log(`Brief 140 — ${commit ? 'APPLYING' : 'DRY RUN (pass --commit to apply)'}`);
  console.log(`Cities in ${DATA_PATH}: ${payload.length}\n`);

  const client = await pool.connect();
  let created = 0, filled = 0, skipped = 0;
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS brief140_backfill_log (
        id            SERIAL PRIMARY KEY,
        city_slug     TEXT NOT NULL,
        action        TEXT NOT NULL,          -- 'insert-row' | 'fill-content-body'
        source        TEXT NOT NULL,
        chars         INTEGER NOT NULL,
        applied_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    for (const city of payload) {
      const existing = await client.query(
        `SELECT id, version, coalesce(content_body,'') AS body, city_type, template_type
           FROM city_pages WHERE city_slug = $1`,
        [city.slug]
      );
      const tags = city.headings.map((h) => h.tag).join(',') || '(none)';
      const label = `${city.slug.padEnd(18)} [${city.sourcePostName}]`;

      if (existing.rowCount === 0) {
        console.log(`  + ${label} no row → INSERT coverage-area row, content_body: empty → ${city.html.length} chars (headings ${tags})`);
        if (commit) {
          await client.query(
            `INSERT INTO city_pages
               (city_slug, city_type, template_type, hero_heading_line1, hero_heading_line2,
                hero_description, hero_callout, hero_image, content_heading, content_body,
                f2_heading, f2_body, faqs, created_by, created_at, updated_at, version)
             VALUES ($1, 'coverage-area', 'coverage-area', '', NULL,
                     '', '', '', '', $2,
                     '', '', '[]'::jsonb, $3, NOW(), NOW(), 0)`,
            [city.slug, city.html, CREATED_BY]
          );
          await client.query(
            `INSERT INTO brief140_backfill_log (city_slug, action, source, chars)
             VALUES ($1, 'insert-row', $2, $3)`,
            [city.slug, city.sourcePostName, city.html.length]
          );
        }
        created++;
        continue;
      }

      const row = existing.rows[0];
      if (row.body.trim() !== '') {
        console.log(`  = ${label} SKIP — content_body already non-empty (${row.body.length} chars)`);
        skipped++;
        continue;
      }

      console.log(`  ~ ${label} row id=${row.id} v=${row.version} → FILL content_body: empty → ${city.html.length} chars (headings ${tags})`);
      if (commit) {
        await client.query(
          `UPDATE city_pages
              SET content_body = $2, version = version + 1, updated_at = NOW()
            WHERE city_slug = $1 AND coalesce(content_body,'') = ''`,
          [city.slug, city.html]
        );
        await client.query(
          `INSERT INTO brief140_backfill_log (city_slug, action, source, chars)
           VALUES ($1, 'fill-content-body', $2, $3)`,
          [city.slug, city.sourcePostName, city.html.length]
        );
      }
      filled++;
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(
    `\n── Summary ─────────────────────────────\n` +
      `  rows created      : ${created}\n` +
      `  bodies filled     : ${filled}\n` +
      `  skipped (non-empty): ${skipped}\n` +
      (commit ? '  committed.' : '  DRY RUN — nothing written. Re-run with --commit.')
  );
}

// ── ROLLBACK ───────────────────────────────────────────────────────────────
async function rollback(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const log = await client.query(
      `SELECT DISTINCT city_slug, action FROM brief140_backfill_log`
    );
    if (log.rowCount === 0) {
      console.log('brief140_backfill_log is empty — nothing to roll back.');
      await client.query('COMMIT');
      return;
    }
    const allowed = new Set(CITIES.map((c) => c.slug));
    let removed = 0, cleared = 0;
    for (const r of log.rows) {
      if (!allowed.has(r.city_slug)) continue;
      if (r.action === 'insert-row') {
        // Only delete a row this script created AND that nobody has since edited.
        const res = await client.query(
          `DELETE FROM city_pages WHERE city_slug = $1 AND created_by = $2 AND version = 0`,
          [r.city_slug, CREATED_BY]
        );
        removed += res.rowCount ?? 0;
        if ((res.rowCount ?? 0) === 0) console.log(`  ! ${r.city_slug}: row edited since backfill — left in place`);
      } else if (r.action === 'fill-content-body') {
        const res = await client.query(
          `UPDATE city_pages SET content_body = '', version = version + 1, updated_at = NOW()
            WHERE city_slug = $1`,
          [r.city_slug]
        );
        cleared += res.rowCount ?? 0;
      }
    }
    await client.query('DELETE FROM brief140_backfill_log');
    await client.query('COMMIT');
    console.log(`rollback: deleted ${removed} rows, cleared ${cleared} content_body values`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── entry point ────────────────────────────────────────────────────────────
async function main() {
  const argv = process.argv.slice(2);
  try {
    if (argv.includes('--extract')) {
      await extract();
    } else if (argv.includes('--rollback')) {
      await rollback();
    } else {
      await insert(argv.includes('--commit'));
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('backfill-brief131-city-content failed:', err);
  process.exit(1);
});
