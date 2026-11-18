import type { Metadata } from 'next';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { getRatingContext } from '@/lib/cms/office-ratings';
import { StatePageView } from '@/components/city-pruning/LocationsViews';
import { STATE_COPY } from '@/lib/city-pruning/state-pages';
import LOCATIONS from '@/lib/city-pruning/locations-data.json';

export const dynamic = 'force-dynamic';

/**
 * `/locations/illinois` — Brief 229 (Track D): the City Pruning package's State Page template v1
 * (Illinois). Replaces `/locations/chicagoland`, which now 301s here. Phone = the number the live header
 * shows (Track 0: 773-724-9272, Global Settings), through PhoneLink so call tracking swaps it.
 */
export const metadata: Metadata = {
  title: STATE_COPY.illinois.title,
  description: STATE_COPY.illinois.description,
};

export default async function IllinoisPage() {
  const settings = await getGlobalSettingsCached();
  const ratings = await getRatingContext(null);
  return (
    <StatePageView
      copy={STATE_COPY.illinois}
      data={LOCATIONS.illinois}
      phone={{ href: settings.phoneHref, display: settings.phoneDisplay }}
      ratings={ratings}
    />
  );
}
