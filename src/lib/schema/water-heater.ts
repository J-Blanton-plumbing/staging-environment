/**
 * Brief 222 (Track D2) — the ONE JSON-LD `@graph` of a water heater page, built from the page's content.
 *
 * Built from the package's graph with the brief's changes (§1 #1–#4):
 *   - the package's own `Plumber` node (#business: Northbrook address, hours, rating, Columbus
 *     department) is NOT emitted. `provider` / `publisher` point at the site's existing company entity,
 *     `ORG_ID` (Brief 188's Organization — the same id the homepage graph and every article use);
 *   - that company node is emitted here only as `organizationNode()` (the Brief 188 identity, so it can
 *     never describe the company differently) PLUS `aggregateRating` — and only when the page visibly
 *     shows exactly those numbers (Brief 221's rule: visible = schema). Never on `Service`, never a
 *     `Review`;
 *   - `WebSite` only on the hub, identical to the homepage's node (it exists on `/` only, not sitewide);
 *   - one `BreadcrumbList`: Home › Water Heater Services › page, as the sewer service pages emit (the
 *     hub: Home › Services › Water Heater Services, as the package — `/services` answers 200, so it
 *     stays; the sewer hub emits no BreadcrumbList to match);
 *   - `FAQPage` is generated from the VISIBLE FAQ (same field), so the two can never drift.
 * No `offers` with prices, no phone (WhatConverts behaviour unchanged — Brief 219 open item).
 */
import { CANONICAL_BASE } from '@/lib/seo';
import { organizationNode, ORG_ID } from '@/lib/schema/organization-ref';
import type { AggregateRatingNode } from '@/lib/schema/aggregate-rating';
import type { SewerFaq } from '@/lib/content/sewer-v2/types';
import type { WhServiceSchema } from '@/lib/content/water-heater-v2/types';
import { nodesText, PHONE_TOKEN } from '@/lib/sewer-v2-cms/rich';

const SITE = CANONICAL_BASE;
export const WH_HUB_PATH = '/services/water-heater';
export const WH_CATEGORY = 'Water Heater Services';

/** The package's areaServed, identical on all six pages. */
const AREA_SERVED = [
  { '@type': 'Place', name: 'Chicagoland, Illinois' },
  { '@type': 'City', name: 'Columbus, Ohio' },
];

/** A FAQ answer as schema text: the visible words, with the displayed phone number in place of the token. */
export function faqAnswerText(value: SewerFaq['full'], phoneDisplay: string): string {
  return nodesText(value).split(PHONE_TOKEN).join(phoneDisplay).replace(/\s+/g, ' ').trim();
}

export interface WhGraphInput {
  /** Live path, e.g. `/water-heater-repair` or `/services/water-heater`. */
  path: string;
  hub: boolean;
  /** The rendered <title> (brand included) and meta description. */
  title: string;
  description: string;
  /** Breadcrumb label of this page (service pages). */
  crumb: string;
  crumbParent: { label: string; href: string };
  service: WhServiceSchema;
  /** Paths of the 5 water heater service pages (catalog items that are one get their `#service` id). */
  spokePaths: readonly string[];
  faqs: readonly SewerFaq[];
  phoneDisplay: string;
  aggregateRating: AggregateRatingNode | null;
}

export function waterHeaterJsonLd(i: WhGraphInput) {
  const url = `${SITE}${i.path}`;
  const abs = (p: string) => (/^https?:\/\//.test(p) ? p : `${SITE}${p}`);
  const org = organizationNode();
  const crumbs = i.hub
    ? [
        { name: 'Home', item: `${SITE}/` },
        { name: 'Services', item: `${SITE}/services` },
        { name: i.crumbParent.label, item: url },
      ]
    : [
        { name: 'Home', item: `${SITE}/` },
        { name: i.crumbParent.label, item: abs(i.crumbParent.href) },
        { name: i.crumb, item: url },
      ];
  const catalog = i.service.catalog
    ? {
        '@type': 'OfferCatalog',
        name: i.service.catalog.name,
        itemListElement: i.service.catalog.items.map((it) => {
          const spoke = i.spokePaths.includes(it.url);
          return {
            '@type': 'Offer',
            itemOffered: {
              '@type': 'Service',
              name: it.name,
              ...(spoke ? { '@id': `${abs(it.url)}#service` } : {}),
              url: abs(it.url),
            },
          };
        }),
      }
    : null;

  const graph: Record<string, unknown>[] = [
    {
      '@type': org['@type'],
      '@id': org['@id'],
      name: org.name,
      url: org.url,
      logo: org.logo,
      ...(i.aggregateRating ? { aggregateRating: i.aggregateRating } : {}),
    },
    {
      '@type': 'WebPage',
      '@id': `${url}#webpage`,
      url,
      name: i.title,
      description: i.description,
      isPartOf: { '@id': `${SITE}/#website` },
      about: { '@id': `${url}#service` },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      inLanguage: 'en-US',
      mainEntity: { '@id': `${url}#service` },
    },
  ];
  if (i.hub) {
    graph.push({
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      url: `${SITE}/`,
      name: 'J. Blanton Plumbing',
      alternateName: 'J. Blanton Plumbing, Sewer & Drain',
      publisher: { '@id': ORG_ID },
      inLanguage: 'en-US',
    });
  }
  graph.push(
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: crumbs.map((c, n) => ({ '@type': 'ListItem', position: n + 1, name: c.name, item: c.item })),
    },
    {
      '@type': 'Service',
      '@id': `${url}#service`,
      name: i.service.name,
      serviceType: i.service.serviceType,
      description: i.service.description,
      provider: { '@id': ORG_ID },
      areaServed: AREA_SERVED,
      audience: { '@type': 'Audience', audienceType: i.service.audienceType },
      mainEntityOfPage: { '@id': `${url}#webpage` },
      category: WH_CATEGORY,
      ...(i.hub ? {} : { isRelatedTo: { '@id': `${SITE}${WH_HUB_PATH}#service` } }),
      ...(catalog ? { hasOfferCatalog: catalog } : {}),
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: i.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: faqAnswerText(f.full, i.phoneDisplay) },
      })),
    }
  );
  return { '@context': 'https://schema.org', '@graph': graph };
}
