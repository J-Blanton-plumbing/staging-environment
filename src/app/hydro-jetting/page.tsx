import type { Metadata } from 'next';
import SubServicePageView from '@/components/SubServicePageView';
import { getSubServiceMeta } from '@/lib/cms/sub-service-pages';

/**
 * Brief 149 (Track B) — the twin of `/sewer-rodding`, same defect and same fix
 * (Brief 145, finding D-2): the page rendered a static content file with four
 * fields overlaid from `service_category_pages` id 24, while `sub_service_pages`
 * id 23 was editable in the admin and never read.
 *
 * Now the identical three-line shape as the other 21 sub-service routes. Both
 * former sources were retired with this change. See `src/app/sewer-rodding/page.tsx`
 * for the full note.
 */

// Force SSR so DB edits and drafts are reflected immediately.
export const dynamic = 'force-dynamic';

const SLUG = 'hydro-jetting';

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSubServiceMeta(SLUG);
  return meta ? { title: meta.title, description: meta.description } : {};
}

export default function Page() {
  return <SubServicePageView slug={SLUG} />;
}
