/**
 * Brief 221 (Track D2) — move the hard-coded review numbers on the City Hubs, their City Service V2
 * pages and Homepage 2026 onto the live-rating tokens (Track D1), so the visible numbers follow the
 * daily Mainline sync and always equal the `aggregateRating` in the page's JSON-LD.
 *
 *   City Hub (19)       reviews intro   "4.8 stars from 860+ Google reviews for our Evanston office."
 *                                     → "{{office_rating}} stars from {{office_review_count}} Google reviews for our Evanston office."
 *                       rating card     "4.8" → "{{office_rating}}"
 *                                       "860+ Google reviews for our Evanston office" → "{{office_review_count}} Google reviews for our Evanston office"
 *                       trust bar       "4.7 stars · 5,669+ Google reviews across all locations"
 *                                     → "{{company_rating}} stars · {{company_review_count}} Google reviews across all locations"
 *     The count is EXACT (no "+"), so the visible number is the schema number. Hanover Park and Highland
 *     Park showed the company-wide line ("4.7 / 5,669+ across all … locations"); they switch to their
 *     OWN office line like the others (Brief 216 open item 8).
 *   City Service V2 (551) reviews section's rating line (its intro slot)
 *                         "4.7 stars from 5,669+ Google reviews across all J. Blanton locations."
 *                       → "{{office_rating}} stars from {{office_review_count}} Google reviews for our {Office} office."
 *                       — the page emits its hub's office node, so its visible line must be that office's
 *                       rating, never the company's; rail trust item → the company tokens, as the hub.
 *   Homepage 2026       rating "4.7" → "{{company_rating}}", review count "5,669+" → "{{company_review_count}}"
 *                       (the trust bar and the review box already fill {rating} / {review_count} from them).
 *   Classic homepage    shows NO rating of its own (only the Elfsight widget, client-side) — nothing to
 *                       migrate, and so no aggregateRating on it either (schema without visible copy).
 *
 * Each changed field's previous text is kept in the content's `ratingFallbacks` (keyed by the token
 * text): a page renders it only while a token has no synced row — never a raw `{{…}}`, never "0".
 * (Homepage 2026's fallback is its registry default, which is the same 4.7 / 5,669+.)
 *
 * Per page, the Brief 216 / 219 pattern: the live content is patched, run through the editor's own
 * checks, saved as a NEW VERSION and PUBLISHED (the previous version stays in history and can be
 * restored). Guards (Brief 186 — editor state is reported, exit 0):
 *   - not a published City Hub / V2 row (or Homepage 2026 record) → left alone;
 *   - every field it replaces must still hold a pre-brief SHAPE (the numbers may have been updated by
 *     hand, the wording may not) or already the token text; anything else = edited in /admin since →
 *     the page is SKIPPED and listed (NOT-APPLIED (edited in admin)), nothing written for it;
 *   - all fields already tokenised → ALREADY-APPLIED;
 *   - every published page is read back.
 *
 * POST-SWAP ONLY (deploy.sh): the build being replaced doesn't know the tokens and would print them raw.
 *
 * `--changed-file <path>`: appends every city whose hub or service pages it published, so the CITY
 * PAGES LIVE CHECK expects their markup to change this deploy.
 * `--only <city>`: limit to one city (testing).
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-221-rating-tokens.ts          # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-221-rating-tokens.ts commit   # apply
 */
import { appendFileSync, existsSync, readFileSync } from 'fs';

if (!process.env.DATABASE_URL && existsSync('.env.local')) {
  const m = readFileSync('.env.local', 'utf8').match(/^DATABASE_URL=(.*)$/m);
  if (m) process.env.DATABASE_URL = m[1].trim();
}

/* eslint-disable import/first */
import pool from '../src/lib/db';
import { createDraft, publishDraft } from '../src/lib/cms/drafts';
import { conformCityHubContent } from '../src/lib/cms/city-hubs-write';
import { conformCityServiceV2Content } from '../src/lib/cms/city-services-v2-write';
import { CITY_HUB_TEMPLATE, type CityHubDraftContent, type CityHubStored } from '../src/lib/city-hub-cms/model';
import { CITY_SERVICE_V2_TEMPLATE, type CityServiceStored, type CityServiceV2DraftContent } from '../src/lib/city-service-v2-cms/model';
import { HOME_2026_PAGE_TYPE, HOME_2026_SLUG, HOME_2026_TEMPLATE } from '../src/lib/cms/home-2026-content';
import { getCity } from '../src/lib/content/cities';
import { authorId } from './lib/city-pages-seed';
import { announceMode, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'update-brief-221-rating-tokens';
const argv = process.argv.slice(2);
const mode = resolveRunMode(SCRIPT, argv);
const argAfter = (flag: string) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : null;
};
const changedFile = argAfter('--changed-file');
const only = argAfter('--only');

