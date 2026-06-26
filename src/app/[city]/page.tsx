import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CITY_REGISTRY,
  getArea,
  getCity,
  getCoverageContent,
  getGridCities,
  getLocalOfficeContent,
  getOffice,
} from '@/lib/content/cities';
import { DEFAULT_ARTICLE_SLUGS, WATER_TESTING_FAQS } from '@/lib/content/cities/shared';
import { getArticles } from '@/lib/articles';
import { getCityCmsContent } from '@/lib/cms/city-pages';
import { getCityPreview } from '@/lib/cms/preview';
import CoverageAreaCity from '@/components/CoverageAreaCity';
import LocalOfficeCity from '@/components/LocalOfficeCity';
import PreviewBanner from '@/components/PreviewBanner';

/**
 * Shared dynamic city builder (brief-10, routing DECIDED 2026-06-03).
 *
 * Brief 31/32: DB content merged when a city_pages row exists; falls back silently
 * to static content for the 140+ non-seeded cities.
 */

export const dynamic = 'force-dynamic';

// Only registry slugs are valid pages; anything else 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return CITY_REGISTRY.map((c) => ({ city: c.slug }));
}

export function generateMetadata({ params }: { params: { city: string } }): Metadata {
  const entry = getCity(params.city);
  if (!entry) return {};

  if (entry.type === 'local-office') {
    const content = getLocalOfficeContent(entry.slug);
    return content ? { title: content.meta.title, description: content.meta.description } : {};
  }

  const content = getCoverageContent(entry.slug);
  return {
    title: content?.meta?.title ?? `${entry.name} Plumber`,
    description:
      content?.meta?.description ??
      `J. Blanton Plumbing serves ${entry.name}, IL with 24/7 emergency plumbing, drain, sewer, and water heater service. 30+ years, same-day available. Call (773) 724-9272.`,
  };
}

export default async function CityPage({ params }: { params: { city: string } }) {
  const entry = getCity(params.city);
  if (!entry) notFound();

  const preview = await getCityPreview(params.city);
  const previewDraft = preview ? preview.meta : null;
  let db = preview ? preview.db : await getCityCmsContent(params.city).catch(() => null);

  // Brief 35: use template_type from DB when available; fall back to registry type
  const templateType: string = db?.templateType ?? entry.type;

  if (templateType === 'local-office') {
    const content = getLocalOfficeContent(entry.slug);
    if (!content) notFound();

    const merged = db ? {
      ...content,
      hero: {
        ...content.hero,
        // poster image: use DB URL when non-empty
        video: db.heroImage
          ? { ...content.hero.video, poster: db.heroImage }
          : content.hero.video,
        headingLine1: db.heroHeadingLine1 || content.hero.headingLine1,
        headingLine2: db.heroHeadingLine2 ?? content.hero.headingLine2,
        intro:        db.heroDescription  || content.hero.intro,
      },
      why: {
        ...content.why,
        heading: db.contentHeading || content.why.heading,
        body:    db.contentBody    || content.why.body,
      },
      faqs: db.faqs.length > 0 ? db.faqs : content.faqs,
    } : content;

    return (
      <>
        {previewDraft && (
          <PreviewBanner
            label={previewDraft.label}
            creatorName={previewDraft.creator_name}
            editorUrl={`/admin/city/${params.city}`}
            liveUrl={`/${params.city}`}
            draftId={previewDraft.id}
            pageType="city"
            pageSlug={params.city}
          />
        )}
        <LocalOfficeCity city={merged} />
      </>
    );
  }

  // Coverage Area
  const content = getCoverageContent(entry.slug);
  const articles = getArticles(content?.articleSlugs ?? DEFAULT_ARTICLE_SLUGS);

  let mergedContent = content;
  if (db) {
    const base = content ?? { slug: params.city };
    mergedContent = {
      ...base,
      // hero image — non-empty DB URL wins over static file
      heroImage:         db.heroImage      || base.heroImage,
      // h1Override — DB line1 wins when non-empty
      h1Override:        db.heroHeadingLine1 || base.h1Override,
      // callout uses heroCallout column (separate from heroDescription)
      callout:           db.heroCallout    || base.callout,
      // "We've Got You Covered" body
      coveredBody:       db.contentBody    || base.coveredBody,
      // "manplumber" block
      manplumberHeading: db.f2Heading      || base.manplumberHeading,
      manplumberBody:    db.f2Body         || base.manplumberBody,
    };
  }

  const mergedFaqs = db && db.faqs.length > 0 ? db.faqs : WATER_TESTING_FAQS;

  return (
    <>
      {previewDraft && (
        <PreviewBanner
          label={previewDraft.label}
          creatorName={previewDraft.creator_name}
          editorUrl={`/admin/city/${params.city}`}
          liveUrl={`/${params.city}`}
          draftId={previewDraft.id}
          pageType="city"
          pageSlug={params.city}
        />
      )}
      <CoverageAreaCity
        name={entry.name}
        content={mergedContent}
        office={getOffice(entry.slug)}
        area={getArea(entry.slug)}
        articles={articles}
        faqs={mergedFaqs}
        cities={getGridCities()}
      />
    </>
  );
}
