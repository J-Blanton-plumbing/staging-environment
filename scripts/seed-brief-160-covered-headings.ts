/**
 * Brief 160 (Track A.5) — put today's rendered heading INTO the new field.
 *
 * The marketing lead's instruction is explicit: *"Fix this without deleting any
 * text, just leave the text in the field for me to change manually afterwards."*
 * So every coverage-area row is seeded with the exact string that row renders
 * today, and nothing on any page changes wording.
 *
 * ── WHERE THE STRING COMES FROM ─────────────────────────────────────────────
 * Not hand-written, and not guessed. `CoverageAreaCity.tsx` renders
 *
 *     WE&apos;VE GOT YOU COVERED, <span>{name}</span>
 *
 * where `name` is `RegistryEntry.name` — the same value `src/app/[city]/page.tsx`
 * passes in. This script builds the seed from that same registry, so the seed and
 * the template can not drift.
 *
 * ── CASING (Brief 160 §0.3.2) ───────────────────────────────────────────────
 * The uppercase is BELT AND BRACES on the live page: the first half is literally
 * uppercase in the markup AND the `<p>` carries Tailwind's `uppercase`
 * (`text-transform: uppercase`), which is what actually uppercases the city name.
 * The value stored here is therefore the PRE-TRANSFORM string — "WE'VE GOT YOU
 * COVERED, Geneva", with the city name in its registry casing. CSS uppercases it
 * on render exactly as it does today, and the editor sees a readable city name
 * rather than a shouted one. Seeding a fully-uppercased city name would also
 * render correctly (text-transform is idempotent) but would be a copy change in
 * the database, which this brief forbids.
 *
 * ── BRIEF 155 GUARD ─────────────────────────────────────────────────────────
 * No value written here may carry a leading outline label (`H1:` / `H2:` …) —
 * that is the exact class of bug Brief 155 cleaned out of 43 CMS fields. The
 * script refuses to write any value matching that pattern and reports the count
 * it verified (expected: 0).
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 *  - FILL-GAPS-ONLY: writes only where `covered_heading` is currently empty, so
 *    an editor's own wording is never overwritten. Re-running is a no-op.
 *  - Bumps `version` and `updated_at` per row (Brief 75), so an editor with the
 *    page already open gets the standard 409 on save instead of silently
 *    re-saving pre-seed content over the top.
 *  - `--rollback` clears ONLY rows still holding exactly the value this script
 *    would seed. A row the marketing lead has since edited is left alone.
 *  - Coverage-area rows only. `local-office` / `local-office-v2` rows do not
 *    render this section and are never touched.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/seed-brief-160-covered-headings.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { announceMode, resolveRunMode, verdict } from './lib/run-mode';
import { CITY_REGISTRY } from '@/lib/content/cities';

const SCRIPT = 'seed-brief-160-covered-headings';
const ROLLBACK = process.argv.slice(2).includes('--rollback');
const mode = resolveRunMode(SCRIPT, process.argv.slice(2).filter((a) => a !== '--rollback'));
announceMode(SCRIPT, mode);

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

/** Leading outline labels — the Brief 155 defect. Must never appear in a seed. */
const LEAKED_LABEL = /^\s*H[1-6]\s*:/i;

/**
 * The heading a coverage-area city renders today, reproduced from the template's
 * own expression. The apostrophe is U+2019-free on purpose: the JSX emits
 * `&apos;`, i.e. the ASCII apostrophe U+0027, and the seed must match it.
 */
function coveredHeadingFor(cityName: string): string {
  return `WE'VE GOT YOU COVERED, ${cityName}`;
}

const NAME_BY_SLUG = new Map(CITY_REGISTRY.map((c) => [c.slug, c.name]));

