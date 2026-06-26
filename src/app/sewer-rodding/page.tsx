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
  title: 'Sewer Rodding Services in Chicagoland',
  description:
    "Annual or emergency sewer rodding done right the first time. Camera inspection before and after so you see exactly what's cleared. No upsell.",
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

  // B-3: warn on anomalous array growth (guards against future data corruption)
  if (merged.problemsSection.problems.length > staticProblemsCount * 2) {
    console.warn(
      `[CMS] problems_items length anomaly on sewer-rodding: got ${merged.problemsSection.problems.length}, expected ~${staticProblemsCount}`
    );
  }

  return merged;
}

export default async function SewerRoddingPage() {
  const staticContent = getService('sewer-rodding');
  if (!staticContent) notFound();

  const servicePreview = await getServicePreview('sewer-rodding');
  const previewDraft = servicePreview?.meta ?? null;

  let cms: ServiceCmsContent | null = servicePreview?.cms ?? null;
  if (!cms) {
    cms = await getServiceCmsContent('sewer-rodding').catch(() => null);
  }

  const content = cms ? mergeWithCms(staticContent, cms) : staticContent;

  return (
    <>
      {previewDraft && (
        <PreviewBanner
          label={previewDraft.label}
          creatorName={previewDraft.creator_name}
          editorUrl="/admin/sewer-rodding"
          liveUrl="/sewer-rodding"
          draftId={previewDraft.id}
          pageType="service"
          pageSlug="sewer-rodding"
        />
      )}
      <ServicePageTemplate content={content} />
    </>
  );
}
