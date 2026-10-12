/**
 * City Hubs V2 (Brief 205) — the registry of city hubs rendered by `[city]/page.tsx`.
 *
 * A slug listed here renders `CityHubView` INSTEAD of whichever template its `city_pages` row
 * selects. The dispatch is by code, deliberately, exactly like Brief 200's sewer pages: these
 * pages are not wired to the CMS yet, so admin edits to these 5 cities' `city_pages` rows do NOT
 * reach the live page until the CMS follow-up brief (Marketing, 2026-10-12). Remove a slug from
 * here to hand the city back to its row's template.
 *
 * Every other city page is untouched.
 */
import type { CityHubContent } from './types';
import { JOLIET_HUB } from './joliet';
import { TINLEY_PARK_HUB } from './tinley-park';
import { COLUMBUS_HUB } from './columbus';
import { NORTHBROOK_HUB } from './northbrook';
import { NAPERVILLE_HUB } from './naperville';

export const CITY_HUBS: Readonly<Record<string, CityHubContent>> = {
  joliet: JOLIET_HUB,
  'tinley-park': TINLEY_PARK_HUB,
  columbus: COLUMBUS_HUB,
  northbrook: NORTHBROOK_HUB,
  naperville: NAPERVILLE_HUB,
};

export const CITY_HUB_SLUGS: readonly string[] = Object.keys(CITY_HUBS);

export function getCityHub(slug: string): CityHubContent | undefined {
  return Object.prototype.hasOwnProperty.call(CITY_HUBS, slug) ? CITY_HUBS[slug] : undefined;
}

export type { CityHubContent } from './types';
