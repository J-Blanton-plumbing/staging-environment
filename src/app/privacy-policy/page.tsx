import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getMainPageMeta } from '@/lib/cms/page-meta';
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
import { isPageLive } from '@/lib/cms/page-status';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsBlock } from '@/lib/cms/sanitize';
import { PRIVACY_POLICY } from '@/lib/content/privacy-policy';
import './privacy-policy.css';

/**
 * /privacy-policy — "Terms of Use & Privacy Policy" legal page (Brief 110).
 *
 * WHY THIS EXISTS: the route 404'd in the Node clone because no template
 * rendered it (the footer links to /privacy-policy on every page, and Google
 * indexes it). This rebuilds the LIVE page
 * (https://jblantonplumbing.com/privacy-policy) using the shared Coverage Area
 * building blocks — `CityHero` (Local Office NAP box, phone-only CTA), `HeroNav`,
 * Google map, `CityServicesMenu`, `ArticleGrid`, `CityLocationsGrid`,
 * `FaqAccordion` — plus one bespoke long-form legal body (the only page-specific
 * markup). Navbar + Footer come from the root layout / SiteShell for free.
 *
 * Unlike the hiring page (Brief 109) there is NO primary CTA button — the live
 * page shows the phone link only, which is `CityHero`'s default when no `cta`
 * prop is passed.
 *
 * CMS: the H1 and the legal body are editable at /admin/privacy-policy and stored
 * on the `main_pages` row (slug `privacy-policy`). DB content is merged over the
 * static `PRIVACY_POLICY` defaults so an un-seeded env still renders. `body_html`
 * is a rich-text field (sanitized on write, rendered as block HTML here).
 *
 * ⚠️ The live page's Privacy Policy body is truncated at the source (ends
 * mid-sentence on "This"); the static fallback mirrors it verbatim. See
 * `@/lib/content/privacy-policy.ts` for the full fidelity note.
 */

const SLUG = 'privacy-policy';

// Force-dynamic so CMS edits are reflected immediately (same as other main pages).
export const dynamic = 'force-dynamic';

/**
 * Brief 149 (Track C) — the `main_pages` meta fields for this page were editable
 * in the admin and read by nothing. They now drive it, with the static content
 * file kept as the fallback for a blank field. `getMainPageMeta` applies
 * `pageTitle()` itself, so the explicit call here is gone rather than doubled.
 */
export async function generateMetadata(): Promise<Metadata> {
  const meta = await getMainPageMeta(SLUG, {
    title: PRIVACY_POLICY.meta.title,
    description: PRIVACY_POLICY.meta.description,
  });
  return {
    title: meta.title,
    description: meta.description,
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPolicyPage() {
  // Preview draft (authorized CMS session) wins over the live DB row.
  const preview = await getMainPagePreview(SLUG);

  /*
   * Brief 159 (Track D / E1) — the render gate.
   *
   * A page is live if and only if one of its versions is Published; the live
   * row's derived `status` column mirrors that, so this is ONE indexed column
   * read and never a join to `page_drafts`. `notFound()` rather than a 200 with
   * `noindex`: a 200 keeps the URL in the crawl set and contradicts the sitemap
   * removal that accompanies it. The session-gated preview cookie wins, so an
   * editor can still see an unpublished page; `isPageLive` fails OPEN on a
   * database error.
   */
  if (!preview && !(await isPageLive('main', SLUG))) notFound();
  const db = preview?.content ?? (await getMainPageContent(SLUG).catch(() => null));
  const d = db ?? {};
  const settings = await getGlobalSettingsCached();

  // String field with static fallback.
  const m = (val: unknown, fb: string) => (typeof val === 'string' && val ? val : fb);

  const S = PRIVACY_POLICY;
  const heroHeading = m(d.hero_heading, S.hero.heading);
  const heroImage = m(d.hero_image, S.hero.image);
  const bodyHtml = renderCmsBlock(m(d.body_html, S.body.html), settings);

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

      {/* ============== 1. HERO + LOCAL OFFICE NAP BOX (phone-only CTA) ============== */}
      <CityHero
        cityName="J. Blanton Plumbing"
        h1={heroHeading}
        heroImageUrl={heroImage}
        office={getOffice(SLUG, settings.offices)}
        area={getArea(SLUG)}
        elfsightHeroId={elfsightHeroId}
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

          {/* ===== 4. LEGAL BODY (the only bespoke section) ===== */}
          <section
            className="privacy-body my-[70px] lg:my-[100px]"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />

          {/* ===== 5. OUR SERVICES (shared static menu) =====
              Brief 138: NO citySlug — this is not a city page, so the menu must
              emit global service links (/sewer-rodding, /services/plumbing, …).
              Passing SLUG here produced ~40 dead /privacy-policy/{service}
              links. */}
          <CityServicesMenu />

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
