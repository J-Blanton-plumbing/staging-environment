import type { Metadata } from 'next';
import LocationsRegionView from '@/components/LocationsRegionView';
import { COLUMBUS_REGION, OHIO_GROUPS } from '@/lib/content/locations-regions';
import '../locations.css';

/**
 * `/locations/central-ohio` — Columbus Integration Brief 03, Track B; renamed
 * and redesigned as the region-page pilot template by Brief 170.
 *
 * The Ohio half of the locations split: all 138 registered Central Ohio areas,
 * grouped by county rather than dumped in one flat A→Z list, with the 36
 * Columbus neighborhoods in their own labelled group — first, and open by
 * default (Brief 170, Track D).
 *
 * ⚠️ The county list is DERIVED — `OHIO_GROUPS` is built from `ohioCounties()`
 * and asserted at module load to sum to the registered Ohio count. Never
 * hardcode it: the 138 areas span 17 counties, and an earlier draft of Brief 03
 * named 10, which would have silently dropped 21 areas off this page with no
 * error anywhere. If a county is ever missed the build FAILS instead.
 *
 * ─── The route name (Brief 170, Track A) ────────────────────────────────────
 * This was `/locations/columbus` up to Brief 170. It never shipped — both region
 * pages were still working-tree-only at `08cfa97` — so the rename cost nothing
 * and NO redirect exists or is needed. `/locations/columbus` is simply a 404.
 *
 * The rename is editorial: the sibling is `/locations/chicagoland`, a region
 * nickname, and this page's own `label` is 'Central Ohio'. `/locations/ohio` was
 * rejected — coverage is 17 Central Ohio counties, not the state.
 *
 * `RegionDef['key']` is still `'columbus'`. Only the URL changed: the key feeds
 * the `MOST_REQUESTED` Record type and `REGIONS`, and renaming it is a wider
 * refactor with no user-visible benefit.
 *
 * Note the route path: `/locations/central-ohio` is the REGION index. `/columbus`
 * is the Columbus city page, and both exist — the first segment here is
 * `locations`, so the `[city]` route and the city-scoped redirect rule (which
 * only fires when segment 1 is a registered city) are not involved.
 *
 * ─── Props ──────────────────────────────────────────────────────────────────
 * Brief 170 shipped its hero band, `.link-button` CTA and flow grid here first,
 * behind opt-in props, while `/locations/chicagoland` was held byte-identical as
 * the gate. Marketing approved and asked for the same on Chicagoland, so those
 * three are now unconditional in `LocationsRegionView` and their props are gone.
 *
 * What is left is data, not styling: this page passes `groups` + `collapsible`
 * because Ohio areas carry `RegistryEntry.county`. Illinois entries do not, so
 * Chicagoland renders one flat A→Z list in the same grid.
 *
 * TODO (Marketing / Phase 3): no `main_pages` row — same static-meta situation
 * as `/locations/chicagoland`; see that file's header for what wiring it up
 * requires.
 */
export const metadata: Metadata = {
  title: 'Columbus & Central Ohio Plumbing Locations',
  description:
    `J. Blanton Plumbing serves ${COLUMBUS_REGION.cities.length} cities and neighborhoods across ` +
    'Columbus and Central Ohio, with 24/7 emergency plumbing, drain, sewer and water heater ' +
    'service. Find your area.',
};

export default function CentralOhioLocationsPage() {
  return (
    <LocationsRegionView
      region={COLUMBUS_REGION}
      groups={OHIO_GROUPS}
      collapsible
      intro={
        'J. Blanton Plumbing brings the same 24/7 service Chicagoland has relied on for 30+ ' +
        'years to Columbus and Central Ohio. Areas are grouped by county below; Columbus ' +
        'neighborhoods have their own section.'
      }
    />
  );
}
