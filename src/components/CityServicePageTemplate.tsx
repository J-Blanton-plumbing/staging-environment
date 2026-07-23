import HeroNav from '@/components/HeroNav';
import Breadcrumbs from '@/components/Breadcrumbs';
import { cityServiceCrumbs } from '@/lib/content/service-taxonomy';
import CityVideoHero from '@/components/CityVideoHero';
import CityServiceHero from '@/components/CityServiceHero';
import CityServicesAccordion from '@/components/CityServicesAccordion';
import CityServicesMenu from '@/components/CityServicesMenu';
import FaqAccordion from '@/components/FaqAccordion';
import CityLocationsGrid from '@/components/CityLocationsGrid';
import ArticleGrid from '@/components/ArticleGrid';
import GoogleReviews from '@/components/GoogleReviews';
import type { RegistryEntry } from '@/lib/content/cities/types';
import type { CityServiceContent } from '@/types/city-service';
import type { GlobalSettings } from '@/lib/cms/global-settings';
import { getOffice, getArea, getLocalOfficeContent, getGridCities } from '@/lib/content/cities';
import { DEFAULT_ARTICLE_SLUGS, getElfsightContentId } from '@/lib/content/cities/shared';
import { getArticles } from '@/lib/articles';

/**
 * Replace every `{city}` token in a string with the city's display name.
 * Applied to all copy fields before render (brief-21 §"Token substitution").
 */
export function replaceCityTokens(text: string, cityName: string): string {
  return text.replace(/\{city\}/g, cityName);
}

function replaceAll(obj: CityServiceContent, cityName: string): CityServiceContent {
  const r = (s: string) => replaceCityTokens(s, cityName);
  return {
    ...obj,
    heroCallout: r(obj.heroCallout),
    seo: { title: r(obj.seo.title), description: r(obj.seo.description) },
    serviceIntro: {
      ...obj.serviceIntro,
      heading: r(obj.serviceIntro.heading),
      paragraphs: obj.serviceIntro.paragraphs.map(r),
    },
    secondarySection: {
      ...obj.secondarySection,
      heading: r(obj.secondarySection.heading),
      paragraphs: obj.secondarySection.paragraphs.map(r),
    },
  };
}

interface Props {
  city: RegistryEntry;
  service: CityServiceContent;
  settings: GlobalSettings;
}

