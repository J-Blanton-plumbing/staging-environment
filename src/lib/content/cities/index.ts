/**
 * City registry + office/area data — the single source the shared `[city]`
 * builder reads (brief-10 §3).
 *
 * `cityToOffice` + `cityToArea` are ported VERBATIM from `jb-blanton/page-city.php`
 * ($nap_map 55–232, $areas_map 235–402). Each office's city list is declared once
 * and reused for BOTH maps so a slug can't get an office without an area (or drift
 * between them). Cities outside the maps fall to the Ravenswood office + "North
 * and Northwest Side Chicago" — unless a CMS office claims them first, which is
 * Brief 178's rule and is checked BEFORE these maps (see `resolveOfficeSlug`).
 *
 * ⚠️ Two separate "Joliet" problems, BOTH now closed. The routing one was:
 * `getOfficeKey('joliet') === 'chicago-ravenswood'`, so the /joliet city page
 * showed the Ravenswood NAP and the Joliet OFFICE dispatched nobody — Brief 178
 * closed it by making the CMS office list win over these maps (see
 * `resolveOfficeSlug` below; the Joliet office's slug IS `joliet`, so it now
 * claims its own town). The other was a DATA bug — the `joliet` record in
 * `global_settings.offices` carried Ravenswood's street address, city, ZIP and
 * Google link — and Brief 171 (Track A1) FIXED it with Joliet's real address.
 * Do not read this paragraph as licence to restore the duplicate address.
 *
 * ⚠️ Brief 178: `cityToOffice` IS NO LONGER THE LAST WORD. It is step 3 of
 * `resolveOfficeSlug()`, consulted only when no CMS office claims the city by
 * slug or by town name. Editing a row here still works, but it is now the
 * FALLBACK — adding the office in /admin/global-settings is the supported way to
 * move a town, and it wins over anything written below.
 *
 * Brief 102 (Track C): the office ADDRESS DATA itself (street/city/state/zip,
 * Google Maps link, lat/lng) moved out of this file into the CMS
 * (`global_settings.offices`, see `CmsOffice` in `lib/cms/global-settings.ts`) —
 * marketing edits it from /admin/global-settings. This file keeps only the
 * routing: which office KEY a given city slug dispatches to. `getOffice()` now
 * takes the live CMS offices list and resolves the key against it.
 *
 * ⚠️ REGISTRY SCOPE DEVIATION (flagged): the brief calls for the FULL ~230-city
 * list from the canonical Sitemap Google Sheet. That sheet is an external
 * reference not available in this repo, so the registry below is built from the
 * ~147 cities the theme maps cover (every city with authoritative office/area
 * data). Cities that exist only on the Sheet (Oak Park, Tinley Park, Alsip, Blue
 * Island, the Chicago neighborhood pages, …) are NOT yet here — each is a
 * one-line `{ slug, name, type: 'coverage-area' }` add and auto-inherits the
 * Ravenswood/default office+area. See report + audit flag.
 */
import type {
  CityType,
  CoverageAreaContent,
  LocalOfficeContent,
  Office,
  RegistryEntry,
} from './types';
import type { CmsOffice } from '@/lib/cms/offices';
import { formatOfficeAddress } from '@/lib/cms/offices';
import { EVANSTON } from './evanston';
import { ELGIN } from './elgin';
import { ALGONQUIN } from './algonquin';
import { COLUMBUS } from './columbus';
import {
  OHIO_AREAS,
  OHIO_AREA_LABEL,
  OHIO_OFFICE_KEY,
  OHIO_SLUGS,
  OHIO_STATE,
  getOhioArea,
} from './ohio-areas';
import { getOhioTemplateContent } from './ohio-template-content';

/** The 12 distinct dispatch offices, keyed to match `CmsOffice.slug` (Brief 102).
 * Brief 154 adds `columbus` — the first OUT-OF-STATE office; every other key
 * here dispatches to an Illinois address. */
export type OfficeKey =
  | 'chicago-ravenswood'
  | 'mchenry'
  | 'elgin'
  | 'arlington-heights'
  | 'northbrook'
  | 'elmhurst'
  | 'hinsdale'
  | 'naperville'
  | 'evanston'
  | 'algonquin'
  | 'geneva'
  | 'chicago-lincoln-park'
  | 'columbus';

const DEFAULT_OFFICE: OfficeKey = 'chicago-ravenswood';
const DEFAULT_AREA = 'North and Northwest Side Chicago';

/* ── Each office's served cities (declared once, reused for both maps) ──────── */
const MCHENRY_CITIES = [
  'antioch', 'barrington-hills', 'belden', 'bull-valley', 'burtons-bridge', 'cary',
  'channel-lake', 'crystal-lake', 'ferndale', 'forest-lake', 'fox-lake', 'fox-lake-hills',
  'franklinville', 'grandwood-park', 'greenwood', 'hainesville', 'harmony', 'hartland',
  'hawthorn-woods', 'holiday-hills', 'huntley', 'ingleside', 'ingleside-shore', 'island-lake',
  'johnsburg', 'kildeer', 'lake-barrington', 'lake-catherine', 'lake-in-the-hills', 'lake-villa',
  'lake-zurich', 'lakemoor', 'lindenhurst', 'long-grove', 'long-lake', 'mccullom-lake',
  'mylith-park', 'oakwood-hills', 'old-mill-creek', 'pistakee-highlands', 'prairie-grove',
  'richmond', 'ridgefield', 'ringwood', 'round-lake', 'round-lake-beach', 'round-lake-heights',
  'round-lake-park', 'solon-mills', 'spring-grove', 'trout-valley',
  'venetian-village', 'village-of-lakewood', 'volo', 'wauconda', 'williams-park', 'wonder-lake',
  'woodstock',
];
// Brief 131 (Track A.2): `venetian-cillage` was a duplicate typo row — the live
// site 301s /venetian-cillage → /venetian-village, so serving both as 200s (and
// listing both in sitemap.ts) was a self-inflicted duplicate city page. Dropped
// here; the legacy redirect map emits /venetian-cillage[/{service}] →
// /venetian-village[/{service}] so all 46 live URLs are preserved.

