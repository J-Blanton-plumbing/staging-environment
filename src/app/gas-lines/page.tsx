import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getService } from '@/lib/content/services';
import { getServiceCmsContent } from '@/lib/cms/service-pages';
import { getServicePreview } from '@/lib/cms/preview';
import type { ServiceCmsContent } from '@/lib/cms/service-pages';
import type { ServiceContent } from '@/types/service';
import ServicePageTemplate from '@/components/ServicePageTemplate';
import PreviewBanner from '@/components/PreviewBanner';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Gas Line Services in Chicagoland | J. Blanton Plumbing',
  description:
    'Gas line repair, installation, and leak detection done right. We send licensed techs who are thorough and transparent about what they find.',
};

function mergeWithCms(staticContent: ServiceContent, cms: ServiceCmsContent): ServiceContent {
  const { page } = cms;
  const staticProblemsCount = staticContent.problemsSection.problems.length;

  const merged: ServiceContent = {
    ...staticContent,
    hero: {
      ...staticContent.hero,
      heading: page.hero_heading || staticContent.hero.heading,
      intro: page.hero_intro || staticContent.hero.intro,
    },
    problemsSection: {
      ...staticContent.problemsSection,
      heading: page.problems_heading || staticContent.problemsSection.heading,
      problems: page.problems_items?.length
        ? page.problems_items
        : staticContent.problemsSection.problems,
    },
  };

  if (merged.problemsSection.problems.length > staticProblemsCount * 2) {
    console.warn(
      `[CMS] problems_items length anomaly on gas-lines: got ${merged.problemsSection.problems.length}, expected ~${staticProblemsCount}`
    );
  }

  return merged;
}

export default async function GasLinesPage() {
  const staticContent = getService('gas-lines');
  if (!staticContent) notFound();

  const servicePreview = await getServicePreview('gas-lines');
  const previewDraft = servicePreview?.meta ?? null;

  let cms: ServiceCmsContent | null = servicePreview?.cms ?? null;
  if (!cms) {
    cms = await getServiceCmsContent('gas-lines').catch(() => null);
  }

  const content = cms ? mergeWithCms(staticContent, cms) : staticContent;

  return (
    <>
      {previewDraft && (
        <PreviewBanner
          label={previewDraft.label}
          creatorName={previewDraft.creator_name}
          editorUrl="/admin/sub-service/gas-lines"
          liveUrl="/gas-lines"
          draftId={previewDraft.id}
          pageType="service"
          pageSlug="gas-lines"
        />
      )}
      <ServicePageTemplate content={content} />
    </>
  );
}
