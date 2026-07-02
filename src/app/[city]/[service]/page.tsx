import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CITY_REGISTRY, getCity } from '@/lib/content/cities';
import { getCityService, getAllServiceSlugs } from '@/lib/content/city-services';
import CityServicePageTemplate, { replaceCityTokens } from '@/components/CityServicePageTemplate';
import { getCityServiceCmsContent } from '@/lib/cms/city-service-pages';
import { getCityServicePreview } from '@/lib/cms/preview';
import PreviewBanner from '@/components/PreviewBanner';
import type { CityServiceContent } from '@/types/city-service';

export const dynamicParams = false;
export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  const serviceSlugs = getAllServiceSlugs();
  return CITY_REGISTRY.flatMap((city) =>
    serviceSlugs.map((service) => ({ city: city.slug, service })),
  );
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
        <CityServicePageTemplate city={cityEntry} service={merged} />
      </>
    );
  }

  // Load DB content and merge with static fallback
  const dbContent = await getCityServiceCmsContent(params.city, params.service).catch((err) => {
    console.error(`[city-service] DB load failed for ${params.city}/${params.service}:`, err);
    return null;
  });
  const merged = dbContent ? mergeWithDb(serviceData, dbContent) : serviceData;

  return <CityServicePageTemplate city={cityEntry} service={merged} />;
}
