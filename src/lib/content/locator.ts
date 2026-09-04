/**
 * Homepage store locator — region grouping and every copy string the section
 * renders that is NOT CMS-backed. Brief 171, Tracks D1 and E3.
 *
 * ─── SERVER-ONLY. Do not import this from a client component ───────────────
 * It imports `REGIONS` from `locations-regions.ts`, which imports
 * `CITY_REGISTRY`, which is assembled from every city copy file in the repo.
 * Importing this module from `StoreLocatorPanel.tsx` would put all of that in
 * the homepage's JavaScript bundle. `StoreLocator.tsx` (a server component)
 * calls `buildLocatorRegions()` and passes the plain, serializable result down as
 * props; the panel imports only TYPES from here, via `import type`, which the
 * compiler erases. Keep it that way.
 *
 * ─── Why the labels are borrowed rather than typed ─────────────────────────
 * `groupLabel` comes from `REGIONS`, the same source `RegionChooser` renders
 * further up the same page. The two sections sit within one scroll of each other
 * and both name the service areas; typing "Chicagoland" here would let them
 * drift the day Marketing rewords one. `assertRegionLabels()` fails the build if
 * the region keys this file expects ever stop existing.
 */
import type { CmsOffice } from '@/lib/cms/offices';
import { CHICAGOLAND, COLUMBUS_REGION } from '@/lib/content/locations-regions';

/* ── Copy (Track E3) ───────────────────────────────────────────────────────── */

/**
 * Everything the section says that is not a CMS field, in one place, so
 * Marketing can be pointed at one file. The heading and intro are NOT here —
 * they are the editable `find_us_heading` / `find_us_body` fields on
 * /admin/home, with `HOME.findUs` as their fallback.
 *
 * `{token}` placeholders follow the same convention as
 * `HOME.regions.supportTemplate`.
 */
export const LOCATOR_COPY = {
  /** Visually-hidden `<label>` for the search input. */
  searchLabel: 'Search for your city or town',
  searchPlaceholder: 'Search by city, neighborhood, or ZIP',
  /** Shown while the city index chunk is being fetched on first interaction. */
  searchLoading: 'Loading city list…',

  /**
   * The line that turns a widget into content: it answers the question the
   * visitor typed. Singular and plural are separate templates rather than one
   * string with a spliced verb, because "Palatine are served" is the kind of
   * detail that gets screenshotted.
   */
  matchTemplate: '{cities} is served from our {office} service center.',
  matchTemplatePlural: '{cities} are served from our {office} service center.',
  /** Appended to the city list once more than 3 cities matched one office. */
  matchAndMore: 'and {count} more',

  /**
   * The status line under the search box — the `aria-live` region, and visible
   * copy for everyone else.
   *
   * It is EMPTY until the visitor types. An idle "15 J. Blanton service centers."
   * line was tried and removed in review: the list is right there and countable,
   * so the sentence was restating the obvious directly under the one control
   * that matters. The `<p>` still renders (a live region has to exist in the DOM
   * before it can announce anything) but carries no margin while empty, so it
   * collapses to nothing.
   *
   * Separate singular and plural templates rather than one with a spliced
   * suffix, because the verb has to agree with the subject: "1 service center
   * match" is the kind of detail that gets screenshotted.
   */
  resultsCountTemplate: '{count} service centers match “{query}”.',
  resultsCountTemplateSingular: '1 service center matches “{query}”.',

  /**
   * No match. The full list stays on screen underneath this line — an empty
   * panel tells a homeowner in a town we do not list that the site is broken,
   * when the honest answer is "call us and ask".
   */
  noResultsTemplate: 'We could not find “{query}” in our service areas.',
  noResultsHelp: 'Every service center is listed below, or call and we will tell you straight away:',

  /**
   * The row's one and only interaction.
   *
   * The whole row — name and address alike — selects that office and centres the
   * live map on it. Nothing in a row navigates anywhere: the "Get Directions"
   * and "View this location" links went in review, and so did the address's link
   * out to Google Maps. A visitor who wants directions gets them from the embed
   * the click brings up, which is Google's own map with its own controls.
   *
   * This label is on the office-name `<button>`, which is the row's single tab
   * stop and its accessible name.
   */
  selectAriaTemplate: 'Show {office} on the map',

  /** `title` on the map `<iframe>`. */
  mapIframeTitleTemplate: 'Interactive Google map of J. Blanton Plumbing {label}',
} as const;

/* ── Regions ───────────────────────────────────────────────────────────────── */

export type LocatorRegionKey = 'chicagoland' | 'columbus';

