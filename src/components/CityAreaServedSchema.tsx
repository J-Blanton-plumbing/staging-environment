import { SITE } from '@/lib/site';
import { BRAND_SUFFIX, canonicalUrlFor } from '@/lib/seo';
import type { Office } from '@/lib/content/cities/types';

/**
 * Per-area `areaServed` JSON-LD — Columbus Integration Brief 02, Track B.
 *
 * ─── Why a `Service` node and not a second `PlumbingBusiness` ──────────────
 * `LocalBusinessSchema.tsx` already emits one `PlumbingBusiness` per CMS office,
 * mounted once in `Footer.tsx`, so it is present on every page including this
 * one. Emitting a second `PlumbingBusiness` per area page would assert 138 more
 * business locations that do not physically exist — the opposite of what local
 * structured data is for, and a real risk to the office nodes that do.
 *
 * So this emits a `Service` whose `provider` is the dispatching business and
 * whose `areaServed` is the actual city, nested inside its county. That names the
 * city in the schema (what the brief asks for) without inventing a location.
 *
 * ─── Illinois emits nothing ────────────────────────────────────────────────
 * The city page mounts this only for an area that HAS a county — which is every
 * Ohio area and no Illinois city — so no existing page's structured data changes.
 * The component also returns `null` with no county, so it cannot half-render.
 */
export interface CityAreaServedSchemaProps {
  /** Area display name, e.g. "Dublin". */
  name: string;
  /** State name, e.g. "Ohio". */
  state: string;
  /** County the area sits in. No county → no node. */
  county?: string;
  /** Page path, e.g. `/dublin` — used for the node's stable `@id`. */
  path: string;
  /** The dispatching office's NAP. */
  office: Office;
}

export default function CityAreaServedSchema({
  name,
  state,
  county,
  path,
  office,
}: CityAreaServedSchemaProps) {
  if (!county) return null;

  const pageUrl = canonicalUrlFor(path);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    // Stable, page-scoped id so this never merges with the footer's office nodes.
    '@id': `${pageUrl}#service`,
    serviceType: 'Plumbing',
    name: `Plumbing services in ${name}, ${state}`,
    url: pageUrl,
    provider: {
      '@type': 'PlumbingBusiness',
      name: BRAND_SUFFIX,
      telephone: SITE.phone,
      url: SITE.baseUrl,
      ...(office.address ? { address: office.address } : {}),
    },
    areaServed: {
      '@type': 'City',
      name,
      containedInPlace: {
        '@type': 'AdministrativeArea',
        name: `${county} County`,
        containedInPlace: { '@type': 'State', name: state },
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
