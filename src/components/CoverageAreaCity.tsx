import HeroNav from '@/components/HeroNav';
import CityHero from '@/components/CityHero';
import CityServicesMenu from '@/components/CityServicesMenu';
import CityLocationsGrid from '@/components/CityLocationsGrid';
import FaqAccordion from '@/components/FaqAccordion';
import ArticleGrid from '@/components/ArticleGrid';
import GoogleReviews from '@/components/GoogleReviews';
import TikTokFeed from '@/components/TikTokFeed';
import type { Article } from '@/lib/articles';
import type { CityFaq, CoverageAreaContent, Office } from '@/lib/content/cities/types';
import {
  MANPLUMBER_IMAGE,
  ELFSIGHT_SOCIAL_ID,
  getElfsightHeroId,
  getElfsightContentId,
  resolveCityImage,
} from '@/lib/content/cities/shared';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import CityPageImage from '@/components/CityPageImage';

/**
 * Coverage Area ("image-hero") city template — theme `page-city.php` + `city.css`
 * (brief-10). The standard layout behind the bulk of location pages.
 *
 * Section order (live + brief §"Confirmed shared"):
 * image hero → hero-nav → "WE'VE GOT YOU COVERED" → Google map → "manplumber"
 * `.f2` → OUR SERVICES (static) → content reviews → "Turning Bad Calls" + social
 * → articles → city-locations grid → FAQs → footer.
 *
 * Per-city office NAP, areas-served, services hrefs, FAQs, map and grid are all
 * derived from the registry — so a coverage-area city renders correctly with NO
 * copy file. The two prose blocks (WE'VE GOT YOU COVERED / manplumber) hide when
 * the city has no copy yet (content-backfill task, brief §4/§6).
 *
 * Local-Office-only sections (video hero, skyline band, partners carousel,
 * dynamic accordion) are intentionally absent (brief §"Not on the Coverage
 * Area page").
 */
export interface CoverageAreaCityProps {
  /** Display name, e.g. "Elgin". */
  name: string;
  /** Optional per-city copy (callout + prose blocks). */
  content?: CoverageAreaContent;
  /** Dispatching office for the NAP block. */
  office: Office;
  /** Areas-served region label. */
  area: string;
  /** Resolved related-article cards (≤3). */
  articles: Article[];
  /** Shared FAQ set. */
  faqs: CityFaq[];
  /** Full A→Z city list for the locations grid. */
  cities: { slug: string; name: string }[];
  /**
   * Brief 154 (Track E1): state used in the map-embed query + title, from
   * `RegistryEntry.state`. Defaults to `'Illinois'` so every existing city's
   * embed URL is byte-identical to before this prop existed.
   */
  state?: string;
}