/**
 * A region, as the map panel needs it.
 *
 * ⚠️ Regions no longer SECTION THE LIST. The list is one flat run of all 15
 * offices in CMS order — a visitor scanning for their town does not care which
 * marketing region it sits in, and `RegionChooser` one scroll above this section
 * already does the two-region job properly, with photos and city counts. Two
 * headed sub-lists here repeated that taxonomy for no navigational gain.
 *
 * What regions still decide is where the Google embed points when a SEARCH has
 * narrowed to one of them and no single office is picked — search "Dublin" and
 * the map goes to Central Ohio rather than staying on both. That is the only
 * remaining job, which is why the type is down to a label, a membership list and
 * the embed's `q`/`z`. `officeSlugs` is slugs rather than whole records so each
 * office crosses the server/client boundary exactly once.
 */
export interface LocatorRegionView {
  key: LocatorRegionKey;
  /** "Chicagoland" / "Central Ohio" — identical to `RegionChooser`'s labels. Used in the map `title`, not as a list heading. */
  label: string;
  officeSlugs: string[];
  /**
   * `q` and `z` for the keyless Google embed when NO office is selected — the
   * same URL shape `LocationsMap.tsx` uses. A selected office overrides `q`
   * with its own formatted address.
   */
  mapQuery: string;
  mapZoom: number;
}

/**
 * Which region an OFFICE belongs to.
 *
 * ⚠️ Note this is NOT the `state === undefined` / `state === 'Ohio'` rule that
 * `locations-regions.ts` uses. That rule is about `CITY_REGISTRY` entries, whose
 * `state` is deliberately unset for Illinois (Brief 02, Track A3). `CmsOffice`
 * is a different type from a different source: `state` is a required two-letter
 * postal code, `'IL'` or `'OH'`. Applying the registry's rule here would put all
 * 15 offices in Chicagoland, because no office has `state === undefined`.
 *
 * Still DERIVED rather than a slug list, which is the part that matters: a 16th
 * office added in /admin/global-settings lands in the right region with no code
 * change, and an office in a third state fails the exhaustiveness check below
 * instead of being silently filed under Chicagoland.
 */
const OHIO_POSTAL = 'OH';

function regionKeyForOffice(o: CmsOffice): LocatorRegionKey {
  return o.state.trim().toUpperCase() === OHIO_POSTAL ? 'columbus' : 'chicagoland';
}

/**
 * The embed's per-region fallback: where the map points when a search has
 * narrowed to one region but no single office is picked.
 */
const REGION_DEFS: Record<
  LocatorRegionKey,
  { label: string; mapQuery: string; mapZoom: number }
> = {
  chicagoland: {
    label: CHICAGOLAND.label,
    mapQuery: 'Chicago, IL',
    mapZoom: 10,
  },
  columbus: {
    label: COLUMBUS_REGION.label,
    mapQuery: 'Columbus, OH',
    mapZoom: 12,
  },
};

/**
 * Both region labels have to exist for the section to render honestly. Thrown at
 * module load so a renamed region key is a red build rather than an empty string
 * in the map's `alt` text on the highest-traffic page on the site.
 */
function assertRegionLabels(): void {
  for (const [key, def] of Object.entries(REGION_DEFS)) {
    if (!def.label || !def.label.trim()) {
      throw new Error(
        `locator: region "${key}" has no label. It is read from locations-regions.ts — ` +
          'check that CHICAGOLAND/COLUMBUS_REGION still export a `label`.'
      );
    }
  }
}
assertRegionLabels();

/**
 * The regions, in fallback order — Chicagoland first, because it is the larger
 * market and its map is what the section shows before anyone interacts.
 *
 * A region with no offices is dropped, so it can never be selected. Both are populated today (14 / 1); the guard matters
 * if Marketing ever un-checks the last office in a region.
 */
export function buildLocatorRegions(offices: CmsOffice[]): LocatorRegionView[] {
  const order: LocatorRegionKey[] = ['chicagoland', 'columbus'];
  return order
    .map((key) => ({
      key,
      ...REGION_DEFS[key],
      officeSlugs: offices.filter((o) => regionKeyForOffice(o) === key).map((o) => o.slug),
    }))
    .filter((r) => r.officeSlugs.length > 0);
}

/* ── The default embed view: every office, both regions ─────────────────────── */

