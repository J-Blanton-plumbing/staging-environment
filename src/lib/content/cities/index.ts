/**
 * City registry + office/area data — the single source the shared `[city]`
 * builder reads (brief-10 §3).
 *
 * `OFFICES` + `cityToOffice` + `cityToArea` are ported VERBATIM from
 * `jb-blanton/page-city.php` ($nap_map 55–232, $areas_map 235–402). Each office's
 * city list is declared once and reused for BOTH maps so a slug can't get an
 * office without an area (or drift between them). Cities outside the maps fall to
 * the Ravenswood office + "North and Northwest Side Chicago" — reproducing the
 * known Joliet bug (live maps Joliet to Ravenswood), flagged not fixed.
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
import { EVANSTON } from './evanston';
import { ELGIN } from './elgin';
import { ALGONQUIN } from './algonquin';

/* ── Offices (the distinct dispatch addresses) ──────────────────────────────── */
export const OFFICES = {
  ravenswood: {
    url: 'https://maps.app.goo.gl/k2RpBwmEiq1iir1x9',
    address: '5126 N Ravenswood Ave, Chicago, IL 60640',
  },
  mchenry: {
    url: 'https://maps.app.goo.gl/DQ4fP5QXZr7TpBJ48',
    address: '3406 W Elm St, Mchenry, IL 60050',
  },
  elgin: {
    url: 'https://maps.app.goo.gl/5J1K7ZVgFeNwy8VJ8',
    address: '964 N McLean Blvd, Elgin, IL 60123-2039',
  },
  'arlington-heights': {
    url: 'https://maps.app.goo.gl/Qq4qPYJT8bCgash26',
    address: '1204 E. Central Road, Suite 3, Arlington Heights, IL 60005',
  },
  northbrook: {
    url: 'https://maps.app.goo.gl/pCmmYeescW7Mf6B2A',
    address: '1945 Techny Road, #11, Northbrook, IL 60062',
  },
  hinsdale: {
    url: 'https://maps.app.goo.gl/UfWAoTRbWkAPR6WYA',
    address: '15 Spinning Wheel Rd #216a, Hinsdale, IL 60521',
  },
  naperville: {
    url: 'https://maps.app.goo.gl/9ou5MAtuAMjG6XfN8',
    address: '200 S Main Street, Suite 3, Naperville, IL 60540',
  },
  evanston: {
    url: 'https://maps.app.goo.gl/rqmTxHMcicWhz1yV7',
    address: '1603 Orrington Ave #600-1085, Evanston, IL 60201',
  },
  algonquin: {
    url: 'https://maps.app.goo.gl/egVEqHQJkzFG8Qo56',
    address: '2390 Esplanade Dr #200f, Algonquin, IL 60102',
  },
  geneva: {
    url: 'https://maps.app.goo.gl/mfdpSC3BSGkQKdQ39',
    address: '115 Campbell St #201C, Geneva, IL 60134',
  },
  'chicago-lincoln-park': {
    url: 'https://maps.app.goo.gl/ninFDe3tVj7U5sYx6',
    address: '800 W Diversey Pkwy, Chicago, IL 60614',
  },
} satisfies Record<string, Office>;

export type OfficeKey = keyof typeof OFFICES;

const DEFAULT_OFFICE: OfficeKey = 'ravenswood';
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
export function getOffice(slug: string): Office {
  return OFFICES[cityToOffice[slug] ?? DEFAULT_OFFICE];
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
/** Local Office slugs not yet built — kept OUT of the registry for now (flagged). */
const PENDING_LOCAL_OFFICE = new Set<string>(['northbrook']);

/* ── The registry (drives generateStaticParams + the §10 grid) ──────────────── */
const localOfficeSlugs = new Set(BUILT_LOCAL_OFFICE.map((c) => c.slug));

const coverageEntries: RegistryEntry[] = Object.keys(cityToOffice)
  .filter((slug) => !localOfficeSlugs.has(slug) && !PENDING_LOCAL_OFFICE.has(slug))
  .map((slug) => ({
    slug,
    name: displayName(slug),
    type: 'coverage-area' as CityType,
    hasOffice: OFFICE_HOSTS.has(slug),
  }));

/** All city pages, sorted A→Z by display name (the order the live §10 grid uses). */
export const CITY_REGISTRY: RegistryEntry[] = [...coverageEntries, ...BUILT_LOCAL_OFFICE].sort(
  (a, b) => a.name.localeCompare(b.name),
);

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
