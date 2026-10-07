import type { Metadata } from 'next';
import { SewerServiceRoute, sewerServiceMetadata } from '@/components/sewer-v2/SewerRoutes';

/**
 * Brief 200 — `/sewer-camera-inspection`: a Sewer Ecosystem v2 service page, rendered from code
 * (`src/lib/content/sewer-v2/sewer-camera-inspection.ts` → `SewerServiceView`). Before Brief 200 this URL was a legacy-map
 * 301 to `/services/sewer`; that redirect was removed so the page can serve.
 */

// The root layout reads request headers, so this renders per request anyway; explicit for parity
// with the other service routes.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = sewerServiceMetadata('sewer-camera-inspection');

export default function Page() {
  return <SewerServiceRoute slug="sewer-camera-inspection" />;
}