const ELGIN_CITIES = [
  'bartlett', 'allens-corners', 'almora', 'alora-heights', 'burlington', 'campton-hills',
  'carol-stream', 'gilberts', 'hampshire', 'knoll-creek-west', 'lily-lake', 'new-lebanon',
  'pingree-grove', 'plato-center', 'south-elgin', 'st-charles', 'starks', 'west-highland-acre',
  'wildwood-valley', 'williamsburg-green',
];

const ARLINGTON_HEIGHTS_CITIES = [
  'bloomingdale', 'deer-park', 'elk-grove', 'hanover-park', 'hoffman-estates', 'inverness',
  'keeneyville', 'mount-prospect', 'palatine', 'prospect-heights', 'rolling-meadows', 'roselle',
  'schaumburg', 'wheeling',
];

const NORTHBROOK_CITIES = [
  'bannockburn', 'green-oaks', 'buffalo-grove', 'fort-sheridan', 'glencoe', 'gurnee', 'highwood',
  'highland-park', 'indian-creek', 'kenilworth', 'knollwood', 'lake-bluff', 'lake-forest',
  'libertyville', 'lincolnshire', 'mettawa', 'mundelein', 'north-chicago', 'northfield', 'rondout',
  'vernon-hills', 'waukegan', 'wells-corners', 'winnetka',
];

const HINSDALE_CITIES = [
  'burr-ridge', 'butterfield', 'clarendon-hills', 'darien', 'downers-grove', 'glen-ellyn',
  'la-grange', 'lombard', 'oak-brook', 'oakbrook-terrace', 'villa-park', 'westchester',
  'western-springs', 'westmont', 'york-center',
];

const NAPERVILLE_CITIES = [
  'aurora', 'bolingbrook', 'plainfield', 'romeoville', 'welco-corners', 'woodridge',
];

const EVANSTON_CITIES = ['morton-grove', 'skokie', 'wilmette'];

/* ── cityToOffice — every suburb → its dispatching office ($nap_map) ────────── */
const cityToOffice: Record<string, OfficeKey> = {};
const assignOffice = (office: OfficeKey, slugs: string[]) => {
  for (const slug of slugs) cityToOffice[slug] = office;
};
assignOffice('mchenry', ['mchenry', ...MCHENRY_CITIES]);
assignOffice('elgin', ['elgin', ...ELGIN_CITIES]);
assignOffice('arlington-heights', ['arlington-heights', ...ARLINGTON_HEIGHTS_CITIES]);
assignOffice('northbrook', ['northbrook', ...NORTHBROOK_CITIES]);
assignOffice('hinsdale', ['hinsdale', ...HINSDALE_CITIES]);
assignOffice('naperville', ['naperville', ...NAPERVILLE_CITIES]);
assignOffice('evanston', ['evanston', ...EVANSTON_CITIES]);
assignOffice('algonquin', ['algonquin']);
assignOffice('geneva', ['geneva']);
assignOffice('chicago-lincoln-park', ['chicago-lincoln-park']);
// Brief 108 (Group A): Elmhurst is its own service-center office (see
// global_settings.offices) but was never in the theme's $nap_map, so it had no
// registry entry and `/elmhurst` 404'd from the shared footer. Map it to its own
// office key so its NAP block resolves to the Elmhurst address. Northbrook is
// already mapped above (it's a NORTHBROOK_CITIES host); it only needed removing
// from PENDING_LOCAL_OFFICE below.
assignOffice('elmhurst', ['elmhurst']);
// Brief 154 (Track A): Columbus, OH — the first out-of-state office. Its own
// office key, dispatching to its own address (never the Ravenswood default).
//
// Columbus Integration Brief 02 (Track A3): the full Central Ohio coverage list
// dispatches to that same office — it is the only Ohio office, so "nearest
// office" is Columbus for all 138 areas. `OHIO_SLUGS` includes `columbus`
// itself, which is already assigned above; `assignOffice` is a plain overwrite,
// so listing it twice is idempotent and keeps this call the single place the
// Ohio set is wired.
assignOffice(OHIO_OFFICE_KEY as OfficeKey, [...OHIO_SLUGS]);
/**
 * Brief 131 (Track A.1) — the 21 cities Brief 130 found as live URLs with no
 * registry entry: the 20 unmapped flat `/{city}-il-sewer-rodding` sources
 * (report §5) plus Willowbrook / Deerfield / Harwood Heights from the
 * `/sewer-service/` geo set (report §7). Deerfield is in both lists, so the
 * brief's "23" dedupes to 22; `rodgers-park` is then aliased rather than
 * registered (see below), leaving 21 here.
 *
 * They are declared with the BARE live slug (`bucktown`, not `chicago-bucktown`)
 * even for the Chicago neighbourhoods, unlike the brief-50 import below. That is
 * deliberate: live serves these as bare top-level slugs (`/bucktown` 301s to
 * `/bucktown-il-sewer-rodding`), so the bare form is the URL that must 200 at
 * cutover. Registering them here does that AND makes the flat `-il-` sources
 * resolve to `/{city}/sewer-rodding` with no generator change.
 *
 * ⚠️ NOT registered: `rodgers-park`. It is a MISSPELLING of Rogers Park, which is
 * already here as `chicago-rogers-park` — registering both would serve two 200
 * city pages (and two sitemap rows) for one neighbourhood, the exact duplicate
 * `venetian-cillage` was dropped for. It is handled as a redirect instead:
 * CITY_ALIASES sends `/rodgers-park-il-sewer-rodding` →
 * `/chicago-rogers-park/sewer-rodding`, and EXTRA_REDIRECTS sends the bare
 * `/rodgers-park` → `/chicago-rogers-park` (both in
 * scripts/build-legacy-redirect-map.ts).
 *
 * No office/area assignment beyond this line, so each falls to the default
 * Ravenswood office + "North and Northwest Side Chicago" area — the same
 * treatment the brief-50 import cities get.
 */
