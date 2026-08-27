/**
 * Brief 147 (Track D) — run every one of the sitemap's `<lastmod>` source queries
 * against the real database and FAIL LOUDLY on a wrong column or table name.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * `src/lib/sitemap/render.ts` wraps each source in `safeQuery`, which swallows errors on
 * purpose so a DB hiccup degrades to "no lastmod" instead of a 500. That is the
 * right runtime behaviour and the wrong build-time behaviour: the city source
 * selected `slug` from `city_pages`, a column that does not exist (it is
 * `city_slug`), so it threw on EVERY request and all 248 city URLs shipped with no
 * freshness signal at all — for weeks — visible only as one line in a server log
 * nobody was reading (Brief 146 §6.2 found it by accident).
 *
 * This script closes that hole from the other side: it imports the queries from
 * `sitemap.ts` itself (so a query can never drift out of coverage) and runs each
 * one with `LIMIT 0`, which validates the identifiers without reading rows.
 *
 * ── EXIT CODES — deliberately NOT the Brief 145 "always exit 0" convention ───
 * The other deploy scripts exit 0 when a guard trips because they answer DATA
 * questions, and aborting the pipeline over data would turn a content question
 * into a site-wide outage. This one answers a CODE question: a 42703 (undefined
 * column), 42P01 (undefined table) or 42601 (syntax error) means the checked-in
 * SQL is wrong and no deploy should carry it. So:
 *
 *   exit 1 — a query has a bad column/table/syntax. Run BEFORE the build swap in
 *            deploy.yml, so `set -e` aborts with the previous build still serving.
 *            No outage; the deploy simply does not happen.
 *   exit 0 — all queries valid, OR the database was unreachable / permission-denied
 *            (a transient infrastructure condition must never block a deploy). That
 *            case prints an unmissable banner instead.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/verify-sitemap-queries.ts
 *
 * ── BRIEF 158 (Track C): CITY PAGE COVERAGE ─────────────────────────────────
 * This script also asserts that every `CITY_REGISTRY` slug has a `city_pages`
 * row. That assertion lives here rather than in `scripts/validate-sitemap.ts`
 * (which is deliberately DB-free, so it cannot ask the question) and rather than
 * in the post-deploy health check, for three reasons:
 *
 *   1. It is the same KIND of question this script already answers — "does the
 *      database actually contain what the checked-in code assumes?" — asked with
 *      the same pool, under the same exit-code doctrine.
 *   2. It runs PRE-SWAP, so a hard failure aborts the deploy with the previous
 *      build still serving. A post-swap check can only tell you about a site
 *      that is already live. No outage either way, and this one is earlier.
 *   3. The health check is HTTP-only by design and has no DB credentials loaded.
 *
 * Its invocation was MOVED in deploy.yml to sit AFTER the seed/backfill scripts
 * (still well before the build swap). That ordering is load-bearing: run before
 * them and the very deploy that creates a missing row would abort before
 * creating it. Do not move it back above `seed-columbus-city-page.ts`.
 *
 * Columbus was the case that motivated it: it was the only one of 249 registered
 * cities with no row, so `/admin/city/columbus` showed "No CMS content found"
 * and the UPDATE-only save path could not create one (Brief 157, Q2/Q6/Q7).
 * Nothing in the pipeline creates a row for a city that never existed in
 * WordPress — every automated writer is driven off the WP export — so a city
 * registered after the migration ships uneditable and nothing notices.
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';

// Brief 153: `src/app/sitemap.ts` is gone — /sitemap.xml is now a Route Handler
// emitting a <sitemapindex>, and the queries moved to the shared render module.
import { SITEMAP_LASTMOD_SOURCES } from '@/lib/sitemap/render';
// Brief 158 (Track C): the registry every `/{city}` route is rendered from.
import { CITY_REGISTRY } from '@/lib/content/cities';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

/** Postgres error codes that mean "the SQL in the repo is wrong". */
const CODE_DEFECTS = new Set(['42703', '42P01', '42601', '42883', '42P10']);

function banner(lines: string[]) {
  console.log('');
  console.log('!'.repeat(72));
  for (const l of lines) console.log(l);
  console.log('!'.repeat(72));
  console.log('');
}

