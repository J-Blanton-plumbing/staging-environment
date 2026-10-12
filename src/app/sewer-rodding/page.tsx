import type { Metadata } from 'next';
import { SewerServiceRoute, sewerServiceMetadata } from '@/components/sewer-v2/SewerRoutes';

/**
 * Brief 200 — `/sewer-rodding`: a Sewer Ecosystem v2 service page, rendered from code
 * (`src/lib/content/sewer-v2/sewer-rodding.ts` → `SewerServiceView`). Until Brief 200 this route rendered the
 * `sub_service_pages` row through `SubServicePageView` (Brief 149's three-line shape); that row is
 * left untouched in the database and still feeds the admin and `/{city}/sewer-rodding` is unaffected
 * (city-service pages have their own content), but its edits no longer reach this page until the
 * CMS follow-up brief.
 *
 * Brief 204: the content now comes from this page's `sub_service_pages` row via SewerRoutes, with the
 * code module as the fallback; edited in /admin/sub-service/<slug>.
 */

// The root layout reads request headers, so this renders per request anyway; explicit for parity
// with the other service routes.
export const dynamic = 'force-dynamic';

// Brief 204: the title/description are the row's SEO fields (code module until the row has v2 content).
export function generateMetadata(): Promise<Metadata> {
  return sewerServiceMetadata('sewer-rodding');
}

export default function Page() {
  return <SewerServiceRoute slug="sewer-rodding" />;
}
