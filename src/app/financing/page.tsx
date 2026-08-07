import Image from 'next/image';
import Link from 'next/link';
import HeroNav from '@/components/HeroNav';
import ArticleCard from '@/components/ArticleCard';
import { FINANCING } from '@/lib/content/financing';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { renderCmsInline } from '@/lib/cms/sanitize';
import { getMainPagePreview } from '@/lib/cms/preview';
import PreviewBanner from '@/components/PreviewBanner';
import GoogleReviews from '@/components/GoogleReviews';
import TikTokFeed from '@/components/TikTokFeed';
import { getArticles } from '@/lib/articles';
import type { Metadata } from 'next';
import { getMainPageMeta } from '@/lib/cms/page-meta';
import './financing.css';

export const dynamic = 'force-dynamic';

/**
 * Brief 149 (Track C) — the `main_pages.meta_title` / `meta_description`
 * fields were editable in the admin and read by nothing: this page's <title>
 * came from the literal below. They now drive the page, with the literal kept
 * as the fallback for a blank field. `getMainPageMeta` normalizes the brand
 * suffix so the root layout's title template appends it exactly once, whatever
 * an editor types.
 */
const STATIC_META = {
  title: 'Financing',
  description:
    "Flexible financing options for your plumbing needs. Don't let budget concerns stop essential repairs — easy payment plans and quick approval with J. Blanton Plumbing.",
};

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getMainPageMeta('financing', STATIC_META);
  return { title: meta.title, description: meta.description };
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M21.546 5.111a1.5 1.5 0 0 1 0 2.121L10.303 18.475a1.6 1.6 0 0 1-2.263 0L2.454 12.89a1.5 1.5 0 1 1 2.121-2.121l4.596 4.596L19.424 5.111a1.5 1.5 0 0 1 2.122 0" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export default async function FinancingPage() {
  const preview = await getMainPagePreview('financing');
  const db = preview?.content ?? await getMainPageContent('financing').catch(() => null);
  const d = db ?? {};
  const settings = await getGlobalSettingsCached();
  const m = (dbVal: unknown, fb: string) => (typeof dbVal === 'string' && dbVal) ? dbVal : fb;
  // Rich-text bodies (Brief 89, A1) render as sanitized inline HTML.
  const html = (v: string) => ({ __html: renderCmsInline(v, settings) });
  const {
    hero: _hero,
    financingSolutionsReady: _fsr,
    financingMadeSimple: _fms,
    coverage: _cov,
    surpriseBills: _sb,
    articleSlugs,
    bottomCta: _bc,
  } = FINANCING;
  // Brief 95 (B.2): Global Settings is the single source for phone CTAs on this
  // page — hero/financingMadeSimple/bottomCta no longer carry their own
  // SITE.phone/SITE.phoneHref literals (see financing.ts).
  const hero = { ..._hero, heading: m(d.hero_heading, _hero.heading), description: m(d.hero_description, _hero.description), ctaLabel: settings.phoneDisplay, ctaHref: settings.phoneHref };
  const financingSolutionsReady = { ..._fsr, label: m(d.financing_ready_label, _fsr.label), body: m(d.financing_ready_body, _fsr.body) };
  const financingMadeSimple = { ..._fms, label: m(d.financing_simple_label, _fms.label), ctaHref: settings.phoneHref };
  const coverage = { ..._cov, heading: m(d.coverage_heading, _cov.heading), body: m(d.coverage_body, _cov.body) };
  const surpriseBills = { ..._sb, label: m(d.surprise_bills_label, _sb.label), body: m(d.surprise_bills_body, _sb.body) };
  const bottomCta = { ..._bc, label: m(d.bottom_cta_label, _bc.label), body: m(d.bottom_cta_body, _bc.body), ctaHref: settings.phoneHref };

  const articles = getArticles([...articleSlugs]);

  return (
    <div className="financing-page">
      {preview && <PreviewBanner label={preview.meta.label} creatorName={preview.meta.creator_name} editorUrl="/admin/financing" liveUrl="/financing" draftId={preview.meta.id} pageType="main" pageSlug="financing" />}

      {/* ================================================================
          HERO
          ================================================================ */}
      <div className="hero">
        <div className="img-s">
          <Image
            src={hero.image}
            alt={hero.imageAlt}
            fill
            sizes="45vw"
            priority
            style={{ objectFit: 'cover' }}
          />
        </div>
        {/* hero-contents avoids Tailwind .contents { display:contents } collision */}
        <div className="hero-contents">
          <div className="w">
            <h1>{hero.heading}</h1>
            <p className="hero-desc" dangerouslySetInnerHTML={html(hero.description)} />
            <a href={hero.ctaHref} className="link-button">
              <PhoneIcon />
              {hero.ctaLabel}
            </a>
          </div>
        </div>
      </div>

      {/* ================================================================
          HERO-NAV
          ================================================================ */}
      <HeroNav />

      {/* ================================================================
          Cream background wrapper
          ================================================================ */}
      <div className="cream">

        {/* ==============================================================
            FINANCING SOLUTIONS READY — .pv layout (full-width section,
            with its own .w81 inside — same pattern as why-j-blanton)
            ============================================================== */}
        <div className="pv">
          <div className="w81">
            {/* Desktop: label + body */}
            <div>
              <p className="red-text">{financingSolutionsReady.label}</p>
              <p dangerouslySetInnerHTML={html(financingSolutionsReady.body)} />
            </div>
            {/* Mobile heading (hidden on desktop) */}
            <p className="red-text red-text-mobile">{financingSolutionsReady.label}</p>
            <Image
              src={financingSolutionsReady.image}
              alt={financingSolutionsReady.imageAlt}
              width={470}
              height={320}
              sizes="(max-width: 900px) 90vw, 470px"
            />
            {/* Mobile body (hidden on desktop) */}
            <div className="mobile-content">
              <p dangerouslySetInnerHTML={html(financingSolutionsReady.body)} />
            </div>
          </div>
        </div>

        {/* ==============================================================
            EP sections — inside a single .w81 constraint
            ============================================================== */}
        <div className="w81">

          {/* ------------------------------------------------------------
              FINANCING MADE SIMPLE — .ep-card pattern
              ------------------------------------------------------------ */}
          <div className="ep-card">
            <Image
              className="ndc"
              src={financingMadeSimple.ndcImage}
              alt="NDC"
              fill
              sizes="100vw"
            />
            <div>
              <Image
                className="char"
                src={financingMadeSimple.characterImage}
                alt="Character"
                width={400}
                height={451}
              />
              <div className="a">
                <div className="l" />
                <div className="r">
                  <p className="label">{financingMadeSimple.label}</p>
                  {/* Mobile image — shown via CSS at ≤1000px */}
                  <Image
                    src={financingMadeSimple.leftImage}
                    alt={financingMadeSimple.leftImageAlt}
                    width={470}
                    height={320}
                  />
                  {financingMadeSimple.items.map((item) => (
                    <div className="service" key={item}>
                      <div><CheckIcon /></div>
                      <p>{item}</p>
                    </div>
                  ))}
                  <a href={financingMadeSimple.ctaHref} className="link-button">
                    {financingMadeSimple.ctaLabel}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------
              WE'RE ALMOST EVERYWHERE — .ep-map pattern
              ------------------------------------------------------------ */}
          <div className="ep-map">
            <div className="ep-contents">
              {/* map2: shown on mobile only */}
              <div className="map2">
                <iframe
                  className="financing-map"
                  loading="lazy"
                  src="https://maps.google.com/maps?hl=en&q=J.+Blanton+Plumbing,+Illinois&t=&z=10&ie=UTF8&iwloc=B&output=embed"
                  title="J. Blanton Plumbing service area"
                />
              </div>
              <p className="red-text">{coverage.heading}</p>
              <p dangerouslySetInnerHTML={html(coverage.body)} />
            </div>
            {/* map1: shown on desktop only */}
            <div className="map1">
              <iframe
                className="financing-map"
                loading="lazy"
                src="https://maps.google.com/maps?hl=en&q=J.+Blanton+Plumbing,+Illinois&t=&z=10&ie=UTF8&iwloc=B&output=embed"
                title="J. Blanton Plumbing service area"
              />
            </div>
          </div>

          {/* ------------------------------------------------------------
              GOOGLE REVIEWS — live site has this as its own block ahead of
              the TikTok feed; ported page was missing it (Brief 96 follow-up)
              ------------------------------------------------------------ */}
          <div className="ep-gr">
            <GoogleReviews />
          </div>

          <p className="ep-tiktok-headline">
            {settings.taglineTurning || 'J Blanton Plumbing - Turning Bad Calls to Good Calls'}
          </p>
          <div className="ep-tiktok">
            <TikTokFeed widgetId={coverage.socialWidgetId} />
          </div>

          {/* ------------------------------------------------------------
              WE HATE SURPRISE BILLS TOO — .f2 pattern
              ------------------------------------------------------------ */}
          <div className="f2">
            <div>
              <p className="red-text">{surpriseBills.label}</p>
              {/* Mobile image (hidden on desktop) */}
              <Image
                src={surpriseBills.leftImage}
                alt={surpriseBills.leftImageAlt}
                width={470}
                height={320}
              />
              <p dangerouslySetInnerHTML={html(surpriseBills.body)} />
              <Link href={surpriseBills.ctaHref} className="link-button">
                {surpriseBills.ctaLabel}
              </Link>
            </div>
            {/* Desktop right image */}
            <Image
              src={surpriseBills.rightImage}
              alt={surpriseBills.rightImageAlt}
              width={470}
              height={320}
            />
          </div>

          {/* ------------------------------------------------------------
              ARTICLES
              ------------------------------------------------------------ */}
          <div className="page-articles">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          </div>

          {/* ------------------------------------------------------------
              TURN A TIGHT SPOT INTO A SMART PLAN — .f3 pattern
              ------------------------------------------------------------ */}
          <div className="f3">
            {/* Desktop left image */}
            <Image
              src={bottomCta.leftImage}
              alt={bottomCta.leftImageAlt}
              width={470}
              height={320}
            />
            <div>
              <p className="red-text">{bottomCta.label}</p>
              {/* Mobile image (hidden on desktop) */}
              <Image
                src={bottomCta.innerImage}
                alt={bottomCta.innerImageAlt}
                width={470}
                height={320}
              />
              <p dangerouslySetInnerHTML={html(bottomCta.body)} />
              <a href={bottomCta.ctaHref} className="link-button button1">
                {bottomCta.ctaLabel}
              </a>
            </div>
          </div>

        </div>{/* end .w81 */}
      </div>{/* end .cream */}

    </div>
  );
}
