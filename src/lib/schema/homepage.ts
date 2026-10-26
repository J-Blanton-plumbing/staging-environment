/**
 * Brief 218 (Track B) — the homepage's own JSON-LD: ONE `@graph` of `Organization` + `WebSite` +
 * `WebPage`, from Marketing's SEO package (`Homepage_Schema.json`, locked 2026-10-26). Pure; the page
 * renders it and `scripts/validate-jsonld.ts` checks it at prebuild.
 *
 * The Organization is the Brief 188 one: it STARTS from `organizationNode()` (same `ORG_ID`, name,
 * url and Primary Logo the 800+ articles embed as `publisher`), so one `@id` never carries two logos
 * (Marketing decision 1). The package's `logo-text.webp` / `#logo` object is deliberately dropped and
 * `image` is the Primary Logo URL. The shared logo object gets no `@id` — article output stays
 * byte-identical. Every other Organization property, plus WebSite, is the package's, verbatim.
 *
 * `department` is NOT typed here: it is the `@id` of every office whose City Hub renders an office
 * node (`hubPlumberJsonLd`), in Global Settings order — see `src/lib/cms/home-departments.ts`. An
 * office that gets a hub joins automatically (the dev notes' rule). `HOME_PACKAGE_DEPARTMENT_IDS` is
 * the package's list, kept only so the build and the live check can assert the two agree.
 *
 * No `aggregateRating`, `review`, `Product` or `FAQPage` in this graph (Brief 218 hard rule). The
 * Elfsight widget injects its own `Product` in the browser; that is Marketing decision 2, not ours.
 */
import { organizationNode, ORG_ID, ORG_LOGO_URL } from '@/lib/schema/organization-ref';

const SITE = 'https://jblantonplumbing.com';

/** The package's 19 office `@id`s, in its order (= Global Settings office order on 2026-10-26). */
export const HOME_PACKAGE_DEPARTMENT_IDS: readonly string[] = [
  'northbrook', 'algonquin', 'geneva', 'arlington-heights', 'chicago-lincoln-park', 'chicago-ravenswood', 'elgin',
  'elmhurst', 'evanston', 'hinsdale', 'mchenry', 'naperville', 'skokie', 'joliet', 'tinley-park', 'mokena',
  'columbus', 'hanover-park', 'highland-park',
].map((slug) => `${SITE}/${slug}#office`);

/** The package's corporate phone and address (Northbrook, corporate) — verbatim. */
export const HOME_ORG_TELEPHONE = '+1-773-724-9272';
export const HOME_ORG_ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: '1945 Techny Road, #11',
  addressLocality: 'Northbrook',
  addressRegion: 'IL',
  postalCode: '60062',
  addressCountry: 'US',
} as const;

const OFFER_CATALOG = [
  ['Emergency Plumbing', '/emergency-plumbing'],
  ['Plumbing Services', '/services/plumbing'],
  ['Sewer Services', '/services/sewer'],
  ['Drain Services', '/services/drain'],
  ['Water Heater Services', '/services/water-heater'],
  ['Water Quality Services', '/services/water-quality'],
  ['Commercial Plumbing', '/services/commercial'],
] as const;

export interface HomepageJsonLdInput {
  /** The rendered `<title>` (brand included) — the same string the head carries. */
  pageName: string;
  /** The rendered meta description. */
  pageDescription: string;
  /** Office node `@id`s for `department`, in order. */
  departmentIds: readonly string[];
}

export function homepageJsonLd({ pageName, pageDescription, departmentIds }: HomepageJsonLdInput) {
  const org = organizationNode();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': org['@type'],
        '@id': org['@id'],
        name: org.name,
        alternateName: ['J. Blanton Plumbing, Sewer & Drain', 'JBP'],
        url: org.url,
        logo: org.logo,
        image: ORG_LOGO_URL,
        slogan: 'Make a Good Call',
        foundingDate: '1993',
        telephone: HOME_ORG_TELEPHONE,
        address: { ...HOME_ORG_ADDRESS },
        areaServed: [
          {
            '@type': 'AdministrativeArea',
            name: 'Chicagoland',
            url: `${SITE}/locations/chicagoland`,
            containedInPlace: { '@type': 'State', name: 'Illinois' },
          },
          {
            '@type': 'AdministrativeArea',
            name: 'Central Ohio',
            url: `${SITE}/locations/central-ohio`,
            containedInPlace: { '@type': 'State', name: 'Ohio' },
          },
        ],
        sameAs: [
          'https://www.facebook.com/J.BlantonPlumbing',
          'https://www.instagram.com/j.blantonplumbing/',
          'https://www.linkedin.com/company/j-blanton-plumbing/',
          'https://x.com/JBPchicago',
          'https://www.tiktok.com/@goodcalljbp',
          'https://www.bbb.org/us/il/morton-grove/profile/plumber/j-blanton-plumbing-0654-88664305',
        ],
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Plumbing Services',
          itemListElement: OFFER_CATALOG.map(([name, path]) => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name, url: `${SITE}${path}` },
          })),
        },
        department: departmentIds.map((id) => ({ '@id': id })),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: `${SITE}/`,
        name: 'J. Blanton Plumbing',
        alternateName: 'J. Blanton Plumbing, Sewer & Drain',
        publisher: { '@id': ORG_ID },
        inLanguage: 'en-US',
      },
      {
        '@type': 'WebPage',
        '@id': `${SITE}/#webpage`,
        url: `${SITE}/`,
        name: pageName,
        description: pageDescription,
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': ORG_ID },
        inLanguage: 'en-US',
      },
    ],
  };
}
