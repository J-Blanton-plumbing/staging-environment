/**
 * Brief 160 (Tracks A + C) — the two new `city_pages` columns.
 *
 *   1. `covered_heading text DEFAULT ''` — the coverage-area
 *      "WE'VE GOT YOU COVERED, {City}" H2, which was a hard-coded template
 *      literal with no CMS field behind it (Brief 157, Q9).
 *
 *   2. `covered_image text DEFAULT ''` — that section's OWN image. There was no
 *      section-1 image column at all, so the block resolved through the hero's
 *      URL and the two slots moved together.
 *
 * ── WHY NEW COLUMNS AND NOT `content_heading` ───────────────────────────────
 * `content_heading` already exists and is EMPTY on all 246 coverage-area rows —
 * but it is the live "Why J. Blanton" heading on `local-office` (Evanston holds
 * "WHY J. BLANTON FOR EVANSTON PLUMBING" in it today). Brief 95 (A.2) removed
 * the coverage-area Heading input precisely to stop the two meanings colliding,
 * and Brief 157 named the pattern "the cross-template column-reuse footgun: a
 * template switch silently changes what the column does". Reusing it would put
 * a live heading at risk on every template switch. A dedicated column cannot.
 *
 * Additive only — no existing value is read, written or overwritten, so there is
 * nothing to back up. Idempotent (`ADD COLUMN IF NOT EXISTS`): a second run
 * reports ALREADY-APPLIED and touches nothing.
 *
 *   # apply
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/migrate-brief-160-city-covered-fields.ts commit
 *
 *   # preview
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/migrate-brief-160-city-covered-fields.ts --dry-run
 *
 *   # reverse (DESTRUCTIVE — drops the columns and everything in them)
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/migrate-brief-160-city-covered-fields.ts --rollback commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { announceMode, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'migrate-brief-160-city-covered-fields';
const ROLLBACK = process.argv.slice(2).includes('--rollback');
// `--rollback` is this script's own flag; strip it before the shared resolver
// sees argv, so it is never mistaken for an unrecognised run-mode token.
const mode = resolveRunMode(SCRIPT, process.argv.slice(2).filter((a) => a !== '--rollback'));
announceMode(SCRIPT, mode);

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

/** The columns this brief owns. `text DEFAULT ''` matches the sibling city_pages copy columns. */
const COLUMNS: { name: string; ddl: string; why: string }[] = [
  {
    name: 'covered_heading',
    ddl: `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS covered_heading TEXT DEFAULT ''::text`,
    why: 'Track A — coverage-area "WE\'VE GOT YOU COVERED, {City}" H2',
  },
  {
    name: 'covered_image',
    ddl: `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS covered_image TEXT DEFAULT ''::text`,
    why: 'Track C — that section\'s own image, independent of hero_image',
  },
];

async function hasColumn(table: string, column: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return (r.rowCount ?? 0) > 0;
}

async function main() {
  const before = new Map<string, boolean>();
  for (const c of COLUMNS) before.set(c.name, await hasColumn('city_pages', c.name));

  if (ROLLBACK) {
    console.log('── ROLLBACK: dropping the Brief 160 columns ────────────────────');
    const present = COLUMNS.filter((c) => before.get(c.name));
    if (present.length === 0) {
      console.log('  = neither column exists — nothing to roll back');
      verdict(SCRIPT, 'ALREADY-APPLIED', 'rollback: columns already absent');
      return;
    }
    for (const c of present) {
      const rows = await pool.query(
        `SELECT count(*)::int AS n FROM city_pages WHERE coalesce(${c.name}, '') <> ''`
      );
      console.log(`  ! DROP city_pages.${c.name} — ${rows.rows[0].n} row(s) hold a non-empty value and will lose it`);
    }
    if (mode === 'dry') {
      console.log('\n  (dry run — nothing dropped)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', 'rollback previewed');
      return;
    }
    for (const c of present) {
      await pool.query(`ALTER TABLE city_pages DROP COLUMN IF EXISTS ${c.name}`);
      console.log(`  ✓ dropped city_pages.${c.name}`);
    }
    verdict(SCRIPT, 'APPLIED', `rollback: dropped ${present.map((c) => c.name).join(', ')}`);
    return;
  }

  console.log('── Brief 160: city_pages.covered_heading + covered_image ───────');
  const missing = COLUMNS.filter((c) => !before.get(c.name));
  for (const c of COLUMNS) {
    console.log(`  ${before.get(c.name) ? '=' : '+'} city_pages.${c.name} — ${c.why}`);
  }

  if (missing.length === 0) {
    console.log('\n  Both columns already exist. Nothing to do.');
    verdict(SCRIPT, 'ALREADY-APPLIED', 'covered_heading + covered_image already present');
    return;
  }

  if (mode === 'dry') {
    console.log(`\n  WOULD ADD: ${missing.map((c) => c.name).join(', ')}`);
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${missing.length} column(s) would be added`);
    return;
  }

  for (const c of missing) {
    await pool.query(c.ddl);
    console.log(`  ✓ added city_pages.${c.name}`);
  }

  // Assert the post-state rather than trusting it: a column that silently failed
  // to appear would surface later as an editor that saves and loses the value.
  const bad: string[] = [];
  for (const c of COLUMNS) if (!(await hasColumn('city_pages', c.name))) bad.push(c.name);
  if (bad.length > 0) {
    console.error(`\n  FAILED: still missing after ALTER — ${bad.join(', ')}`);
    verdict(SCRIPT, 'FAILED', `missing after ALTER: ${bad.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  // Every existing row must read as empty: empty is what makes the render fall
  // back to the template literal / the pipes image, i.e. no page changes on the
  // strength of this migration alone.
  const nonEmpty = await pool.query(
    `SELECT count(*)::int AS n FROM city_pages
      WHERE coalesce(covered_heading, '') <> '' OR coalesce(covered_image, '') <> ''`
  );
  console.log(`\n  Rows with a non-empty new field: ${nonEmpty.rows[0].n} (expected 0 on a first run)`);

  verdict(SCRIPT, 'APPLIED', `added ${missing.map((c) => c.name).join(', ')}`);
}

main()
  .catch((err) => {
    console.error(err);
    verdict(SCRIPT, 'FAILED', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
