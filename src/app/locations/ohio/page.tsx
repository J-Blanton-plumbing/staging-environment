import type { Metadata } from 'next';
import { getGlobalSettingsCached, getRegionalPhonesCached } from '@/lib/cms/global-settings';
import { getRatingContext } from '@/lib/cms/office-ratings';
import { StatePageView } from '@/components/city-pruning/LocationsViews';
import { STATE_COPY } from '@/lib/city-pruning/state-pages';
import LOCATIONS from '@/lib/city-pruning/locations-data.json';

export const dynamic = 'force-dynamic';

/**
 * `/locations/ohio` — Brief 229 (Track D, Marketing 2026-11-18 decision 3 approved this URL): the City
 * Pruning package's State Page template v1 (Ohio). Replaces `/locations/central-ohio`, which now 301s
 * here. Phone = Global Settings' Central Ohio phone (the Columbus office's Google number, the one the
 * State MD names), as on the Columbus hub; blank → the main phone.
 */
export const metadata: Metadata = {
  title: STATE_COPY.ohio.title,
  description: STATE_COPY.ohio.description,
};

export default async function OhioPage() {
  const settings = await getGlobalSettingsCached();
  const regional = await getRegionalPhonesCached();
  const phone = regional.centralOhioPhoneDisplay
    ? { href: regional.centralOhioPhoneHref || `tel:${regional.centralOhioPhoneDisplay.replace(/[^0-9+]/g, '')}`, display: regional.centralOhioPhoneDisplay }
    : { href: settings.phoneHref, display: settings.phoneDisplay };
  const ratings = await getRatingContext(null);
  return <StatePageView copy={STATE_COPY.ohio} data={LOCATIONS.ohio} phone={phone} ratings={ratings} />;
}
