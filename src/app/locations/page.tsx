import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { getRatingContext } from '@/lib/cms/office-ratings';
import { isPageLive } from '@/lib/cms/page-status';
import { LocationsIndexView } from '@/components/city-pruning/LocationsViews';
import LOCATIONS from '@/lib/city-pruning/locations-data.json';

export const dynamic = 'force-dynamic';

/**
 * `/locations` — Brief 229 (Track D): a full remake from the City Pruning package's approved Locations
 * Index template v1 (office finder, Browse by State, every place we serve A to Z). Head per the changes
 * MD §6; the root layout composes the brand suffix (this page is not one of the 10 suffix-free pages).
 *
 * The page renders from the package's data (src/lib/city-pruning/locations-data.json) — the old
 * `main_pages.locations` content (hero, region cards, service-center list) no longer has a place on it.
 * The row still gates the page: unpublished → 404 (Brief 159), as before.
 */
export const metadata: Metadata = {
  title: 'J. Blanton Plumbing Locations | Illinois & Ohio Offices',
  description:
    'Find your closest J. Blanton Plumbing office. Local offices across Chicagoland and Columbus, OH, with plumbers available 24/7. Search by town or ZIP.',
};

export default async function LocationsPage() {
  if (!(await isPageLive('main', 'locations'))) notFound();
  const settings = await getGlobalSettingsCached();
  const ratings = await getRatingContext(null);
  return (
    <LocationsIndexView
      data={LOCATIONS.index}
      phone={{ href: settings.phoneHref, display: settings.phoneDisplay }}
      ratings={ratings}
    />
  );
}
