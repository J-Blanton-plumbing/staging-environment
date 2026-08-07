import type { Metadata } from 'next';
import SubServicePageView from '@/components/SubServicePageView';
import { getSubServiceMeta } from '@/lib/cms/sub-service-pages';

/**
 * Brief 149 (Track A) — `/sewer-rodding` was one of the last two top-level
 * sub-service routes that ignored the CMS. It rendered a static content file
 * (`src/lib/content/services/sewer-rodding.ts`) with four fields overlaid from
 * `service_category_pages` id 25, while `sub_service_pages` id 2 sat editable in
 * the admin and was never read — nine fields written into the void
 * (Brief 145, finding D-1).
 *
 * It is now the identical three-line shape as the other 21 sub-service routes:
 * `SubServicePageView` reads the published `sub_service_pages` row (and honours
 * the preview cookie), so CMS text AND image edits render. Both former sources
 * were retired with this change — the static file is deleted and category row 25
 * is archived (see `scripts/retire-brief-149-legacy-sources.ts`).
 *
 * The three sections this page carries that no block type could express before
 * (`relatedServices`, and the two centred text bands) are now real blocks, added
 * by this brief for exactly this reason — see `src/lib/cms/block-catalogue.ts`.
 * Without them the flip would have silently dropped three sections of live copy.
 */

// Force SSR so DB edits and drafts are reflected immediately.
export const dynamic = 'force-dynamic';

const SLUG = 'sewer-rodding';

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSubServiceMeta(SLUG);
  return meta ? { title: meta.title, description: meta.description } : {};
}

export default function Page() {
  return <SubServicePageView slug={SLUG} />;
}
