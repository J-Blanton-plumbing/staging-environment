/**
 * The two service regions the locations pages are split into — Columbus
 * Integration Brief 03.
 *
 * ─── Why this file exists ──────────────────────────────────────────────────
 * Before this brief `/locations` rendered `CITY_REGISTRY` straight into a
 * five-column grid. That was fine while the registry was one region. Brief 02
 * registered 138 Ohio areas, and the page started rendering 386 links — 248
 * Illinois cities and 138 Ohio areas — in one undifferentiated A→Z list with
 * nothing saying which state anything was in. `/locations` ranks, so that was a
 * live defect, not a risk.
 *
 * The split is hub + two region pages. This module is the shared data layer for
 * all three so the hub's counts, the region pages' grids and the nav labels can
 * never disagree: every number below is COUNTED from `CITY_REGISTRY`, never
 * typed.
 *
 * ─── The one hard rule this file enforces ──────────────────────────────────
 * The Ohio county list is DERIVED, via `ohioCounties()`. It is never written
 * down. The 138 areas span 17 counties; an earlier draft of the brief named 10,
 * which would have silently dropped 21 areas off the page with no error. So
 * `OHIO_COUNTY_GROUPS` is built from the registry and `assertOhioGroupsComplete`
 * (below, run at module load) fails the BUILD if the groups stop summing to the
 * registered Ohio count. A missing county is now a red build, not a quiet loss.
 */
import { CITY_REGISTRY } from '@/lib/content/cities/index';
import { OHIO_STATE, ohioCounties } from '@/lib/content/cities/ohio-areas';
import {
  CHICAGO_NEIGHBORHOOD_SLUGS,
  ILLINOIS_COUNTIES,
  ILLINOIS_COUNTY_BY_SLUG,
  illinoisCounties,
} from '@/lib/content/cities/illinois-areas';

export interface RegionCity {
  slug: string;
  name: string;
}

/* ── The two city sets ──────────────────────────────────────────────────────
 *
 * Illinois cities leave `state` UNSET by design (Brief 02, Track A3): giving
 * them an explicit `'Illinois'` value would change ~248 existing map embeds and
 * `<title>` strings. So "is Illinois" is `state === undefined`, not
 * `state === 'Illinois'`. Do not "tidy" this into an equality check.
 */
const byName = (a: RegionCity, b: RegionCity) => a.name.localeCompare(b.name);
const toRegionCity = (c: { slug: string; name: string }): RegionCity => ({ slug: c.slug, name: c.name });

/** Every Illinois city page, A→Z. 248 as of this brief. */
export const CHICAGOLAND_CITIES: readonly RegionCity[] = CITY_REGISTRY
  .filter((c) => c.state === undefined)
  .map(toRegionCity)
  .sort(byName);

/** Every Ohio area page, A→Z. 138 as of Brief 02 (Columbus itself included). */
export const OHIO_CITIES: readonly RegionCity[] = CITY_REGISTRY
  .filter((c) => c.state === OHIO_STATE)
  .map(toRegionCity)
  .sort(byName);

/* ── Ohio: grouped by county, neighborhoods held out ────────────────────────
 *
 * A Columbus neighborhood is registered with a `columbus-` slug prefix and a
 * "Columbus …" display name (Brief 02, Track A2). Listing "Columbus Short North"
 * under Franklin County alongside Dublin and Hilliard reads as if it were a
 * separate municipality, so the 36 neighborhoods get their own labelled group —
 * which is also what the brief asks for.
 *
 * The county groups therefore cover the 102 MUNICIPALITIES only; the
 * neighborhoods group covers the other 36. `assertOhioGroupsComplete` checks the
 * two together against the registry, so holding the neighborhoods out cannot
 * lose anybody.
 */
