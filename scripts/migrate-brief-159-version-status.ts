/**
 * Brief 159 (Track A1 + A2) — the version-status schema.
 *
 * Adds two things and nothing else:
 *
 *   1. `page_drafts.is_published` — the CURRENT publication pointer, plus a
 *      PARTIAL UNIQUE INDEX that makes two Published versions of one page
 *      structurally impossible. Application logic that forgets to clear the old
 *      flag now fails loudly instead of producing the reported bug a second time.
 *
 *   2. `status TEXT NOT NULL DEFAULT 'published'` on every live content table
 *      that lacks one — the DERIVED render gate (Track A2). Default 'published'
 *      is deliberate: every existing row stays live.
 *
 * WHAT IT CHECKS (rewritten by Brief 186 — read before changing):
 *   • SCHEMA — `status` must exist on every live table after the run. Missing →
 *     the deploy FAILS. That is a code/schema fault and must stay fatal.
 *   • "Nothing gets unpublished by this brief" — asserted ONLY for tables this
 *     run actually added the column to, because that is the only way this script
 *     can create a draft. It used to be asserted on EVERY deploy, against every
 *     table, and so measured whether editors had any drafts: one draft article
 *     blocked every deploy from run #110 on.
 *   • Everything else (drafts that already exist) is printed as INFORMATION with
 *     ids and slugs, and the script exits 0. Marketing's rule (2026-09-23):
 *     "A CMS has to work regardless of the state of its content. An article,
 *      page or city being a draft, published, unpublished or newly approved is a
 *      normal day in the CMS. It must never break a deploy."
 *     Do not re-add a content-state assertion to this file.
 *
 * `sub_service_pages` and `cms_articles` already carried `status` (Brief 75
 * Track D / the articles editor). Those are REUSED, never duplicated — the
 * migration only reports their existing value domain.
 *
 * Idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE UNIQUE INDEX IF NOT EXISTS`)
 * and safe to re-run: a second run reports zero changes.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/migrate-brief-159-version-status.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { announceMode, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'migrate-brief-159-version-status';
const mode = resolveRunMode(SCRIPT);
announceMode(SCRIPT, mode);

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

/**
 * Live content tables that need the derived `status` gate. Keep in sync with
 * `LIVE_TABLES` in `src/lib/cms/page-status.ts` — the verify script asserts the
 * column exists on every one of them.
 */
const STATUS_TABLES = [
  'city_pages',
  'service_category_pages',
  'city_service_pages',
  'emergency_plumbing_page',
  'main_pages',
  // Pre-existing — listed so the assertion below covers them too. ADD COLUMN
  // IF NOT EXISTS is a no-op on these.
  'sub_service_pages',
  'cms_articles',
];

const changes: string[] = [];
const noops: string[] = [];

async function hasColumn(table: string, column: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return (r.rowCount ?? 0) > 0;
}

async function hasIndex(name: string): Promise<boolean> {
  const r = await pool.query(`SELECT 1 FROM pg_indexes WHERE indexname = $1`, [name]);
  return (r.rowCount ?? 0) > 0;
}

async function tableExists(table: string): Promise<boolean> {
  const r = await pool.query(`SELECT 1 FROM information_schema.tables WHERE table_name = $1`, [table]);
  return (r.rowCount ?? 0) > 0;
}

async function countNotPublished(table: string): Promise<number> {
  const r = await pool.query<{ c: string }>(
    `SELECT count(*)::text AS c FROM ${table} WHERE status IS DISTINCT FROM 'published'`
  );
  return parseInt(r.rows[0].c, 10);
}

/**
 * `id · slug · status` for up to `limit` non-published rows. The identifying
 * columns differ per table (city_pages keys on city_slug, city_service_pages on
 * city_slug + service_slug, emergency_plumbing_page has only id), so they are
 * picked from what the table actually has.
 */
async function listNotPublished(table: string, limit: number): Promise<string[]> {
  const candidates = ['slug', 'city_slug', 'service_slug', 'title', 'updated_at'];
  const present: string[] = [];
  for (const c of candidates) if (await hasColumn(table, c)) present.push(c);
  const cols = ['id', ...present, 'status'].join(', ');
  const r = await pool.query<Record<string, unknown>>(
    `SELECT ${cols} FROM ${table} WHERE status IS DISTINCT FROM 'published' ORDER BY id LIMIT ${limit}`
  );
  return r.rows.map((row) =>
    Object.entries(row)
      .map(([k, v]) => `${k}=${v instanceof Date ? v.toISOString() : JSON.stringify(v)}`)
      .join(' · ')
  );
}

