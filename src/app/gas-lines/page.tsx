import type { Metadata } from 'next';
import SubServicePageView from '@/components/SubServicePageView';
import { getSubServiceMeta } from '@/lib/cms/sub-service-pages';

/**
 * Brief 146 (Track B) — `/gas-lines` was the one top-level sub-service route that
 * ignored the CMS. It rendered 100% static content from
 * `src/lib/content/services/gas-lines.ts` through the old hand-built route
 * (Brief 54), merging in `getServiceCmsContent('gas-lines')` — a
 * `service_category_pages` lookup that has never matched a row, so the merge was
 * always null and `sub_service_pages` id 26 was editable in the admin but never
 * read (Brief 145, finding D-3).
 *
 * It is now the identical three-line shape as the other 19 sub-service routes:
 * `SubServicePageView` reads the published `sub_service_pages` row (and honours
 * the preview cookie), so CMS text AND image edits render. The static content
 * file was retired with this change — those 19 routes carry no static fallback,
 * and the brief's rule was to follow them rather than invent a variant.
 *
 * Side effect (Brief 146 Track C): the doubled `<title>` is gone. The old route
 * hardcoded `metadata.title` WITH the `| J. Blanton Plumbing` suffix that the
 * root layout's title template already appends. The suffix now comes from the
 * template alone, over the row's `meta_title`.
 */

// Force SSR so DB edits and drafts are reflected immediately.
export const dynamic = 'force-dynamic';

const SLUG = 'gas-lines';

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSubServiceMeta(SLUG);
  return meta ? { title: meta.title, description: meta.description } : {};
}

export default function Page() {
  return <SubServicePageView slug={SLUG} />;
}
