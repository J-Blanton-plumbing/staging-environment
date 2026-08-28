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
 *      is deliberate: every existing row stays live. This migration asserts that,
 *      and FAILS if any row lands in 'draft'. "Nothing gets unpublished by this
 *      brief" is a hard rule, so it is checked, not assumed.
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

  // ── The hard rule: nothing gets unpublished by this brief ─────────────────
  console.log('\n── Assertion: zero rows in any content table are `draft` ───────');
  let dark = 0;
  for (const table of STATUS_TABLES) {
    if (!(await hasColumn(table, 'status'))) {
      if (mode === 'dry') { console.log(`  ~ ${table}: status column not yet added (dry run)`); continue; }
      console.log(`  ✗ ${table}: status column missing after migration`);
      dark++;
      continue;
    }
    const r = await pool.query<{ c: string }>(
      `SELECT count(*)::text AS c FROM ${table} WHERE status <> 'published'`
    );
    const n = parseInt(r.rows[0].c, 10);
    console.log(`  ${n === 0 ? '✓' : '✗'} ${table}: ${n} row(s) not 'published'`);
    dark += n;
  }
  if (dark > 0) {
    throw new Error(
      `${dark} row(s) are not 'published' after the migration. "Nothing gets unpublished by this brief" ` +
      'is a hard rule — investigate before proceeding.'
    );
  }

  console.log(`\nCHANGES: ${changes.length ? changes.join(', ') : 'none'}`);
  console.log(`ALREADY PRESENT: ${noops.length ? noops.join(', ') : 'none'}`);

  if (mode === 'dry') {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${changes.length} change(s) pending`);
  } else if (changes.length === 0) {
    verdict(SCRIPT, 'ALREADY-APPLIED', 'schema already in place — idempotent re-run');
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
