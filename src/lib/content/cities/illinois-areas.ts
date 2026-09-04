/**
 * Illinois county assignments, for `/locations/chicagoland`'s county grouping.
 *
 * ─── Why this is a separate map and NOT `RegistryEntry.county` ──────────────
 * The obvious implementation is to populate `county` on the 248 Illinois
 * registry entries, the way Ohio does it, and let `locations-regions.ts` read it
 * back. DO NOT DO THAT without a separate decision, because `county` is not just
 * a grouping key — `CoverageAreaCity` renders BOTH `CityAreaServedSchema` and the
 * `CityAreaDetails` "area facts" block whenever a city has one
 * (`CoverageAreaCity.tsx` §143 and §212, and `CityAreaDetails`'s own
 * `hasAreaData` check). Setting it would therefore add a visible facts panel and
 * a JSON-LD block to 248 live Illinois city pages as a side effect of grouping
 * one index page.
 *
 * So this map is consumed ONLY by `locations-regions.ts`. Every Illinois
 * `RegistryEntry.county` stays `undefined`, and all 248 city pages render exactly
 * as before. If Marketing later wants the area-facts panel on Illinois pages,
 * that is a deliberate follow-up: feed this map into the registry and re-verify
 * those 248 pages.
 *
 * ─── Provenance — READ THIS BEFORE TRUSTING A VALUE ────────────────────────
 * Ohio's county data arrived with the area supply. Illinois' did not: `county`
 * is unset on all 248 entries, and there is no county column anywhere in the
 * repo. The assignments below were compiled from general geographic knowledge of
 * the Chicago metropolitan area, NOT from a supplied dataset or a Census pull.
 *
 * Incorporated municipalities are unambiguous public administrative facts and
 * are marked accordingly. The small unincorporated places (CDPs and named
 * localities) are the risk: several are tiny, several share names with places in
 * other counties, and the dispatch office is only weak corroboration because the
 * McHenry office serves both McHenry and Lake, and `chicago-ravenswood` is the
 * fallback bucket for anything unassigned. Those are listed in
 * `ILLINOIS_COUNTY_UNVERIFIED` and must be checked against a public source
 * before anyone treats this file as authoritative.
 *
 * ─── The straddler rule ────────────────────────────────────────────────────
 * Many Chicago-area municipalities cross county lines. Each is assigned the
 * county containing its SEAT OF GOVERNMENT (village/city hall) — the same
 * primary-county convention the Census uses — and is listed in
 * `ILLINOIS_COUNTY_STRADDLERS` with the other counties it reaches, so a reader
 * who expects Aurora under DuPage can see why it is under Kane.
 */

/**
 * The six counties Chicagoland is described as covering.
 *
 * Deliberately asserted rather than derived: `ILLINOIS_COUNTIES` is checked
 * against the `counties` copy line on the region card (`ILLINOIS_COUNTIES_COPY`
 * in locations-regions.ts). If a future city needs a seventh county — Kendall,
 * say, for an Oswego or Yorkville page — that copy line becomes wrong, and the
 * build should say so rather than let the page contradict itself.
 */
export const ILLINOIS_COUNTIES = ['Cook', 'DuPage', 'Kane', 'Lake', 'McHenry', 'Will'] as const;

export type IllinoisCounty = (typeof ILLINOIS_COUNTIES)[number];

/**
 * The Chicago neighborhood pages, held out of the county groups the way Brief 03
 * holds out the Columbus neighborhoods — listing "Chicago Andersonville" under
 * Cook County beside Skokie and Niles reads as if it were its own municipality.
 *
 * ⚠️ An EXPLICIT LIST, not `slug.startsWith('chicago-')`. Ohio can use a prefix
 * test because Brief 02 minted every Ohio slug under one convention. Illinois
 * cannot, in both directions:
 *   - `chicago-heights` IS prefixed but is Chicago Heights, a south suburb and a
 *     municipality in its own right — a prefix test would misfile it.
 *   - Twelve neighborhoods are registered with BARE slugs (Brief 131 registered
 *     the live URL shape): bucktown, buena-park, gold-coast, hyde-park,
 *     lake-view-east, north-halsted, old-town, roseland, sauganash,
 *     sheridan-park, west-lakeview, wrigleyville — a prefix test would orphan
 *     them into a county group.
 * `chicago` itself is NOT here: it is the city page, and it belongs in Cook
 * County exactly as `columbus` sits in Franklin County on the Ohio side.
 */
