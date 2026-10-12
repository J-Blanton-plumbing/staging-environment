import type { Metadata } from 'next';
import { SewerServiceRoute, sewerServiceMetadata } from '@/components/sewer-v2/SewerRoutes';

/**
 * Brief 200 — `/trenchless-sewer-repair`: a Sewer Ecosystem v2 service page, rendered from code
 * (`src/lib/content/sewer-v2/trenchless-sewer-repair.ts` → `SewerServiceView`). New in Brief 200 — this URL was a 404 before.
 *
 * Brief 204: the content now comes from this page's `sub_service_pages` row via SewerRoutes, with the
 * code module as the fallback; edited in /admin/sub-service/<slug>.
 */

// The root layout reads request headers, so this renders per request anyway; explicit for parity
// with the other service routes.
export const dynamic = 'force-dynamic';

// Brief 204: the title/description are the row's SEO fields (code module until the row has v2 content).
export function generateMetadata(): Promise<Metadata> {
  return sewerServiceMetadata('trenchless-sewer-repair');
}

export default function Page() {
  return <SewerServiceRoute slug="trenchless-sewer-repair" />;
}
