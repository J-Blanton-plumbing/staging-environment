import type { Metadata } from 'next';
import { WhServiceRoute, whServiceMetadata } from '@/components/water-heater-v2/WhRoutes';

/**
 * Brief 222 — `/water-heater-maintenance`: a Water Heater Cluster v1 service page (WH Service Page, Standard). Content
 * comes from this page's `sub_service_pages` row (`v2_content`) via WhRoutes, with the code module
 * src/lib/content/water-heater-v2/water-heater-maintenance.ts as the fallback; edited in /admin/sub-service/water-heater-maintenance.
 */

export const dynamic = 'force-dynamic';

export function generateMetadata(): Promise<Metadata> {
  return whServiceMetadata('water-heater-maintenance');
}

export default function Page() {
  return <WhServiceRoute slug="water-heater-maintenance" />;
}
