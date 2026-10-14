/**
 * City Service Pages V2 (Brief 209) — WHICH pages are V2, with no content attached.
 *
 * Kept apart from the page data (~1.9 MB of JSON) so the draft/publish guards in src/lib/cms and the
 * admin can ask "is this one of the V2 pages?" without loading it. 5 cities × the same 29 services.
 */
export const CITY_V2_CITIES = ['northbrook', 'columbus', 'tinley-park', 'joliet', 'naperville'] as const;
export type CityV2City = (typeof CITY_V2_CITIES)[number];

export const CITY_V2_SERVICES = [
  'basement-flooding',
  'burst-pipe-repair',
  'catch-basin',
  'commercial-water-heater',
  'drain-cleaning',
  'ejector-pump',
  'emergency-plumbing',
  'faucet-installation-repair',
  'garbage-disposal-installation-repair',
  'gas-fireplace',
  'gas-line-installation',
  'gas-line-repair',
  'hydro-jetting',
  'leak-repairs',
  'overhead-sewer-systems',
  'plumbing-maintenance',
  'sewage-line-backup-services',
  'sewer-maintenance',
  'sewer-repair',
  'sewer-rodding',
  'shower-repair',
  'sump-pumps',
  'tankless-water-heater',
  'toilet-installation-repair',
  'trenchless-sewer-repair',
  'video-camera-sewer-inspections',
  'water-filtration-systems',
  'water-heater-installation',
  'water-heater-repair',
] as const;
export type CityV2Service = (typeof CITY_V2_SERVICES)[number];

/** Cities whose V2 pages show the Central Ohio phone (Global Settings, Brief 192). */
export const CENTRAL_OHIO_V2_CITIES: ReadonlySet<string> = new Set(['columbus']);

export function isCityV2City(slug: string): slug is CityV2City {
  return (CITY_V2_CITIES as readonly string[]).includes(slug);
}

export function isCityV2Service(city: string, service: string): boolean {
  return isCityV2City(city) && (CITY_V2_SERVICES as readonly string[]).includes(service);
}

/** `northbrook/drain-cleaning` — the `page_drafts.page_slug` of a city-service page (Brief 159). */
export function isCityV2ServiceKey(pageSlug: string): boolean {
  const [city, service, extra] = pageSlug.split('/');
  return extra === undefined && !!service && isCityV2Service(city, service);
}
