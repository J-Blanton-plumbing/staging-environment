/**
 * Brief 226 (Marketing 2026-11-10) — the overhead sewer pages show real overhead sewer reviews.
 *
 * The reviews on `/overhead-sewer-systems` and the 18 `/{city}/overhead-sewer-systems` City Service V2 pages
 * were general sewer reviews (camera inspections, backups, rodding). Each page gets 3 of Marketing's 4
 * overhead sewer reviews, in a FIXED order per page (the "random pick" was made once, in the brief, and is
 * stored in the data file — never a new pick per page load). City pages also get the H2
 * "Real Overhead Sewer System Reviews"; the main page keeps "Overhead Sewer System Reviews".
 *
 * Source: data/brief-226-overhead-reviews.json (review text word for word from Marketing's
 * Overhead_Sewer_Reviews_Replacement.md — the bank, the main page's set and the 18 city picks).
 *
 * Per page it PATCHES the live published content — only the review items (name, Google review link, text)
 * and, on city pages, the reviews H2. The eyebrow, the rating line (and its Brief 221 live tokens) and
 * everything else stay exactly as stored. Then the editor's own checks (`conformSewerV2Content` /
 * `conformCityServiceV2Content`), a NEW version "Version N — Overhead sewer reviews (2026-11)" and
 * `publishDraft` — the previous versions stay in history untouched.
 *
 * Guards (Brief 186: editor state is reported, exit 0):
 *   - the row must be published and hold v2 content, else NOT-APPLIED for that page;
 *   - the current reviewers must be exactly the brief's "remove" names (and the H2 the pre-brief one),
 *     else the page was edited in /admin since → SKIPPED, nothing written (Brief 226 "Patch, don't replace");
 *   - already carries the new reviews + H2 → ALREADY-APPLIED (every later deploy);
 *   - this brief's version already exists for the page but the live reviews differ → an editor changed or
 *     reverted them in /admin after this ran → SKIPPED, never re-applied;
 *   - after publishing, every saved quote, name, link and the H2 is read back and must equal the source.
 * Exit 1 only when a write did not land (code/schema fault).
 *
 * Main page quotes are stored WITH their quote marks (that is how the sewer v2 cards store them); the City
 * Service V2 card adds its own, so city quotes are stored without.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-226-overhead-reviews.ts          # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-226-overhead-reviews.ts commit   # apply
 *
 * deploy.sh runs it with `commit` BEFORE the Sewer v2 and City Pages snapshots, so the still-live build
 * already renders the new reviews when those snapshots are taken and both live checks stay byte-identical
 * across the swap (the build being replaced renders these fields from the row exactly as the new one does).
 */
import { existsSync, readFileSync } from 'fs';
import path from 'path';

if (!process.env.DATABASE_URL && existsSync('.env.local')) {
  const m = readFileSync('.env.local', 'utf8').match(/^DATABASE_URL=(.*)$/m);
  if (m) process.env.DATABASE_URL = m[1].trim();
}