export interface CityGroup {
  /** Group heading, e.g. "Franklin County" or "Columbus Neighborhoods". */
  label: string;
  cities: readonly RegionCity[];
  /**
   * Render this group EXPANDED when the page is in `collapsible` mode (Brief
   * 170, Track D). Only the neighborhoods group sets it today.
   *
   * A flag rather than a label match on purpose: `'Columbus Neighborhoods'` is
   * editorial copy, and a component matching it by string would silently start
   * shipping 18 collapsed groups the day that heading is reworded. Groups that
   * omit it render collapsed; the flag is inert on a page that does not pass
   * `collapsible`.
   */
  defaultOpen?: boolean;
}

const isNeighborhood = (slug: string) => slug.startsWith('columbus-');

/** The 36 Columbus neighborhood pages, A→Z. */
export const OHIO_NEIGHBORHOODS: readonly RegionCity[] = OHIO_CITIES.filter((c) => isNeighborhood(c.slug));

/** The 102 Ohio municipality pages (Columbus itself included), A→Z. */
export const OHIO_MUNICIPALITIES: readonly RegionCity[] = OHIO_CITIES.filter((c) => !isNeighborhood(c.slug));

const COUNTY_BY_SLUG = new Map(CITY_REGISTRY.map((c) => [c.slug, c.county]));

/**
 * Every Ohio county that has at least one municipality page, A→Z, each with its
 * cities A→Z. Derived from `ohioCounties()` — the county list is NEVER typed
 * out here (see the file header).
 *
 * A county whose only areas are neighborhoods (none today, though Polaris sits
 * in Delaware and a future supply could produce one) is skipped rather than
 * rendered empty; its areas are still counted, in the neighborhoods group.
 */
export const OHIO_COUNTY_GROUPS: readonly CityGroup[] = ohioCounties()
  .map((county) => ({
    label: `${county} County`,
    cities: OHIO_MUNICIPALITIES.filter((c) => COUNTY_BY_SLUG.get(c.slug) === county),
  }))
  .filter((g) => g.cities.length > 0);

/**
 * The render order of `/locations/central-ohio` — Brief 170, Track D.
 *
 * NOT the A→Z county order any more. Two changes, both editorial:
 *
 *  1. **Columbus Neighborhoods first.** It is the largest group (36 of 138) and
 *     the likeliest destination for someone who arrived searching "Columbus",
 *     and it used to render 18th — below every one- and two-area county. It is
 *     also the only group that opens by default (`defaultOpen`).
 *  2. **Counties by size, descending**, tie-broken A→Z on label. That puts
 *     Franklin — Columbus's own county — directly under the neighborhoods, and
 *     collects the one- and two-area counties (Perry, Hocking, Knox) at the
 *     bottom where they read as a tail rather than as noise between the big
 *     groups.
 *
 * ORDER ONLY. Membership is untouched, so `assertOhioGroupsComplete()` below —
 * which is order-independent — still guards exactly the same invariant. Sort a
 * COPY: `OHIO_COUNTY_GROUPS` is exported and read elsewhere, and `.sort()`
 * mutates in place.
 */
const bySizeDescThenLabel = (a: CityGroup, b: CityGroup) =>
  b.cities.length - a.cities.length || a.label.localeCompare(b.label);

export const OHIO_GROUPS: readonly CityGroup[] = [
  ...(OHIO_NEIGHBORHOODS.length
    ? [{ label: 'Columbus Neighborhoods', cities: OHIO_NEIGHBORHOODS, defaultOpen: true }]
    : []),
  ...[...OHIO_COUNTY_GROUPS].sort(bySizeDescThenLabel),
];

/**
 * Brief 03 hard rule: the groups must account for every registered Ohio area.
 *
 * Thrown at module load, so an area that falls out of every group fails
 * `npm run build` instead of quietly vanishing from a page that is supposed to
 * be the complete list. The duplicate check matters as much as the sum: two
 * groups both claiming one area would keep the total right while double-listing
 * it.
 */
