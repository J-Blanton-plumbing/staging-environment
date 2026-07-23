/**
 * City registry + office/area data — the single source the shared `[city]`
 * builder reads (brief-10 §3).
 *
 * `cityToOffice` + `cityToArea` are ported VERBATIM from `jb-blanton/page-city.php`
 * ($nap_map 55–232, $areas_map 235–402). Each office's city list is declared once
 * and reused for BOTH maps so a slug can't get an office without an area (or drift
 * between them). Cities outside the maps fall to the Ravenswood office + "North
 * and Northwest Side Chicago" — reproducing the known Joliet bug (live maps
 * Joliet to Ravenswood), flagged not fixed.
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

/** The 11 distinct dispatch offices, keyed to match `CmsOffice.slug` (Brief 102). */
export type OfficeKey =
  | 'chicago-ravenswood'
  | 'mchenry'
  | 'elgin'
  | 'arlington-heights'
  | 'northbrook'
  | 'hinsdale'
  | 'naperville'
  | 'evanston'
  | 'algonquin'
  | 'geneva'
  | 'chicago-lincoln-park';

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
  'round-lake-park', 'solon-mills', 'spring-grove', 'trout-valley', 'venetian-cillage',
  'venetian-village', 'village-of-lakewood', 'volo', 'wauconda', 'williams-park', 'wonder-lake',
  'woodstock',
];

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
assignArea('Western Suburban Chicago', ['naperville', ...NAPERVILLE_CITIES, 'geneva']);
assignArea('North Shore Chicagoland', ['evanston', ...EVANSTON_CITIES]);
// NB: 'chicago-lincoln-park' is in $nap_map but NOT $areas_map → it falls to the
// default area, exactly as live. Don't add it here.

/* ── Resolvers ──────────────────────────────────────────────────────────────── */
/**
 * Resolve a city slug to its dispatching office's NAP data. `offices` is the
 * live CMS list (`getGlobalSettingsCached().offices`) — callers already have it
 * in scope wherever they render a NAP block, so this stays a plain sync lookup
 * rather than reaching into the DB itself.
 */
export function getOffice(slug: string, offices: CmsOffice[]): Office {
  const key = cityToOffice[slug] ?? DEFAULT_OFFICE;
  const office = offices.find((o) => o.slug === key);
  if (!office) return { url: '', address: '' };
  return { url: office.mapUrl, address: formatOfficeAddress(office) };
}
export function getArea(slug: string): string {
  return cityToArea[slug] ?? DEFAULT_AREA;
}

/* ── Display names (overrides + smart title-case) ───────────────────────────── */
const NAME_OVERRIDES: Record<string, string> = {
  mchenry: 'McHenry',
  'st-charles': 'St. Charles',
  'chicago-lincoln-park': 'Lincoln Park',
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
  'mchenry', 'elgin', 'arlington-heights', 'northbrook', 'hinsdale', 'naperville', 'evanston',
  'algonquin', 'geneva', 'chicago-lincoln-park',
]);

/**
 * Local Office cities currently BUILT (have a copy file + the video-hero data).
 * Northbrook + Elmhurst are also Local Office but await their Brief-09 data drop,
 * so they're excluded here (Elmhurst isn't in the theme maps at all). They render
 * once `northbrook.ts` / `elmhurst.ts` land + a registry line is added.
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
/** Local Office slugs not yet built — kept OUT of the registry for now (flagged). */
const PENDING_LOCAL_OFFICE = new Set<string>(['northbrook']);

/* ── The registry (drives generateStaticParams + the §10 grid) ──────────────── */
const localOfficeSlugs = new Set(
  [...BUILT_LOCAL_OFFICE, ...LOCAL_OFFICE_V2].map((c) => c.slug),
);

const coverageEntries: RegistryEntry[] = Object.keys(cityToOffice)
  .filter((slug) => !localOfficeSlugs.has(slug) && !PENDING_LOCAL_OFFICE.has(slug))
  .map((slug) => ({
    slug,
    name: displayName(slug),
    type: 'coverage-area' as CityType,
    hasOffice: OFFICE_HOSTS.has(slug),
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
};
const LOCAL_OFFICE_CONTENT: Record<string, LocalOfficeContent> = {
  evanston: EVANSTON,
};

export function getCity(slug: string): RegistryEntry | undefined {
  return BY_SLUG.get(slug);
}
export function getCoverageContent(slug: string): CoverageAreaContent | undefined {
  return COVERAGE_CONTENT[slug];
}
export function getLocalOfficeContent(slug: string): LocalOfficeContent | undefined {
  return LOCAL_OFFICE_CONTENT[slug];
}
/** The full A→Z city list for the §10 locations grid. */
export function getGridCities(): { slug: string; name: string }[] {
  return CITY_REGISTRY.map((c) => ({ slug: c.slug, name: c.name }));
}
