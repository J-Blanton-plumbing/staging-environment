import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCity } from '@/lib/content/cities';
import { getCityService } from '@/lib/content/city-services';
import CityServicePageTemplate, { replaceCityTokens } from '@/components/CityServicePageTemplate';
import { getCityServiceCmsContent } from '@/lib/cms/city-service-pages';
import { getCityServicePreview } from '@/lib/cms/preview';
import { isPageLive } from '@/lib/cms/page-status';
import { getGlobalSettingsCached, getRegionalPhonesCached } from '@/lib/cms/global-settings';
import PreviewBanner from '@/components/PreviewBanner';
import { getCityServiceV2, CENTRAL_OHIO_V2_CITIES } from '@/lib/content/city-services-v2';
import CityServiceV2View from '@/components/city-services-v2/CityServiceV2View';
import { pageTitle } from '@/lib/seo';
import { cityServiceRobots } from '@/lib/city-service-indexation';
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
  // Brief 209 go-live: a City Service Pages V2 page carries its approved title/description from
  // code. pageTitle() strips the brand tail the layout's template appends again. These 5 cities are
  // all indexable, so `robots` is left to the default exactly as for every Illinois city.
  const v2 = getCityServiceV2(params.city, params.service);
  if (v2) return { title: pageTitle(v2.meta.title), description: v2.meta.description, robots: cityServiceRobots(params.city) };
  return {
    // Every one of the 45 city-service content files ends its seo.title with
    // "| J. Blanton Plumbing", which the root layout's template appends again —
    // ~9,700 URLs were shipping the brand twice. Normalized here rather than in
    // 45 files so a new service file can't reintroduce it.
    title: pageTitle(replaceCityTokens(serviceData.seo.title, cityEntry.name)),
    description: replaceCityTokens(serviceData.seo.description, cityEntry.name),
    /*
     * Columbus Integration Brief 02 (Track C): `noindex, follow` while a city's
     * service pages are still name-swapped template copy. The decision lives in
     * ONE list — `CITY_SERVICE_INDEXED_OHIO_CITIES` in
     * src/lib/city-service-indexation.ts — which also drives whether these URLs
     * enter the sitemap, so the two can never disagree.
     *
     * `undefined` for every Illinois city, so their emitted metadata is
     * unchanged. The policy is deliberately a function call rather than an inline
     * literal: an unconditional noindex declaration in this file would apply to
     * all 11,160 Illinois city-service URLs, and scripts/validate-sitemap.ts
     * greps route files for exactly that shape. The validator instead asks this
     * same module per URL — see its shard split and per-path check.
     */
    robots: cityServiceRobots(params.city),
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

  /*
   * Brief 209 go-live — City Service Pages V2 (Marketing, 2026-10-14).
   *
   * The 29 service pages of Northbrook, Columbus, Tinley Park, Joliet and Naperville render the
   * approved Highland Park-template service page INSTEAD of CityServicePageTemplate. Dispatched by
   * code, like the Brief 205 hubs: these pages are not wired to the CMS yet, so admin edits (and
   * draft previews) of these 145 city_service_pages rows do not reach the live page until a CMS
   * follow-up brief. The Brief 159 render gate still applies — an unpublished row 404s exactly as
   * before. The 55 service pages these absorb are 301'd in middleware (city-service-folds.ts) and
   * never reach this route. Every other city-service page falls through, unchanged.
   */
  const v2 = getCityServiceV2(params.city, params.service);
  if (v2) {
    if (!(await isPageLive('city-service', `${params.city}/${params.service}`))) notFound();
    let phone = { href: settings.phoneHref, display: settings.phoneDisplay };
    if (CENTRAL_OHIO_V2_CITIES.has(params.city)) {
      // Brief 192: the Central Ohio phone from Global Settings; blank = the main phone. The
      // header keeps the main (WhatConverts) number by design — it never reads this.
      const regional = await getRegionalPhonesCached();
      if (regional.centralOhioPhoneDisplay) {
        phone = {
          href: regional.centralOhioPhoneHref || `tel:${regional.centralOhioPhoneDisplay.replace(/[^0-9+]/g, '')}`,
          display: regional.centralOhioPhoneDisplay,
        };
      }
    }
    return <CityServiceV2View page={v2} cityName={cityEntry.name} phone={phone} />;
  }

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

  /*
   * Brief 159 (Track D / E1) — the render gate, checked only once the preview
   * branch above has fallen through: an editor previewing an unpublished page
   * must still see it. One indexed column read on the live row, no join to
   * `page_drafts`; `isPageLive` fails OPEN on a database error so a DB blip
   * cannot 404 one of the 11,160 self-canonical pages in the sitemap.
   */
  if (!(await isPageLive('city-service', `${params.city}/${params.service}`))) notFound();

  // Load DB content and merge with static fallback
  const dbContent = await getCityServiceCmsContent(params.city, params.service).catch((err) => {
    console.error(`[city-service] DB load failed for ${params.city}/${params.service}:`, err);
    return null;
  });
  const merged = dbContent ? mergeWithDb(serviceData, dbContent) : serviceData;

  return <CityServicePageTemplate city={cityEntry} service={merged} settings={settings} />;
}
