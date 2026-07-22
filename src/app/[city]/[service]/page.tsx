import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCity } from '@/lib/content/cities';
import { getCityService } from '@/lib/content/city-services';
import CityServicePageTemplate, { replaceCityTokens } from '@/components/CityServicePageTemplate';
import { getCityServiceCmsContent } from '@/lib/cms/city-service-pages';
import { getCityServicePreview } from '@/lib/cms/preview';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import PreviewBanner from '@/components/PreviewBanner';
import type { CityServiceContent } from '@/types/city-service';

export const dynamic = 'force-dynamic';

/**
 * Brief 72 — build failure fix (audit CQ-2).
 *
 * This route is `force-dynamic`: it renders on demand and (as verified) emits
 * ZERO static HTML at build. Previously it also declared `dynamicParams = false`
 * plus a `generateStaticParams()` that returned the full CITY_REGISTRY ×
 * getAllServiceSlugs() cartesian product — ~10,500 param combinations. Because
 * the route is force-dynamic, none of those combinations produced a static page;
 * they only forced the build to enumerate and process 10k dead entries during
 * "Collecting page data", which intermittently exhausted a build worker's memory
 * and killed it mid-collection — surfacing as the hard build error
 * `PageNotFoundError: Cannot find module for page: /api/articles` (the next page
 * in the dead worker's queue) with a truncated page-data manifest.
 *
 * The DB pool was NOT the cause (instrumentation confirmed the pool is never
 * touched during the build). The fix is to stop the pointless static fan-out.
 * Unknown slugs are still rejected identically: the `notFound()` guard below
 * fires whenever `getCity()`/`getCityService()` miss — the exact complement of
 * the params the old `generateStaticParams()` enumerated — so routing behavior
 * is unchanged.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export function generateMetadata({
  params,
}: {
  params: { city: string; service: string };
}): Metadata {
  const cityEntry = getCity(params.city);
  const serviceData = getCityService(params.service);
  if (!cityEntry || !serviceData) return {};
  return {
    title: replaceCityTokens(serviceData.seo.title, cityEntry.name),
    description: replaceCityTokens(serviceData.seo.description, cityEntry.name),
  };
}

function mergeWithDb(
  serviceData: CityServiceContent,
  db: {
    serviceIntroHeading: string;
    serviceIntroParagraphs: string[];
    serviceIntroImage: string;
    secondaryHeading: string;
    secondaryParagraphs: string[];
    secondaryImage: string;
    faqs: Array<{ question: string; answer: string }>;
  }
): CityServiceContent {
  return {
    ...serviceData,
    serviceIntro: {
      ...serviceData.serviceIntro,
      heading: db.serviceIntroHeading || serviceData.serviceIntro.heading,
      paragraphs:
        db.serviceIntroParagraphs.length > 0
          ? db.serviceIntroParagraphs
          : serviceData.serviceIntro.paragraphs,
      image: db.serviceIntroImage || serviceData.serviceIntro.image,
    },
    secondarySection: {
      ...serviceData.secondarySection,
      heading: db.secondaryHeading || serviceData.secondarySection.heading,
      paragraphs:
        db.secondaryParagraphs.length > 0
          ? db.secondaryParagraphs
          : serviceData.secondarySection.paragraphs,
      image: db.secondaryImage || serviceData.secondarySection.image,
    },
    faqs: db.faqs.length > 0 ? db.faqs : serviceData.faqs,
  };
}

export default async function CityServicePage({
  params,
}: {
  params: { city: string; service: string };
}) {
  const cityEntry = getCity(params.city);
  const serviceData = getCityService(params.service);
  if (!cityEntry || !serviceData) notFound();

  const settings = await getGlobalSettingsCached();

  // Check preview cookie first
  const preview = await getCityServicePreview(params.city, params.service).catch((err) => {
    console.error(`[city-service] Preview load failed for ${params.city}/${params.service}:`, err);
    return null;
  });
  if (preview) {
    const merged = mergeWithDb(serviceData, preview.db);
    return (
      <>
        <PreviewBanner
          label={preview.meta.label}
          creatorName={preview.meta.creator_name}
          editorUrl={`/admin/city-service/${params.city}/${params.service}`}
          liveUrl={`/${params.city}/${params.service}`}
          draftId={preview.meta.id}
          pageType="city-service"
          pageSlug={`${params.city}/${params.service}`}
        />
        <CityServicePageTemplate city={cityEntry} service={merged} settings={settings} />
      </>
    );
  }

  // Load DB content and merge with static fallback
  const dbContent = await getCityServiceCmsContent(params.city, params.service).catch((err) => {
    console.error(`[city-service] DB load failed for ${params.city}/${params.service}:`, err);
    return null;
  });
  const merged = dbContent ? mergeWithDb(serviceData, dbContent) : serviceData;

  return <CityServicePageTemplate city={cityEntry} service={merged} settings={settings} />;
}
