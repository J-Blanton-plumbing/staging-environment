/**
 * Sub-service content registry (brief-11). Maps a top-level slug → its
 * `ServiceContent` data file, mirroring the cities registry pattern
 * (`lib/content/cities/index.ts`).
 *
 * Each new sub-service is a one-line add: import the data file and drop it in
 * `SERVICE_CONTENT`. The static route folder under `src/app/[slug]/page.tsx`
 * then calls `getService(slug)` and renders `ServicePageTemplate`.
 */
import type { ServiceContent } from '@/types/service';
import { SEWER_RODDING } from './sewer-rodding';
import { HYDRO_JETTING_SERVICE } from './hydro-jetting';

/**
 * Brief 146 (Track B): `gas-lines` was retired from this registry — `/gas-lines`
 * now renders from `sub_service_pages` through `SubServicePageView` like the other
 * 19 top-level sub-service routes, none of which carry a static fallback, so
 * `./gas-lines.ts` had no remaining reader and was deleted. Only `/sewer-rodding`
 * and `/hydro-jetting` still use this registry (Brief 145 findings D-1/D-2 are
 * still open — consolidating them is a separate marketing decision).
 */
const SERVICE_CONTENT: Record<string, ServiceContent> = {
  'sewer-rodding': SEWER_RODDING,
  'hydro-jetting': HYDRO_JETTING_SERVICE,
};

/** Resolve a slug to its service content, or `undefined` if unregistered. */
export function getService(slug: string): ServiceContent | undefined {
  return SERVICE_CONTENT[slug];
}

/** All registered sub-service slugs (for static-param generation later). */
export function getServiceSlugs(): string[] {
  return Object.keys(SERVICE_CONTENT);
}
