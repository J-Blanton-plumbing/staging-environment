/**
 * Brief 188 (Track F4/F5) — the `BreadcrumbList` JSON-LD object, extracted
 * VERBATIM from `src/components/Breadcrumbs.tsx` (Brief 64) so the prebuild
 * JSON-LD check can build the exact same object without rendering React. The
 * component calls this with `SITE.baseUrl`; key order and values are
 * unchanged, so every existing breadcrumb emits byte-identical JSON.
 */
export interface BreadcrumbListItemInput {
  label: string;
  href: string;
}

export function breadcrumbListJsonLd(items: BreadcrumbListItemInput[], baseUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      item: `${baseUrl}${it.href}`,
    })),
  };
}