async function main() {
  const cols = await pool.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_name = 'city_pages' AND column_name = 'covered_heading'`
  );
  if ((cols.rowCount ?? 0) === 0) {
    console.error('GUARD: city_pages.covered_heading does not exist.');
    console.error('Run scripts/migrate-brief-160-city-covered-fields.ts first — this script');
    console.error('deliberately does not create schema.');
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', 'covered_heading column missing');
    process.exitCode = 1;
    return;
  }

  const rows = await pool.query<{ city_slug: string; covered_heading: string | null; version: number }>(
    `SELECT city_slug, covered_heading, version FROM city_pages
      WHERE template_type = 'coverage-area' ORDER BY city_slug`
  );
  console.log(`Coverage-area rows: ${rows.rowCount}`);

  if (ROLLBACK) {
    const targets = rows.rows.filter((r) => {
      const name = NAME_BY_SLUG.get(r.city_slug);
      return !!name && (r.covered_heading ?? '') === coveredHeadingFor(name);
    });
    console.log(`Rows still holding exactly the seeded value: ${targets.length}`);
    const edited = rows.rows.filter(
      (r) => (r.covered_heading ?? '') !== '' && !targets.includes(r)
    );
    if (edited.length > 0) {
      console.log(`Rows edited since the seed (LEFT ALONE): ${edited.length}`);
      for (const r of edited.slice(0, 10)) console.log(`  - ${r.city_slug}: ${JSON.stringify(r.covered_heading)}`);
    }
    if (mode === 'dry') {
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would clear ${targets.length} row(s)`);
      return;
    }
    for (const r of targets) {
      await pool.query(
        `UPDATE city_pages SET covered_heading = '', version = version + 1, updated_at = NOW()
          WHERE city_slug = $1 AND covered_heading = $2`,
        [r.city_slug, coveredHeadingFor(NAME_BY_SLUG.get(r.city_slug)!)]
      );
    }
    console.log(`Cleared ${targets.length} row(s).`);
    verdict(SCRIPT, 'APPLIED', `rollback: cleared ${targets.length} row(s)`);
    return;
  }

  const toSeed: { slug: string; value: string }[] = [];
  const skippedFilled: string[] = [];
  const skippedUnregistered: string[] = [];

  for (const r of rows.rows) {
    if ((r.covered_heading ?? '') !== '') {
      skippedFilled.push(r.city_slug);
      continue;
    }
    const name = NAME_BY_SLUG.get(r.city_slug);
    if (!name) {
      // A `city_pages` row with no registry entry does not render a page at all
      // (`[city]` is `dynamicParams = false` in effect — `getCity()` 404s it), so
      // there is no "text it renders today" to preserve. Report, never guess.
      skippedUnregistered.push(r.city_slug);
      continue;
    }
    const value = coveredHeadingFor(name);
    if (LEAKED_LABEL.test(value)) {
      console.error(`GUARD: refusing to seed a leaked outline label for ${r.city_slug}: ${JSON.stringify(value)}`);
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', 'Brief 155 label pattern in a seed value');
      process.exitCode = 1;
      return;
    }
    toSeed.push({ slug: r.city_slug, value });
  }

  console.log(`  to seed:                  ${toSeed.length}`);
  console.log(`  already filled (skipped): ${skippedFilled.length}`);
  console.log(`  not in CITY_REGISTRY:     ${skippedUnregistered.length}${skippedUnregistered.length ? ' → ' + skippedUnregistered.join(', ') : ''}`);
  for (const s of toSeed.slice(0, 5)) console.log(`    e.g. ${s.slug} → ${JSON.stringify(s.value)}`);

  if (toSeed.length === 0) {
    verdict(SCRIPT, 'ALREADY-APPLIED', 'every coverage-area row already has a covered_heading');
    return;
  }
  if (mode === 'dry') {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${toSeed.length} row(s) would be seeded`);
    return;
  }

  let written = 0;
  for (const s of toSeed) {
    // Guarded on the empty value: a concurrent editor save between the SELECT
    // and here wins, and is skipped rather than clobbered (the Brief 155 rule).
    const res = await pool.query(
      `UPDATE city_pages
          SET covered_heading = $2, version = version + 1, updated_at = NOW()
        WHERE city_slug = $1 AND coalesce(covered_heading, '') = ''`,
      [s.slug, s.value]
    );
    written += res.rowCount ?? 0;
  }
  console.log(`\nSeeded ${written} row(s).`);

  // Brief 155 guard, verified against what is actually stored, not what we meant
  // to store.
  const leaked = await pool.query(
    `SELECT count(*)::int AS n FROM city_pages WHERE covered_heading ~* '^\\s*H[1-6]\\s*:'`
  );
  console.log(`covered_heading rows matching '^\\s*H[1-6]\\s*:' → ${leaked.rows[0].n} (expected 0)`);
  if (leaked.rows[0].n > 0) {
    verdict(SCRIPT, 'FAILED', `${leaked.rows[0].n} seeded heading(s) carry a leaked outline label`);
    process.exitCode = 1;
    return;
  }

  verdict(SCRIPT, 'APPLIED', `seeded ${written} covered_heading value(s)`);
}

main()
  .catch((err) => {
    console.error(err);
    verdict(SCRIPT, 'FAILED', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
