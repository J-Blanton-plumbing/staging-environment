/**
 * City Service Pages V2 (Brief 209) — the CODE MODULES of the 145 `/{city}/{service}` pages for
 * Northbrook, Columbus, Tinley Park, Joliet and Naperville (29 services each).
 *
 * Since the CMS wiring (Brief 209 follow-up, 2026-10-14) the pages render from their
 * `city_service_pages` rows (`v2_content`) and the city's shared parts from `city_pages`
 * (`v2_content.shared`) — see src/lib/cms/city-v2.ts. These modules are what Brief 204's code
 * modules are for the sewer pages:
 *   - the LAYOUT TEMPLATE every save is locked against (src/lib/city-v2-cms/conform.ts), and
 *   - the FALLBACK when a page has no row, no v2 content yet, or the database is unreachable.
 * So changing the design of these pages in code means migrating the stored `v2_content` in the
 * same deploy, or every edited page falls back to the code copy (CLAUDE.md gotcha 30).
 *
 * `data/{city}.json` is GENERATED from the approved Brief 209 package (MDs + §4 fact-check
 * corrections + Marketing's 2026-10-14 copy fixes). Server-only: ~3 MB of JSON — never import it
 * from a client component or middleware (src/lib/content/city-services-v2/registry.ts holds the
 * page list without content).
 */
import type { CityServiceCode } from './types';
import { isCityV2Service, type CityV2City } from './registry';
import northbrook from './data/northbrook.json';
import columbus from './data/columbus.json';
import tinleyPark from './data/tinley-park.json';
import joliet from './data/joliet.json';
import naperville from './data/naperville.json';

type CityPages = Readonly<Record<string, CityServiceCode>>;

const CODE: Readonly<Record<CityV2City, CityPages>> = {
  northbrook: northbrook as unknown as CityPages,
  columbus: columbus as unknown as CityPages,
  'tinley-park': tinleyPark as unknown as CityPages,
  joliet: joliet as unknown as CityPages,
  naperville: naperville as unknown as CityPages,
};

/** A page's code module, or undefined when (city, service) is not a V2 page. */
export function cityServiceCode(city: string, service: string): CityServiceCode | undefined {
  return isCityV2Service(city, service) ? CODE[city as CityV2City][service] : undefined;
}

export * from './registry';
export { cityServiceSharedDefault, cityV2Name } from './shared';
export type { CityImage, CityServiceCode, CityServiceSchemaFields, CityServiceSection, CityServiceShared, CityServiceStored } from './types';
