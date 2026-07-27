import type { Metadata } from 'next';
import HeroNav from '@/components/HeroNav';
import CityHero from '@/components/CityHero';
import CityServicesMenu from '@/components/CityServicesMenu';
import CityLocationsGrid from '@/components/CityLocationsGrid';
import FaqAccordion from '@/components/FaqAccordion';
import ArticleGrid from '@/components/ArticleGrid';
import GoogleReviews from '@/components/GoogleReviews';
import PreviewBanner from '@/components/PreviewBanner';
import { getArticles } from '@/lib/articles';
import { getArea, getGridCities, getOffice } from '@/lib/content/cities';
import {
  DEFAULT_ARTICLE_SLUGS,
  WATER_TESTING_FAQS,
  getElfsightHeroId,
  getElfsightContentId,
} from '@/lib/content/cities/shared';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getMainPagePreview } from '@/lib/cms/preview';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { IS_HIRING, splitHiringList } from '@/lib/content/is-hiring';

/**
 * /j-blanton-is-hiring — "Join Our Team" recruiting page (Brief 109).
 *
 * WHY THIS EXISTS: the route 404'd in production because no template rendered
 * it (the URL existed, the template did not). This rebuilds the LIVE page
 * (https://jblantonplumbing.com/j-blanton-is-hiring) using the shared Coverage
 * Area building blocks — `CityHero` (Local Office NAP box), `HeroNav`, Google
 * map, `CityServicesMenu`, `ArticleGrid`, `CityLocationsGrid`, `FaqAccordion` —
 * plus one bespoke "We Are Hiring!" body section (the only non-shared markup).
 * Navbar + Footer come from the root layout / SiteShell for free.
 *
 * CMS: the hiring-specific body copy is editable at /admin/j-blanton-is-hiring
 * and stored on the `main_pages` row (slug `j-blanton-is-hiring`). DB content is
 * merged over the static `IS_HIRING` defaults so an un-seeded env still renders.
 * The hero "JOIN US" CTA is a FIXED external link (not CMS-editable).
 */

const SLUG = 'j-blanton-is-hiring';

// Force-dynamic so CMS edits are reflected immediately (same as other main pages).
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: IS_HIRING.meta.title,
  description: IS_HIRING.meta.description,
  robots: { index: true, follow: true },
};

