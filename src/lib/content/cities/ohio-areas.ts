/**
 * The Columbus / Central Ohio coverage list — Columbus Integration Brief 02.
 *
 * ─── What this file is ─────────────────────────────────────────────────────
 * The coverage list Marketing supplied, typed and deduped, as ONE array. Every
 * Ohio area page in the site derives from it: the registry entries, the
 * `state: 'Ohio'` map-embed override, the county grouping Brief 03's
 * `/locations/central-ohio` needs, the "we also serve" internal link graph, and the
 * city-service indexation list in `src/lib/seo/city-service-indexation.ts`.
 *
 * It is deliberately a flat data table with no derived values baked in — the
 * derivations live in `./index.ts` and `./ohio-nearby.ts` so a change to the
 * list is a one-line edit here.
 *
 * ─── Slug convention (Brief 02, Track A2) ──────────────────────────────────
 *  • A standalone municipality gets a FLAT root slug: `/dublin`, `/grove-city`.
 *  • A Columbus neighborhood gets a `columbus`-prefixed FLAT slug:
 *    `/columbus-short-north`, `/columbus-german-village`. This matches the
 *    existing `/chicago-lincoln-park` convention. It is NOT
 *    `/columbus/short-north` — that is two segments and would be swallowed by
 *    the `[city]/[service]` route.
 *
 * ─── The supplied list, exactly as received ────────────────────────────────
 * 141 rows: 105 municipality rows and 36 Columbus-neighborhood rows. Dublin,
 * Springfield and Westerville each appeared twice (Brief 02 A1 predicted all
 * three), so 105 municipality rows dedupe to 102. `Columbus` itself is one of
 * those 102 and was ALREADY registered by Brief 154 — it is listed here so this
 * file is a faithful copy of the coverage list, and `./index.ts` folds it into
 * the existing entry rather than adding a second one.
 *
 * Net: 138 distinct areas, 137 of them new.
 *
 * The brief's header says "135 municipalities + 37 Columbus neighborhoods"
 * (=172). The list actually supplied is 102 + 36 (=138). The list is the source
 * of truth; the discrepancy is reported rather than padded — inventing 34 Ohio
 * place names to reach 172 is exactly what the brief's "do not invent local
 * detail" rule forbids.
 *
 * ─── Springfield ───────────────────────────────────────────────────────────
 * Brief 02 A1 required confirming which Springfield is meant before registering
 * it. Marketing confirmed on 2026-09-01: Springfield, Clark County, OH IS in the
 * Columbus service area. Registered.
 *
 * ─── Woodstock ─────────────────────────────────────────────────────────────
 * `Woodstock` collides with Woodstock, IL — already registered and dispatching
 * to the McHenry office. It is disambiguated to `woodstock-oh`; see
 * `SLUG_OVERRIDES` below. NO Illinois entry was touched.
 *
 * ─── What is NOT here ──────────────────────────────────────────────────────
 * `population` and `zips` are declared on `RegistryEntry` (Brief 02 Track B) but
 * left UNSET. Both must come from sourced public data (Census ACS / USPS), and
 * the Brief 02 rule is explicit: no statistics that were not supplied or sourced.
 * The Columbus board carries a P1 card for that pass ("Source public local data
 * for all areas", due 2026-09-19). The template renders them only when present,
 * so filling them later is a data-only change with no code change.
 */

/** Which of the two Track A2 slug shapes an area takes. */
export type OhioAreaKind = 'municipality' | 'neighborhood';

export interface OhioArea {
  /** Route slug — see the slug convention above. */
  slug: string;
  /** Display name, as it appears in the H1, `<title>` and city grids. */
  name: string;
  /** Ohio county. Drives Brief 03's `/locations/central-ohio` grouping and the "we also serve" graph. */
  county: string;
  kind: OhioAreaKind;
}

/**
 * Slugs that do NOT follow the mechanical name→slug rule, and why. Every entry
 * here is a collision fix or a punctuation decision, never a preference.
 */
const SLUG_OVERRIDES: Readonly<Record<string, string>> = {
  // COLLISION (Brief 02 A2): Woodstock, IL is registered (McHenry office).
  // Woodstock, OH (Champaign County) is suffixed rather than the Illinois page
  // being renamed — the Illinois URL is live, ranked and out of scope.
  Woodstock: 'woodstock-oh',
  // Supplied as "Saint Louisville"; the village's own name is St. Louisville.
  // The supplied spelling is kept as the display name, and the slug spells the
  // word out rather than mixing conventions with the existing `st-charles`.
  'Saint Louisville': 'saint-louisville',
};

