/**
 * Brief 217 (Track C, Marketing 2026-10-22 decision 4) — "one location per city page": which request
 * paths render the City Hub or City Service V2 template.
 *
 * Those pages signal ONLY their own office in structured data — the hub's Plumber node (Brief 216)
 * and, on a service page, the same node built from its hub — so the footer's sitewide all-offices
 * PlumbingBusiness graph is switched off on them. Every other page keeps it unchanged.
 *
 * Scoped by TEMPLATE, never by a city list: the answer comes from the same cached resolvers the two
 * routes dispatch on (`resolveCityHub` / `resolveCityServiceV2`, React `cache()` — called with the
 * routes' own arguments, so the page's call is the same memoised result, not a second DB read). A city
 * moved onto (or off) City Hub in /admin follows automatically; an unpublished page (404) or a legacy
 * template keeps the footer graph.
 */
import { resolveCityHub } from '@/lib/cms/city-hubs';
import { resolveCityServiceV2 } from '@/lib/cms/city-services-v2';
import { getCity } from '@/lib/content/cities';

/**
 * Brief 229 adds two templates whose structured data names offices in its own way, so the footer's
 * all-offices graph is off on them too: the Tier 3 town page (README §2: no Plumber with an address
 * on a town page — the Service's provider is the hub's #office @id only) and the three locations pages
 * (an ItemList of the offices as Plumber items, per the package's schema spec).
 */
export type CityTemplate = 'city-hub' | 'city-service-v2' | 'tier3-town' | 'locations';

const LOCATIONS_PATHS: ReadonlySet<string> = new Set(['/locations', '/locations/illinois', '/locations/ohio']);

/** The city template `pathname` renders, or null (any other page — including a 404). Never throws. */
export async function cityTemplateForPath(pathname: string | null | undefined): Promise<CityTemplate | null> {
  if (!pathname) return null;
  if (LOCATIONS_PATHS.has(pathname)) return 'locations';
  const seg = pathname.split('/').filter(Boolean);
  if (seg.length === 1 && getCity(seg[0])?.pilot?.kind === 'town') return 'tier3-town';
  if (seg.length < 1 || seg.length > 2 || seg.some((s) => !/^[a-z0-9-]+$/.test(s))) return null;
  try {
    if (seg.length === 1) return (await resolveCityHub(seg[0])).kind === 'hub' ? 'city-hub' : null;
    return (await resolveCityServiceV2(seg[0], seg[1])).kind === 'v2' ? 'city-service-v2' : null;
  } catch {
    return null; // the page itself reports the failure; the footer simply stays as it always was
  }
}