export default async function JoinOurTeamPage() {
  // Preview draft (authorized CMS session) wins over the live DB row.
  const preview = await getMainPagePreview(SLUG);
  const db = preview?.content ?? (await getMainPageContent(SLUG).catch(() => null));
  const d = db ?? {};
  const settings = await getGlobalSettingsCached();

  // String field with static fallback.
  const m = (val: unknown, fb: string) => (typeof val === 'string' && val ? val : fb);

  const S = IS_HIRING;
  const hero = {
    heading: m(d.hero_heading, S.hero.heading),
    image: m(d.hero_image, S.hero.image),
    cta: S.hero.cta, // fixed external careers link — not DB-driven
  };
  const body = {
    heading: m(d.body_heading, S.body.heading),
    intro: m(d.body_intro, S.body.intro),
    paragraph: m(d.body_paragraph, S.body.paragraph),
    image: m(d.body_image, S.body.image),
    benefitsLabel: m(d.benefits_label, S.body.benefitsLabel),
    benefits: splitHiringList(d.benefits, S.body.benefits),
    candidatesLabel: m(d.candidates_label, S.body.candidatesLabel),
    candidates: splitHiringList(d.candidates, S.body.candidates),
    signingBonus: m(d.signing_bonus, S.body.signingBonus),
    readyParagraph: m(d.ready_paragraph, S.body.readyParagraph),
    positionsLabel: m(d.positions_label, S.body.positionsLabel),
    positions: splitHiringList(d.positions, S.body.positions),
  };

  const articles = getArticles(DEFAULT_ARTICLE_SLUGS);
  const elfsightHeroId = getElfsightHeroId(SLUG);
  const elfsightContentId = getElfsightContentId(SLUG);
  const mapUrl =
    'https://maps.google.com/maps?hl=en&q=J.+Blanton+Plumbing,+Illinois&t=&z=10&ie=UTF8&iwloc=B&output=embed';

  return (
    <>
      {preview && (
        <PreviewBanner
          label={preview.meta.label}
          creatorName={preview.meta.creator_name}
          editorUrl={`/admin/${SLUG}`}
          liveUrl={`/${SLUG}`}
          draftId={preview.meta.id}
          pageType="main"
          pageSlug={SLUG}
        />
      )}

      {/* ============== 1. HERO + LOCAL OFFICE NAP BOX ============== */}
      <CityHero
        cityName="J. Blanton Plumbing"
        h1={hero.heading}
        heroImageUrl={hero.image}
        office={getOffice(SLUG, settings.offices)}
        area={getArea(SLUG)}
        elfsightHeroId={elfsightHeroId}
        cta={{ label: hero.cta.label, href: hero.cta.href, external: true }}
      />

      {/* ============== 2. HERO-NAV ("We've Got You Covered" band) ============== */}
      <HeroNav />

      {/* ============== CREAM CONTENT WRAPPER ============== */}
      <div className="cream bg-cream-100">
        <div className="city-page-content mx-auto w-[90%] lg:w-[81%]">
          {/* ===== 3. GOOGLE MAP ===== */}
          <iframe
            className="city-page-map mt-[50px] h-[570px] w-full border-0 lg:mt-[130px]"
            loading="lazy"
            src={mapUrl}
            title="J. Blanton Plumbing service area"
          />

          {/* ===== 4. "We Are Hiring!" body =====
              Two-column .f2 layout matching the live page: editable image on the
              left (default manplumber), hiring copy on the right. Stacks on
              mobile. Same grid pattern as CoverageAreaCity's manplumber block. */}
          <section className="hiring-body my-[70px] grid grid-cols-1 items-start gap-10 lg:my-[100px] lg:grid-cols-[470px_1fr]">
            {/* Image column — hidden on mobile; a mobile copy renders inside the
                text column below (mirrors the theme's .f2 behavior). */}
            <div className="relative hidden min-h-[300px] overflow-hidden rounded-[5px] lg:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={body.image}
                alt="J. Blanton Plumbing team"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>

            <div>
              <p className="mb-2 font-display text-[28px] font-bold uppercase leading-tight tracking-tight text-brand-600 md:text-[32px]">
                {body.heading}
              </p>
              <p className="mb-6 font-display text-[18px] font-bold text-navy-800">{body.intro}</p>

              {/* Mobile-only image (theme shows the .f2 image above the copy under 1024px). */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={body.image}
                alt=""
                className="mb-6 block w-full max-w-[470px] rounded-[5px] lg:hidden"
              />

              <p className="mb-10 leading-relaxed text-navy-800">{body.paragraph}</p>

              {/* Two lists render STACKED (one above the other), matching the live
                  page's actual layout — verified against jblantonplumbing.com. */}
              <p className="mb-3 font-display text-[20px] font-bold uppercase tracking-tight text-brand-600">
                {body.benefitsLabel}
              </p>
              <ul className="mb-10 list-disc space-y-1 pl-6 leading-relaxed text-navy-800">
                {body.benefits.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <p className="mb-3 font-display text-[20px] font-bold uppercase tracking-tight text-brand-600">
                {body.candidatesLabel}
              </p>
              <ul className="list-disc space-y-1 pl-6 leading-relaxed text-navy-800">
                {body.candidates.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <p className="mt-10 font-display text-[20px] font-bold uppercase tracking-tight text-brand-600">
                {body.signingBonus}
              </p>
              <p className="mt-4 leading-relaxed text-navy-800">{body.readyParagraph}</p>

              <p className="mt-8 mb-3 font-display text-[20px] font-bold uppercase tracking-tight text-brand-600">
                {body.positionsLabel}
              </p>
              <ul className="list-disc space-y-1 pl-6 leading-relaxed text-navy-800">
                {body.positions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              {/* Primary apply CTA (mirrors the hero button — fixed external portal). */}
              <a
                className="hero-link-button mt-8 inline-flex w-max items-center gap-2 rounded-[10px] bg-accent-500 px-[30px] py-[10px] text-white shadow-[0_0_10px_rgba(0,0,0,0.25)] transition-colors hover:bg-brand-600"
                href={hero.cta.href}
                target="_blank"
                rel="noreferrer"
              >
                <span>{hero.cta.label}</span>
              </a>
            </div>
          </section>

          {/* ===== 5. OUR SERVICES (shared static menu) ===== */}
          <CityServicesMenu citySlug={SLUG} />

          {/* ===== 6. CONTENT REVIEWS (Elfsight — live on production) ===== */}
          <div className="city-page-gr mb-[100px]">
            <GoogleReviews widgetId={elfsightContentId} />
          </div>

          {/* ===== 7. RELATED ARTICLES ===== */}
          {articles.length > 0 && (
            <section className="city-articles mt-[130px] w-full">
              <ArticleGrid articles={articles} />
            </section>
          )}

          {/* ===== 8. AREAS-SERVED GRID ===== */}
          <CityLocationsGrid cities={getGridCities()} />

          {/* ===== 9. FAQ accordion ===== */}
          <FaqAccordion faqs={WATER_TESTING_FAQS} />
        </div>
      </div>
    </>
  );
}
