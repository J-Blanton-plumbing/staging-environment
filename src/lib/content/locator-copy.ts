/**
 * The store locator's interface text (Brief 171 Track E3). Split out of locator.ts by Brief 219 so the
 * /admin/home editor can import it without pulling the city registry into a client bundle; locator.ts
 * re-exports both names.
 *
 * Since Brief 219 every string here is editable in /admin/home (the `locator_*` fields); these values
 * are the fallback for a blank field. `{token}` placeholders are filled at render and must be kept.
 */
export const LOCATOR_COPY = {
  /** Visually-hidden `<label>` for the search input. */
  searchLabel: 'Search for your city or town',
  searchPlaceholder: 'Search by city, neighborhood, or ZIP',
  /** Shown while the city index chunk is being fetched on first interaction. */
  searchLoading: 'Loading city list…',

  /**
   * The header above the office list (Brief 178, Track C2).
   *
   * `{count}` is `offices.length` — NEVER typed. An idle "18 locations" was
   * previously argued down as restating the obvious (see `resultsCountTemplate`
   * below), and that argument was wrong for one specific reason: the desktop
   * list is a ~469px window onto ~1,500px of rows, so six of eighteen offices
   * are visible and nothing else on screen says how many there are. It is the
   * written half of the same affordance as the scroll fade.
   *
   * It is the TOTAL, not the match count, and it does not change while
   * searching — the `aria-live` status line under the search box is what reports
   * matches.
   */
  officeCountTemplate: '{count} locations',

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

/**
 * Brief 219: the locator text as the homepage passes it — the same keys as `LOCATOR_COPY`, with plain
 * string values, because /admin/home makes every one of them editable (`HOME.locator` is the fallback).
 */
export type LocatorCopy = { [K in keyof typeof LOCATOR_COPY]: string };
