/**
 * Brief 225 (Track D2) — the ONE JSON-LD `@graph` of `/emergency-plumbing`, built from the page's content.
 *
 * The copy doc's two blocks (Service + FAQPage) with the brief's changes (§1 #6), in the water heater hub's
 * shape (src/lib/schema/water-heater.ts):
 *   - the copy doc's `Plumber` provider node (with its `[PHONE]` placeholders) is NOT emitted; `provider`
 *     points at the site's company entity `ORG_ID` (Brief 188), which is emitted here only as
 *     `organizationNode()` — so it can never describe the company differently — PLUS `aggregateRating`,
 *     and only when the rating card visibly shows exactly those numbers (Brief 221: visible = schema);
 *   - one `BreadcrumbList`, Home › Services › Emergency Plumbing — the water heater hub's pattern (`/services`
 *     answers 200 and lists Emergency Plumbing); the page has no visible breadcrumb;
 *   - `Service` keeps the copy doc's name, serviceType, url, areaServed (Illinois + Ohio as `State`),
 *     hoursAvailable (Mon–Sun 00:00–23:59) and availableChannel. Its `servicePhone` is left out, as every
 *     water heater page leaves the phone out of its graph (WhatConverts behaviour unchanged — Brief 219 open
 *     item); `foundingDate` belongs on the Organization, whose sitewide node is not edited here;
 *   - `FAQPage` is generated from the VISIBLE FAQ (same field), so the two can never drift.
 * No `Plumber`, no `Review`, no prices.
 */
import { CANONICAL_BASE } from '@/lib/seo';
import { organizationNode, ORG_ID } from '@/lib/schema/organization-ref';
import type { AggregateRatingNode } from '@/lib/schema/aggregate-rating';
import type { SewerFaq } from '@/lib/content/sewer-v2/types';
import type { WhServiceSchema } from '@/lib/content/water-heater-v2/types';
import { faqAnswerText } from '@/lib/schema/water-heater';

const SITE = CANONICAL_BASE;

/** The copy doc's areaServed and opening hours (the service is answered around the clock, every day). */
const AREA_SERVED = [
  { '@type': 'State', name: 'Illinois' },
  { '@type': 'State', name: 'Ohio' },
];
const HOURS = {
  '@type': 'OpeningHoursSpecification',
  dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  opens: '00:00',
  closes: '23:59',
};

export interface EmGraphInput {
  path: string;
  /** The rendered <title> (brand included) and meta description. */
  title: string;
  description: string;
  /** The last breadcrumb's name (the page's own label). */
  crumbLabel: string;
  service: WhServiceSchema;
  faqs: readonly SewerFaq[];
  phoneDisplay: string;
  aggregateRating: AggregateRatingNode | null;
}

export function emergencyJsonLd(i: EmGraphInput) {
  const url = `${SITE}${i.path}`;
  const org = organizationNode();
  const crumbs = [
    { name: 'Home', item: `${SITE}/` },
    { name: 'Services', item: `${SITE}/services` },
    { name: i.crumbLabel, item: url },
  ];
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
      url,
      ...(i.service.description ? { description: i.service.description } : {}),
      provider: { '@id': ORG_ID },
      areaServed: AREA_SERVED,
      availableChannel: { '@type': 'ServiceChannel', serviceUrl: url },
      hoursAvailable: HOURS,
      ...(i.service.audienceType ? { audience: { '@type': 'Audience', audienceType: i.service.audienceType } } : {}),
      mainEntityOfPage: { '@id': `${url}#webpage` },
    },
    {
      '@type': 'FAQPage',
      '@id': `${url}#faq`,
      mainEntity: i.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: faqAnswerText(f.full, i.phoneDisplay) },
      })),
    },
  ];
  return { '@context': 'https://schema.org', '@graph': graph };
}
