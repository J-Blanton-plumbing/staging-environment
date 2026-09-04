import type { Metadata } from 'next';
import LocationsRegionView from '@/components/LocationsRegionView';
import { CHICAGOLAND, CHICAGOLAND_GROUPS } from '@/lib/content/locations-regions';
import '../locations.css';

/**
 * `/locations/chicagoland` — Columbus Integration Brief 03, Track B.
 *
 * The Illinois half of the locations split. Its city list is every registry
 * entry with `state` UNSET, which is how Illinois is expressed (Brief 02 gave
 * Ohio areas `state: 'Ohio'` and deliberately left every Illinois entry alone so
 * ~248 map embeds and `<title>` strings stayed byte-identical). The filter lives
 * in `locations-regions.ts`; do not re-derive it here.
 *
 * No Illinois city URL changes because of this page — it is a new index over
 * pages that already existed.
 *
 * ─── Brief 170 treatment ────────────────────────────────────────────────────
 * This page was held BYTE-IDENTICAL while Brief 170 piloted the new region-page
 * design on `/locations/central-ohio`. Marketing approved it and asked for the
 * same here, so the hero photo band, the canonical `.link-button` CTA and the
 * `.l-cities-flow` grid are now unconditional in `LocationsRegionView` — which
 * is why this file passes no new props for any of them. The band uses
 * `CHICAGOLAND.image` (`/images/region-chicagoland.webp`).
 *
 * It does NOT pass `groups`/`collapsible`, and that is a data limit rather than
 * a style choice: Central Ohio groups by `RegistryEntry.county`, which is unset
 * on every Illinois entry (Brief 02, Track B). All 248 cities render as one flat
 * A→Z list in the same grid. Grouping Chicagoland needs a grouping key in the
 * registry first.
 *
 * TODO (Marketing / Phase 3): this page has NO `main_pages` row, so its title
 * and description are the literals below rather than CMS fields. The hub
 * (`/locations`) reads `getMainPageMeta('locations', …)`. Giving the two region
 * pages the same treatment needs a `main_pages` row seeded per environment plus
 * an admin editor entry — and, critically, the row must be PUBLISHED before the
 * page can read it, because `isPageLive()` 404s a main page with no published
 * version. Static meta until that lands; the canonical is unaffected (the root
 * layout emits a self-referencing one from `x-pathname` for every route).
 */
export const metadata: Metadata = {
  title: 'Chicagoland Plumbing Locations',
  description:
    `J. Blanton Plumbing serves ${CHICAGOLAND.cities.length} cities and neighborhoods across ` +
    'Chicago and the suburbs, with 24/7 emergency plumbing, drain, sewer and water heater ' +
    'service. Find your city.',
};

export default function ChicagolandLocationsPage() {
  return (
    <LocationsRegionView
      region={CHICAGOLAND}
      groups={CHICAGOLAND_GROUPS}
      collapsible
      intro={
        'For over 30 years J. Blanton Plumbing has served Chicago and its surrounding suburbs ' +
        'from service centers across the region. Every city below has its own page with local ' +
        'service details, the office that covers it, and how to reach us 24/7.'
      }
    />
  );
}
