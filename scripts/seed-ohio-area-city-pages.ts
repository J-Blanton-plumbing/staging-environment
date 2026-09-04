/**
 * Create the missing `city_pages` rows for Columbus Brief 02's Ohio areas.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * Brief 02 registered 138 Ohio area pages. Nothing in the pipeline creates a
 * `city_pages` row for a city that never existed in WordPress —
 * `migrate-wp-cities.ts` is gated on `jb_type=city_overview`,
 * `backfill-brief131-city-content.ts` is allow-listed to 21 WP-sourced slugs, and
 * the seed scripts cover Evanston/Elgin/the V2 set plus Columbus itself (Brief
 * 158). So all of them shipped rowless, and `verify-sitemap-queries.ts` refused
 * the deploy:
 *
 *     CITY PAGE COVERAGE DEFECT — a registered city has no `city_pages` row.
 *     137 of 386 registered cities are missing a row
 *
 * (137, not 138: `columbus` itself got its row from `seed-columbus-city-page.ts`.)
 *
 * That check is not being worked around here, it is being satisfied. A registered
 * city with no row is a page Marketing can SEE on the live site and cannot edit a
 * word of: `/admin/city/{slug}` renders the "No CMS content found" card instead
 * of a form, and `updateCityCmsContent` is UPDATE-only, so a save cannot
 * bootstrap the row. 137 uneditable indexed pages is exactly the condition Brief
 * 158 added the gate to prevent.
 *
 * ── WHY NO LIVE PAGE MOVES ──────────────────────────────────────────────────
 * Every field is seeded EMPTY, and the coverage-area merge in
 * `src/app/[city]/page.tsx` is `db.X || base.X` PER FIELD — verified line by line
 * (`h1Override`, `coveredHeading`, `coveredBody`, `coveredImage`,
 * `manplumberHeading`, `manplumberBody`, …). An empty string is falsy, so every
 * `||` resolves to `base` — the checked-in Ohio template content — exactly as it
 * does today with no row at all. The rows are a place for Marketing to type, not
 * a content change.
 *
 * ⚠️ `hero_heading_line1` IS THE EMPTY STRING, DELIBERATELY. It is the one column
 * that silently rewrites the H1 of an indexed page: `CoverageAreaCity.tsx`
 * renders `content?.h1Override ?? \`${name} Plumber\``, and the merge sets
 * `h1Override = db.heroHeadingLine1 || base.h1Override`. A non-empty value here
 * replaces `<h1>{City} Plumber</h1>` on all 137 pages at once. `''` is the
 * established precedent — Brief 158's Columbus row and the 21 Brief-140 backfill
 * rows all carry `''` and all render the default correctly. Never seed a headline.
 *
 * `faqs` is `[]` for the same reason: `mergedFaqs` picks the DB array only when
 * non-empty, so `[]` preserves the `WATER_TESTING_FAQS` fallback exactly.
 *
 * ── SCOPE, ASSERTED RATHER THAN ASSUMED ─────────────────────────────────────
 * The target set is DERIVED: every `CITY_REGISTRY` entry with no `city_pages`
 * row. It is then asserted to be exactly what this script is willing to create —
 * Ohio (`state === OHIO_STATE`) and `type === 'coverage-area'`. Anything else
 * (an Illinois city, a local-office city) ABORTS with the slug named, because a
 * missing row on one of those means a different bug with a different fix and
 * this script must not paper over it. Measured today: 137/137 Ohio coverage-area.
 *
 * ── SELECTOR ────────────────────────────────────────────────────────────────
 * By `city_slug`, never by `id` — ids differ per environment (Brief 146 lesson).
 * Note the column is `city_slug`, not `slug`: that trap has cost this project
 * twice (Brief 144's dead canonical resolver, Brief 147 Track D's missing
 * sitemap lastmod).
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * Dry run unless invoked with `commit` (`scripts/lib/run-mode.ts`), which also
 * makes a missing flag in the pipeline a hard failure rather than a silent
 * no-op. Fill-gaps only: `ON CONFLICT (city_slug) DO NOTHING`, so it never
 * touches a row that exists and is a clean no-op on every deploy after the first.
 * One transaction — either all 137 rows appear or none do.
 *
 * Run:
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/seed-ohio-area-city-pages.ts            # dry run
 *   npx ts-node ... scripts/seed-ohio-area-city-pages.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { CITY_REGISTRY } from '../src/lib/content/cities/index';
import { OHIO_STATE } from '../src/lib/content/cities/ohio-areas';
import { announceMode, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'seed-ohio-area-city-pages';
const CREATED_BY = 'seed-ohio-area-city-pages';

const envFile = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const envVar = (k: string) =>
  process.env[k] || (envFile.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

async function main() {
  const mode = resolveRunMode(SCRIPT);
  announceMode(SCRIPT, mode);

  const pool = new Pool({ connectionString: envVar('DATABASE_URL') });
  const client = await pool.connect();

  try {
    const have = new Set(
      (await client.query<{ city_slug: string }>('SELECT city_slug FROM city_pages')).rows.map(
        (r) => r.city_slug
      )
    );
    const missing = CITY_REGISTRY.filter((c) => !have.has(c.slug));

    console.log(
      `${have.size} city_pages row(s) exist; ${CITY_REGISTRY.length} cities registered; ${missing.length} missing.`
    );

    if (missing.length === 0) {
      console.log('Nothing to do — every registered city already has a row.');
      verdict(SCRIPT, 'ALREADY-APPLIED', '0 rows created');
      return;
    }

    /* The scope assertion. This script creates rows for Ohio coverage-area pages
       and nothing else; a missing row on any other kind of city is a different
       defect and must not be silently filled with an empty Ohio-shaped row. */
    const outOfScope = missing.filter(
      (c) => c.state !== OHIO_STATE || c.type !== 'coverage-area'
    );
    if (outOfScope.length > 0) {
      throw new Error(
        `refusing to run — ${outOfScope.length} missing row(s) are not Ohio coverage-area cities:\n` +
          outOfScope.map((c) => `  ${c.slug} (state=${String(c.state)}, type=${c.type})`).join('\n') +
          '\nA missing row on one of those means a different bug with a different fix.'
      );
    }

    console.log(`\nAll ${missing.length} are Ohio coverage-area pages. Rows to create:`);
    console.log('  ' + missing.map((c) => c.slug).join(', '));
    console.log(
      '\nEvery column is seeded EMPTY, so the per-field `db.X || base.X` merge keeps\n' +
        'resolving to the checked-in Ohio template content. No live page changes.'
    );

    if (mode === 'dry') {
      console.log(`\nDRY RUN — nothing written. Pass \`commit\` to create ${missing.length} row(s).`);
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${missing.length} row(s) would be created`);
      return;
    }

    await client.query('BEGIN');
    let created = 0;
    for (const city of missing) {
      const res = await client.query(
        `INSERT INTO city_pages
           (city_slug, city_type, template_type,
            hero_heading_line1, hero_heading_line2, hero_description, hero_callout, hero_image,
            content_heading, content_body, f2_heading, f2_body, faqs,
            meta_title, meta_description,
            created_by, created_at, updated_at, version)
         VALUES ($1, 'coverage-area', 'coverage-area',
                 '', NULL, '', '', NULL,
                 '', '', '', '', '[]'::jsonb,
                 '', '',
                 $2, NOW(), NOW(), 0)
         ON CONFLICT (city_slug) DO NOTHING`,
        [city.slug, CREATED_BY]
      );
      created += res.rowCount ?? 0;
    }
    await client.query('COMMIT');

    console.log(`\nCreated ${created} of ${missing.length} row(s).`);
    if (created !== missing.length) {
      console.log(
        `  ${missing.length - created} ON CONFLICT no-op(s) — a row appeared mid-run. Harmless; re-run to confirm.`
      );
    }
    verdict(
      SCRIPT,
      created > 0 ? 'APPLIED' : 'ALREADY-APPLIED',
      `${created} row(s) created, all fields empty`
    );
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(`\n${SCRIPT} FAILED:`, e.message);
  verdict(SCRIPT, 'FAILED', e.message.split('\n')[0]);
  process.exit(1);
});