const LABEL = 'Live Google rating (Brief 221, 2026-10)';

// ── The token text ─────────────────────────────────────────────────────────────────────────────
export const OFFICE_INTRO = (office: string) => `{{office_rating}} stars from {{office_review_count}} Google reviews for our ${office} office.`;
export const OFFICE_RATING = '{{office_rating}}';
export const OFFICE_SUB = (office: string) => `{{office_review_count}} Google reviews for our ${office} office`;
export const COMPANY_TRUST = '{{company_rating}} stars · {{company_review_count}} Google reviews across all locations';

// ── The pre-brief shapes (numbers free, wording fixed) ──────────────────────────────────────────
const N = String.raw`\d\.\d`;
const C = String.raw`\d{1,3}(?:,\d{3})*\+?`;
const OLD_OFFICE_INTRO = new RegExp(`^${N} stars from ${C} Google reviews for our (.+) office\\.$`);
const OLD_COMPANY_INTRO = new RegExp(`^${N} stars from ${C} Google reviews across all (?:J\\. Blanton )?locations\\.$`);
const OLD_RATING = new RegExp(`^${N}$`);
const OLD_OFFICE_SUB = new RegExp(`^${C} Google reviews for our (.+) office$`);
const OLD_COMPANY_SUB = new RegExp(`^${C} Google reviews across all (?:J\\. Blanton )?locations$`);
const OLD_TRUST = new RegExp(`^${N} stars · ${C} Google reviews across all locations$`);

type Outcome = 'loaded' | 'already' | 'would-load' | 'edited' | 'not-applied' | 'failed';
interface Result {
  path: string;
  outcome: Outcome;
  detail: string;
}

async function nextLabel(pageType: string, slug: string): Promise<string> {
  const n = Number((await pool.query<{ n: string }>(`SELECT count(*) AS n FROM page_drafts WHERE page_type = $1 AND page_slug = $2`, [pageType, slug])).rows[0].n) + 1;
  return `Version ${n} — ${LABEL}`;
}

/**
 * One field: the token text it gets, or why the page must be skipped. `old` = the pre-brief shape(s).
 * Returns { value, fallback } — fallback is the previous text when it changed.
 */
function field(current: string, target: string, old: RegExp[]): { value: string; fallback?: string } | { edited: string } {
  if (current === target) return { value: target };
  if (old.some((re) => re.test(current))) return { value: target, fallback: current };
  return { edited: current };
}

/** "for our X office" in the hub's own copy, else the registry name (Hanover Park, Highland Park). */
function officeName(slug: string, hub: CityHubStored): string {
  return hub.reviews.intro.match(OLD_OFFICE_INTRO)?.[1] ?? hub.reviews.ratingSub.match(OLD_OFFICE_SUB)?.[1] ?? hub.reviews.intro.match(/for our (.+) office\.$/)?.[1] ?? getCity(slug)?.name ?? slug;
}

