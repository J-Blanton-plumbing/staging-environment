import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getArea,
  getCity,
  getCoverageContent,
  getGridCities,
  getLocalOfficeContent,
  getOffice,
  staticCityMeta,
} from '@/lib/content/cities';
import { DEFAULT_ARTICLE_SLUGS, WATER_TESTING_FAQS } from '@/lib/content/cities/shared';
import { getArticles } from '@/lib/articles';
import { getCityCmsContent } from '@/lib/cms/city-pages';
import { getCityPreview } from '@/lib/cms/preview';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import CoverageAreaCity from '@/components/CoverageAreaCity';
import LocalOfficeCity from '@/components/LocalOfficeCity';
import LocalOfficeCityV2 from '@/components/LocalOfficeCityV2';
import PreviewBanner from '@/components/PreviewBanner';
import { getCityPageMeta } from '@/lib/cms/page-meta';

/**
 * Shared dynamic city builder (brief-10, routing DECIDED 2026-06-03).
 *
 * Brief 31/32: DB content merged when a city_pages row exists; falls back silently
 * to static content for the 140+ non-seeded cities.
 */

export const dynamic = 'force-dynamic';

/**
 * Brief 72 — build failure fix (audit CQ-2).
 *
 * Same fix as the sibling `[city]/[service]` route. This route is
 * `force-dynamic` and emits no static HTML at build, so enumerating every
 * registry slug in `generateStaticParams()` only added dead entries to the
 * build's page-data collection. Combined with the ~10,500-entry
 * `[city]/[service]` fan-out, that collection load intermittently killed a
 * build worker (surfacing as `PageNotFoundError`). We now prebuild nothing and
 * render on demand. Unknown slugs are still 404'd by the `notFound()` guard in
 * the component below — the exact complement of the old static param list — so
 * routing behavior is unchanged.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

/**
 * Brief 149 (Track C): reads the `city_pages` SEO fields, falling back to the
 * static content file. Those fields were editable in the admin and read by
 * nothing — the same shadow Tracks A and B close for sub-service pages.
 *
 * Now async (it queries), which is fine: the route is already `force-dynamic`.
 * `getCityPageMeta` never throws — a DB blip yields the static values rather
 * than a 500 on a page whose body renders fine.
 */
export async function generateMetadata({ params }: { params: { city: string } }): Promise<Metadata> {
  const fallback = staticCityMeta(params.city);
  if (!fallback) return {};
  const meta = await getCityPageMeta(params.city, fallback);
  return { title: meta.title, description: meta.description };
}

export default async function CityPage({ params }: { params: { city: string } }) {
  const entry = getCity(params.city);
  if (!entry) notFound();

  const preview = await getCityPreview(params.city);
  const previewDraft = preview ? preview.meta : null;
  let db = preview ? preview.db : await getCityCmsContent(params.city).catch(() => null);

  // Brief 102 (Track C): fetched once up-front — every branch below needs
  // settings.offices to resolve the city's NAP data via getOffice().
  const settings = await getGlobalSettingsCached();

  // Brief 35: use template_type from DB when available; fall back to registry type
  const templateType: string = db?.templateType ?? entry.type;

  // Brief 67: Local Office City V2 — DB-driven 12-section template.
  if (templateType === 'local-office-v2') {
    if (!db) notFound();
    const coverage = getCoverageContent(entry.slug);
    const localOffice = getLocalOfficeContent(entry.slug);

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
        <LocalOfficeCityV2
          city={{
            name: entry.name,
            slug: entry.slug,
            heroImage: coverage?.heroImage,
            officeAddress: getOffice(entry.slug, settings.offices).address,
            reviewsElfsightId: localOffice?.reviews.elfsightId,
            whyFallback: localOffice ? { heading: localOffice.why.heading, body: localOffice.why.body } : null,
          }}
          db={db}
          settings={settings}
        />
      </>
    );
  }

  if (templateType === 'local-office') {
    const content = getLocalOfficeContent(entry.slug);
    // Brief 70: cities on template_type 'local-office' with no dedicated
    // LocalOfficeContent file (Algonquin/Elgin only have a CoverageAreaContent
    // file — see COVERAGE_CONTENT) fall through to Coverage Area rendering
    // below instead of 404ing. Mirrors the same fallback generateMetadata()
    // already uses above for these two cities.
    if (content) {
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
        faqs: (db.faqs?.length ?? 0) > 0 ? db.faqs : content.faqs,
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
      // "We've Got You Covered" body (Brief 95, A.2: intentionally no heading
      // merge here — db.contentHeading is the local-office Why-heading column
      // reused across templates; this template's heading stays hard-coded, see
      // CoverageAreaCity.tsx and CoverageAreaCityFields)
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
        office={getOffice(entry.slug, settings.offices)}
        area={getArea(entry.slug)}
        articles={articles}
        faqs={mergedFaqs}
        cities={getGridCities()}
      />
    </>
  );
}