async function main() {
  console.log('── Track A1: page_drafts.is_published ──────────────────────────');

  if (await hasColumn('page_drafts', 'is_published')) {
    noops.push('page_drafts.is_published (already present)');
    console.log('  = page_drafts.is_published already exists');
  } else {
    changes.push('page_drafts.is_published');
    console.log('  + ADD COLUMN page_drafts.is_published BOOLEAN NOT NULL DEFAULT FALSE');
    if (mode === 'commit') {
      await pool.query(
        `ALTER TABLE page_drafts ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT FALSE`
      );
    }
  }

  // The "only one Published version per page" rule, enforced by the database.
  for (const [name, ddl] of [
    [
      'page_drafts_one_published_per_page',
      `CREATE UNIQUE INDEX IF NOT EXISTS page_drafts_one_published_per_page
         ON page_drafts (page_type, page_slug) WHERE is_published`,
    ],
    // Legacy page_type aliases ('city-local', 'financing', …) address the same
    // live row as their canonical type, so the raw-column index above would let
    // one alias row and one canonical row both be Published on the SAME page.
    // This second index closes that by normalising first. `cms_canonical_page_type`
    // mirrors PAGE_TYPE_ALIASES in src/lib/cms/page-status.ts.
    [
      'page_drafts_one_published_per_canonical_page',
      `CREATE UNIQUE INDEX IF NOT EXISTS page_drafts_one_published_per_canonical_page
         ON page_drafts (cms_canonical_page_type(page_type), page_slug) WHERE is_published`,
    ],
  ] as const) {
    if (name === 'page_drafts_one_published_per_canonical_page') {
      const fnSql = `
        CREATE OR REPLACE FUNCTION cms_canonical_page_type(pt text) RETURNS text
          LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $fn$
            SELECT CASE pt
              WHEN 'city-coverage'    THEN 'city'
              WHEN 'city-local'       THEN 'city'
              WHEN 'local-office-v2'  THEN 'city'
              WHEN 'financing'        THEN 'main'
              WHEN 'customer-stories' THEN 'main'
              WHEN 'help-and-support' THEN 'main'
              WHEN 'locations'        THEN 'main'
              ELSE pt
            END
          $fn$`;
      console.log('  ~ CREATE OR REPLACE FUNCTION cms_canonical_page_type(text)');
      if (mode === 'commit') await pool.query(fnSql);
    }
    if (await hasIndex(name)) {
      noops.push(`${name} (already present)`);
      console.log(`  = index ${name} already exists`);
    } else {
      changes.push(name);
      console.log(`  + CREATE UNIQUE INDEX ${name}`);
      if (mode === 'commit') await pool.query(ddl);
    }
  }

  console.log('\n── Track A2: derived status column on live content tables ──────');
  for (const table of STATUS_TABLES) {
    const exists = (await pool.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = $1`, [table]
    )).rowCount;
    if (!exists) {
      console.log(`  ! ${table} does not exist — skipped`);
      continue;
    }
    if (await hasColumn(table, 'status')) {
      const dist = await pool.query<{ status: string; c: string }>(
        `SELECT status, count(*)::text AS c FROM ${table} GROUP BY 1 ORDER BY 1`
      );
      noops.push(`${table}.status (already present)`);
      console.log(
        `  = ${table}.status already exists — ${dist.rows.map((r) => `${r.status}=${r.c}`).join(', ') || '(no rows)'}`
      );
    } else {
      changes.push(`${table}.status`);
      console.log(`  + ADD COLUMN ${table}.status TEXT NOT NULL DEFAULT 'published'`);
      if (mode === 'commit') {
        await pool.query(
          `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published'`
        );
        // The value domain is Draft | Published and nothing else. A CHECK keeps a
        // future typo ('Published', 'live') out of a column the render gate reads.
        await pool.query(
          `ALTER TABLE ${table} ADD CONSTRAINT ${table}_status_domain
             CHECK (status IN ('published', 'draft'))`
        );
      }
    }
  }

  // ── Schema assertion: the column exists on every table (CODE — may fail) ──
  // A missing column after this migration means the schema is broken, and the
  // render gate that reads it would 500. That is a code/schema failure and it
  // still stops the deploy (Brief 186, hard rule 2).
  console.log('\n── Schema check: `status` present on every live content table ──');
  const missing: string[] = [];
  for (const table of STATUS_TABLES) {
    if (!(await tableExists(table))) continue; // reported as skipped above
    if (await hasColumn(table, 'status')) {
      console.log(`  ✓ ${table}.status`);
      continue;
    }
    if (mode === 'dry') { console.log(`  ~ ${table}: status column not yet added (dry run)`); continue; }
    console.log(`  ✗ ${table}: status column missing after migration`);
    missing.push(table);
  }
  if (missing.length) {
    throw new Error(`status column missing after migration on: ${missing.join(', ')}`);
  }

  // ── Content check: SCOPED to what this run changed (Brief 186) ────────────
  // "Nothing gets unpublished by this brief" was a claim about the day this
  // migration ADDED a status column: a brand-new column defaults to
  // 'published', so a non-published row in a table THIS RUN just altered would
  // mean the migration itself darkened a page. That is the only situation in
  // which this script can create a draft, so it is the only one checked.
  //
  // On every later deploy the column already exists, and a draft row is an
  // EDITOR'S choice in /admin — not something this script did. Asserting on it
  // turned every draft article into a site-wide deploy outage (runs #110/#111,
  // 2026-09-23). Marketing's rule, recorded so no future brief restores it:
  //
  //   "A CMS has to work regardless of the state of its content. An article,
  //    page or city being a draft, published, unpublished or newly approved is
  //    a normal day in the CMS. It must never break a deploy."
  //
  // So on an ALREADY-APPLIED run the counts are printed as INFORMATION only.
  const addedStatusTables = STATUS_TABLES.filter((t) => changes.includes(`${t}.status`));
  if (mode === 'commit' && addedStatusTables.length) {
    console.log('\n── Assertion: tables that gained `status` THIS RUN hold no draft ──');
    let dark = 0;
    for (const table of addedStatusTables) {
      const n = await countNotPublished(table);
      console.log(`  ${n === 0 ? '✓' : '✗'} ${table}: ${n} row(s) not 'published'`);
      dark += n;
    }
    if (dark > 0) {
      throw new Error(
        `${dark} row(s) are not 'published' in table(s) this run just added a status column to ` +
        `(${addedStatusTables.join(', ')}). The column defaults to 'published', so this migration ` +
        'itself unpublished them — investigate before proceeding.'
      );
    }
  }

  console.log('\n── Editor state (information only — never fails a deploy) ──────');
  let editorDrafts = 0;
  for (const table of STATUS_TABLES) {
    if (addedStatusTables.includes(table)) continue; // checked above
    if (!(await tableExists(table)) || !(await hasColumn(table, 'status'))) continue;
    const n = await countNotPublished(table);
    editorDrafts += n;
    if (n === 0) {
      console.log(`  i ${table}: 0 not published`);
      continue;
    }
    console.log(`  i ${table}: ${n} not published (editor state; not checked)`);
    for (const row of await listNotPublished(table, 20)) console.log(`      - ${row}`);
    if (n > 20) console.log(`      … and ${n - 20} more`);
  }
  if (editorDrafts > 0) {
    console.log(
      `  i ${editorDrafts} non-published row(s) in total — normal CMS activity, reported for visibility only.`
    );
  }

  console.log(`\nCHANGES: ${changes.length ? changes.join(', ') : 'none'}`);
  console.log(`ALREADY PRESENT: ${noops.length ? noops.join(', ') : 'none'}`);

  if (mode === 'dry') {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${changes.length} change(s) pending`);
  } else if (changes.length === 0) {
    verdict(
      SCRIPT,
      'ALREADY-APPLIED',
      `schema already in place — idempotent re-run; ${editorDrafts} non-published row(s) (editor state, not checked)`
    );
  } else {
    verdict(SCRIPT, 'APPLIED', `${changes.length} schema change(s)`);
  }
}

main()
  .catch((e) => {
    console.error(`\n${SCRIPT} FAILED: ${e instanceof Error ? e.message : String(e)}`);
    verdict(SCRIPT, 'FAILED', e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