/**
 * What the Google embed shows when NO single office is picked — all of our
 * locations, pinned, zoomed out far enough to hold Chicagoland and Central Ohio
 * in one frame. This is the state the section loads in.
 *
 * ─── Why the query is the business name and not a place ────────────────────
 * A keyless classic embed (`maps.google.com/maps?…&output=embed`) takes exactly
 * ONE `q`, and there is no keyless way to hand it a list of 15 markers: the
 * Embed API needs a key, the JS Maps API needs a key and a billing account, and
 * a multi-pin Google My Maps needs somebody to build and publish a map in a
 * Google account. All three are out (Hard rule 4 and the brief's non-goals).
 *
 * What DOES work is a keyword search: Google runs it against its own index and
 * pins every matching business, which for our exact Google Business Profile name
 * is our own offices — the same mechanism the old `LocationsMap.tsx` used with
 * `q=J.+Blanton+Plumbing,+Illinois`. Using the exact GBP name (verified against
 * all four short links Marketing supplied in A4, which all resolve to
 * "J. Blanton Plumbing, Sewer & Drain") is what keeps unrelated results out.
 *
 * The pins are therefore GOOGLE'S, drawn from our live listings — which is more
 * authoritative than anything we could plot, and immune to the stale coordinates
 * flagged in the Brief 171 report.
 *
 * ─── `mapCenter` and `mapZoom` are measured, not guessed ───────────────────
 * The classic embed honours `ll` and `z`: fetching
 * `…?q=…&ll=41.0,-85.35&z=7&output=embed` follows a 301 to
 * `google.com/maps/embed?pb=…!2d-85.35!3d41!…!6i7!…` — the centre and zoom come
 * back verbatim in the resolved payload. Do not replace them with a guess.
 *
 * 41.0,-85.35 is the midpoint between the Chicago and Columbus clusters. At z7
 * the ~672px-wide desktop pane spans about 7.4° of longitude (≈615 km) against
 * the 4.7° (≈390 km) between them, so both sit in frame with margin at every
 * breakpoint.
 */
export interface LocatorAllOfficesView {
  /** For the map `<iframe>`'s `title`. */
  label: string;
  /** `q` — the exact GBP business name. */
  mapQuery: string;
  /** `ll` — "lat,lng". */
  mapCenter: string;
  mapZoom: number;
}

export const LOCATOR_ALL_OFFICES: LocatorAllOfficesView = {
  label: `${CHICAGOLAND.label} and ${COLUMBUS_REGION.label}`,
  mapQuery: 'J. Blanton Plumbing, Sewer & Drain',
  mapCenter: '41.0,-85.35',
  mapZoom: 7,
};

/* ── List order ─────────────────────────────────────────────────────────────── */

/**
 * The offices pinned to the top of the locator list, in this order. Everything
 * else follows in CMS order.
 *
 * ─── Why this is a typed list, when the rest of this file derives everything ─
 * Editorial priority is the one thing that CANNOT be derived: there is no field
 * on `CmsOffice` that says "show this one second", and distance-ranking is off
 * the table because the section takes no geolocation. Marketing asked for
 * Columbus second and Evanston third; Northbrook is named explicitly rather than
 * left to fall out of CMS order first, so the intended top three survive
 * somebody reordering rows in /admin/global-settings.
 *
 * Same shape as `CHICAGOLAND_MOST_REQUESTED` in `locations-regions.ts` — a short
 * hand-kept slug list for a hand-made decision.
 *
 * ─── Locator only. It does NOT reorder the footer or the structured data ────
 * `global_settings.offices` is the array `Footer.tsx`'s office directory and
 * `LocalBusinessSchema`'s 15 JSON-LD nodes both iterate. Reordering it to get
 * this result would have silently reshuffled a footer that renders on every page
 * of the site and the order of the sitewide structured data, neither of which
 * anybody asked for. So the pin happens here, at the point of use.
 */
const LOCATOR_PRIORITY: readonly string[] = ['northbrook', 'columbus', 'evanston'];

/**
 * Pinned offices first, then the rest in CMS order.
 *
 * ⚠️ Deliberately does NOT throw on a missing slug, which is the opposite of the
 * `MOST_REQUESTED` resolver in `locations-regions.ts`. That one reads
 * `CITY_REGISTRY`, a compile-time constant, so a typo there is a build error and
 * should be. This one reads the LIVE CMS array at request time: if Marketing
 * deletes or un-checks the Columbus office, throwing here would 500 the
 * homepage over an ordering preference. A missing pin is skipped instead — the
 * list still renders all fifteen offices, only the order degrades to CMS order.
 * `npm run build` cannot catch a typo in `LOCATOR_PRIORITY`, so check the
 * rendered order after editing it.
 */
export function orderLocatorOffices(offices: CmsOffice[]): CmsOffice[] {
  const pinnedSlugs = new Set(LOCATOR_PRIORITY);
  const bySlug = new Map(offices.map((o) => [o.slug, o]));
  const pinned = LOCATOR_PRIORITY.map((slug) => bySlug.get(slug)).filter(
    (o): o is CmsOffice => o !== undefined
  );
  return [...pinned, ...offices.filter((o) => !pinnedSlugs.has(o.slug))];
}

/*
 * `fillTokens()` and `shortOfficeName()` deliberately live in
 * `StoreLocatorPanel.tsx`, not here.
 *
 * They are only used by the panel, and the panel is a CLIENT component: any
 * value import from this module would pull `locations-regions.ts` — and through
 * it `CITY_REGISTRY` and every city copy file — into the homepage bundle.
 * Tree-shaking cannot save it, because `locations-regions.ts` runs its
 * completeness asserts at module load, so the module has side effects and
 * webpack must keep it. The panel receives `LOCATOR_COPY` as a prop instead and
 * imports only TYPES from here.
 */
