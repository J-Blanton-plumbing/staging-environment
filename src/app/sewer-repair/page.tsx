import type { Metadata } from 'next';
import { SewerServiceRoute, sewerServiceMetadata } from '@/components/sewer-v2/SewerRoutes';

/**
 * Brief 200 — `/sewer-repair`: a Sewer Ecosystem v2 service page, rendered from code
 * (`src/lib/content/sewer-v2/sewer-repair.ts` → `SewerServiceView`). Until Brief 200 this route rendered the
 * `sub_service_pages` row through `SubServicePageView` (Brief 149's three-line shape); that row is
 * left untouched in the database and still feeds the admin and `/{city}/sewer-repair` is unaffected
 * (city-service pages have their own content), but its edits no longer reach this page until the
 * CMS follow-up brief.
 */

// The root layout reads request headers, so this renders per request anyway; explicit for parity
// with the other service routes.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = sewerServiceMetadata('sewer-repair');

export default function Page() {
  return <SewerServiceRoute slug="sewer-repair" />;
}
