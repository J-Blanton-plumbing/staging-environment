import type { Metadata } from 'next';
import { SewerServiceRoute, sewerServiceMetadata } from '@/components/sewer-v2/SewerRoutes';

/**
 * Brief 200 — `/sewer-line-installation`: a Sewer Ecosystem v2 service page, rendered from code
 * (`src/lib/content/sewer-v2/sewer-line-installation.ts` → `SewerServiceView`). New in Brief 200 — this URL was a 404 before.
 */

// The root layout reads request headers, so this renders per request anyway; explicit for parity
// with the other service routes.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = sewerServiceMetadata('sewer-line-installation');

export default function Page() {
  return <SewerServiceRoute slug="sewer-line-installation" />;
}
