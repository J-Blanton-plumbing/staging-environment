/**
 * Brief 227 (Track E, Marketing 2026-11-13) — the legacy German Village URLs, retired in favour of the
 * German Village OFFICE PAGE `/columbus-german-village-oh` (an office page has no service pages of its
 * own; its service links go to the Columbus hub's — src/lib/content/cities `officePage`).
 *
 *   /columbus-german-village            → /columbus-german-village-oh       (the page moved)
 *   /columbus-german-village/{service}  → /columbus/{service}               (decision 3)
 *
 * The `/{service}` rule is applied ONLY where `/columbus/{service}` is itself a page that serves (200):
 * a city-service slug that is neither one of Columbus's Brief 209 folds (those 301 on to another
 * Columbus page) nor retired (`plumbing-services` 301s to `/columbus`). The brief says not to guess a
 * target for a slug with no matching Columbus service page, so the 11 fold slugs are NOT redirected
 * here — `GERMAN_VILLAGE_UNMATCHED` lists them with the target Columbus's own fold would give, for
 * Marketing to approve (adding them is moving them into the map below). Until then those 11 legacy
 * pages keep rendering exactly as today (noindex, never in the sitemap — Ohio city-service pages).
 *
 * `/columbus-german-village/plumbing-services` already 301'd to `/columbus-german-village` (Brief 211's
 * derived rule); that would now be a chain, so it is collapsed to the page's new address — the same
 * decision ("a retired city-service URL goes to its city's page"), one hop.
 *
 * Every entry is one hop to a 200 (`scripts/validate-sitemap.ts` fails the build on a chain), and the
 * legacy row is never touched: it is archived ("Pre-office archive (2026-11)") and stays registered,
 * so removing this map (plus the sitemap exclusion in `RETIRED_CITY_PAGES`) restores the old page.
 */
import { getAllServiceSlugs } from '@/lib/content/city-services';
import { CITY_SERVICE_FOLD_REDIRECTS } from './city-service-folds';
import { isRetiredCityService, RETIRED_CITY_SERVICE_SLUGS } from './retired-city-services';

/** The legacy coverage-area page that moved to an office page, and where it went. */
export const RETIRED_CITY_PAGES: Readonly<Record<string, string>> = Object.freeze({
  'columbus-german-village': 'columbus-german-village-oh',
});

const LEGACY = 'columbus-german-village';
const NEW = RETIRED_CITY_PAGES[LEGACY];
const SERVICE_HUB = 'columbus';

/** `/columbus/{service}` serves a page (not a fold, not retired). */
const columbusServes = (service: string) => !CITY_SERVICE_FOLD_REDIRECTS[`/${SERVICE_HUB}/${service}`] && !isRetiredCityService(service);

/** The slugs with no Columbus page of their own: NOT redirected (the brief's "don't guess"), reported. */
export const GERMAN_VILLAGE_UNMATCHED: ReadonlyArray<{ from: string; proposed: string; why: string }> = Object.freeze(
  getAllServiceSlugs()
    .filter((s) => CITY_SERVICE_FOLD_REDIRECTS[`/${SERVICE_HUB}/${s}`])
    .sort()
    .map((s) => ({
      from: `/${LEGACY}/${s}`,
      proposed: CITY_SERVICE_FOLD_REDIRECTS[`/${SERVICE_HUB}/${s}`],
      why: `/${SERVICE_HUB}/${s} is a Brief 209 fold (301 → ${CITY_SERVICE_FOLD_REDIRECTS[`/${SERVICE_HUB}/${s}`]})`,
    }))
);

export const OFFICE_PAGE_REDIRECTS: Readonly<Record<string, string>> = Object.freeze({
  [`/${LEGACY}`]: `/${NEW}`,
  ...Object.fromEntries(
    getAllServiceSlugs()
      .filter(columbusServes)
      .sort()
      .map((s) => [`/${LEGACY}/${s}`, `/${SERVICE_HUB}/${s}`])
  ),
  // Chain collapse of Brief 211's derived `/{city}/plumbing-services` → `/{city}` (see the header).
  ...Object.fromEntries(RETIRED_CITY_SERVICE_SLUGS.map((s) => [`/${LEGACY}/${s}`, `/${NEW}`])),
});

/** A retired city page (it 301s): never in the sitemap. */
export function isRetiredCityPage(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(RETIRED_CITY_PAGES, slug);
}