export const CHICAGO_NEIGHBORHOOD_SLUGS: readonly string[] = [
  'bucktown',
  'buena-park',
  'chicago-albany-park',
  'chicago-andersonville',
  'chicago-austin',
  'chicago-avondale',
  'chicago-belmont-cragin',
  'chicago-dunning',
  'chicago-edgewater',
  'chicago-edison-park',
  'chicago-forest-glen',
  'chicago-hermosa',
  'chicago-humboldt-park',
  'chicago-irving-park',
  'chicago-jefferson-park',
  'chicago-lake-view',
  'chicago-lincoln-park',
  'chicago-lincoln-square',
  'chicago-logan-square',
  'chicago-montclare',
  'chicago-north-center',
  'chicago-north-park',
  'chicago-norwood-park',
  'chicago-ohare',
  'chicago-portage-park',
  'chicago-ravenswood',
  'chicago-rogers-park',
  'chicago-uptown',
  'chicago-west-ridge',
  'chicago-west-town',
  'gold-coast',
  'hyde-park',
  'lake-view-east',
  'north-halsted',
  'old-town',
  'roseland',
  'sauganash',
  'sheridan-park',
  'west-lakeview',
  'wrigleyville',
];

/**
 * slug → county for every Illinois MUNICIPALITY page (i.e. everything that is
 * not in `CHICAGO_NEIGHBORHOOD_SLUGS`).
 *
 * Grouped by county for review. `assertChicagolandGroupsComplete()` in
 * locations-regions.ts fails the BUILD if this map and the registry ever
 * disagree, so a new Illinois city cannot silently fall off the page.
 */
