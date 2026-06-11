import HeroNav from '@/components/HeroNav';
import CityVideoHero from '@/components/CityVideoHero';
import CityServicesAccordion from '@/components/CityServicesAccordion';
import PartnersCarousel from '@/components/PartnersCarousel';
import FaqAccordion from '@/components/FaqAccordion';
import ArticleGrid from '@/components/ArticleGrid';
import { getArticles } from '@/lib/articles';
import type { LocalOfficeContent } from '@/lib/content/cities/types';

/**
 * Local Office ("video-hero") city template — the Brief 09 Evanston layout,
 * folded out of the old standalone `app/evanston/page.tsx` into a reusable
 * component the shared `[city]` builder calls for `type: 'local-office'` cities
 * (currently Evanston; Northbrook/Elmhurst drop in as data later). The JSX is
 * unchanged from Brief 09, so `/evanston` output is identical after the move.
 *
 * Section order matches live `/evanston` (brief-09 §"Confirmed matches"):
 * video hero → hero-nav → WHY → skyline → OUR SERVICES → reviews →
 * tiktok/social → articles → partners → FAQs → footer.
 *
 * Coverage-Area-only sections (NAP block, Google map, "manplumber", city-locations
 * grid) are intentionally absent (brief-09 "do NOT add").
 */
export default function LocalOfficeCity({ city }: { city: LocalOfficeContent }) {
  const articles = getArticles(city.articles.featuredSlugs);

  return (
    <>
      {/* ============== 1. VIDEO HERO ============== */}
      <CityVideoHero hero={city.hero} />

      {/* ============== 2. HERO-NAV (shared; Brief 07 default hrefs) ============== */}
      <HeroNav />

      {/* ============== CREAM CONTENT WRAPPER ============== */}
      <div className="cream bg-cream-100">
        <div className="city-page-content mx-auto w-[90%] lg:w-[81%] pt-[80px] lg:pt-[130px]">
          {/* ===== 3. WHY J. BLANTON FOR {CITY} ===== */}
          <section className="f grid grid-cols-1 min-[901px]:grid-cols-2 items-stretch gap-10">
            <div className="flex flex-col justify-center">
              <p className="red-text mb-6 font-display text-[28px] font-bold uppercase leading-tight tracking-tight text-brand-600 md:text-[32px]">
                {city.why.heading}
              </p>
              <div className="leading-relaxed text-navy-800">
                <p>{city.why.body}</p>
              </div>
              {/* Inline image — hidden at desktop (≥901px), shown at ≤900px when right-col img hides */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={city.why.image.src}
                alt={city.why.image.alt}
                className="mt-4 max-w-[350px] w-full mx-auto rounded-[5px] object-cover min-[901px]:hidden"
              />
            </div>
            {/* Right-col image — hidden at ≤900px; inline .l img takes over */}
            <div className="relative min-h-[300px] overflow-hidden rounded-[5px] max-[900px]:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={city.why.image.src}
                alt={city.why.image.alt}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </section>

          {/* ===== 4. FLOATING-SKYLINE IMAGE ===== */}
          <div className="image-container my-[60px] w-full">
            {/* Decorative — empty alt. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={city.skylineImage}
              alt=""
              className="block h-auto w-full object-contain lg:mx-auto lg:max-w-[1200px]"
            />
          </div>

          {/* ===== 5. OUR SERVICES (accordion menu) ===== */}
          <CityServicesAccordion heading={city.services.heading} categories={city.services.categories} />

          {/* ===== 6. REVIEWS (Elfsight) ===== */}
          <section id="reviews" className="mb-[60px]">
            <div
              className={`elfsight-app-${city.reviews.elfsightId}`}
              data-elfsight-app-lazy
            />
          </section>

          {/* ===== 7. "Turning Bad Calls to Good Calls" + social (Elfsight) ===== */}
          <p className="ep-tiktok-headline">{city.social.headline}</p>
          <section className="city-social-media mb-[60px]">
            <div
              className={`elfsight-app-${city.social.elfsightId}`}
              data-elfsight-app-lazy
            />
          </section>

          {/* ===== 8. RELATED ARTICLES (shared component) ===== */}
          {articles.length > 0 && (
            <section className="city-articles mt-[130px] w-full">
              <ArticleGrid articles={articles} />
            </section>
          )}

          {/* ===== 9. OUR PARTNERS carousel (gated on data) ===== */}
          {city.partners.length > 0 && <PartnersCarousel logos={city.partners} />}

          {/* ===== 10. FAQ accordion ===== */}
          <FaqAccordion faqs={city.faqs} />
        </div>
      </div>
    </>
  );
}
