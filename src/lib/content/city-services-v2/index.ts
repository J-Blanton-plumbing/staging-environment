/**
 * City Service Pages V2 (Brief 209, live 2026-10-14) — the 145 `/{city}/{service}` pages for
 * Northbrook, Columbus, Tinley Park, Joliet and Naperville (29 services each).
 *
 * A (city, service) pair listed here renders `CityServiceV2View` INSTEAD of the shared
 * CityServicePageTemplate. The dispatch is by code, exactly like the Brief 205 city hubs: these
 * pages are not wired to the CMS, so admin edits (and draft previews) of the 145
 * `city_service_pages` rows do NOT reach the live page until a CMS follow-up brief. The Brief 159
 * publish gate still applies (an unpublished row 404s). Every other city-service page is untouched.
 *
 * `data/{city}.json` is GENERATED from the approved Brief 209 package (New Pages/City Service
 * Pages V2/_source MDs + the Highland Park template's block layout and images, with the §4
 * fact-check corrections and Marketing's 2026-10-14 go-live copy fixes applied). Edit copy there
 * only as a deliberate content change; the structure is checked by the view's types.
 *
 * Server-only: ~1.9 MB of JSON. Never import this from a client component or from middleware —
 * the fold redirects the middleware needs live in src/lib/redirects/city-service-folds.ts.
 */
import type { CityServiceV2Page } from './types';
import northbrook from './data/northbrook.json';
import columbus from './data/columbus.json';
import tinleyPark from './data/tinley-park.json';
import joliet from './data/joliet.json';
import naperville from './data/naperville.json';

type CityPages = Readonly<Record<string, CityServiceV2Page>>;

export const CITY_SERVICES_V2: Readonly<Record<string, CityPages>> = {
  northbrook: northbrook as unknown as CityPages,
  columbus: columbus as unknown as CityPages,
  'tinley-park': tinleyPark as unknown as CityPages,
  joliet: joliet as unknown as CityPages,
  naperville: naperville as unknown as CityPages,
};

/** Cities whose V2 service phone is the Central Ohio number (Global Settings, Brief 192). */
export const CENTRAL_OHIO_V2_CITIES: ReadonlySet<string> = new Set(['columbus']);

const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

export function getCityServiceV2(city: string, service: string): CityServiceV2Page | undefined {
  if (!own(CITY_SERVICES_V2, city)) return undefined;
  const pages = CITY_SERVICES_V2[city];
  return own(pages, service) ? pages[service] : undefined;
}

export type { CityServiceV2Page, CsBlock, CsImage, Rich } from './types';
