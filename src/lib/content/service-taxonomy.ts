/**
 * Shared service taxonomy for the city-service silo (Brief 64).
 *
 * After Brief 64, `city_service_pages.parent_slug` stores the SERVICE HUB slug
 * (the top-level `/{hub}` page), not a broad category. The CATEGORY is now a
 * DERIVED value, resolved from the service/hub slug via `SERVICE_TO_CATEGORY`
 * (which mirrors the hand-curated `sub_service_pages` taxonomy) with a keyword
 * fallback. Because the admin `/admin/cities` view is a client component it can't
 * query the DB, so this static map — kept in sync with `sub_service_pages` — is
 * the client-side source of truth for categorization and breadcrumb silos.
 *
 * Single source of truth for:
 *   - service/hub slug → category            (deriveCategory)
 *   - category key → display label           (CATEGORY_LABELS)
 *   - a city-service service_slug → its live hub slug (CITY_SLUG_TO_HUB_ALIAS)
 *   - which hub / category routes are live    (isLiveBreadcrumbRoute)
 *   - human display name for a service/hub slug (serviceDisplayName)
 *   - breadcrumb trail builders               (cityServiceCrumbs / subServiceCrumbs)
 */

export const CATEGORY_DEFS: Array<{ key: string; label: string }> = [
  { key: 'plumbing', label: 'Plumbing' },
  { key: 'sewer', label: 'Sewer' },
  { key: 'drain', label: 'Drain' },
  { key: 'water-heater', label: 'Water Heater' },
  { key: 'water-quality', label: 'Water Quality' },
  { key: 'commercial', label: 'Commercial' },
];

export const CATEGORY_KEYS = CATEGORY_DEFS.map((c) => c.key);

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORY_DEFS.map((c) => [c.key, c.label])
);

/**
 * service/hub slug → category. Mirrors the hand-curated `sub_service_pages`
 * taxonomy plus the location-suffixed hub variants. `emergency-plumbing` maps to
 * `plumbing` (Brief 64 decision — the breadcrumb target is Home › Plumbing ›
 * Emergency Plumbing). In `/admin/cities` the emergency row is still special-cased
 * as a direct link (keyed off `service_slug`), so this entry only affects the
 * derived category used by the breadcrumb silo.
 */
export const SERVICE_TO_CATEGORY: Record<string, string> = {
  // Plumbing
  'bathroom-plumbing': 'plumbing',
  'bathroom-plumbing-chicago': 'plumbing',
  'kitchen-plumbing': 'plumbing',
  'kitchen-faucet-repair-and-installation': 'plumbing',
  'faucet-installation-repair': 'plumbing',
  'toilet-installation-repair': 'plumbing',
  'shower-repair': 'plumbing',
  'garbage-disposal-installation-repair': 'plumbing',
  'burst-pipe-repair': 'plumbing',
  'leak-repairs': 'plumbing',
  'plumbing-fixture-installations': 'plumbing',
  'plumbing-maintenance': 'plumbing',
  'plumbing-services': 'plumbing',
  'laundry-room-plumbing': 'plumbing',
  'emergency-plumbing': 'plumbing',
  'gas-lines': 'plumbing',
  'gas-line-installation': 'plumbing',
  'gas-line-repair': 'plumbing',
  'gas-line-leak-detection': 'plumbing',
  'gas-fireplace': 'plumbing',
  // Sewer
  'sewer-rodding': 'sewer',
  'sewer-repair': 'sewer',
  'sewer-maintenance': 'sewer',
  'sewer-drain-clearing': 'sewer',
  'sewage-line-backup-services': 'sewer',
  'overhead-sewer-systems': 'sewer',
  'trenchless-sewer-repair': 'sewer',
  'video-camera-sewer-inspections': 'sewer',
  'hydro-jetting': 'sewer',
  'home-repipe': 'sewer',
  'basement-waterproofing': 'sewer',
  'flood-control-maintenance': 'sewer',
  'ejector-pump': 'sewer',
  'sump-pumps': 'sewer',
  // Drain
  'basement-flooding': 'drain',
  'drain-cleaning': 'drain',
  'drain-cleaning-services-in-chicago': 'drain',
  'clogged-drains': 'drain',
  'clogged-drains-in-chicago': 'drain',
  'drain-camera-inspection': 'drain',
  'kitchen-sink-drain': 'drain',
  'catch-basin': 'drain',
  // Water Heater
  'water-heater-installation': 'water-heater',
  'water-heater-repair': 'water-heater',
  'water-heater-maintenance': 'water-heater',
  'tankless-water-heater': 'water-heater',
  'residential-water-heater': 'water-heater',
  'commercial-water-heater': 'water-heater',
  'restaurant-water-heater': 'commercial',
  // Water Quality
  'water-filtration-systems': 'water-quality',
  'water-testing': 'water-quality',
  // Commercial
  'commercial-drain-service': 'commercial',
  'commercial-jetting': 'commercial',
  'restaurant-drain-clearing': 'commercial',
  'restaurant-plumbing-services': 'commercial',
};

/**
 * Keyword fallback for any service slug not in the explicit map above. Order
 * matters — first match wins. Returns null if nothing matches → Uncategorized.
 */