function assertOhioGroupsComplete(): void {
  const grouped = OHIO_GROUPS.flatMap((g) => g.cities.map((c) => c.slug));
  const unique = new Set(grouped);
  if (unique.size !== grouped.length) {
    const dupes = grouped.filter((s, i) => grouped.indexOf(s) !== i);
    throw new Error(
      `locations-regions: Ohio area(s) appear in more than one group: ${dupes.join(', ')}`
    );
  }
  if (grouped.length !== OHIO_CITIES.length) {
    const missing = OHIO_CITIES.filter((c) => !unique.has(c.slug)).map((c) => c.slug);
    throw new Error(
      `locations-regions: county groups cover ${grouped.length} Ohio areas but ${OHIO_CITIES.length} ` +
        `are registered. Unaccounted for: ${missing.join(', ') || '(none — an extra slug leaked in)'}. ` +
        'The county list is derived from ohioCounties(); do not hardcode it.'
    );
  }
}
assertOhioGroupsComplete();

/* ── Chicagoland: the same county grouping, from a different source ─────────
 *
 * Marketing asked for Central Ohio's treatment on Chicagoland too. The visual
 * half was free; the grouping was not, because `RegistryEntry.county` is unset
 * on all 248 Illinois entries and there is no county column anywhere in the
 * repo. `illinois-areas.ts` carries the slug → county map instead — read its
 * header before trusting a value, and note especially WHY the map is not written
 * back onto the registry (it would light up `CityAreaDetails` and
 * `CityAreaServedSchema` on 248 live city pages).
 *
 * Everything below mirrors the Ohio side deliberately, including the assert.
 */
const isChicagoNeighborhood = (() => {
  const set = new Set(CHICAGO_NEIGHBORHOOD_SLUGS);
  return (slug: string) => set.has(slug);
})();

/** The 40 Chicago neighborhood pages, A→Z. */
export const CHICAGO_NEIGHBORHOODS: readonly RegionCity[] = CHICAGOLAND_CITIES.filter((c) =>
  isChicagoNeighborhood(c.slug)
);

/** The Illinois municipality pages (Chicago itself included), A→Z. */
export const ILLINOIS_MUNICIPALITIES: readonly RegionCity[] = CHICAGOLAND_CITIES.filter(
  (c) => !isChicagoNeighborhood(c.slug)
);

export const ILLINOIS_COUNTY_GROUPS: readonly CityGroup[] = illinoisCounties()
  .map((county) => ({
    label: `${county} County`,
    cities: ILLINOIS_MUNICIPALITIES.filter((c) => ILLINOIS_COUNTY_BY_SLUG[c.slug] === county),
  }))
  .filter((g) => g.cities.length > 0);

/**
 * The render order of `/locations/chicagoland` — same rule as `OHIO_GROUPS`:
 * neighborhoods first (largest group, and the likeliest destination for someone
 * who searched "Chicago"), then counties by size descending, tie-broken A→Z.
 */
export const CHICAGOLAND_GROUPS: readonly CityGroup[] = [
  ...(CHICAGO_NEIGHBORHOODS.length
    ? [{ label: 'Chicago Neighborhoods', cities: CHICAGO_NEIGHBORHOODS, defaultOpen: true }]
    : []),
  ...[...ILLINOIS_COUNTY_GROUPS].sort(bySizeDescThenLabel),
];

/**
 * The Illinois twin of `assertOhioGroupsComplete`, plus one extra check Ohio
 * does not need.
 *
 * Ohio's county data is supplied with the areas, so a missing county there is a
 * supply bug. Illinois' is a hand-compiled map in a separate file, so it can
 * drift from the registry in BOTH directions: a newly registered Illinois city
 * with no map entry would silently vanish from the page, and a slug removed from
 * the registry would leave a dead map entry nobody notices. Both fail the build.
 */