/** name → slug, mechanically: lowercase, non-alphanumerics collapse to a hyphen. */
function slugifyName(name: string): string {
  return (
    SLUG_OVERRIDES[name] ??
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  );
}

/* ── The municipalities (102 distinct, as supplied) ───────────────────────── */
const MUNICIPALITIES: ReadonlyArray<readonly [name: string, county: string]> = [
  ['Adelphi', 'Ross'],
  ['Alexandria', 'Licking'],
  ['Amanda', 'Fairfield'],
  ['Amlin', 'Franklin'],
  ['Ashley', 'Delaware'],
  ['Ashville', 'Pickaway'],
  ['Baltimore', 'Fairfield'],
  ['Blacklick', 'Franklin'],
  ['Bloomingburg', 'Fayette'],
  ['Bremen', 'Fairfield'],
  ['Brice', 'Franklin'],
  ['Buckeye Lake', 'Licking'],
  ['Cable', 'Champaign'],
  ['Canal Winchester', 'Franklin'],
  ['Cardington', 'Morrow'],
  ['Carroll', 'Fairfield'],
  ['Catawba', 'Clark'],
  ['Centerburg', 'Knox'],
  ['Chesterville', 'Morrow'],
  ['Circleville', 'Pickaway'],
  ['Clarksburg', 'Ross'],
  ['Columbus', 'Franklin'],
  ['Commercial Point', 'Pickaway'],
  ['Croton', 'Licking'],
  ['Delaware', 'Delaware'],
  ['Derby', 'Pickaway'],
  ['Dublin', 'Franklin'],
  ['East Liberty', 'Logan'],
  ['Fulton', 'Morrow'],
  ['Galena', 'Delaware'],
  ['Galloway', 'Franklin'],
  ['Granville', 'Licking'],
  ['Green Camp', 'Marion'],
  ['Grove City', 'Franklin'],
  ['Groveport', 'Franklin'],
  ['Harrisburg', 'Franklin'],
  ['Heath', 'Licking'],
  ['Hebron', 'Licking'],
  ['Hilliard', 'Franklin'],
  ['Irwin', 'Union'],
  ['Jacksontown', 'Licking'],
  ['Jeffersonville', 'Fayette'],
  ['Johnstown', 'Licking'],
  ['Kilbourne', 'Delaware'],
  ['Kingston', 'Ross'],
  ['Kirkersville', 'Licking'],
  ['Lancaster', 'Fairfield'],
  ['Lewis Center', 'Delaware'],
  ['Lithopolis', 'Fairfield'],
  ['Lockbourne', 'Franklin'],
  ['London', 'Madison'],
  ['Magnetic Springs', 'Union'],
  ['Marengo', 'Morrow'],
  ['Marysville', 'Union'],
  ['Mechanicsburg', 'Champaign'],
  ['Middleburg', 'Logan'],
  ['Milford Center', 'Union'],
  ['Milledgeville', 'Fayette'],
  ['Millersport', 'Fairfield'],
  ['Mount Sterling', 'Madison'],
  ['Mount Vernon', 'Knox'],
  ['New Albany', 'Franklin'],
  ['New Holland', 'Pickaway'],
  ['Newark', 'Licking'],
  ['North Lewisburg', 'Champaign'],
  ['Orient', 'Pickaway'],
  ['Ostrander', 'Delaware'],
  ['Pataskala', 'Licking'],
  ['Pickerington', 'Fairfield'],
  ['Plain City', 'Madison'],
  ['Pleasantville', 'Fairfield'],
  ['Powell', 'Delaware'],
  ['Prospect', 'Marion'],
  ['Radnor', 'Delaware'],
  ['Raymond', 'Union'],
  ['Reynoldsburg', 'Franklin'],
  ['Richwood', 'Union'],
  ['Rockbridge', 'Hocking'],
  ['Rushville', 'Fairfield'],
  ['Saint Louisville', 'Licking'],
  ['Sedalia', 'Madison'],
  ['South Charleston', 'Clark'],
  ['South Solon', 'Madison'],
  ['South Vienna', 'Clark'],
  ['Springfield', 'Clark'],
  ['Stoutsville', 'Fairfield'],
  ['Sugar Grove', 'Fairfield'],
  ['Sunbury', 'Delaware'],
  ['Tarlton', 'Pickaway'],
  ['Thornville', 'Perry'],
  ['Thurston', 'Fairfield'],
  ['Unionville Center', 'Union'],
  ['Urbana', 'Champaign'],
  ['Utica', 'Licking'],
  ['Waldo', 'Marion'],
  ['Washington Court House', 'Fayette'],
  ['West Jefferson', 'Madison'],
  ['West Mansfield', 'Logan'],
  ['Westerville', 'Franklin'],
  ['Williamsport', 'Pickaway'],
  ['Woodstock', 'Champaign'],
  ['Zanesfield', 'Logan'],
];