export function inferCategoryByKeyword(slug: string): string | null {
  if (/water-heater|tankless/.test(slug)) return 'water-heater';
  if (/filtration|water-testing|water-quality/.test(slug)) return 'water-quality';
  if (/commercial|restaurant/.test(slug)) return 'commercial';
  if (/sewer|sewage|overhead|hydro-jetting|ejector|sump|flood|basement|repipe/.test(slug)) return 'sewer';
  if (/drain|catch-basin/.test(slug)) return 'drain';
  if (/plumb|gas|faucet|toilet|shower|pipe|leak|fixture|garbage-disposal|sink|laundry/.test(slug)) return 'plumbing';
  return null;
}

/** Resolve a service/hub slug to a category key (or null = Uncategorized). */
export function deriveCategory(slug: string): string | null {
  return SERVICE_TO_CATEGORY[slug] ?? inferCategoryByKeyword(slug);
}

/**
 * A city-service `service_slug` whose top-level hub page lives at a
 * location-suffixed slug (there is no bare `/{service_slug}` hub, but there IS a
 * location-suffixed one). Mirrors `CITY_SLUG_TO_SUB_SLUG_ALIAS` in
 * scripts/copy-sub-service-parents-to-city.ts and the Track-A migration.
 */
export const CITY_SLUG_TO_HUB_ALIAS: Record<string, string> = {
  'bathroom-plumbing': 'bathroom-plumbing-chicago',
  'clogged-drains': 'clogged-drains-in-chicago',
  'drain-cleaning': 'drain-cleaning-services-in-chicago',
};

/** The hub slug (top-level `/{hub}` page) for a city-service service_slug. */
export function hubSlugFor(serviceSlug: string): string {
  return CITY_SLUG_TO_HUB_ALIAS[serviceSlug] ?? serviceSlug;
}

/**
 * Hub/service routes confirmed live in the build (CLAUDE.md + Brief 64 addendum
 * 2026-07-02). Ancestor breadcrumb crumbs pointing at a NON-live route render as
 * plain text (still emitted in the JSON-LD with the intended canonical URL); once
 * the page ships, adding its slug here flips the crumb to a real link.
 */
export const LIVE_HUB_SLUGS = new Set<string>([
  'emergency-plumbing',
  'gas-lines',
  'hydro-jetting',
  'sewer-rodding',
  'sewer-repair',
  'sewer-maintenance',
  'basement-flooding',
  'commercial-water-heater',
  'residential-water-heater',
  'tankless-water-heater',
  'water-filtration-systems',
  'kitchen-plumbing',
  'kitchen-sink-drain',
  'home-repipe',
  'laundry-room-plumbing',
  'clogged-drains-in-chicago',
  'drain-cleaning-services-in-chicago',
  'bathroom-plumbing-chicago',
  'commercial-drain-service',
  'commercial-jetting',
  'restaurant-drain-clearing',
  'restaurant-plumbing-services',
  'restaurant-water-heater',
]);

/** Category hub pages that are live: `/services/{category}` (all 6 per addendum). */
export const LIVE_CATEGORY_SLUGS = new Set<string>(CATEGORY_KEYS);

/** True if a breadcrumb href points at a route that actually exists in the build. */
export function isLiveBreadcrumbRoute(href: string): boolean {
  if (href === '/') return true;
  const cat = href.match(/^\/services\/([a-z0-9-]+)$/);
  if (cat) return LIVE_CATEGORY_SLUGS.has(cat[1]);
  const hub = href.replace(/^\//, '');
  return LIVE_HUB_SLUGS.has(hub);
}

/**
 * Human display name for a service/hub slug. Location marketing suffixes
 * (`-services-in-chicago`, `-in-chicago`, `-chicago`) are stripped so the
 * location-suffixed hubs read cleanly in a breadcrumb (e.g.
 * `clogged-drains-in-chicago` → "Clogged Drains").
 */
const LOCATION_SUFFIXES = [/-services-in-chicago$/, /-in-chicago$/, /-chicago$/];
export function serviceDisplayName(slug: string): string {
  let s = slug;
  for (const re of LOCATION_SUFFIXES) {
    if (re.test(s)) {
      s = s.replace(re, '');
      break;
    }
  }
  return s
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export interface Crumb {
  label: string;
  href: string;
}

/**
 * Breadcrumb trail for a city-service page:
 *   Home › {Category} › {Service hub} › {City} {Service} (current)
 * Category is derived from the service slug; the hub crumb points at the
 * top-level hub page (location-suffixed where applicable).
 */
export function cityServiceCrumbs(
  citySlug: string,
  cityName: string,
  serviceSlug: string,
  serviceTitle: string
): Crumb[] {
  const category = deriveCategory(serviceSlug);
  const hub = hubSlugFor(serviceSlug);
  const crumbs: Crumb[] = [{ label: 'Home', href: '/' }];
  if (category) {
    crumbs.push({ label: CATEGORY_LABELS[category], href: `/services/${category}` });
  }
  crumbs.push({ label: serviceDisplayName(hub), href: `/${hub}` });
  crumbs.push({ label: `${cityName} ${serviceTitle}`, href: `/${citySlug}/${serviceSlug}` });
  return crumbs;
}

/**
 * Breadcrumb trail for a sub-service (hub) page:
 *   Home › {Category} › {Service hub} (current)
 */
export function subServiceCrumbs(slug: string): Crumb[] {
  const category = deriveCategory(slug);
  const crumbs: Crumb[] = [{ label: 'Home', href: '/' }];
  if (category) {
    crumbs.push({ label: CATEGORY_LABELS[category], href: `/services/${category}` });
  }
  crumbs.push({ label: serviceDisplayName(slug), href: `/${slug}` });
  return crumbs;
}