function patchHub(slug: string, hub: CityHubStored): { hub: CityHubStored; changed: string[] } | { edited: string } {
  const office = officeName(slug, hub);
  const out: CityHubStored = JSON.parse(JSON.stringify(hub));
  const fallbacks: Record<string, string> = { ...(hub.ratingFallbacks ?? {}) };
  const changed: string[] = [];
  const apply = (name: string, current: string, target: string, old: RegExp[], set: (v: string) => void): string | null => {
    const f = field(current, target, old);
    if ('edited' in f) return `${name} was edited in /admin since ("${f.edited}")`;
    set(f.value);
    if (f.fallback !== undefined) {
      fallbacks[f.value] = f.fallback;
      changed.push(name);
    }
    return null;
  };
  const errs = [
    apply('reviews intro', hub.reviews.intro, OFFICE_INTRO(office), [OLD_OFFICE_INTRO, OLD_COMPANY_INTRO], (v) => (out.reviews.intro = v)),
    apply('rating card', hub.reviews.rating, OFFICE_RATING, [OLD_RATING], (v) => (out.reviews.rating = v)),
    apply('rating caption', hub.reviews.ratingSub, OFFICE_SUB(office), [OLD_OFFICE_SUB, OLD_COMPANY_SUB], (v) => (out.reviews.ratingSub = v)),
  ].filter(Boolean);
  // The trust bar: the one company-rating item (by its shape, not its position); none = left alone.
  const ti = hub.trust.findIndex((t) => t === COMPANY_TRUST || OLD_TRUST.test(t));
  if (ti >= 0) apply('trust bar', hub.trust[ti], COMPANY_TRUST, [OLD_TRUST], (v) => (out.trust[ti] = v));
  else errs.push('no company rating item in the trust bar');
  if (errs.length) return { edited: errs.join('; ') };
  if (Object.keys(fallbacks).length) out.ratingFallbacks = fallbacks;
  return { hub: out, changed };
}

function patchService(page: CityServiceStored, office: string): { page: CityServiceStored; changed: string[] } | { edited: string } {
  const out: CityServiceStored = JSON.parse(JSON.stringify(page));
  const fallbacks: Record<string, string> = { ...(page.ratingFallbacks ?? {}) };
  const changed: string[] = [];
  const errs: string[] = [];
  const reviews = out.blocks.filter((b) => b.type === 'reviews');
  if (!reviews.length) errs.push('no reviews section (no intro slot for the office line) — STOP item');
  for (const b of reviews) {
    if (b.type !== 'reviews') continue;
    const f = field(b.rating, OFFICE_INTRO(office), [OLD_OFFICE_INTRO, OLD_COMPANY_INTRO]);
    if ('edited' in f) errs.push(`reviews rating line was edited in /admin since ("${f.edited}")`);
    else {
      b.rating = f.value;
      if (f.fallback !== undefined) {
        fallbacks[f.value] = f.fallback;
        changed.push('reviews rating line');
      }
    }
  }
  const ti = out.trust.findIndex((t) => t === COMPANY_TRUST || OLD_TRUST.test(t));
  if (ti >= 0) {
    if (out.trust[ti] !== COMPANY_TRUST) {
      fallbacks[COMPANY_TRUST] = out.trust[ti];
      out.trust[ti] = COMPANY_TRUST;
      changed.push('trust rail');
    }
  } else errs.push('no company rating item in the trust rail');
  if (errs.length) return { edited: errs.join('; ') };
  if (Object.keys(fallbacks).length) out.ratingFallbacks = fallbacks;
  return { page: out, changed };
}

async function hub(slug: string, by: number, apply: boolean): Promise<Result & { office: string | null }> {
  const path = `/${slug}`;
  const row = (
    await pool.query<{ status: string; template_type: string | null; hub: CityHubStored | null; mt: string | null; md: string | null }>(
      `SELECT status, template_type, hub_content AS hub, meta_title AS mt, meta_description AS md FROM city_pages WHERE city_slug = $1`,
      [slug]
    )
  ).rows[0];
  if (!row || row.template_type !== CITY_HUB_TEMPLATE || !row.hub || row.status !== 'published') {
    return { path, office: null, outcome: 'not-applied', detail: `not a published City Hub row with hub content (${row ? `${row.status}, ${row.template_type}` : 'no row'}) — left alone` };
  }
  const office = officeName(slug, row.hub);
  const p = patchHub(slug, row.hub);
  if ('edited' in p) return { path, office, outcome: 'edited', detail: p.edited };
  if (!p.changed.length) return { path, office, outcome: 'already', detail: 'already on the rating tokens' };
  const draft: CityHubDraftContent = { template: CITY_HUB_TEMPLATE, hub: p.hub, metaTitle: row.mt ?? '', metaDescription: row.md ?? '' };
  const clean = conformCityHubContent(slug, draft); // the editor's own checks — throws (422) on a problem
  if (!apply) return { path, office, outcome: 'would-load', detail: `would publish "${LABEL}" (${p.changed.join(', ')})` };
  const id = (await createDraft({ pageType: 'city', pageSlug: slug, label: await nextLabel('city', slug), content: clean, createdBy: by, templateType: CITY_HUB_TEMPLATE })).id;
  await publishDraft(id, by);
  const after = (await pool.query<{ hub: CityHubStored }>(`SELECT hub_content AS hub FROM city_pages WHERE city_slug = $1`, [slug])).rows[0]?.hub;
  if (after?.reviews.rating !== OFFICE_RATING || after.reviews.intro !== OFFICE_INTRO(office) || !after.trust.includes(COMPANY_TRUST) || !after.ratingFallbacks) {
    return { path, office, outcome: 'failed', detail: `published version #${id} but the live row does not read back with the tokens + fallbacks` };
  }
  return { path, office, outcome: 'loaded', detail: `published version #${id} (${p.changed.join(', ')})` };
}

