import { khAreaHref, khTopicHref } from '@/lib/cms/kh-taxonomy-types';

/**
 * Brief 188 (Track D) — the Knowledge Hub breadcrumb trails, pure so the
 * prebuild JSON-LD check (scripts/validate-jsonld.ts) builds the same trails
 * the pages render. The last crumb is the page itself; a paginated ?page=n
 * page uses the SAME trail (no "Page n" crumb). The hub has no visible trail.
 */
export interface KhCrumb {
  label: string;
  href: string;
}

const BASE: KhCrumb[] = [
  { label: 'Home', href: '/' },
  { label: 'Knowledge Hub', href: '/knowledge-hub' },
];

/** Home › Knowledge Hub › {Primary Topic} › {Article}, or without the topic. */
export function articleCrumbs(article: { slug: string; title: string }, primary: { slug: string; name: string } | null): KhCrumb[] {
  return [
    ...BASE,
    ...(primary ? [{ label: primary.name, href: khTopicHref(primary.slug) }] : []),
    { label: article.title, href: `/knowledge-hub/${article.slug}` },
  ];
}

/**
 *   topic        Home › Knowledge Hub › {Topic}
 *   area, city   Home › Knowledge Hub › {Region} › {City}
 *   area, region Home › Knowledge Hub › {Region}
 */
export function termCrumbs(term: {
  type: 'topic' | 'location';
  slug: string;
  name: string;
  parentSlug: string | null;
  parentName: string | null;
}): KhCrumb[] {
  if (term.type === 'topic') return [...BASE, { label: term.name, href: khTopicHref(term.slug) }];
  const region = term.parentSlug && term.parentName ? [{ label: term.parentName, href: khAreaHref(term.parentSlug) }] : [];
  return [...BASE, ...region, { label: term.name, href: khAreaHref(term.slug) }];
}
