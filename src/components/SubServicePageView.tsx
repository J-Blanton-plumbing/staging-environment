import { notFound } from 'next/navigation';
import ServicePageTemplate from '@/components/ServicePageTemplate';
import PreviewBanner from '@/components/PreviewBanner';
import { getSubServiceCmsContent } from '@/lib/cms/sub-service-pages';
import { getSubServicePreview } from '@/lib/cms/preview';

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
      <ServicePageTemplate content={content} />
    </>
  );
}