export const ILLINOIS_COUNTY_BY_SLUG: Readonly<Record<string, IllinoisCounty>> = {
  /* ── Cook ──────────────────────────────────────────────────────────────── */
  alsip: 'Cook',
  'arlington-heights': 'Cook',
  'barrington-hills': 'Cook',
  'blue-island': 'Cook',
  chicago: 'Cook',
  'chicago-heights': 'Cook',
  'country-club-hills': 'Cook',
  'des-plaines': 'Cook',
  'elk-grove': 'Cook',
  evanston: 'Cook',
  flossmoor: 'Cook',
  'forest-park': 'Cook',
  glencoe: 'Cook',
  glenview: 'Cook',
  golf: 'Cook',
  'hanover-park': 'Cook',
  harvey: 'Cook',
  'harwood-heights': 'Cook',
  'hoffman-estates': 'Cook',
  homewood: 'Cook',
  inverness: 'Cook',
  kenilworth: 'Cook',
  'la-grange': 'Cook',
  lemont: 'Cook',
  lincolnwood: 'Cook',
  markham: 'Cook',
  matteson: 'Cook',
  midlothian: 'Cook',
  'morton-grove': 'Cook',
  'mount-prospect': 'Cook',
  niles: 'Cook',
  norridge: 'Cook',
  northbrook: 'Cook',
  northfield: 'Cook',
  'oak-forest': 'Cook',
  'oak-park': 'Cook',
  'orland-park': 'Cook',
  palatine: 'Cook',
  'palos-heights': 'Cook',
  'palos-hills': 'Cook',
  'park-forest': 'Cook',
  'park-ridge': 'Cook',
  'prospect-heights': 'Cook',
  'river-forest': 'Cook',
  'river-grove': 'Cook',
  riverside: 'Cook',
  'rolling-meadows': 'Cook',
  rosemont: 'Cook',
  schaumburg: 'Cook',
  'schiller-park': 'Cook',
  skokie: 'Cook',
  'south-holland': 'Cook',
  'tinley-park': 'Cook',
  westchester: 'Cook',
  'western-springs': 'Cook',
  wheeling: 'Cook',
  wilmette: 'Cook',
  winnetka: 'Cook',

  /* ── DuPage ────────────────────────────────────────────────────────────── */
  bartlett: 'DuPage',
  bloomingdale: 'DuPage',
  'bonnie-brae': 'DuPage',
  'burr-ridge': 'DuPage',
  butterfield: 'DuPage',
  'carol-stream': 'DuPage',
  'clarendon-hills': 'DuPage',
  darien: 'DuPage',
  'downers-grove': 'DuPage',
  elmhurst: 'DuPage',
  'glen-ellyn': 'DuPage',
  hinsdale: 'DuPage',
  keeneyville: 'DuPage',
  lombard: 'DuPage',
  naperville: 'DuPage',
  'oak-brook': 'DuPage',
  'oakbrook-terrace': 'DuPage',
  roselle: 'DuPage',
  'villa-park': 'DuPage',
  westmont: 'DuPage',
  willowbrook: 'DuPage',
  woodridge: 'DuPage',
  'york-center': 'DuPage',

  /* ── Kane ──────────────────────────────────────────────────────────────── */
  'allens-corners': 'Kane',
  almora: 'Kane',
  'alora-heights': 'Kane',
  aurora: 'Kane',
  burlington: 'Kane',
  'campton-hills': 'Kane',
  elgin: 'Kane',
  geneva: 'Kane',
  gilberts: 'Kane',
  hampshire: 'Kane',
  'knoll-creek-west': 'Kane',
  'lily-lake': 'Kane',
  'new-lebanon': 'Kane',
  'pingree-grove': 'Kane',
  'plato-center': 'Kane',
  'south-elgin': 'Kane',
  'st-charles': 'Kane',
  starks: 'Kane',
  'west-highland-acre': 'Kane',
  'williamsburg-green': 'Kane',

  /* ── Lake ──────────────────────────────────────────────────────────────── */
  antioch: 'Lake',
  bannockburn: 'Lake',
  'buffalo-grove': 'Lake',
  'channel-lake': 'Lake',
  'deer-park': 'Lake',
  deerfield: 'Lake',
  'forest-lake': 'Lake',
  'fort-sheridan': 'Lake',
  'fox-lake': 'Lake',
  'fox-lake-hills': 'Lake',
  'grandwood-park': 'Lake',
  grayslake: 'Lake',
  'green-oaks': 'Lake',
  gurnee: 'Lake',
  hainesville: 'Lake',
  'hawthorn-woods': 'Lake',
  'highland-park': 'Lake',
  highwood: 'Lake',
  'indian-creek': 'Lake',
  ingleside: 'Lake',
  'ingleside-shore': 'Lake',
  'island-lake': 'Lake',
  kildeer: 'Lake',
  knollwood: 'Lake',
  'lake-barrington': 'Lake',
  'lake-bluff': 'Lake',
  'lake-catherine': 'Lake',
  'lake-forest': 'Lake',
  'lake-villa': 'Lake',
  'lake-zurich': 'Lake',
  lakemoor: 'Lake',
  libertyville: 'Lake',
  lincolnshire: 'Lake',
  lindenhurst: 'Lake',
  'long-grove': 'Lake',
  'long-lake': 'Lake',
  mettawa: 'Lake',
  mundelein: 'Lake',
  'north-barrington': 'Lake',
  'north-chicago': 'Lake',
  'old-mill-creek': 'Lake',
  riverwoods: 'Lake',
  rondout: 'Lake',
  'round-lake': 'Lake',
  'round-lake-beach': 'Lake',
  'round-lake-heights': 'Lake',
  'round-lake-park': 'Lake',
  'third-lake': 'Lake',
  'tower-lakes': 'Lake',
  'venetian-village': 'Lake',
  'vernon-hills': 'Lake',
  volo: 'Lake',
  wadsworth: 'Lake',
  wauconda: 'Lake',
  waukegan: 'Lake',
  'wildwood-valley': 'Lake',
  'williams-park': 'Lake',

  /* ── McHenry ───────────────────────────────────────────────────────────── */
  algonquin: 'McHenry',
  belden: 'McHenry',
  'bull-valley': 'McHenry',
  'burtons-bridge': 'McHenry',
  cary: 'McHenry',
  'crystal-lake': 'McHenry',
  ferndale: 'McHenry',
  franklinville: 'McHenry',
  greenwood: 'McHenry',
  harmony: 'McHenry',
  hartland: 'McHenry',
  'holiday-hills': 'McHenry',
  huntley: 'McHenry',
  johnsburg: 'McHenry',
  'lake-in-the-hills': 'McHenry',
  'mccullom-lake': 'McHenry',
  mchenry: 'McHenry',
  'mylith-park': 'McHenry',
  'oakwood-hills': 'McHenry',
  'pistakee-highlands': 'McHenry',
  'prairie-grove': 'McHenry',
  richmond: 'McHenry',
  ridgefield: 'McHenry',
  ringwood: 'McHenry',
  'solon-mills': 'McHenry',
  'spring-grove': 'McHenry',
  'trout-valley': 'McHenry',
  'village-of-lakewood': 'McHenry',
  'welco-corners': 'McHenry',
  'wells-corners': 'McHenry',
  'wonder-lake': 'McHenry',
  woodstock: 'McHenry',

  /* ── Will ──────────────────────────────────────────────────────────────── */
  'arbury-hills': 'Will',
  bolingbrook: 'Will',
  'crest-hill': 'Will',
  fairmont: 'Will',
  frankfort: 'Will',
  'frankfort-square': 'Will',
  'homer-glen': 'Will',
  'ingalls-park': 'Will',
  joliet: 'Will',
  lockport: 'Will',
  'lockport-heights': 'Will',
  manhattan: 'Will',
  mokena: 'Will',
  'new-lenox': 'Will',
  plainfield: 'Will',
  'preston-heights': 'Will',
  rockdale: 'Will',
  romeoville: 'Will',
};

