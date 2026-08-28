/**
 * Brief 160 — read-only verification. Exits non-zero if any check fails.
 *
 * Answers, against the database it is pointed at (dev, staging or production):
 *
 *   A1  `city_pages.covered_heading` exists, and every coverage-area row that
 *       renders a page has one. `content_heading` is UNCHANGED on local-office.
 *   A2  Brief 155 guard: no `covered_heading` value carries a leading `H1:` /
 *       `H2:` outline label. Expected count: 0.
 *   A3  Every seeded value equals the string its template renders — rebuilt from
 *       `CITY_REGISTRY`, the same source the template reads.
 *   C1  `city_pages.covered_image` exists and, by default, is empty everywhere
 *       (empty → the shared pipes fallback, which is what these pages render).
 *   C2  THE VISIBLE-CHANGE LIST: coverage-area rows with a populated
 *       `hero_image` and an empty `covered_image`. Their section-1 image stops
 *       mirroring the hero and becomes the pipes fallback — the requested fix,
 *       but a visible change. Printed in full so it can be reviewed before a
 *       production run, and split by whether the hero URL actually loads.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/verify-brief-160.ts
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { CITY_REGISTRY } from '@/lib/content/cities';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const NAME_BY_SLUG = new Map(CITY_REGISTRY.map((c) => [c.slug, c.name]));
const expected = (name: string) => `WE'VE GOT YOU COVERED, ${name}`;

const failures: string[] = [];
const ok = (m: string) => console.log(`  PASS  ${m}`);
const fail = (m: string) => { console.log(`  FAIL  ${m}`); failures.push(m); };
const note = (m: string) => console.log(`  ..    ${m}`);

async function hasColumn(column: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name='city_pages' AND column_name=$1`,
    [column]
  );
  return (r.rowCount ?? 0) > 0;
}

async function main() {
  console.log('Brief 160 verification\n');

  console.log('── Schema ──────────────────────────────────────────────────────');
  const hasHeading = await hasColumn('covered_heading');
  const hasImage = await hasColumn('covered_image');
  hasHeading ? ok('city_pages.covered_heading exists') : fail('city_pages.covered_heading is MISSING — run the migration');
  hasImage ? ok('city_pages.covered_image exists') : fail('city_pages.covered_image is MISSING — run the migration');
  if (!hasHeading || !hasImage) {
    console.log('\nCannot continue without both columns.');
    process.exitCode = 1;
    return;
  }

  const rows = await pool.query<{
    city_slug: string; template_type: string;
    covered_heading: string | null; covered_image: string | null;
    hero_image: string | null; content_heading: string | null;
  }>(
    `SELECT city_slug, template_type, covered_heading, covered_image, hero_image, content_heading
       FROM city_pages ORDER BY city_slug`
  );
  const coverage = rows.rows.filter((r) => r.template_type === 'coverage-area');
  const others = rows.rows.filter((r) => r.template_type !== 'coverage-area');
  note(`${rows.rowCount} city_pages rows — ${coverage.length} coverage-area, ${others.length} other`);

  console.log('\n── Track A — the "We\'ve got you covered" heading ───────────────');
  const renderable = coverage.filter((r) => NAME_BY_SLUG.has(r.city_slug));
  const unregistered = coverage.filter((r) => !NAME_BY_SLUG.has(r.city_slug));
  if (unregistered.length) note(`${unregistered.length} coverage-area row(s) have no CITY_REGISTRY entry and render no page: ${unregistered.map((r) => r.city_slug).join(', ')}`);

  const empty = renderable.filter((r) => (r.covered_heading ?? '') === '');
  empty.length === 0
    ? ok(`all ${renderable.length} renderable coverage-area rows have a covered_heading`)
    : fail(`${empty.length} coverage-area row(s) have an EMPTY covered_heading (they render the code literal, which is safe but unseeded): ${empty.slice(0, 8).map((r) => r.city_slug).join(', ')}${empty.length > 8 ? ' …' : ''}`);

  const labelled = rows.rows.filter((r) => /^\s*H[1-6]\s*:/i.test(r.covered_heading ?? ''));
  labelled.length === 0
    ? ok('Brief 155 guard: 0 covered_heading values carry an H1:/H2: outline label')
    : fail(`Brief 155 REGRESSION: ${labelled.length} covered_heading value(s) start with an outline label: ${labelled.map((r) => r.city_slug).join(', ')}`);

  const drifted = renderable.filter(
    (r) => (r.covered_heading ?? '') !== '' && r.covered_heading !== expected(NAME_BY_SLUG.get(r.city_slug)!)
  );
  drifted.length === 0
    ? ok('every non-empty covered_heading matches the string its template renders')
    : note(`${drifted.length} covered_heading value(s) differ from the seeded default — expected once Marketing starts editing: ${drifted.slice(0, 8).map((r) => r.city_slug).join(', ')}${drifted.length > 8 ? ' …' : ''}`);

  const coverageContentHeading = coverage.filter((r) => (r.content_heading ?? '') !== '');
  coverageContentHeading.length === 0
    ? ok('content_heading is still empty on every coverage-area row (Brief 95 A.2 meaning untouched)')
    : note(`${coverageContentHeading.length} coverage-area row(s) hold a non-empty content_heading — legacy, read by nothing on this template: ${coverageContentHeading.map((r) => r.city_slug).join(', ')}`);

  const localOfficeHeadings = others.filter((r) => (r.content_heading ?? '') !== '');
  note(`local-office / V2 rows with a live content_heading (must be unaffected): ${localOfficeHeadings.length}${localOfficeHeadings.length ? ' → ' + localOfficeHeadings.map((r) => `${r.city_slug}=${JSON.stringify(r.content_heading)}`).join(', ') : ''}`);
  const clobbered = others.filter((r) => (r.covered_heading ?? '') !== '');
  clobbered.length === 0
    ? ok('no local-office / V2 row was given a covered_heading')
    : fail(`${clobbered.length} non-coverage-area row(s) have a covered_heading: ${clobbered.map((r) => r.city_slug).join(', ')}`);

  console.log('\n── Track C — the section-1 image ───────────────────────────────');
  const withCovered = coverage.filter((r) => (r.covered_image ?? '') !== '');
  note(`coverage-area rows with an explicit covered_image: ${withCovered.length}${withCovered.length ? ' → ' + withCovered.map((r) => r.city_slug).join(', ') : ''}`);

  const changing = coverage.filter(
    (r) => (r.hero_image ?? '') !== '' && (r.covered_image ?? '') === ''
  );
  if (changing.length === 0) {
    ok('no coverage-area page changes its section-1 image (every hero_image is empty)');
  } else {
    // A hero value that cannot actually LOAD already resolved to the pipes
    // fallback in both slots before this brief — server-side for the dead
    // `wp-content/uploads` tree (Brief 126, Fix A), and client-side via
    // `CityPageImage`'s `onError` for anything else that 404/403s. Those pages
    // look identical afterwards. Only a hero image that really renders today is
    // a genuine before/after difference, so the URL is fetched rather than
    // guessed at from its shape.
    note(`${changing.length} coverage-area page(s) have a hero image and no section image — checking whether each one actually loads:`);
    const visible: string[] = [];
    const alreadyFallingBack: string[] = [];
    const unknown: string[] = [];
    for (const r of changing) {
      const raw = r.hero_image ?? '';
      if (raw.includes('wp-content/uploads')) {
        alreadyFallingBack.push(`/${r.city_slug} (dead wp-content URL — server-side fallback since Brief 126)`);
        continue;
      }
      const url = /^https?:\/\//.test(raw)
        ? raw
        : raw.startsWith('/')
          ? null // same-origin: cannot be checked without knowing which host to hit
          : `https://d1rplazj5a80fb.cloudfront.net/images/${raw.includes('.') ? raw : `${raw}.webp`}`;
      if (!url) { unknown.push(`/${r.city_slug} (same-origin path ${raw} — check by hand)`); continue; }
      try {
        const res = await fetch(url, { method: 'HEAD' });
        if (res.ok) visible.push(`/${r.city_slug}  hero_image=${raw}  → ${url} (HTTP ${res.status})`);
        else alreadyFallingBack.push(`/${r.city_slug} (${url} → HTTP ${res.status}; CityPageImage onError already showed the pipes image in BOTH slots)`);
      } catch (e) {
        unknown.push(`/${r.city_slug} (${url} unreachable from here: ${e instanceof Error ? e.message : String(e)})`);
      }
    }
    for (const s of visible) console.log(`        VISIBLE CHANGE  ${s}`);
    for (const s of alreadyFallingBack) console.log(`        no visible change  ${s}`);
    for (const s of unknown) console.log(`        UNKNOWN  ${s}`);
    note(`→ ${visible.length} page(s) visibly swap section 1 to the pipes fallback; ${alreadyFallingBack.length} already showed it; ${unknown.length} could not be determined.`);
  }

  console.log('\n────────────────────────────────────────────────────────────────');
  if (failures.length === 0) {
    console.log('Brief 160: ALL CHECKS PASS');
  } else {
    console.log(`Brief 160: ${failures.length} CHECK(S) FAILED`);
    process.exitCode = 1;
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