export default function CoverageAreaCity({
  name,
  content,
  office,
  area,
  articles,
  faqs,
  cities,
  state = 'Illinois',
}: CoverageAreaCityProps) {
  const slug = content?.slug ?? name.toLowerCase();
  const h1 = content?.h1Override ?? `${name} Plumber`;
  const gbpLabel = content?.gbp ?? name;
  const heroImageUrl = resolveCityImage(content?.heroImage);
  /*
   * Brief 160 (Track C): section 1 resolves its OWN field. It deliberately does
   * not read `content.heroImage`, and does not reuse `heroImageUrl` — the whole
   * point of the track is that a populated hero has no effect here. Empty →
   * the pipes fallback, which is what these pages already render.
   */
  const coveredImageUrl = resolveCityImage(content?.coveredImage);
  /*
   * Brief 160 (Track A): the CMS heading wins when non-empty; empty falls back
   * to the literal below, so clearing the field is safe and reversible.
   */
  const coveredHeading = content?.coveredHeading?.trim() ?? '';
  const mapUrl = `https://maps.google.com/maps?hl=en&q=${encodeURIComponent(
    `${name}, ${state}`,
  )}&t=&z=14&ie=UTF8&iwloc=B&output=embed`;

  const elfsightHeroId = getElfsightHeroId(slug);
  const elfsightContentId = getElfsightContentId(slug);

  return (
    <>
      {/* ============== 1. IMAGE HERO ============== */}
      <CityHero
        cityName={name}
        h1={h1}
        heroImageUrl={heroImageUrl}
        office={office}
        gbpLabel={gbpLabel}
        area={area}
        elfsightHeroId={elfsightHeroId}
        callout={content?.callout}
      />

      {/* ============== 2. HERO-NAV (shared; Brief 07 default hrefs) ============== */}
      <HeroNav />

      {/* ============== CREAM CONTENT WRAPPER ============== */}
      <div className="cream bg-cream-100">
        <div className="city-page-content mx-auto w-[90%] lg:w-[81%]">
          {/* ===== 3. WE'VE GOT YOU COVERED, {CITY} ===== */}
          <section className="f grid grid-cols-1 items-stretch gap-10 pt-[50px] lg:grid-cols-2 lg:pt-[130px]">
            <div className="flex flex-col justify-center">
              {/* Brief 160 (Track A): this heading IS editable now, backed by its
                  own `city_pages.covered_heading` column — a NEW column, not the
                  `content_heading` one Brief 95 (A.2) refused to reuse, which
                  still means the Why-J.-Blanton heading on the Local-Office
                  template. A template switch therefore cannot repurpose it.

                  The literal stays as the fallback on purpose: an empty field
                  renders exactly what this page rendered before the column
                  existed, so clearing the field in the CMS is a safe, reversible
                  action rather than a blank heading on a live indexed page.
                  Plain text, never HTML — it is rendered inside a heading. */}
              <h2 className="red-text mb-6 font-display text-[28px] font-bold uppercase leading-tight tracking-tight text-brand-600 md:text-[32px]">
                {coveredHeading || <>WE&apos;VE GOT YOU COVERED, <span>{name}</span></>}
              </h2>
              {content?.coveredBody && (
                <div
                  className="city-prose leading-relaxed text-navy-800"
                  dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(content.coveredBody) }}
                />
              )}
            </div>
            <div className="relative min-h-[300px] overflow-hidden rounded-[5px]">
              <CityPageImage
                src={coveredImageUrl}
                alt={name}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </section>

          {/* ===== 4. GOOGLE MAP ===== */}
          <iframe
            className="city-page-map my-[100px] h-[570px] w-full border-0"
            loading="lazy"
            src={mapUrl}
            title={`Map of ${name}, ${state}`}
          />

          {/* ===== 5. "manplumber" .f2 ===== */}
          <section className="f2 mb-[50px] grid grid-cols-1 items-stretch gap-10 lg:mb-[130px] lg:grid-cols-[470px_1fr]">
            <div className="relative hidden min-h-[250px] overflow-hidden rounded-[5px] lg:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MANPLUMBER_IMAGE}
                alt="J. Blanton Plumber"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <div className="r flex flex-col justify-center">
              {content?.manplumberHeading && (
                <h2 className="red-text mb-4 font-display text-[28px] font-bold uppercase leading-tight tracking-tight text-brand-600 md:text-[32px]">
                  {content.manplumberHeading}
                </h2>
              )}
              {/* Mobile-only image (theme shows .r img under 900px). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MANPLUMBER_IMAGE}
                alt=""
                className="mb-4 block max-w-[350px] rounded-[5px] lg:hidden"
              />
              {content?.manplumberBody && (
                <div
                  className="city-prose leading-relaxed text-navy-800"
                  dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(content.manplumberBody) }}
                />
              )}
            </div>
          </section>

          {/* ===== 6. OUR SERVICES (static menu) ===== */}
          <CityServicesMenu citySlug={slug} />

          {/* ===== 7. CONTENT REVIEWS (Elfsight) ===== */}
          <div className="city-page-gr mb-[100px]">
            <GoogleReviews widgetId={elfsightContentId} />
          </div>

          {/* ===== 8. "Turning Bad Calls to Good Calls" + social ===== */}
          <p className="ep-tiktok-headline">J Blanton Plumbing - Turning Bad Calls to Good Calls</p>
          <div className="city-social-media mb-[60px]">
            <TikTokFeed widgetId={ELFSIGHT_SOCIAL_ID} />
          </div>

          {/* ===== 9. RELATED ARTICLES ===== */}
          {articles.length > 0 && (
            <section className="city-articles mt-[130px] w-full">
              <ArticleGrid articles={articles} />
            </section>
          )}

          {/* ===== 10. CITY-LOCATIONS GRID (Coverage Area only) ===== */}
          <CityLocationsGrid cities={cities} />

          {/* ===== 11. FAQ accordion ===== */}
          <FaqAccordion faqs={faqs} />
        </div>
      </div>
    </>
  );
}