/**
 * Municipalities whose boundary crosses a county line. The value is the OTHER
 * county or counties it reaches; the map above assigns the seat-of-government
 * county.
 *
 * Documentation, not logic — nothing reads this at render time. It exists so
 * that "why is Aurora under Kane and not DuPage?" has an answer in the file
 * rather than in someone's memory.
 */
export const ILLINOIS_COUNTY_STRADDLERS: Readonly<Record<string, string>> = {
  algonquin: 'also extends into Kane',
  aurora: 'also extends into DuPage, Kendall and Will',
  'barrington-hills': 'also extends into Lake, Kane and McHenry',
  bartlett: 'also extends into Cook and Kane',
  bolingbrook: 'also extends into DuPage',
  'buffalo-grove': 'also extends into Cook',
  'burr-ridge': 'also extends into Cook',
  deerfield: 'also extends into Cook',
  elgin: 'also extends into Cook',
  'elk-grove': 'also extends into DuPage',
  'fox-lake': 'also extends into McHenry',
  'hanover-park': 'also extends into DuPage',
  'hoffman-estates': 'also extends into Kane',
  huntley: 'also extends into Kane',
  'island-lake': 'also extends into McHenry',
  joliet: 'also extends into Kendall',
  lakemoor: 'also extends into McHenry',
  lemont: 'also extends into DuPage and Will',
  naperville: 'also extends into Will',
  'park-forest': 'also extends into Will',
  plainfield: 'also extends into Kendall',
  roselle: 'also extends into Cook',
  schaumburg: 'also extends into DuPage',
  'st-charles': 'also extends into DuPage',
  'tinley-park': 'also extends into Will',
  woodridge: 'also extends into Will',
};

/**
 * ⚠️ ASSIGNMENTS MARKETING MUST VERIFY.
 *
 * Small unincorporated places (CDPs and named localities) whose county I could
 * not establish with the confidence an incorporated municipality gives. They are
 * assigned above so the page renders complete groups, but each is a candidate
 * for correction, and several share a name with a place in another Illinois
 * county. Check against the Census place file or the county GIS parcel viewer,
 * then delete the slug from this list.
 *
 * Nothing reads this at render time either — it is a review queue. `scripts/`
 * has no checker for it; the list itself is the deliverable.
 */
export const ILLINOIS_COUNTY_UNVERIFIED: readonly string[] = [
  'allens-corners',
  'almora',
  'alora-heights',
  'belden',
  'bonnie-brae',
  'ferndale',
  'harmony',
  'hartland',
  'knoll-creek-west',
  'mylith-park',
  'new-lebanon',
  'starks',
  'welco-corners',
  'wells-corners',
  'west-highland-acre',
  'wildwood-valley',
  'williams-park',
  'williamsburg-green',
];

/**
 * Every Illinois county that has at least one municipality page, A→Z. Derived
 * from the map — the same rule Ohio's `ohioCounties()` follows, so the group
 * builder never hardcodes a county list.
 */
export function illinoisCounties(): string[] {
  return Array.from(new Set(Object.values(ILLINOIS_COUNTY_BY_SLUG))).sort((a, b) =>
    a.localeCompare(b)
  );
}
