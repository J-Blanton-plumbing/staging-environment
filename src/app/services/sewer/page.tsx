import type { Metadata } from 'next';
import { SewerHubRoute, sewerHubMetadata } from '@/components/sewer-v2/SewerRoutes';

/**
 * Brief 200 — `/services/sewer`: the Sewer Ecosystem v2 hub, rendered from code
 * (`src/lib/content/sewer-v2/hub.ts` → `SewerHubView`).
 *
 * Until Brief 200 this was the Brief 29 category page, assembled from the `service_category_pages`
 * row `sewer` (plus its `serviceSubcategories` block and Global Settings) with `src/lib/content/sewer.ts`
 * as the DB-down fallback, and it honoured the admin preview cookie. That row is untouched in the
 * database, but its edits — and its draft previews — no longer reach this page until the CMS
 * follow-up brief.
 *
 * Brief 204: the hub's content (and the sewer-shared sections) now come from its
 * `service_category_pages` row via SewerRoutes, with the code module as the fallback; edited in
 * /admin/sewer.
 */

export const dynamic = 'force-dynamic';

// Brief 204: the title/description are the hub row's SEO fields (code module until it has v2 content).
export function generateMetadata(): Promise<Metadata> {
  return sewerHubMetadata();
}

export default function SewerPage() {
  return <SewerHubRoute />;
}