async function service(city: string, svc: string, office: string, by: number, apply: boolean): Promise<Result> {
  const slug = `${city}/${svc}`;
  const path = `/${slug}`;
  const row = (
    await pool.query<{ status: string; v2: CityServiceStored | null; mt: string | null; md: string | null }>(
      `SELECT status, v2_content AS v2, meta_title AS mt, meta_description AS md FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`,
      [city, svc]
    )
  ).rows[0];
  if (!row || !row.v2 || row.status !== 'published') return { path, outcome: 'not-applied', detail: `not a published City Service V2 row (${row ? row.status : 'no row'}) — left alone` };
  const p = patchService(row.v2, office);
  if ('edited' in p) return { path, outcome: 'edited', detail: p.edited };
  if (!p.changed.length) return { path, outcome: 'already', detail: 'already on the rating tokens' };
  const draft: CityServiceV2DraftContent = { template: CITY_SERVICE_V2_TEMPLATE, page: p.page, metaTitle: row.mt ?? '', metaDescription: row.md ?? '' };
  const clean = conformCityServiceV2Content(slug, draft, row.v2);
  if (!apply) return { path, outcome: 'would-load', detail: `would publish "${LABEL}" (${p.changed.join(', ')})` };
  const id = (await createDraft({ pageType: 'city-service', pageSlug: slug, label: await nextLabel('city-service', slug), content: clean, createdBy: by, templateType: CITY_SERVICE_V2_TEMPLATE })).id;
  await publishDraft(id, by);
  const after = (await pool.query<{ v2: CityServiceStored }>(`SELECT v2_content AS v2 FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`, [city, svc])).rows[0]?.v2;
  const lines = (after?.blocks ?? []).flatMap((b) => (b.type === 'reviews' ? [b.rating] : []));
  if (!lines.length || lines.some((l) => l !== OFFICE_INTRO(office)) || !after?.trust.includes(COMPANY_TRUST) || !after.ratingFallbacks) {
    return { path, outcome: 'failed', detail: `published version #${id} but the live row does not read back with the tokens + fallbacks` };
  }
  return { path, outcome: 'loaded', detail: `published version #${id} (${p.changed.join(', ')})` };
}

const COMPANY_RATING = '{{company_rating}}';
const COMPANY_COUNT = '{{company_review_count}}';

async function home2026(by: number, apply: boolean): Promise<Result> {
  const path = '/ (Homepage 2026)';
  const row = (await pool.query<{ status: string; content: Record<string, unknown> | null }>(`SELECT status, content FROM main_pages WHERE slug = $1`, [HOME_2026_SLUG])).rows[0];
  if (!row || !row.content || row.status !== 'published') return { path, outcome: 'not-applied', detail: `no published Homepage 2026 record (${row ? row.status : 'no row'}) — left alone` };
  const c = row.content;
  const rating = String(c.rating ?? '').trim();
  const count = String(c.review_count ?? '').trim();
  const errs: string[] = [];
  if (rating !== COMPANY_RATING && !OLD_RATING.test(rating)) errs.push(`rating was edited in /admin since ("${rating}")`);
  if (count !== COMPANY_COUNT && !new RegExp(`^${C}$`).test(count)) errs.push(`review count was edited in /admin since ("${count}")`);
  if (errs.length) return { path, outcome: 'edited', detail: errs.join('; ') };
  if (rating === COMPANY_RATING && count === COMPANY_COUNT) return { path, outcome: 'already', detail: 'already on the rating tokens' };
  // The version content is the record's own content (the Brief 220 seed's shape) with the two fields swapped.
  const content = { ...c, template: HOME_2026_TEMPLATE, rating: COMPANY_RATING, review_count: COMPANY_COUNT };
  if (!apply) return { path, outcome: 'would-load', detail: `would publish "${LABEL}" (rating "${rating}" → ${COMPANY_RATING}, count "${count}" → ${COMPANY_COUNT})` };
  const id = (await createDraft({ pageType: HOME_2026_PAGE_TYPE, pageSlug: HOME_2026_SLUG, label: await nextLabel(HOME_2026_PAGE_TYPE, HOME_2026_SLUG), content, createdBy: by })).id;
  await publishDraft(id, by);
  const after = (await pool.query<{ content: Record<string, unknown> }>(`SELECT content FROM main_pages WHERE slug = $1`, [HOME_2026_SLUG])).rows[0]?.content;
  if (after?.rating !== COMPANY_RATING || after?.review_count !== COMPANY_COUNT) return { path, outcome: 'failed', detail: `published version #${id} but the record does not read back with the tokens` };
  return { path, outcome: 'loaded', detail: `published version #${id} (rating + review count → company tokens)` };
}