export default function CityServicePageTemplate({ city, service, settings }: Props) {
  const s = replaceAll(service, city.name);
  const office = getOffice(city.slug, settings.offices);
  const area = getArea(city.slug);
  const articles = getArticles(DEFAULT_ARTICLE_SLUGS);
  const gridCities = getGridCities();
  const cityNameUpper = city.name.toUpperCase();

  return (
    <>
      {/* ── 1. HERO ──────────────────────────────────────────────────────── */}
      {city.type === 'local-office' ? (
        (() => {
          const localContent = getLocalOfficeContent(city.slug);
          return localContent ? <CityVideoHero hero={localContent.hero} /> : null;
        })()
      ) : (
        <CityServiceHero
          serviceTitle={s.serviceTitle}
          cityName={city.name}
          serviceHeroImage={s.serviceHeroImage}
          office={office}
          gbpLabel={city.name}
          area={area}
          callout={s.heroCallout}
        />
      )}

      {/* ── 2. HERO-NAV ──────────────────────────────────────────────────── */}
      <HeroNav />

      {/* ── 2b. SEO BREADCRUMB (Brief 64) — Home › Category › Hub › City Service */}
      <div className="bg-cream-100">
        <Breadcrumbs
          items={cityServiceCrumbs(city.slug, city.name, service.serviceSlug, service.serviceTitle)}
        />
      </div>

      {/* ── 3–7. CREAM CONTENT WRAPPER (mirrors CoverageAreaCity structure) ── */}
      <div className="cream bg-cream-100">
        <div className="city-page-content mx-auto w-[90%] lg:w-[81%]">

          {/* ── 3 + 4. SERVICE INTRO (heading + body + image) ────────────── */}
          <section className="f grid grid-cols-1 items-stretch gap-10 pt-[50px] lg:grid-cols-2 lg:pt-[130px]">
            <div className="flex flex-col justify-start">
              {/* Brief 95 (A.3): serviceIntro.heading was saved + merged but never
                  rendered — wire it, falling back to the old hard-coded literal
                  when empty (Secondary Section below proves this template's
                  headings are meant to be per-page editable). */}
              <p className="red-text mb-6 font-display text-[28px] font-bold uppercase leading-tight tracking-tight text-brand-600 md:text-[32px]">
                {s.serviceIntro.heading || `WE'VE GOT YOU COVERED, ${cityNameUpper}`}
              </p>
              <div className="space-y-4">
                {s.serviceIntro.paragraphs.map((p, i) => (
                  <p key={i} className="font-body text-[16px] leading-[24px] text-navy-800">
                    {p}
                  </p>
                ))}
              </div>
            </div>
            <div className="relative min-h-[300px] overflow-hidden rounded-[5px]">
              {s.serviceIntro.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.serviceIntro.image}
                  alt={city.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0" style={{ background: '#F9F3EC' }} aria-hidden="true" />
              )}
            </div>
          </section>

          {/* ── 5. GOOGLE MAP ────────────────────────────────────────────── */}
          <iframe
            className="city-page-map my-[100px] h-[570px] w-full border-0"
            loading="lazy"
            src={`https://maps.google.com/maps?hl=en&q=${encodeURIComponent(`${city.name}, Illinois`)}&t=&z=14&ie=UTF8&iwloc=B&output=embed`}
            title={`Map of ${city.name}, Illinois`}
          />

          {/* ── 6. SECONDARY CONTENT (LOCAL SEO) ────────────────────────── */}
          <section className="secondary-section mb-[50px] grid grid-cols-1 items-stretch gap-10 lg:mb-[130px] lg:grid-cols-[470px_1fr]">
            <div className="relative min-h-[250px] overflow-hidden rounded-[5px]">
              {s.secondarySection.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.secondarySection.image}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0" style={{ background: '#F9F3EC' }} aria-hidden="true" />
              )}
            </div>
            <div className="flex flex-col justify-center">
              <p className="red-text mb-4 font-display text-[28px] font-bold uppercase leading-tight tracking-tight text-brand-600 md:text-[32px]">
                {s.secondarySection.heading}
              </p>
              <div className="space-y-4">
                {s.secondarySection.paragraphs.map((p, i) => (
                  <p key={i} className="font-body text-[16px] leading-[24px] text-navy-800">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </section>

          {/* ── 7. OUR SERVICES ACCORDION ────────────────────────────────── */}
          {city.type === 'local-office' ? (
            (() => {
              const localContent = getLocalOfficeContent(city.slug);
              return localContent ? (
                <CityServicesAccordion
                  heading={localContent.services.heading}
                  categories={localContent.services.categories}
                />
              ) : null;
            })()
          ) : (
            <CityServicesMenu citySlug={city.slug} />
          )}

          {/* ── 8. REVIEWS WIDGET ────────────────────────────────────────── */}
          {(() => {
            const elfsightId =
              city.type === 'local-office'
                ? (getLocalOfficeContent(city.slug)?.reviews.elfsightId ?? getElfsightContentId(city.slug))
                : getElfsightContentId(city.slug);
            return (
              <div className="city-page-gr mb-[100px]">
                <GoogleReviews widgetId={elfsightId} />
              </div>
            );
          })()}

        </div>
      </div>

      {/* ── 9. "TURNING BAD CALLS TO GOOD CALLS" TAGLINE ────────────────── */}
      {/* Brief 95 (B.3): Global Settings is the single source for this tagline —
          do not re-hard-code it here. */}
      <div className="py-[40px] text-center">
        <p className="ep-tiktok-headline font-display text-[24px] font-bold text-navy-800">
          {settings.taglineTurning || 'J Blanton Plumbing - Turning Bad Calls to Good Calls'}
        </p>
      </div>

      {/* ── 9. RELATED ARTICLES ──────────────────────────────────────────── */}
      <section className="city-articles mx-auto max-w-[1200px] px-6 pb-[80px]">
        <ArticleGrid articles={articles} />
      </section>

      {/* ── 10. CITY-LOCATIONS GRID ──────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pb-[80px]">
        <CityLocationsGrid cities={gridCities} />
      </section>

      {/* ── 11. FAQ ACCORDION ────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pb-[60px]">
        <FaqAccordion faqs={s.faqs} />
      </section>
    </>
  );
}