assignOffice('chicago-ravenswood', [
  'bucktown', 'buena-park', 'deerfield', 'gold-coast', 'grayslake', 'harwood-heights',
  'hyde-park', 'lake-view-east', 'north-barrington', 'north-halsted', 'old-town',
  'river-grove', 'riverwoods', 'sauganash', 'sheridan-park', 'third-lake',
  'tower-lakes', 'wadsworth', 'west-lakeview', 'willowbrook', 'wrigleyville',
]);
// ── Cities imported from WordPress XML export (brief-50, Track C) ──────────
assignOffice('chicago-ravenswood', ['alsip', 'arbury-hills', 'blue-island', 'bonnie-brae', 'chicago', 'chicago-albany-park', 'chicago-andersonville', 'chicago-austin', 'chicago-avondale', 'chicago-belmont-cragin', 'chicago-dunning', 'chicago-edgewater', 'chicago-edison-park', 'chicago-forest-glen', 'chicago-heights', 'chicago-hermosa', 'chicago-humboldt-park', 'chicago-irving-park', 'chicago-jefferson-park', 'chicago-lake-view', 'chicago-lincoln-square', 'chicago-logan-square', 'chicago-montclare', 'chicago-north-center', 'chicago-north-park', 'chicago-norwood-park', 'chicago-ohare', 'chicago-portage-park', 'chicago-ravenswood', 'chicago-rogers-park', 'chicago-uptown', 'chicago-west-ridge', 'chicago-west-town', 'country-club-hills', 'crest-hill', 'des-plaines', 'fairmont', 'flossmoor', 'forest-park', 'frankfort', 'frankfort-square', 'glenview', 'golf', 'harvey', 'homer-glen', 'homewood', 'ingalls-park', 'joliet', 'lemont', 'lincolnwood', 'lockport', 'lockport-heights', 'manhattan', 'markham', 'matteson', 'midlothian', 'mokena', 'new-lenox', 'niles', 'norridge', 'oak-forest', 'oak-park', 'orland-park', 'palos-heights', 'palos-hills', 'park-forest', 'park-ridge', 'preston-heights', 'river-forest', 'riverside', 'rockdale', 'roseland', 'rosemont', 'schiller-park', 'south-holland', 'tinley-park']);

/* ── cityToArea — every suburb → its region label ($areas_map) ──────────────── */
const cityToArea: Record<string, string> = {};
const assignArea = (area: string, slugs: string[]) => {
  for (const slug of slugs) cityToArea[slug] = area;
};
assignArea('Northwest Suburban Chicago', [
  'mchenry', ...MCHENRY_CITIES,
  'elgin', ...ELGIN_CITIES,
  'arlington-heights', ...ARLINGTON_HEIGHTS_CITIES,
  'algonquin',
]);
assignArea('Northern Suburban Chicago', ['northbrook', ...NORTHBROOK_CITIES]);
assignArea('Western Suburbs', ['hinsdale', ...HINSDALE_CITIES]);
// Brief 108 (Group A): Elmhurst (DuPage County) sits with the other western
// suburbs — same region label as the Hinsdale-office group above.
assignArea('Western Suburbs', ['elmhurst']);
assignArea('Western Suburban Chicago', ['naperville', ...NAPERVILLE_CITIES, 'geneva']);
assignArea('North Shore Chicagoland', ['evanston', ...EVANSTON_CITIES]);
// Brief 154 (Track A): PLACEHOLDER — every other area label is a Chicagoland
// region, so there is no existing convention to copy for an Ohio office.
// Flagged in the Brief 154 report for Marketing to confirm or replace.
//
// Columbus Integration Brief 02: the whole Ohio set shares that one label. Same
// idempotency note as the office assignment above.
assignArea(OHIO_AREA_LABEL, [...OHIO_SLUGS]);
// NB: 'chicago-lincoln-park' is in $nap_map but NOT $areas_map → it falls to the
// default area, exactly as live. Don't add it here.

/* ── Resolvers ──────────────────────────────────────────────────────────────── */

