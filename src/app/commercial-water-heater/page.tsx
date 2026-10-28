import type { Metadata } from 'next';
import { WhServiceRoute, whServiceMetadata } from '@/components/water-heater-v2/WhRoutes';

/**
 * Brief 222 — `/commercial-water-heater`: a Water Heater Cluster v1 service page (WH Service Page, Index). Content
 * comes from this page's `sub_service_pages` row (`v2_content`) via WhRoutes, with the code module
 * src/lib/content/water-heater-v2/commercial-water-heater.ts as the fallback; edited in /admin/sub-service/commercial-water-heater.
 */

export const dynamic = 'force-dynamic';

export function generateMetadata(): Promise<Metadata> {
  return whServiceMetadata('commercial-water-heater');
}

export default function Page() {
  return <WhServiceRoute slug="commercial-water-heater" />;
}