async function main() {
  announceMode(SCRIPT, mode);
  const apply = mode === 'commit';
  const by = await authorId();
  const results: Result[] = [];
  const touched = new Set<string>();

  const hubs = (await pool.query<{ s: string }>(`SELECT city_slug AS s FROM city_pages WHERE template_type = $1 AND hub_content IS NOT NULL ORDER BY city_slug`, [CITY_HUB_TEMPLATE])).rows
    .map((r) => r.s)
    .filter((s) => !only || s === only);
  for (const slug of hubs) {
    const h = await hub(slug, by, apply);
    results.push(h);
    if (h.outcome === 'loaded') touched.add(slug);
    // The service pages carry their hub's OFFICE line (the node they emit is the hub's office).
    const office = h.office ?? getCity(slug)?.name ?? slug;
    const services = (await pool.query<{ s: string }>(`SELECT service_slug AS s FROM city_service_pages WHERE city_slug = $1 AND v2_content IS NOT NULL ORDER BY service_slug`, [slug])).rows.map((r) => r.s);
    for (const s of services) {
      const r = await service(slug, s, office, by, apply);
      results.push(r);
      if (r.outcome === 'loaded') touched.add(slug);
    }
  }
  if (!only) results.push(await home2026(by, apply));

  const by_ = (o: Outcome) => results.filter((r) => r.outcome === o);
  for (const r of results.filter((x) => x.outcome !== 'loaded' && x.outcome !== 'would-load' && x.outcome !== 'already')) console.log(`  ${r.outcome.padEnd(11)} ${r.path} — ${r.detail}`);
  for (const r of results.filter((x) => x.path.split('/').length === 2 || x.path.startsWith('/ ('))) if (['loaded', 'would-load', 'already'].includes(r.outcome)) console.log(`  ${r.outcome.padEnd(11)} ${r.path} — ${r.detail}`);
  const svc = results.filter((x) => x.path.split('/').length === 3);
  console.log(`\n  service pages: ${svc.filter((r) => r.outcome === 'loaded').length} published, ${svc.filter((r) => r.outcome === 'would-load').length} would publish, ${svc.filter((r) => r.outcome === 'already').length} already, ${svc.filter((r) => r.outcome === 'edited').length} skipped (edited), ${svc.filter((r) => r.outcome === 'not-applied').length} not applicable`);

  if (changedFile && touched.size) appendFileSync(changedFile, [...touched].map((c) => `${c}\n`).join(''));
  const failed = by_('failed');
  const edited = by_('edited');
  if (failed.length) {
    console.error(`FAILED: ${failed.map((f) => f.path).join(', ')}`);
    process.exitCode = 1;
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `${failed.length} page(s) did not land`);
    return;
  }
  const tail = edited.length ? `; ${edited.length} skipped as edited in /admin: ${edited.map((e) => e.path).join(', ')}` : '';
  if (!apply) {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${by_('would-load').length} page(s) would change${tail}`);
    return;
  }
  if (edited.length && !by_('loaded').length) {
    verdict(SCRIPT, 'NOT-APPLIED (edited in admin)', `${edited.length} page(s) skipped${tail}`);
    return;
  }
  verdict(SCRIPT, by_('loaded').length ? 'APPLIED' : 'ALREADY-APPLIED', `${by_('loaded').length} page(s) published${tail}`);
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