async function main() {
  const entries = Object.entries(SITEMAP_LASTMOD_SOURCES);
  console.log(`checking ${entries.length} sitemap lastmod source quer${entries.length === 1 ? 'y' : 'ies'}…\n`);

  const defects: Array<{ name: string; code: string; message: string; sql: string }> = [];
  let unreachable: string | null = null;

  for (const [name, sql] of entries) {
    // LIMIT 0 validates every identifier without transferring rows. Wrapping in a
    // subselect keeps it correct for queries that already carry their own LIMIT.
    const probe = `SELECT * FROM (${sql}) AS sitemap_probe LIMIT 0`;
    // Brief 153: the city-service query is parameterised ($1/$2 = the shard's
    // city-slug bounds). Postgres refuses to prepare a statement whose
    // parameters are unbound, so supply one empty string per placeholder —
    // `LIMIT 0` means the values never matter, only the identifiers do.
    const paramCount = Math.max(0, ...[...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])));
    const params = Array.from({ length: paramCount }, () => '');
    try {
      await pool.query(probe, params);
      console.log(`  ok   ${name}`);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      const code = e.code ?? '(no code)';
      if (CODE_DEFECTS.has(code)) {
        console.log(`  FAIL ${name} — postgres ${code}: ${e.message}`);
        defects.push({ name, code, message: e.message ?? String(err), sql });
      } else {
        console.log(`  skip ${name} — postgres ${code}: ${e.message} (not a SQL defect)`);
        unreachable = `${code}: ${e.message ?? String(err)}`;
      }
    }
  }

  if (defects.length > 0) {
    banner([
      'SITEMAP QUERY DEFECT — the checked-in SQL references something that does',
      'not exist in this database. Every URL from the affected source(s) would ship',
      'with NO <lastmod>, and the render module swallows the error at runtime so',
      'nothing else would surface it. Fix the query in src/lib/sitemap/render.ts.',
      '',
      ...defects.flatMap((d) => [
        `  ${d.name}: postgres ${d.code}: ${d.message}`,
        `    sql: ${d.sql.replace(/\s+/g, ' ').trim()}`,
      ]),
      '',
      'Exiting NON-ZERO on purpose: this runs before the build swap, so the deploy',
      'aborts with the previous build still serving. This is a code bug, not data.',
    ]);
    process.exitCode = 1;
    return;
  }

  if (unreachable) {
    banner([
      'SITEMAP QUERY CHECK COULD NOT RUN — the database was not reachable (or denied',
      `access): ${unreachable}`,
      'Exiting 0: a transient infrastructure condition must not block a deploy. But',
      'this check proved NOTHING on this run — do not read it as a pass.',
    ]);
    return;
  }

  console.log(`\nall ${entries.length} sitemap lastmod queries are valid against this database.`);

  await checkCityPageCoverage();
}

/**
 * Brief 158 (Track C) — every registered city must have a `city_pages` row.
 *
 * A registered city with no row is a page Marketing can see and cannot edit: the
 * editor renders its "No CMS content found" card, and `updateCityCmsContent` is
 * UPDATE-only so a save cannot bootstrap the row. HARD FAIL — this runs before
 * the build swap, so the deploy simply does not happen and the previous build
 * keeps serving. There is no outage to trade against, and the fix is one seed
 * script in the shape of `scripts/seed-columbus-city-page.ts`.
 *
 * A DB that cannot be reached exits 0 with a banner, exactly like the query
 * check above: an infrastructure blip must never block a deploy, and a check
 * that could not run is never reported as a pass.
 */
async function checkCityPageCoverage(): Promise<void> {
  console.log('\nchecking city_pages coverage for every registered city…');

  let rows: Array<{ city_slug: string }>;
  try {
    rows = (await pool.query<{ city_slug: string }>('SELECT city_slug FROM city_pages')).rows;
  } catch (err) {
    const e = err as { code?: string; message?: string };
    const code = e.code ?? '(no code)';
    if (CODE_DEFECTS.has(code)) {
      banner([
        'CITY PAGE COVERAGE CHECK — the city_pages table or its city_slug column does',
        `not exist: postgres ${code}: ${e.message}`,
        'Note the column is `city_slug`, not `slug` — that trap has cost this project',
        'twice (Brief 144, Brief 147 Track D). Exiting NON-ZERO: this is a code defect.',
      ]);
      process.exitCode = 1;
      return;
    }
    banner([
      'CITY PAGE COVERAGE CHECK COULD NOT RUN — the database was not reachable (or',
      `denied access): ${code}: ${e.message}`,
      'Exiting 0: a transient infrastructure condition must not block a deploy. But',
      'this check proved NOTHING on this run — do not read it as a pass.',
    ]);
    return;
  }

  const haveRow = new Set(rows.map((r) => r.city_slug));
  const registered = CITY_REGISTRY.map((c) => c.slug);
  const missing = registered.filter((slug) => !haveRow.has(slug));
  // The other direction is informational only: a row for a slug that is not
  // registered is an orphan (`POST /api/cms/pages` never validates a city slug
  // against the registry — Brief 157 §5 item 9), but it is editable and harmless
  // to a visitor, so it is not worth blocking a deploy over.
  const orphans = Array.from(haveRow).filter((slug) => !registered.includes(slug));

  if (orphans.length > 0) {
    console.log(
      `  note: ${orphans.length} city_pages row(s) have no CITY_REGISTRY entry (no route serves them): ${orphans.sort().join(', ')}`
    );
  }

  if (missing.length === 0) {
    console.log(`  ok   all ${registered.length} registered cities have a city_pages row.`);
    return;
  }

  banner([
    'CITY PAGE COVERAGE DEFECT — a registered city has no `city_pages` row.',
    '',
    `${missing.length} of ${registered.length} registered cities are missing a row:`,
    ...missing.sort().map((slug) => `  ${slug}   (/admin/city/${slug} will show "No CMS content found")`),
    '',
    'What this means: the page is live and indexed, and Marketing cannot edit a word',
    'of it. The city editor needs a row to load, and its save path is UPDATE-only, so',
    'it cannot create the missing row itself.',
    '',
    'How to fix: add a seed step for the city in the shape of',
    '`scripts/seed-columbus-city-page.ts` — a fill-gaps INSERT keyed on `city_slug`,',
    'with `hero_heading_line1` left as the EMPTY STRING (a non-empty value there',
    'silently rewrites the page H1), pre-filled from the city\'s content file if it',
    'has one. Wire it into deploy.yml above this step.',
    '',
    'Exiting NON-ZERO on purpose: this runs before the build swap, so the deploy',
    'aborts with the previous build still serving. Nothing is down.',
  ]);
  process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
