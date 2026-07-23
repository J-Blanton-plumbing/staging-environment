import { SITE } from '@/lib/site';
import type { CmsOffice } from '@/lib/cms/offices';

/**
 * LocalBusiness (PlumbingBusiness) JSON-LD — Brief 102, Track D.
 *
 * Emits one `PlumbingBusiness` node per CMS office (Brief 102, Track C is the
 * single source for both this and every visible address on the site), as a
 * `@graph` list. Follows the exact emission approach `Breadcrumbs.tsx` already
 * uses (a `<script type="application/ld+json">` via `dangerouslySetInnerHTML`).
 * Mounted exactly once, in `Footer.tsx` (present on every page), so the graph
 * never duplicates on a page.
 *
 * `geo` is included only when both `lat`/`lng` are present for that office —
 * the schema stays valid for offices that haven't had coordinates filled in yet.
 */
export interface LocalBusinessSchemaProps {
  offices: CmsOffice[];
  phoneDisplay: string;
  phoneHref: string;
  /** Global Settings "Hours Label" (e.g. "24 hours") — mapped to openingHours where sensible. */
  hoursLabel: string;
}

/** `tel:773-724-9272` → `+17737249272`. Falls back to the display string if it doesn't parse. */
function toE164(phoneHref: string, phoneDisplay: string): string {
  const digits = phoneHref.replace(/^tel:/, '').replace(/\D/g, '');
  return digits.length === 10 ? `+1${digits}` : phoneDisplay;
}

/** "24 hours" (case-insensitive) is the only hours format currently in use — maps to the
 * schema.org always-open shorthand. Anything else is left out rather than guessed at. */
function toOpeningHours(hoursLabel: string): string | null {
  return hoursLabel.trim().toLowerCase() === '24 hours' ? 'Mo-Su 00:00-23:59' : null;
}

export default function LocalBusinessSchema({ offices, phoneDisplay, phoneHref, hoursLabel }: LocalBusinessSchemaProps) {
  if (offices.length === 0) return null;

  const telephone = toE164(phoneHref, phoneDisplay);
  const openingHours = toOpeningHours(hoursLabel);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': offices.map((o) => ({
      '@type': 'PlumbingBusiness',
      name: `J. Blanton Plumbing, Sewer & Drain - ${o.name}`,
      url: `${SITE.baseUrl}/${o.slug}`,
      telephone,
      address: {
        '@type': 'PostalAddress',
        streetAddress: o.streetAddress,
        addressLocality: o.city,
        addressRegion: o.state,
        postalCode: o.zip,
        addressCountry: 'US',
      },
      ...(o.lat != null && o.lng != null
        ? { geo: { '@type': 'GeoCoordinates', latitude: o.lat, longitude: o.lng } }
        : {}),
      ...(openingHours ? { openingHours } : {}),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