/**
 * Brief 178 (Track A1) — the slug form used to compare an office's `city` field
 * against a registry slug.
 *
 * Lowercase, accents stripped (NFD + drop the combining range), every run of
 * non-alphanumerics collapsed to one hyphen, hyphens trimmed off both ends. That
 * is the same shape the registry's own slugs take, so "Tinley Park" → `tinley-park`
 * and "St. Charles" → `st-charles`.
 *
 * Deliberately separate from `displayName()`'s inverse mapping: this one has to
 * survive whatever a human typed into /admin/global-settings, including trailing
 * spaces, a stray comma, or a state suffix.
 *
 * Exported for `scripts/check-brief-178-office-city-match.ts` and nothing else.
 * A guard rail that re-implements the rule it is guarding can only ever report
 * on its own copy of it, so the checker borrows this one.
 */
export function officeCitySlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The two lookups `resolveOfficeSlug` needs, built in ONE pass over the office
 * array.
 *
 * Exists so the resolver and `resolveOfficeOverrides()` (which answers the same
 * question for all ~386 registry cities at once) cannot drift apart: there is one
 * implementation of "which office claims which city", used twice.
 *
 * ⚠️ Built per call, never cached at module scope. `offices` is the LIVE CMS
 * array and changes between requests — a module-level memo would serve one
 * visitor's answer to the next. Hard rule 2.
 */
interface OfficeClaims {
  /** trimmed `slug` → the office's RAW `slug`, first record wins. */
  bySlug: Map<string, string>;
  /** slugified `city` → the office's RAW slug, or `null` when two or more offices claim it. */
  byCity: Map<string, string | null>;
}

function buildOfficeClaims(offices: CmsOffice[]): OfficeClaims {
  const bySlug = new Map<string, string>();
  const byCity = new Map<string, string | null>();
  if (!Array.isArray(offices)) return { bySlug, byCity };

  for (const office of offices) {
    /* `offices` is JSONB straight out of the CMS: a record can be missing a
       field, or hold a number where a string belongs. Nothing in here may throw
       (Hard rule 2), so every read is typeof-guarded and a bad record is simply
       skipped rather than matched against ''. */
    if (!office || typeof office !== 'object') continue;

    const rawSlug = typeof office.slug === 'string' ? office.slug : '';
    const trimmedSlug = rawSlug.trim();
    /* First record wins — a duplicate slug is two records naming the SAME
       office, so taking the earlier one is deterministic and loses nothing. */
    if (trimmedSlug && !bySlug.has(trimmedSlug)) bySlug.set(trimmedSlug, rawSlug);

    const cityKey = typeof office.city === 'string' ? officeCitySlug(office.city) : '';
    if (!cityKey) continue;
    /*
     * A SECOND office in the same town makes the name match ambiguous, and the
     * tie is recorded as `null` rather than resolved by array position.
     *
     * ── Deviation from the brief, deliberate, flagged in the Brief 178 report ──
     * Track A1 says "take the earlier one in the array". Hard rule 2 says a
     * duplicate "must degrade to today's behavior". They disagree exactly once,
     * on the live data: Chicago Lincoln Park and Chicago Ravenswood both carry
     * `city: "Chicago"`, and `chicago` is a registry city of its own. Taking the
     * earlier record would move /chicago's NAP address off Ravenswood — a page
     * nobody asked this brief to touch — and would move it AGAIN the next time
     * somebody drags rows in /admin/global-settings, which is the exact coupling
     * Track C1 set out to remove. So an ambiguous town keeps today's answer and
     * `check:brief-178` reports the tie.
     *
     * Both Chicago offices still claim their OWN registry city by exact slug at
     * step 1; it is only the third slug, bare `chicago`, that nobody can claim.
     */
    if (byCity.has(cityKey)) byCity.set(cityKey, null);
    else byCity.set(cityKey, rawSlug);
  }

  return { bySlug, byCity };
}

/**
 * Brief 178 (Track A1) — which office serves `citySlug`, according to the LIVE
 * CMS office list first and the hardcoded map only as a fallback.
 *
 * Marketing's ask was that adding an office in /admin/global-settings — and
 * nothing else — routes that town to it. Three offices (Tinley Park, Mokena,
 * Hanover Park) had been added and the site was still dispatching those towns to
 * Ravenswood and Arlington Heights, up to 35 miles away.
 *
 * ─── Resolution order. Three steps, never merged ───────────────────────────
 *   1. An office whose `slug` IS `citySlug`. The expected path — Marketing names
 *      office slugs after the town.
 *   2. An office whose `city` field slugifies to `citySlug`. The safety net for a
 *      slug saved as `tinley-park-il`, `tinleypark` or — as actually happened —
 *      `/hanover-park` with a leading slash.
 *   3. `cityToOffice[citySlug] ?? DEFAULT_OFFICE`, i.e. exactly today's answer.
 *
 * Returns the office's RAW `slug` string, so `offices.find(o => o.slug === key)`
 * still finds the record even when that slug has stray whitespace or a leading
 * slash. It is therefore a `string`, not an `OfficeKey`: a CMS slug can be
 * anything a human typed.
 *
 * ─── What this rule does NOT do ────────────────────────────────────────────
 * NEIGHBOURING TOWNS ARE UNAFFECTED. Orland Park, Frankfort and New Lenox still
 * dispatch to Chicago Ravenswood even though the new Tinley Park office is far
 * nearer, because nothing in the data says which towns an office serves. That is
 * a deliberate scope line, not an oversight: moving neighbours needs a "cities
 * this office serves" field in Global Settings, which Marketing deferred to a
 * later brief.
 *
 * Distance-based assignment is NOT the missing piece and should not be
 * attempted. Registry cities carry no coordinates at all, and the Brief 171
 * report measured nine offices whose stored `lat`/`lng` disagree with their own
 * Google Business Profile by up to 4.3 km — so a nearest-office calculation
 * would be built on numbers that are already known to be wrong.
 *
 * ─── Never throws ──────────────────────────────────────────────────────────
 * Every call reads live CMS data at request time. An office with a slug that
 * matches nothing, a blank or non-string `city`, a duplicate record, or a
 * missing field degrades to step 3 — today's behaviour — rather than 500ing a
 * page. Same reasoning as `orderLocatorOffices()` in `lib/content/locator.ts`.
 *
 * Pure function of its two arguments. No module-level cache: `offices` changes
 * between requests.
 */