/**
 * The 36 Columbus neighborhoods, as supplied.
 *
 * ⚠️ Five of these — Bexley, Gahanna, Grandview Heights, Minerva Park and Upper
 * Arlington — are independent municipalities inside Franklin County, not
 * neighborhoods of Columbus. Marketing supplied them under the Columbus column,
 * so that is how they are registered (the `columbus-` slug prefix is also what
 * keeps them from colliding with anything). Flagged for Marketing in the Brief 02
 * report; re-typing one is a one-line move between these two arrays.
 *
 * Polaris straddles the Columbus / Delaware County line; its county is recorded
 * as Delaware, which is where the retail district sits.
 */
const NEIGHBORHOODS: ReadonlyArray<readonly [name: string, county: string]> = [
  ['Arena District', 'Franklin'],
  ['Beechwold', 'Franklin'],
  ['Berwick', 'Franklin'],
  ['Bexley', 'Franklin'],
  ['Brewery District', 'Franklin'],
  ['Clintonville', 'Franklin'],
  ['Downtown', 'Franklin'],
  ['Eastland', 'Franklin'],
  ['Eastmoor', 'Franklin'],
  ['Easton', 'Franklin'],
  ['Fifth by Northwest', 'Franklin'],
  ['Forest Park', 'Franklin'],
  ['Franklinton', 'Franklin'],
  ['Gahanna', 'Franklin'],
  ['German Village', 'Franklin'],
  ['Grandview Heights', 'Franklin'],
  ['Harrison West', 'Franklin'],
  ['Hilltop', 'Franklin'],
  ['Italian Village', 'Franklin'],
  ['King-Lincoln Bronzeville', 'Franklin'],
  ['Linden', 'Franklin'],
  ['Marion-Franklin', 'Franklin'],
  ['Merion Village', 'Franklin'],
  ['Minerva Park', 'Franklin'],
  ['Near East Side', 'Franklin'],
  ['North Linden', 'Franklin'],
  ['Northland', 'Franklin'],
  ['Olde Towne East', 'Franklin'],
  ['Polaris', 'Delaware'],
  ['Short North', 'Franklin'],
  ['South Side', 'Franklin'],
  ['University District', 'Franklin'],
  ['Upper Arlington', 'Franklin'],
  ['Victorian Village', 'Franklin'],
  ['Weinland Park', 'Franklin'],
  ['Westland', 'Franklin'],
];

/**
 * Every Ohio area, A→Z by slug. Neighborhood display names are prefixed with
 * "Columbus " so the H1 (`{name} Plumber`) and `<title>` name the city the area
 * is in — Brief 02 Track B requires the city in both, and "Short North Plumber"
 * on its own does not say where that is.
 */
export const OHIO_AREAS: readonly OhioArea[] = [
  ...MUNICIPALITIES.map(([name, county]): OhioArea => ({
    slug: slugifyName(name),
    name,
    county,
    kind: 'municipality',
  })),
  ...NEIGHBORHOODS.map(([name, county]): OhioArea => ({
    slug: `columbus-${slugifyName(name)}`,
    name: `Columbus ${name}`,
    county,
    kind: 'neighborhood',
  })),
].sort((a, b) => a.slug.localeCompare(b.slug));

/** The state every entry above carries — the map-embed + `<title>` driver. */
export const OHIO_STATE = 'Ohio';

/** The office every Ohio area dispatches to. Columbus is the only Ohio office. */
export const OHIO_OFFICE_KEY = 'columbus';

/** The `cityToArea` region label for every Ohio area. */
export const OHIO_AREA_LABEL = 'Central Ohio';

export const OHIO_SLUGS: readonly string[] = OHIO_AREAS.map((a) => a.slug);

const OHIO_BY_SLUG = new Map(OHIO_AREAS.map((a) => [a.slug, a]));

export function getOhioArea(slug: string): OhioArea | undefined {
  return OHIO_BY_SLUG.get(slug);
}

export function isOhioSlug(slug: string): boolean {
  return OHIO_BY_SLUG.has(slug);
}

/**
 * Every county represented, A→Z — Brief 03's `/locations/central-ohio` group order.
 *
 * Deduped with a plain filter rather than `[...new Set()]`: the app's tsconfig
 * target does not allow spreading an iterator without `downlevelIteration`.
 */
export function ohioCounties(): string[] {
  return OHIO_AREAS.map((a) => a.county)
    .filter((c, i, all) => all.indexOf(c) === i)
    .sort();
}
