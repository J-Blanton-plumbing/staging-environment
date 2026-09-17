/**
 * Brief 179 (Track A.2) — `city_pages.hero_video_url`.
 *
 * The Local Office ("video-hero") template is the Evanston layout: a full-screen
 * autoplay background video behind the H1. Until this brief the video URL lived
 * ONLY in the hand-written per-city content file (`evanston.ts`), so the one city
 * with a content file was the one city that could use the template at all.
 *
 * Track A gives every registry city a synthesised `LocalOfficeContent` fallback,
 * and this column is the CMS field that lets Marketing put a real video behind a
 * city's hero without a code change. Empty is the normal state and is MEANINGFUL:
 * `CityVideoHero` then renders the `<video>` with a `poster` and no `src`, so the
 * hero shows the hero image as a still and the geometry is unchanged.
 *
 * ── WHY A NEW COLUMN AND NOT `hero_image` ───────────────────────────────────
 * `hero_image` is the POSTER (and the coverage-area hero photo, and the V2 hero
 * photo). A video URL in it would render as a broken <img> on two other
 * templates — the cross-template column-reuse footgun Brief 157 (Q9) named and
 * Brief 160 designed around. A dedicated column cannot be repurposed by a
 * template switch.
 *
 * ── SHIPPING ORDER (Brief 179 hard rule 7, Brief 171 precedent) ─────────────
 * This migration commits and runs AHEAD of the code that reads the column, so a
 * failed deploy leaves the database ahead of the app rather than the app
 * querying a column that does not exist. The reader (`getCityCmsContent`) still
 * uses `r.hero_video_url ?? ''`, so an un-migrated database degrades to "no
 * video" rather than throwing — but that is the safety net, not the plan.
 *
 * Additive only — no existing value is read, written or overwritten, so there is
 * nothing to back up. Idempotent (`ADD COLUMN IF NOT EXISTS`): a second run
 * reports ALREADY-APPLIED and touches nothing.
 *
 *   # apply
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/migrate-brief-179-city-hero-video.ts commit
 *
 *   # preview
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/migrate-brief-179-city-hero-video.ts --dry-run
 *
 *   # reverse (DESTRUCTIVE — drops the column and everything in it)
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/migrate-brief-179-city-hero-video.ts --rollback commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { announceMode, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'migrate-brief-179-city-hero-video';
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

/** The one column this brief owns. `text DEFAULT ''` matches the sibling city_pages copy columns. */
const COLUMN = {
  name: 'hero_video_url',
  ddl: `ALTER TABLE city_pages ADD COLUMN IF NOT EXISTS hero_video_url TEXT DEFAULT ''::text`,
  why: 'Track A.2 — Local Office hero background video (blank = show the hero image as a still)',
};

async function hasColumn(table: string, column: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return (r.rowCount ?? 0) > 0;
}

async function main() {
  const present = await hasColumn('city_pages', COLUMN.name);

  if (ROLLBACK) {
    console.log('── ROLLBACK: dropping the Brief 179 column ─────────────────────');
    if (!present) {
      console.log(`  = city_pages.${COLUMN.name} does not exist — nothing to roll back`);
      verdict(SCRIPT, 'ALREADY-APPLIED', 'rollback: column already absent');
      return;
    }
    const rows = await pool.query(
      `SELECT count(*)::int AS n FROM city_pages WHERE coalesce(${COLUMN.name}, '') <> ''`
    );
    console.log(
      `  ! DROP city_pages.${COLUMN.name} — ${rows.rows[0].n} row(s) hold a non-empty value and will lose it`
    );
    if (mode === 'dry') {
      console.log('\n  (dry run — nothing dropped)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', 'rollback previewed');
      return;
    }
    await pool.query(`ALTER TABLE city_pages DROP COLUMN IF EXISTS ${COLUMN.name}`);
    console.log(`  ✓ dropped city_pages.${COLUMN.name}`);
    verdict(SCRIPT, 'APPLIED', `rollback: dropped ${COLUMN.name}`);
    return;
  }

  console.log('── Brief 179: city_pages.hero_video_url ────────────────────────');
  console.log(`  ${present ? '=' : '+'} city_pages.${COLUMN.name} — ${COLUMN.why}`);

  if (present) {
    console.log('\n  Column already exists. Nothing to do.');
    verdict(SCRIPT, 'ALREADY-APPLIED', 'hero_video_url already present');
    return;
  }

  if (mode === 'dry') {
    console.log(`\n  WOULD ADD: ${COLUMN.name}`);
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', '1 column would be added');
    return;
  }

  await pool.query(COLUMN.ddl);
  console.log(`  ✓ added city_pages.${COLUMN.name}`);

  // Assert the post-state rather than trusting it: a column that silently failed
  // to appear would surface later as an editor that saves and loses the value.
  if (!(await hasColumn('city_pages', COLUMN.name))) {
    console.error(`\n  FAILED: still missing after ALTER — ${COLUMN.name}`);
    verdict(SCRIPT, 'FAILED', `missing after ALTER: ${COLUMN.name}`);
    process.exitCode = 1;
    return;
  }

  // Every existing row must read as empty: empty is what makes the hero fall
  // back to the poster still, i.e. no page changes on the strength of this
  // migration alone.
  const nonEmpty = await pool.query(
    `SELECT count(*)::int AS n FROM city_pages WHERE coalesce(hero_video_url, '') <> ''`
  );
  console.log(`\n  Rows with a non-empty hero_video_url: ${nonEmpty.rows[0].n} (expected 0 on a first run)`);

  verdict(SCRIPT, 'APPLIED', `added ${COLUMN.name}`);
}

main()
  .catch((err) => {
    console.error(err);
    verdict(SCRIPT, 'FAILED', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