export function resolveOfficeSlug(citySlug: string, offices: CmsOffice[]): string {
  const fallback = cityToOffice[citySlug] ?? DEFAULT_OFFICE;
  const want = typeof citySlug === 'string' ? citySlug.trim() : '';
  if (!want) return fallback;

  const { bySlug, byCity } = buildOfficeClaims(offices);

  // 1 — exact slug.
  const bySlugHit = bySlug.get(want);
  if (bySlugHit !== undefined) return bySlugHit;

  // 2 — normalized city name. `null` means two offices claim it; see buildOfficeClaims.
  const byCityHit = byCity.get(want);
  if (byCityHit) return byCityHit;

  // 3 — the hardcoded map, unchanged.
  return fallback;
}

/**
 * Every registry city whose CMS answer differs from the static map, as
 * `{ [citySlug]: officeSlug }`.
 *
 * Brief 178 (Track B2): the store locator's search index is GENERATED from
 * `getOfficeKey()` — the static map — because the generator runs in Node with no
 * database. This is the overrides-only diff that sits on top of it at request
 * time, computed by `StoreLocator.tsx` (a server component, which has the live
 * offices) and handed to the client panel as a prop. Deliberately a handful of
 * entries rather than a regenerated 386-row index: it keeps the payload tiny and
 * puts the override where a reviewer can see it, in the props, instead of hiding
 * it in a generated file.
 *
 * Builds the claim lookups ONCE and reuses them across the registry, so this is
 * O(offices + cities) rather than a `resolveOfficeSlug` call per city.
 */
export function resolveOfficeOverrides(offices: CmsOffice[]): Record<string, string> {
  const { bySlug, byCity } = buildOfficeClaims(offices);
  const out: Record<string, string> = {};
  for (const entry of CITY_REGISTRY) {
    const resolved = bySlug.get(entry.slug) ?? byCity.get(entry.slug) ?? null;
    if (resolved && resolved !== getOfficeKey(entry.slug)) out[entry.slug] = resolved;
  }
  return out;
}

/**
 * Resolve a city slug to its dispatching office's NAP data. `offices` is the
 * live CMS list (`getGlobalSettingsCached().offices`) — callers already have it
 * in scope wherever they render a NAP block, so this stays a plain sync lookup
 * rather than reaching into the DB itself.
 *
 * Brief 178 (Track A2): resolves through `resolveOfficeSlug`, so an office added
 * in /admin/global-settings claims its own town's NAP address with no code
 * change. This one line is what fixes the address on both the `/{city}` pages
 * and the ~11,000 `/{city}/{service}` pages.
 */
export function getOffice(slug: string, offices: CmsOffice[]): Office {
  const key = resolveOfficeSlug(slug, offices);
  const office = offices.find((o) => o.slug === key);
  if (!office) return { url: '', address: '' };
  return { url: office.mapUrl, address: formatOfficeAddress(office) };
}
export function getArea(slug: string): string {
  return cityToArea[slug] ?? DEFAULT_AREA;
}

/**
 * The dispatching office KEY for a city slug, from the STATIC map only.
 *
 * ⚠️ IT IGNORES THE CMS. Since Brief 178 the live answer can differ — an office
 * added in /admin/global-settings claims its own town — so this returns the
 * pre-Brief-178 default and is only correct where the CMS is genuinely
 * unreachable. That is exactly one place: `scripts/build-locator-index.ts`,
 * which runs in Node with no database and emits the fallback index the store
 * locator ships to the browser.
 *
 * In a component or a route, use `getOfficeKeyFor(slug, offices)` instead. A page
 * that names "Arlington Heights" above a Hanover Park address is worse than
 * either error on its own.
 *
 * Columbus Integration Brief 02 (Track B) needs the office's NAME ("Columbus")
 * to label the "nearest office" fact, and `getOffice()` returns only the
 * URL + formatted address. Exposing the key rather than widening `Office` keeps
 * that type — used in a dozen render paths — unchanged.
 */
export function getOfficeKey(slug: string): OfficeKey {
  return cityToOffice[slug] ?? DEFAULT_OFFICE;
}

/**
 * Brief 178 (Track A2) — the CMS-aware counterpart of `getOfficeKey`, for every
 * caller that HAS the live office array.
 *
 * Same answer as `resolveOfficeSlug` (it is a one-line delegation, not a second
 * implementation); the separate name exists so a call site reads as the
 * replacement for the `getOfficeKey` it is swapping out. Returns `string` rather
 * than `OfficeKey` because a CMS slug is whatever a human typed.
 */