function assertChicagolandGroupsComplete(): void {
  const grouped = CHICAGOLAND_GROUPS.flatMap((g) => g.cities.map((c) => c.slug));
  const unique = new Set(grouped);
  if (unique.size !== grouped.length) {
    const dupes = grouped.filter((s, i) => grouped.indexOf(s) !== i);
    throw new Error(
      `locations-regions: Illinois area(s) appear in more than one group: ${dupes.join(', ')}`
    );
  }
  if (grouped.length !== CHICAGOLAND_CITIES.length) {
    const missing = CHICAGOLAND_CITIES.filter((c) => !unique.has(c.slug)).map((c) => c.slug);
    throw new Error(
      `locations-regions: Illinois groups cover ${grouped.length} of ${CHICAGOLAND_CITIES.length} ` +
        `registered cities. Unaccounted for: ${missing.join(', ') || '(none — an extra slug leaked in)'}. ` +
        'Add each slug to ILLINOIS_COUNTY_BY_SLUG (or CHICAGO_NEIGHBORHOOD_SLUGS) in ' +
        'src/lib/content/cities/illinois-areas.ts.'
    );
  }

  const registered = new Set(CHICAGOLAND_CITIES.map((c) => c.slug));
  const stale = Object.keys(ILLINOIS_COUNTY_BY_SLUG).filter((s) => !registered.has(s));
  if (stale.length) {
    throw new Error(
      `locations-regions: ILLINOIS_COUNTY_BY_SLUG has ${stale.length} entr(ies) for slugs that are ` +
        `not registered Illinois cities: ${stale.join(', ')}. Remove them, or fix the typo.`
    );
  }
  const staleHoods = CHICAGO_NEIGHBORHOOD_SLUGS.filter((s) => !registered.has(s));
  if (staleHoods.length) {
    throw new Error(
      `locations-regions: CHICAGO_NEIGHBORHOOD_SLUGS lists unregistered slug(s): ${staleHoods.join(', ')}.`
    );
  }

  /* The region card's counties line is editorial copy; the groups are data. If a
     seventh county ever appears, the copy is silently wrong on a page that ranks. */
  const derived = illinoisCounties();
  const declared = [...ILLINOIS_COUNTIES].sort((a, b) => a.localeCompare(b));
  if (derived.join('|') !== declared.join('|')) {
    throw new Error(
      `locations-regions: Illinois counties in use (${derived.join(', ')}) no longer match ` +
        `ILLINOIS_COUNTIES (${declared.join(', ')}). Update that list AND the ` +
        'ILLINOIS_COUNTIES_COPY line on the region card so the page does not contradict itself.'
    );
  }
}
assertChicagolandGroupsComplete();

/* ── The regions ────────────────────────────────────────────────────────── */

export interface RegionDef {
  key: 'chicagoland' | 'columbus';
  /** Region page path. */
  href: string;
  /** Short label — nav, breadcrumbs, region card heading. */
  label: string;
  /** Long label for the H1 and the `<title>`. */
  heading: string;
  /** Human list of the counties covered, for the hub's region card. */
  counties: string;
  /** The "since when" line on the region card. */
  tenure: string;
  /**
   * Skyline photo for the top band of the homepage region card (`RegionChooser`).
   * Both files are 1000x500 WebP in `public/images/`, pre-cropped to 2:1 so the
   * card band needs no art direction at render time. Required, not optional: a
   * card with no photo next to a card with one reads as the secondary region,
   * which is exactly what Brief 04's parity rule forbids. Adding a third region
   * is therefore a TYPE ERROR here until it has a photo too.
   */
  image: { src: string; alt: string; width: number; height: number };
  cities: readonly RegionCity[];
}

/**
 * Illinois counties, as editorial copy.
 *
 * Deliberately NOT derived: `RegistryEntry.county` is populated for Ohio areas
 * only (Brief 02, Track B) — every Illinois entry has it `undefined`, so there
 * is nothing to derive from. This string is the six counties the Chicagoland
 * service area has always been described as covering. If a `county` field is
 * ever backfilled for Illinois, replace this with the same derived treatment the
 * Ohio side gets. Flagged in the Brief 03 report.
 */
