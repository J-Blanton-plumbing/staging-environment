import { notFound } from 'next/navigation';
import ServicePageTemplate from '@/components/ServicePageTemplate';
import PreviewBanner from '@/components/PreviewBanner';
import { getSubServiceCmsContent, getSubServiceParentSlug } from '@/lib/cms/sub-service-pages';
import { getSubServicePreview } from '@/lib/cms/preview';
import { getRelatedArticlesPool } from '@/lib/cms/related-articles-pool';
import { isCommercialServicePage } from '@/lib/cms/commercial-pages';

/**
 * Public renderer for a DB-backed sub-service page. Each routeless sub-service
 * (kitchen-sink-drain, basement-flooding, …) has a thin static route under
 * `src/app/{slug}/page.tsx` that renders this with its slug — mirroring the
 * documented "explicit static route per service" pattern while sharing one
 * data path. The hand-built `/sewer-rodding`, `/gas-lines`, `/hydro-jetting`
 * pages keep their own static-content routes and are not affected.
 *
 * Preview (the __preview_draft cookie) wins over the published row, so the
 * admin Preview button shows in-progress edits with the preview banner.
 */
export default async function SubServicePageView({ slug }: { slug: string }) {
  const preview = await getSubServicePreview(slug);
  const content = preview?.content ?? (await getSubServiceCmsContent(slug));

  if (!content) notFound();

  // Brief 92: the pool the Related Articles block resolves against (DB + static).
  const articlePool = await getRelatedArticlesPool();

  // Brief 143 (Track A): the No Drip Club is residential-only, so its section is
  // suppressed on every commercial page. Read `parent_slug` from the published
  // row rather than the content payload — a draft preview carries no category,
  // and the rule has to hold in preview too. Every DB-backed sub-service route
  // renders through this component, so the rule applies site-wide without
  // touching the 19 individual route files, and a commercial page added later
  // inherits it automatically.
  const parentSlug = await getSubServiceParentSlug(slug);
  const hideNoDripClub = isCommercialServicePage({ slug, parentSlug });

  return (
    <>
      {preview?.meta && (
        <PreviewBanner
          label={preview.meta.label}
          creatorName={preview.meta.creator_name}
          editorUrl={`/admin/sub-service/${slug}`}
          liveUrl={`/${slug}`}
          draftId={preview.meta.id}
          pageType="service"
          pageSlug={slug}
        />
      )}
      <ServicePageTemplate
        content={content}
        blockOrder={content.blockOrder}
        blocks={content.blocks}
        articlePool={articlePool}
        hideNoDripClub={hideNoDripClub}
      />
    </>
  );
}