export function getOfficeKeyFor(slug: string, offices: CmsOffice[]): string {
  return resolveOfficeSlug(slug, offices);
}

/* ── Display names (overrides + smart title-case) ───────────────────────────── */
const NAME_OVERRIDES: Record<string, string> = {
  mchenry: 'McHenry',
  'st-charles': 'St. Charles',
  'chicago-lincoln-park': 'Lincoln Park',
  /*
   * Columbus Integration Brief 02: every Ohio area carries its supplied display
   * name explicitly rather than letting `displayName()` reverse-engineer it from
   * the slug. The mechanical title-case is wrong for several of them —
   * `woodstock-oh` → "Woodstock Oh", `columbus-fifth-by-northwest` → "Columbus
   * Fifth By Northwest", `columbus-king-lincoln-bronzeville` loses its hyphen —
   * and these names are what the H1, `<title>` and city grids render.
   */
  ...Object.fromEntries(OHIO_AREAS.map((a) => [a.slug, a.name])),
};
const SMALL_WORDS = new Set(['in', 'the', 'of', 'and', 'on', 'at']);
function displayName(slug: string): string {
  if (NAME_OVERRIDES[slug]) return NAME_OVERRIDES[slug];
  return slug
    .split('-')
    .map((w, i) => (SMALL_WORDS.has(w) && i > 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/* ── Page-type assignment ───────────────────────────────────────────────────── */
/** Office host cities (factual `hasOffice: true`). */
const OFFICE_HOSTS = new Set<string>([
  'mchenry', 'elgin', 'arlington-heights', 'northbrook', 'elmhurst', 'hinsdale', 'naperville', 'evanston',
  'algonquin', 'geneva', 'chicago-lincoln-park', 'columbus',
]);

/**
 * Local Office cities currently BUILT (have a copy file + the video-hero data).
 *
 * Brief 108 (Group A): Northbrook + Elmhurst are office locations shown in the
 * shared footer, so their `/{slug}` links must resolve site-wide. They don't yet
 * have a dedicated Local Office copy file or a DB `city_pages` row, so rather than
 * 404 them (the bug) or mark them `local-office-v2` (which `notFound()`s without a
 * DB row), they render as Coverage-Area office-host pages — the same working
 * template the other office hosts without a copy file use (Arlington Heights,
 * Hinsdale, Naperville, …). Northbrook auto-generates its coverage entry from the
 * `cityToOffice`/`cityToArea` maps; Elmhurst gains its own office key above. When
 * the Local Office copy drop lands, add a `local-office`/`-v2` entry + copy file.
 */
const BUILT_LOCAL_OFFICE: RegistryEntry[] = [
  { slug: 'evanston', name: 'Evanston', type: 'local-office', hasOffice: true },
];

/**
 * Brief 67 — Local Office City V2 cities. Registry `type` is `'local-office'`;
 * the actual V2 rendering is driven by the DB `template_type = 'local-office-v2'`
 * column (see `[city]/page.tsx`). They keep their `CoverageAreaContent` files
 * (used for metadata + the static hero-image fallback) — the DB row carries the
 * V2 body content. Remaining 12 V2 cities land in Brief 68 (data-only).
 */
const LOCAL_OFFICE_V2: RegistryEntry[] = [
  { slug: 'algonquin', name: 'Algonquin', type: 'local-office', hasOffice: true },
  { slug: 'elgin', name: 'Elgin', type: 'local-office', hasOffice: true },
];
/**
 * Local Office slugs not yet built — kept OUT of the registry for now (flagged).
 * Brief 108 (Group A): Northbrook removed — it now renders as a Coverage-Area
 * office-host page so its shared-footer link resolves (see BUILT_LOCAL_OFFICE).
 */
const PENDING_LOCAL_OFFICE = new Set<string>([]);

/* ── The registry (drives generateStaticParams + the §10 grid) ──────────────── */
const localOfficeSlugs = new Set(
  [...BUILT_LOCAL_OFFICE, ...LOCAL_OFFICE_V2].map((c) => c.slug),
);

/**
 * Brief 154: Columbus, OH is deliberately rendered as `coverage-area` — Marketing
 * decided the video-hero Local Office template doesn't suit dummy content (it
 * requires a hero video that doesn't exist yet), so Columbus instead follows the
 * SAME auto-generated "office host" path Arlington Heights, Hinsdale, Naperville,
 * Geneva, and Chicago-Lincoln-Park use for the registry TYPE — but unlike those,
 * it DOES have a dedicated copy file (`./columbus.ts`, a dummy Elgin clone; see
 * `COVERAGE_CONTENT` below), so the prose sections render instead of hiding.
 * Revisit when real Columbus content exists — it may stay `coverage-area` for
 * good, or move to `local-office`; either is a small, contained change.
 */
/**
 * Columbus Integration Brief 02 (Track A3 hard rule): EVERY Ohio registry entry
 * gets `state: 'Ohio'`; every Illinois city leaves `state` UNSET so its
 * map-embed URL and `<title>` stay byte-identical. That is why this is an
 * override map keyed by slug rather than a field with an `'Illinois'` default —
 * an explicit Illinois value would change ~249 existing embeds.
 */
const STATE_OVERRIDES: Record<string, string> = Object.fromEntries(
  OHIO_SLUGS.map((slug) => [slug, OHIO_STATE])
);

const coverageEntries: RegistryEntry[] = Object.keys(cityToOffice)
  .filter((slug) => !localOfficeSlugs.has(slug) && !PENDING_LOCAL_OFFICE.has(slug))
  .map((slug) => ({
    slug,
    name: displayName(slug),
    type: 'coverage-area' as CityType,
    /*
     * Columbus Integration Brief 02 (Track A3): `hasOffice: false` on every Ohio
     * area except Columbus itself, per Marketing. `OFFICE_HOSTS` already contains
     * exactly `columbus` and no other Ohio slug, so this needs no Ohio special
     * case — the 137 new areas dispatch to the Columbus office without claiming
     * to host one.
     */
    hasOffice: OFFICE_HOSTS.has(slug),
    state: STATE_OVERRIDES[slug],
    /*
     * Brief 02 Track B. Undefined for every Illinois city (`getOhioArea` misses),
     * so no Illinois page renders a county. Brief 03 groups
     * `/locations/central-ohio` by this field.
     */
    county: getOhioArea(slug)?.county,
  }));

/** All city pages, sorted A→Z by display name (the order the live §10 grid uses). */
export const CITY_REGISTRY: RegistryEntry[] = [
  ...coverageEntries,
  ...BUILT_LOCAL_OFFICE,
  ...LOCAL_OFFICE_V2,
].sort((a, b) => a.name.localeCompare(b.name));

const BY_SLUG = new Map(CITY_REGISTRY.map((c) => [c.slug, c]));

/* ── Per-city copy lookups ──────────────────────────────────────────────────── */
const COVERAGE_CONTENT: Record<string, CoverageAreaContent> = {
  algonquin: ALGONQUIN,
  elgin: ELGIN,
  // Brief 154: dummy copy (Elgin clone, name/state substituted) — see columbus.ts.
  columbus: COLUMBUS,
};
const LOCAL_OFFICE_CONTENT: Record<string, LocalOfficeContent> = {
  evanston: EVANSTON,
};

export function getCity(slug: string): RegistryEntry | undefined {
  return BY_SLUG.get(slug);
}
export function getCoverageContent(slug: string): CoverageAreaContent | undefined {
  /*
   * Columbus Integration Brief 02: an Ohio area with no hand-written copy file
   * falls back to the name-swapped TEMPLATE copy, which is this brief's declared
   * shipping state ("the current template with the city name substituted").
   *
   * Without this the two prose blocks hide and the 137 new pages render heading
   * chrome with no body — which is what the ~240 copy-less Illinois cities do,
   * but is not what the brief asked for.
   *
   * Order matters: the explicit map wins, so `columbus` keeps `./columbus.ts`
   * and no hand-written file can ever be shadowed by the template. Illinois
   * slugs miss both and return undefined exactly as before.
   */
  return COVERAGE_CONTENT[slug] ?? getOhioTemplateContent(slug);
}
export function getLocalOfficeContent(slug: string): LocalOfficeContent | undefined {
  return LOCAL_OFFICE_CONTENT[slug];
}
/**
 * Brief 179 (Track A.1): the shared fallback that makes this map's one-entry-ness
 * harmless. `getLocalOfficeContent(slug) ?? buildLocalOfficeFallback(entry,
 * settings)` is always defined, so the `[city]` builder's `local-office` branch
 * can always return instead of falling through to Coverage Area. Re-exported here
 * so callers import both halves of the rule from the same module.
 */
export { buildLocalOfficeFallback } from './local-office-defaults';
/**
 * Which region's city list the §10 locations grid should show.
 *
 * Columbus Integration Brief 02: before this, the grid rendered the ENTIRE
 * registry, so registering 137 Ohio areas would have added 137 links to the
 * bottom of every Illinois city page and every Illinois city-service page — a
 * modification of ~11,400 existing Illinois pages, which the brief's hard rules
 * forbid, and an Ohio page would have listed 249 Illinois towns under "some
 * areas we serve".
 */
export type CityGridRegion = 'chicagoland' | 'ohio';

/**
 * The A→Z city list for the §10 locations grid, scoped to one region.
 *
 * `'chicagoland'` (the default, so every existing call site is unchanged) is
 * every non-Ohio city PLUS `columbus` itself. Including Columbus is deliberate:
 * Brief 154 put it in this grid and it has shipped there since, so excluding it
 * would be an unrequested change to every Illinois page. Only the 137 areas
 * added by this brief are held back.
 *
 * `'ohio'` is the Ohio areas only — Columbus included, as the region's hub.
 */
export function getGridCities(
  region: CityGridRegion = 'chicagoland'
): { slug: string; name: string }[] {
  const entries =
    region === 'ohio'
      ? CITY_REGISTRY.filter((c) => c.state === OHIO_STATE)
      : CITY_REGISTRY.filter((c) => c.state !== OHIO_STATE || c.slug === 'columbus');
  return entries.map((c) => ({ slug: c.slug, name: c.name }));
}

/** The grid region a city page belongs to, from its registry entry. */
export function gridRegionFor(slug: string): CityGridRegion {
  return getCity(slug)?.state === OHIO_STATE ? 'ohio' : 'chicagoland';
}

/**
 * Brief 149 (Track C) — the title/description a city page rendered BEFORE its
 * `city_pages` meta fields were wired up. Now the fallback behind those fields,
 * not the source (see `getCityPageMeta` in `src/lib/cms/page-meta.ts`).
 *
 * It lives here, not in the route file, for two reasons: a Next.js `page.tsx`
 * may only export the framework's own symbols (anything else is a build-time
 * type error), and the Track C backfill script needs the exact same value —
 * it copies what each page renders today into its empty CMS field, so a second
 * hand-maintained copy of this rule would drift the moment either changed.
 *
 * Returns the RAW title, with no brand suffix handling; `pageTitle()` normalizes
 * at the render boundary so the layout's template appends the suffix once.
 */
/**
 * Static metadata overrides for cities whose approved copy lives outside the
 * coverage/local-office content files (Brief 181, Track B3).
 *
 * ── WHY THIS IS NOT THE WHOLE STORY ────────────────────────────────────────
 * `getCityPageMeta` prefers a NON-EMPTY `city_pages.meta_title` /
 * `meta_description` over whatever this function returns. So for a city with a
 * CMS row — which `hanover-park` has — editing this map alone changes nothing
 * that ships. The CMS fields have to be updated too, in
 * `/admin/city/{slug}`. That step is in the Brief 181 report's handoff, called
 * out as REQUIRED rather than optional, because the failure mode is silent: the
 * page renders approved copy under the old WordPress title.
 *
 * What this map IS for: the page is then correct with no CMS row and with the
 * database down, which is the posture every other fallback here takes.
 *
 * ⚠ NO BRAND SUFFIX. The root layout composes `%s | J. Blanton Plumbing` via
 * `TITLE_TEMPLATE`, and `pageTitle()` strips a trailing brand before that. The
 * approved copy rewrite's title tag ends in "-- J. Blanton Plumbing"; Marketing
 * confirmed on 2026-09-18 that the sitewide vertical separator wins over the
 * rewrite's em dash, so the brand is left off here and composed on once.
 */
const CITY_META_OVERRIDES: Readonly<Record<string, { title: string; description: string }>> = {
  // Brief 181 — the approved Hanover Park copy rewrite's META DATA block,
  // promoted from `/hanover-park-test`. Source of truth:
  // `New Pages/Hanover Park city page/Hanover Park_CityPage_Copy_Rewrite.md`.
  'hanover-park': {
    title: 'Hanover Park Plumbers, Available 24/7',
    description:
      'Our Hanover Park office serves the northwest suburbs, including Streamwood, Bartlett, and Schaumburg. Call 24/7 for a flat-rate quote before we start.',
  },
};

export function staticCityMeta(slug: string): { title: string; description: string } | null {
  const entry = getCity(slug);
  if (!entry) return null;

  // An explicit override wins over every derivation below — it exists precisely
  // because the derivations cannot know about approved copy written elsewhere.
  const override = CITY_META_OVERRIDES[entry.slug];
  if (override) return override;

  // V1 local-office cities (Evanston) have a dedicated content file.
  if (entry.type === 'local-office') {
    const localContent = getLocalOfficeContent(entry.slug);
    if (localContent) return { title: localContent.meta.title, description: localContent.meta.description };
    // Brief 67: V2 local-office cities (Algonquin, Elgin) keep their coverage
    // content file for metadata — fall through rather than returning empty.
  }

  const content = getCoverageContent(entry.slug);
  // Brief 154 (Track E3 follow-up): this fallback used to hardcode ", IL" — fine
  // while every coverage-area city was Illinois, wrong the moment Columbus (OH)
  // started rendering through this exact branch. Derives the abbreviation from
  // `entry.state` (unset ⇒ 'IL', matching every pre-existing city unchanged).
  const stateAbbr = entry.state === 'Ohio' ? 'OH' : 'IL';

  /*
   * Columbus Integration Brief 02, Track B: an Ohio area's `<title>` and meta
   * description must name the city AND the state, and must differ per area.
   *
   * Split on `entry.state` rather than changed in place. The Illinois branch is
   * the exact string this function returned before — a `<title>` is the single
   * most sensitive field on ~249 ranked pages, and Brief 149's backfill copied
   * these literals into the CMS, so a "harmless" rewording here would silently
   * disagree with what those rows hold.
   *
   * The Ohio title is `Plumber in {Area}, OH` rather than `{Area} Plumber, OH`
   * because the area name is not always a bare city — "Columbus Short North
   * Plumber, OH" reads as a mistake, "Plumber in Columbus Short North, OH" does
   * not. The county in the description is a second free differentiator and is
   * sourced from the coverage list, not invented.
   *
   * NOTE: the Chicagoland "30+ years" claim is deliberately absent from the Ohio
   * description — see the trust-statement rule in Brief 02's hard rules.
   */
  if (entry.state === 'Ohio') {
    const countyClause = entry.county ? ` in ${entry.county} County` : '';
    return {
      title: content?.meta?.title || `Plumber in ${entry.name}, ${stateAbbr}`,
      description:
        content?.meta?.description ??
        `J. Blanton Plumbing serves ${entry.name}, ${stateAbbr}${countyClause} with 24/7 emergency plumbing, drain, sewer, and water heater service. Same-day available. Call (773) 724-9272.`,
    };
  }

  return {
    title: content?.meta?.title || `${entry.name} Plumber`,
    description:
      content?.meta?.description ??
      `J. Blanton Plumbing serves ${entry.name}, ${stateAbbr} with 24/7 emergency plumbing, drain, sewer, and water heater service. 30+ years, same-day available. Call (773) 724-9272.`,
  };
}