const ILLINOIS_COUNTIES_COPY = 'Cook, DuPage, Lake, McHenry, Kane and Will counties';

export const CHICAGOLAND: RegionDef = {
  key: 'chicagoland',
  href: '/locations/chicagoland',
  label: 'Chicagoland',
  heading: 'Chicagoland, Illinois',
  counties: ILLINOIS_COUNTIES_COPY,
  tenure: '30+ years',
  image: {
    src: '/images/region-chicagoland.webp',
    alt: 'The Chicago skyline at dusk, seen across the lakefront',
    width: 1000,
    height: 500,
  },
  cities: CHICAGOLAND_CITIES,
};

export const COLUMBUS_REGION: RegionDef = {
  key: 'columbus',
  href: '/locations/central-ohio',
  label: 'Central Ohio',
  heading: 'Central Ohio & Columbus',
  // Derived, never typed — the whole point of the rule in the file header.
  counties: `${ohioCounties().length} counties across Central Ohio`,
  tenure: 'Now serving',
  image: {
    src: '/images/region-central-ohio.webp',
    alt: 'The Columbus, Ohio skyline at night, reflected in the Scioto River',
    width: 1000,
    height: 500,
  },
  cities: OHIO_CITIES,
};

export const REGIONS: readonly RegionDef[] = [CHICAGOLAND, COLUMBUS_REGION];

/* ── "Most requested" — the hub's internal-linking mitigation ───────────────
 *
 * The hub used to link to every city directly. After the split those links live
 * one level down, which drops the internal link equity every city page receives
 * from a page that ranks. These two short lists keep a direct hub → city link
 * for the highest-value pages in each region.
 *
 * Both lists deliberately EXCLUDE the cities already in the hub's
 * `SERVICE_CENTERS` grid (Columbus and the Illinois offices). A second link to a
 * page the same page already links to adds nothing; spending the ten slots on
 * ten OTHER city pages is the actual mitigation.
 *
 * Every slug is asserted against the registry at module load — a typo here would
 * otherwise ship a 404 link from a page that ranks.
 */
const CHICAGOLAND_MOST_REQUESTED = [
  'oak-park', 'schaumburg', 'des-plaines', 'wilmette', 'glenview',
  'park-ridge', 'palatine', 'mount-prospect', 'downers-grove', 'highland-park',
];

const OHIO_MOST_REQUESTED = [
  'dublin', 'westerville', 'hilliard', 'grove-city', 'reynoldsburg',
  'delaware', 'pickerington', 'powell', 'new-albany', 'marysville',
];

function resolveMostRequested(region: RegionDef, slugs: string[]): readonly RegionCity[] {
  const inRegion = new Map(region.cities.map((c) => [c.slug, c]));
  const missing = slugs.filter((s) => !inRegion.has(s));
  if (missing.length) {
    throw new Error(
      `locations-regions: "most requested" slug(s) not registered in ${region.label}: ` +
        `${missing.join(', ')}. The hub would link to a 404.`
    );
  }
  return slugs.map((s) => inRegion.get(s)!);
}

export const MOST_REQUESTED: Readonly<Record<RegionDef['key'], readonly RegionCity[]>> = {
  chicagoland: resolveMostRequested(CHICAGOLAND, CHICAGOLAND_MOST_REQUESTED),
  columbus: resolveMostRequested(COLUMBUS_REGION, OHIO_MOST_REQUESTED),
};

/** Split a city list into `n` roughly equal columns, preserving A→Z read order. */
export function cityColumns(cities: readonly RegionCity[], n: number): RegionCity[][] {
  const size = Math.ceil(cities.length / n);
  const out: RegionCity[][] = [];
  for (let i = 0; i < cities.length; i += size) out.push(cities.slice(i, i + size));
  return out;
}
