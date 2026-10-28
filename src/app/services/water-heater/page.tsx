import type { Metadata } from 'next';
import { WhHubRoute, whHubMetadata } from '@/components/water-heater-v2/WhRoutes';

/**
 * Brief 222 — `/services/water-heater`: the Water Heater hub (WH Hub template, Water Heater Cluster v1).
 *
 * Until Brief 222 this was the Brief 29 category page assembled from the `service_category_pages` row
 * `water-heater` (+ its serviceSubcategories block and Global Settings). The page now reads the same
 * row's `v2_content` (the hub + the water-heater-shared sections) through WhRoutes, with the code module
 * src/lib/content/water-heater-v2/hub.ts as the fallback; edited in /admin/water-heater.
 */

export const dynamic = 'force-dynamic';

export function generateMetadata(): Promise<Metadata> {
  return whHubMetadata();
}

export default function WaterHeaterPage() {
  return <WhHubRoute />;
}