/* eslint-disable import/first */
import pool from '../src/lib/db';
import { createDraft, publishDraft } from '../src/lib/cms/drafts';
import { conformSewerV2Content } from '../src/lib/cms/sewer-v2-write';
import { conformCityServiceV2Content } from '../src/lib/cms/city-services-v2-write';
import { SEWER_V2_TEMPLATE, type SewerV2DraftContent } from '../src/lib/sewer-v2-cms/model';
import { CITY_SERVICE_V2_TEMPLATE, type CityServiceStored, type CityServiceV2DraftContent } from '../src/lib/city-service-v2-cms/model';
import type { SewerServiceStored } from '../src/lib/content/sewer-v2/types';
import { authorId } from './lib/city-pages-seed';
import { announceMode, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'update-brief-226-overhead-reviews';
const argv = process.argv.slice(2);
const mode = resolveRunMode(SCRIPT, argv);

interface Review { name: string; url: string; text: string }
interface Data {
  versionLabel: string;
  service: string;
  cityH2: string;
  mainH2: string;
  bank: Record<string, Review>;
  main: { path: string; remove: string[]; reviews: string[] };
  cities: Array<{ city: string; remove: string[]; reviews: string[] }>;
}
const DATA_FILE = path.join(__dirname, '..', 'data', 'brief-226-overhead-reviews.json');
const DATA = JSON.parse(readFileSync(DATA_FILE, 'utf8')) as Data;
/** The reviews H2 every one of the 19 pages carried before this brief. */
const OLD_H2 = 'Overhead Sewer System Reviews';

type Outcome = 'loaded' | 'would-load' | 'already' | 'skipped' | 'not-applied' | 'failed';
interface Result { path: string; outcome: Outcome; detail: string }

const pick = (keys: string[]): Review[] =>
  keys.map((k) => {
    const r = DATA.bank[k];
    if (!r) throw new Error(`data file: no review "${k}" in the bank`);
    return r;
  });
const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n');

async function nextLabel(pageType: string, slug: string): Promise<string> {
  const n = Number((await pool.query<{ n: string }>(`SELECT count(*) AS n FROM page_drafts WHERE page_type = $1 AND page_slug = $2`, [pageType, slug])).rows[0].n) + 1;
  return `Version ${n} — ${DATA.versionLabel}`;
}

/**
 * This brief already published its version on this page once. If the live page no longer carries the new
 * reviews, an editor changed or REVERTED them in /admin since — that is their decision, never re-applied.
 */
async function appliedBefore(pageType: string, slug: string): Promise<number | null> {
  const r = await pool.query<{ id: number }>(
    `SELECT id FROM page_drafts WHERE page_type = $1 AND page_slug = $2 AND label LIKE $3 ORDER BY id LIMIT 1`,
    [pageType, slug, `Version % — ${DATA.versionLabel}`]
  );
  return r.rows[0]?.id ?? null;
}

// ── /overhead-sewer-systems (Sewer v2, sub_service_pages.v2_content) ─────────────────────────────────────

/** How the sewer v2 card stores a quote: inside straight double quotes. */
const sewerQuote = (text: string) => `"${text}"`;

function sewerReviews(v2: SewerServiceStored) {
  const sec = v2.sections.find((s) => s.kind === 'reviews');
  return sec && sec.kind === 'reviews' ? sec : null;
}

async function mainPage(by: number, apply: boolean): Promise<Result> {
  const slug = DATA.service;
  const p = DATA.main.path;
  const row = (
    await pool.query<{ status: string; v2: SewerServiceStored | null; mt: string | null; md: string | null }>(
      `SELECT status, v2_content AS v2, meta_title AS mt, meta_description AS md FROM sub_service_pages WHERE slug = $1`,
      [slug]
    )
  ).rows[0];
  if (!row || !row.v2 || row.status !== 'published') return { path: p, outcome: 'not-applied', detail: `not a published Sewer v2 row (${row ? row.status : 'no row'}) — left alone` };
  const want = pick(DATA.main.reviews);
  const sec = sewerReviews(row.v2);
  if (!sec) return { path: p, outcome: 'skipped', detail: 'no reviews section on the row — left alone' };
  const items = sec.items;
  const isNew = sec.heading === DATA.mainH2 && items.length === want.length && items.every((it, i) => it.name === want[i].name && it.href === want[i].url && it.quote === sewerQuote(want[i].text));
  if (isNew) return { path: p, outcome: 'already', detail: 'already carries the overhead sewer reviews, no change' };
  const prior = await appliedBefore('sub-service', slug);
  if (prior) return { path: p, outcome: 'skipped', detail: `this brief published version #${prior} here before and the reviews were changed in /admin since — left alone` };
  if (sec.heading !== OLD_H2 || !sameSet(items.map((x) => x.name), DATA.main.remove)) {
    return { path: p, outcome: 'skipped', detail: `reviews were edited in /admin since ("${sec.heading}": ${items.map((x) => x.name).join(', ')}) — left alone` };
  }
  const v2: SewerServiceStored = JSON.parse(JSON.stringify(row.v2));
  const target = sewerReviews(v2)!;
  target.heading = DATA.mainH2;
  target.items = want.map((r) => ({ quote: sewerQuote(r.text), name: r.name, href: r.url }));
  const draft: SewerV2DraftContent = { template: SEWER_V2_TEMPLATE, sewerV2: v2, metaTitle: row.mt ?? '', metaDescription: row.md ?? '' };
  conformSewerV2Content('sub-service', slug, draft); // the editor's own checks — throws (422) on a problem
  const names = want.map((r) => r.name).join(', ');
  if (!apply) return { path: p, outcome: 'would-load', detail: `would publish "${await nextLabel('sub-service', slug)}" (${names})` };
  const label = await nextLabel('sub-service', slug);
  const id = (await createDraft({ pageType: 'sub-service', pageSlug: slug, label, content: draft, createdBy: by, templateType: SEWER_V2_TEMPLATE })).id;
  await publishDraft(id, by);
  const after = (await pool.query<{ v2: SewerServiceStored }>(`SELECT v2_content AS v2 FROM sub_service_pages WHERE slug = $1`, [slug])).rows[0]?.v2;
  const got = after ? sewerReviews(after) : null;
  const bad: string[] = [];
  if (got?.heading !== DATA.mainH2) bad.push('H2');
  want.forEach((r, i) => {
    const s = got?.items[i];
    if (!s || s.name !== r.name || s.href !== r.url || s.quote !== sewerQuote(r.text)) bad.push(`review ${i + 1}`);
  });
  if ((got?.items.length ?? 0) !== want.length) bad.push('review count');
  if (bad.length) return { path: p, outcome: 'failed', detail: `published version #${id} but the live row differs from the source in: ${bad.join(', ')}` };
  return { path: p, outcome: 'loaded', detail: `published "${label}" #${id} (${names})` };
}

// ── /{city}/overhead-sewer-systems (City Service V2, city_service_pages.v2_content) ─────────────────────

function cityReviews(v2: CityServiceStored) {
  const b = v2.blocks.find((x) => x.type === 'reviews');
  return b && b.type === 'reviews' ? b : null;
}

async function cityPage(city: string, remove: string[], keys: string[], by: number, apply: boolean): Promise<Result> {
  const svc = DATA.service;
  const slug = `${city}/${svc}`;
  const p = `/${slug}`;
  const row = (
    await pool.query<{ status: string; v2: CityServiceStored | null; mt: string | null; md: string | null }>(
      `SELECT status, v2_content AS v2, meta_title AS mt, meta_description AS md FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`,
      [city, svc]
    )
  ).rows[0];
  if (!row || !row.v2 || row.status !== 'published') return { path: p, outcome: 'not-applied', detail: `not a published City Service V2 row (${row ? row.status : 'no row'}) — left alone` };
  const want = pick(keys);
  const b = cityReviews(row.v2);
  if (!b) return { path: p, outcome: 'skipped', detail: 'no reviews section on the row — left alone' };
  const isNew = b.h2 === DATA.cityH2 && b.reviews.length === want.length && b.reviews.every((r, i) => r.name === want[i].name && r.url === want[i].url && r.text === want[i].text);
  if (isNew) return { path: p, outcome: 'already', detail: 'already carries the overhead sewer reviews, no change' };
  const prior = await appliedBefore('city-service', slug);
  if (prior) return { path: p, outcome: 'skipped', detail: `this brief published version #${prior} here before and the reviews were changed in /admin since — left alone` };
  if (b.h2 !== OLD_H2 || !sameSet(b.reviews.map((r) => r.name), remove)) {
    return { path: p, outcome: 'skipped', detail: `reviews were edited in /admin since ("${b.h2}": ${b.reviews.map((r) => r.name).join(', ')}) — left alone` };
  }
  const v2: CityServiceStored = JSON.parse(JSON.stringify(row.v2));
  const target = cityReviews(v2)!;
  target.h2 = DATA.cityH2;
  target.reviews = want.map((r) => ({ name: r.name, url: r.url, text: r.text }));
  const draft: CityServiceV2DraftContent = { template: CITY_SERVICE_V2_TEMPLATE, page: v2, metaTitle: row.mt ?? '', metaDescription: row.md ?? '' };
  const clean = conformCityServiceV2Content(slug, draft, row.v2); // the editor's own checks — throws (422) on a problem
  const names = want.map((r) => r.name).join(', ');
  if (!apply) return { path: p, outcome: 'would-load', detail: `would publish "${await nextLabel('city-service', slug)}" (${names})` };
  const label = await nextLabel('city-service', slug);
  const id = (await createDraft({ pageType: 'city-service', pageSlug: slug, label, content: clean, createdBy: by, templateType: CITY_SERVICE_V2_TEMPLATE })).id;
  await publishDraft(id, by);
  const after = (await pool.query<{ v2: CityServiceStored }>(`SELECT v2_content AS v2 FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`, [city, svc])).rows[0]?.v2;
  const got = after ? cityReviews(after) : null;
  const bad: string[] = [];
  if (got?.h2 !== DATA.cityH2) bad.push('H2');
  if (got?.rating !== b.rating) bad.push('rating line');
  want.forEach((r, i) => {
    const s = got?.reviews[i];
    if (!s || s.name !== r.name || s.url !== r.url || s.text !== r.text) bad.push(`review ${i + 1}`);
  });
  if ((got?.reviews.length ?? 0) !== want.length) bad.push('review count');
  if (bad.length) return { path: p, outcome: 'failed', detail: `published version #${id} but the live row differs from the source in: ${bad.join(', ')}` };
  return { path: p, outcome: 'loaded', detail: `published "${label}" #${id} (${names})` };
}

async function guarded(p: string, f: () => Promise<Result>): Promise<Result> {
  try {
    return await f();
  } catch (e) {
    // The editor's own checks / publish guards refused the patched content (ValidationError 422,
    // ConflictError 409, NotFoundError 404 — src/lib/cms/errors.ts): reported per page, exit 1.
    const code = (e as { code?: unknown })?.code;
    if (code === '422' || code === '409' || code === '404') return { path: p, outcome: 'failed', detail: `refused (${code}): ${(e as Error).message}` };
    throw e;
  }
}

async function main() {
  announceMode(SCRIPT, mode);
  const apply = mode === 'commit';
  const by = await authorId();
  const results: Result[] = [];
  results.push(await guarded(DATA.main.path, () => mainPage(by, apply)));
  for (const c of DATA.cities) results.push(await guarded(`/${c.city}/${DATA.service}`, () => cityPage(c.city, c.remove, c.reviews, by, apply)));
  for (const r of results) console.log(`  ${r.path.padEnd(46)} ${r.outcome.toUpperCase().padEnd(11)} ${r.detail}`);

  const n = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  const tail = `${n('already')} already, ${n('skipped')} skipped (edited in /admin), ${n('not-applied')} left alone`;
  if (n('failed')) {
    console.error(`\n!!!! ${SCRIPT}: ${n('failed')} page(s) did not land: ${results.filter((r) => r.outcome === 'failed').map((r) => r.path).join(', ')}`);
    verdict(SCRIPT, 'FAILED', `${n('failed')} page(s) did not land`);
    process.exitCode = 1;
  } else if (!apply) verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${n('would-load')} would be published, ${tail}`);
  else if (n('loaded')) verdict(SCRIPT, 'APPLIED', `published ${n('loaded')}, ${tail}`);
  else if (n('skipped')) verdict(SCRIPT, 'NOT-APPLIED (edited in admin)', tail);
  else if (n('not-applied')) verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', tail);
  else verdict(SCRIPT, 'ALREADY-APPLIED', tail);
}

main()
  .catch((err) => {
    console.error(`\n!!!! ${SCRIPT} crashed:`, err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
