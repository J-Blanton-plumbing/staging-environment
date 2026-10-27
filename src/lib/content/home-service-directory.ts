import { SERVICES } from '@/lib/services';
import {
  CATEGORY_DEFS,
  SUB_SERVICE_ROUTES,
  deriveCategory,
  globalServiceHref,
  serviceDisplayName,
} from '@/lib/content/service-taxonomy';

/**
 * Brief 220 (B3) — Homepage 2026's "Explore all our plumbing services" directory, GENERATED from the
 * services data the site already routes with, never typed: every top-level service page the build
 * serves (`SUB_SERVICE_ROUTES` + Emergency Plumbing, i.e. `LIVE_HUB_SLUGS`), grouped by its taxonomy
 * category (`deriveCategory`, in `CATEGORY_DEFS` order), labelled by `serviceDisplayName`, linked by
 * the Brief 138 rule (`globalServiceHref`). The count is derived. A service page added to the
 * taxonomy appears here with no homepage edit.
 *
 * Emergency gets its own first group, as on the prototype and in `SERVICES` (the taxonomy files
 * `emergency-plumbing` under Plumbing for breadcrumbs, but the homepage lists it as a category).
 * Within a group, A–Z by label. Each service appears ONCE (the prototype listed Commercial Water
 * Heater under both Water Heater and Commercial; the taxonomy files it under Water Heater).
 */
export interface DirectoryGroup {
  label: string;
  items: Array<{ label: string; href: string }>;
}

export function homeServiceDirectory(): { groups: DirectoryGroup[]; count: number } {
  const emergency = SERVICES.find((s) => s.slug === 'emergency-plumbing');
  const groups: DirectoryGroup[] = [
    { label: emergency?.name ?? 'Emergency', items: [{ label: serviceDisplayName('emergency-plumbing'), href: '/emergency-plumbing' }] },
  ];
  for (const cat of CATEGORY_DEFS) {
    const items = [...SUB_SERVICE_ROUTES]
      .filter((slug) => deriveCategory(slug) === cat.key)
      .map((slug) => ({ label: serviceDisplayName(slug), href: globalServiceHref(slug) }))
      .filter((x): x is { label: string; href: string } => !!x.href)
      .sort((a, b) => a.label.localeCompare(b.label));
    if (items.length) groups.push({ label: cat.label, items });
  }
  return { groups, count: groups.reduce((n, g) => n + g.items.length, 0) };
}
