/**
 * City V2 CMS (Brief 209 follow-up, 2026-10-14) — how the 145 City Service Pages V2 and the 5 City
 * Hubs V2 map onto what the database stores, and back. The same design as Brief 204's Sewer v2
 * (src/lib/sewer-v2-cms/model.ts), keyed by city:
 *
 *   `city_service_pages.v2_content` → `CityServiceStored` (one per city/service page)
 *   `city_pages.v2_content`         → `CityHubStored` (the hub + its shared template sections + the
 *                                     parts the city's 29 service pages share)
 *   meta title/description          → each row's existing `meta_title` / `meta_description`
 *
 * A version (`page_drafts.content`) carries `CityV2DraftContent`, marked `template: 'city-v2'`. A
 * version WITHOUT the marker is "old-shaped" (the legacy template): read-only on these pages and
 * never publishable onto them (src/lib/cms/city-v2-write.ts).
 *
 * Pure and client-safe (the admin editor imports it). The code defaults, which load the page data,
 * live in ./code-defaults.ts (server-only).
 */
import { CITY_V2_CITIES, isCityV2City, isCityV2ServiceKey } from '@/lib/content/city-services-v2/registry';

export const CITY_V2_TEMPLATE = 'city-v2';
export const CITY_V2_LABEL = 'City v2';

/** The version name the seed gives each existing row's pre-v2 content. */
export const PRE_V2_ARCHIVE_LABEL = 'Pre-v2 archive (2026-10)';
/** Shown wherever an old-shaped version meets the v2 editor or publish path. */
export const OLD_SHAPE_MESSAGE =
  "This version uses the old layout and can't be edited or published here.";

/** A version's content for one of the 150 pages. */
export interface CityV2DraftContent {
  template: typeof CITY_V2_TEMPLATE;
  /** `CityServiceStored` for a `city-service` page, `CityHubStored` for a `city` page. */
  cityV2: unknown;
  metaTitle: string;
  metaDescription: string;
}

export function isCityV2DraftContent(content: unknown): content is CityV2DraftContent {
  return (
    !!content &&
    typeof content === 'object' &&
    !Array.isArray(content) &&
    (content as Record<string, unknown>).template === CITY_V2_TEMPLATE &&
    !!(content as Record<string, unknown>).cityV2 &&
    typeof (content as Record<string, unknown>).cityV2 === 'object'
  );
}

/** Is (page type, page slug) one of the 150 City V2 pages? `city-service` slugs are `{city}/{service}`. */
export function isCityV2Target(pageType: string, slug: string): boolean {
  if (pageType === 'city') return isCityV2City(slug);
  if (pageType === 'city-service') return isCityV2ServiceKey(slug);
  return false;
}

export { CITY_V2_CITIES };
