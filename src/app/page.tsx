import Link from 'next/link';
import Image from 'next/image';
import { Phone } from 'lucide-react';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import ServiceCard from '@/components/ServiceCard';
import ServicesAccordion from '@/components/ServicesAccordion';
import HeroNav from '@/components/HeroNav';
import HomeHeroVideo from '@/components/HomeHeroVideo';
import GoogleReviews from '@/components/GoogleReviews';
import TikTokFeed from '@/components/TikTokFeed';
import ArticleGrid from '@/components/ArticleGrid';
import StoreLocator from '@/components/locator/StoreLocator';
import RegionChooser from '@/components/RegionChooser';
import NoDripClubSection from '@/components/NoDripClubSection';
import { renderCmsBlock, sanitizeHomeContent } from '@/lib/cms/sanitize';
import { SERVICES } from '@/lib/services';
import { getHomeFeaturedArticles } from '@/lib/cms/home-featured';
import { resolveHomeContent } from '@/lib/cms/home-content';
import { HOME } from '@/lib/content/home';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getMainPagePreview } from '@/lib/cms/preview';
import PreviewBanner from '@/components/PreviewBanner';
import type { Metadata } from 'next';
import { cache } from 'react';
import { getMainPageMeta } from '@/lib/cms/page-meta';
import HomeHeroRotator from '@/components/HomeHeroRotator';
import { getHomeDepartmentIds } from '@/lib/cms/home-departments';
import { homepageJsonLd } from '@/lib/schema/homepage';
import { ldJson } from '@/lib/schema/city-pages';
import { CANONICAL_BASE, TITLE_TEMPLATE } from '@/lib/seo';
import './home-hero.css';

/*
 * Brief 219: the WHOLE homepage reads the `main_pages` row `home` (/admin/home), every piece of copy,
 * every image and the hero video. The field list, defaults and fallback rules live in
 * `src/lib/cms/home-content.ts`; the code fallback for a blank field is `HOME` in
 * `src/lib/content/home.ts` (= the live page of 2026-10-26). Layout stays locked here: the CMS changes
 * what a section says, never which sections exist or their order.
 *
 * Retired with this brief: the HERO_V5_PREVIEW flag and its HERO_V5_COPY override (Brief 218's hero
 * copy is now seeded into the CMS), the two-tier `|` heading, and the `hero_heading` field. The sr-only
 * <h1> is built from the visible line (`heroH1`), so the two can never disagree.
 */

export const dynamic = 'force-dynamic';

/**
 * The https hosts next.config.mjs lets next/image load (its `images.remotePatterns`): an image field
 * pointing anywhere else falls back to its default instead of throwing. The uploads CDN comes from
 * the same env var next.config reads, so an image uploaded in /admin/home is always usable.
 */
const IMAGE_HOSTS = [
  'lh3.googleusercontent.com',
  'd1rplazj5a80fb.cloudfront.net',
  ...(() => {
    try {
      return process.env.S3_UPLOAD_PUBLIC_BASE_URL ? [new URL(process.env.S3_UPLOAD_PUBLIC_BASE_URL).hostname] : [];
    } catch {
      return [];
    }
  })(),
];

/** The entries of `value` that differ from `defaults` (props a client component only needs when edited). */
function changedFrom<T extends Record<string, string>>(value: T, defaults: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([k, v]) => v !== defaults[k])) as Partial<T>;
}

/**
 * Brief 218 (Track A, copy locked 2026-10-26) replaced the values below. The title is stored and kept
 * suffix-free like every other title source; `generateMetadata` composes the brand through
 * TITLE_TEMPLATE itself, because the root layout's `title.template` does NOT apply to a page in the
 * layout's own segment — that is why the old homepage <title> never carried "| J. Blanton Plumbing".
 * Production's `main_pages.home` meta fields hold the Brief 149 backfill (= the old values), which
 * beat this fallback: `scripts/update-brief-218-home-meta.ts` (deploy step) writes the new copy there.
 *
 * Brief 149 (Track C) — the `main_pages.meta_title` / `meta_description` fields
 * for `home` were editable in the admin and read by nothing: this page's <title>
 * came from the literal below. They now drive the page, with the literal kept as
 * the fallback for a blank field. `getMainPageMeta` normalizes the brand suffix
 * so the root layout's title template appends it exactly once.
 *
 * Note the fallback title's internal pipe — "Chicago Plumbing Experts | Make a
 * Good Call" — which is copy, not a suffix. `pageTitle()` only strips a TRAILING
 * brand suffix, so it is left alone; a brand name mid-string always was.
 */
const STATIC_META = {
  title: 'Plumbers in Chicagoland & Columbus, OH',
  description:
    "Need a plumber near you? For 30+ years, we've helped homeowners with water heaters, clogged drains, sewer lines and more. Available 24/7, with upfront pricing.",
};

/** Brief 218 (Track A): the share image (1200×630, committed at public/images/og-home.jpg). */
const OG_IMAGE = {
  url: `${CANONICAL_BASE}/images/og-home.jpg`,
  width: 1200,
  height: 630,
  alt: 'J. Blanton Plumbing technician standing next to a branded red service van',
};

/**
 * The ONE resolved title + description for this request, shared by the <head> and the WebPage
 * JSON-LD node (React `cache`: one read per request), so the two can never drift apart. `title` is
 * the full rendered title, brand included exactly once.
 */
const homeMeta = cache(async () => {
  const meta = await getMainPageMeta('home', STATIC_META);
  return { title: TITLE_TEMPLATE.replace('%s', meta.title), description: meta.description };
});

export async function generateMetadata(): Promise<Metadata> {
  const { title, description } = await homeMeta();
  // Next merges metadata SHALLOWLY: a page-level `openGraph` replaces the layout's whole object, so
  // site_name / locale / type are re-declared here exactly as the layout sets them.
  return {
    title: { absolute: title },
    description,
    openGraph: {
      type: 'website',
      locale: 'en_US',
      siteName: 'J. Blanton Plumbing',
      title,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

export default async function HomePage() {
  const settings = await getGlobalSettingsCached();
  // Brief 218 (Track B): the homepage's own Organization + WebSite + WebPage graph. The footer's
  // all-offices graph is off on `/` (root layout → SiteShell `officeGraphOffPath`).
  const meta = await homeMeta();
  const departmentIds = await getHomeDepartmentIds(settings.offices.map((o) => o.slug));
  const jsonLd = homepageJsonLd({ pageName: meta.title, pageDescription: meta.description, departmentIds });
  const preview = await getMainPagePreview('home');
  const db = preview?.content ?? await getMainPageContent('home').catch(() => null);
  // Brief 219: the stored row (or the draft under the preview cookie) → render values. The same
  // sanitizer the write path runs, so a preview shows exactly what a publish would store; then every
  // blank / unusable value falls back to `HOME` (never throws, never undefined).
  const c = resolveHomeContent(sanitizeHomeContent((db ?? {}) as Record<string, unknown>), IMAGE_HOSTS);
  const articles = await getHomeFeaturedArticles(c.knowledgeHub.featuredSlugs);
  // A client component's props are serialized into the page, so the hero video gets them only when
  // they differ from its built-in defaults; the unedited homepage stays byte-identical.
  const videoProps = changedFrom(
    { desktopSrc: c.hero.videoDesktop, mobileSrc: c.hero.videoMobile, poster: c.hero.poster },
    { desktopSrc: HOME.hero.videoDesktop, mobileSrc: HOME.hero.videoMobile, poster: HOME.hero.poster }
  );

  return (
    <>
      {preview && <PreviewBanner label={preview.meta.label} creatorName={preview.meta.creator_name} editorUrl="/admin/home" liveUrl="/" draftId={preview.meta.id} pageType="main" pageSlug="home" />}
      <script type="application/ld+json" dangerouslySetInnerHTML={ldJson(jsonLd)} />
      {/* ============== HERO: 100vh, bright video, bottom-aligned content ============== */}
      <section className="test-hero relative w-full h-screen overflow-hidden bg-navy-900">
        <HomeHeroVideo {...videoProps} />

        <div className="test-hero-body absolute inset-0 z-[2] flex items-end">
          {/* ── One left column, sr-only H1 + animated line, 24/7 on the "P" ──
               Reading order top→bottom: eyebrow, H1, intro, CTA label, phone
               pill. Brief 218: the column is 700px and the type is the sewer
               hero's (src/app/home-hero.css). */}
            <div className="test-hero-contents w-[90%] mx-auto mb-[80px] lg:mb-[150px] flex flex-col">
              {/* `mx-auto` belongs to the 90% band (left edge at 5%, matching
                  every other section). The width cap goes on THIS inner column,
                  never on the band — putting max-w on the band made mx-auto
                  centre the text block instead of left-aligning it. */}
              <div className="w-full max-w-[700px] flex flex-col items-start">
              {/* Eyebrow — the 14px/600/1px-tracking label step this page
                  already uses elsewhere. The 46px bottom margin is not
                  decorative: it is the clearance the 24/7 mark needs to sit
                  above the headline without touching this line. */}
              <p className="font-display font-semibold uppercase text-white text-[14px] leading-[20px] tracking-[1px] opacity-90 mb-[46px] max-[780px]:text-[12px] max-[780px]:tracking-[1.2px] max-[780px]:mb-[34px]">
                {c.hero.eyebrow}
              </p>

              {/* Brief 218 (Track D): the page's ONE <h1> is this static,
                  visually hidden one (Tailwind `sr-only` — never display:none),
                  so screen readers and Google read one complete heading. */}
              <h1 className="sr-only">{c.hero.h1}</h1>
              {/* The visible headline is NOT a heading: an aria-hidden line
                  whose market name rotates. Both names are in the server HTML;
                  HomeHeroRotator only moves classes. Sewer-hero type, normal
                  case, Cream (text-white is #fff) — src/app/home-hero.css. */}
              <p className="hub-h1-home" aria-hidden="true">
                {/* The 24/7 mark, moved here from the old <h1> with alt="" (it
                    sits inside an aria-hidden line now). Em-relative offsets
                    keep it on the "P" at every clamp() size. `absolute` (not
                    inline) is deliberate: inline would inflate the line box. */}
                <Image
                  src={c.hero.badgeImage}
                  alt=""
                  width={100}
                  height={100}
                  priority
                  className="hero-badge"
                />
                {`${c.hero.lineLead} `}
                <HomeHeroRotator words={c.hero.words} />
              </p>

              {/* Nunito, not Industry — the sewer hero's intro step (20/30,
                  17/27 at ≤900px). The 26px to the CTA label is that label's
                  own top margin, unchanged. */}
              <p className="intro home-hero-intro">
                {c.hero.intro}
              </p>

              {/* "Make a Good Call" is already a PhoneLink, so pairing it with
                  the phone pill below reads as one lockup — label then number —
                  instead of a 50px slogan competing with the H1. Marketing
                  dropped the exclamation mark; the copy itself is the CMS
                  `hero_cta` field, so this file does not hardcode it. */}
              <p className="font-display font-bold uppercase text-white text-[20px] leading-[24px] tracking-[1.2px] mt-[26px] mb-[10px] max-[780px]:text-[16px]">
                <PhoneLink
                  href={settings.phoneHref}
                  display={settings.phoneDisplay}
                  className="text-white hover:text-brand-400 transition-colors"
                >
                  {c.hero.ctaLabel}
                </PhoneLink>
              </p>

              {/* Same PhoneLink as before (WhatConverts note in the original
                  branch below still applies) with ONE change: `rounded-full`
                  became `rounded-[10px]`. 10px is this page's measured CTA
                  radius — three Cerulean buttons use it; this pill was the only
                  fully-round one. Audit finding F-04 is closed on exactly that
                  basis (live uses 10px rectangles, not the brand doc's pill). */}
              <PhoneLink
                href={settings.phoneHref}
                display={settings.phoneDisplay}
                className="test-hero-contact inline-flex items-center self-start bg-accent-500 hover:bg-brand-600 text-white font-display font-bold px-7 py-4 rounded-[10px] shadow-[0_0_10px_rgba(0,0,0,0.25)] transition-colors duration-150"
              >
                <span className="w-5 h-5 mr-2.5 flex items-center justify-center">
                  <Phone className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <span className="text-lg lg:text-xl tracking-wide">
                  <PhoneNumber value={settings.phoneDisplay} />
                </span>
              </PhoneLink>
              </div>
            </div>
        </div>
      </section>

      {/* ============== HERO-NAV ============== */}
      {/* Homepage exception (matches live): HELP & SUPPORT → /no-drip-club (§10) */}
      <HeroNav helpHref="/no-drip-club" />

      {/* ============== SERVICES (cream bg) + Google Reviews + TikTok ============== */}
      <section className="home-services-bg bg-cream-100 pt-[90px] pb-16 md:pb-24 relative z-0">
        <div className="home-services w-[90%] lg:w-[81%] mx-auto relative z-[2]">
          <div className="align1 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 md:mb-[60px]">
            <h2 className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-none">
              {c.services.heading}
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 md:max-w-2xl">
              <p className="text-navy-800 font-sans text-[19px] leading-[30px] max-[1280px]:text-[16px] max-[770px]:leading-[26px] flex-1">
                {c.services.intro}
              </p>
              {/* Desktop-only — live hides this row's CTA on mobile (the accordion
                  below has its own full-width "VIEW ALL SERVICES" button; brief-113 B2). */}
              <Link
                href="/services"
                className="link-button hidden md:flex flex-shrink-0"
              >
                {c.services.ctaLabel}
              </Link>
            </div>
          </div>

          <div className="services">
            {/* Mobile (≤900px): red collapsible accordion */}
            <ServicesAccordion />

            {/* Desktop (≥900px): centered, wrapping flex row of 350px cards (§4) */}
            <div className="services-contents hidden min-[900px]:flex flex-wrap justify-center gap-[30px]">
              {SERVICES.map((service) => (
                <ServiceCard key={service.slug} service={service} className="w-[350px]" />
              ))}
            </div>
          </div>

          {/* ---- AREAS WE SERVICE — region chooser (Columbus Brief 04) -------
              Placement is Marketing's, not a layout preference: inside this
              cream services section, AFTER both service paths and BEFORE the
              reviews carousel.

              "After both paths" is the load-bearing part. `.services` above
              renders TWO mutually exclusive trees — `ServicesAccordion` at
              ≤900px and the `ServiceCard` flex row at ≥900px. The band is a
              SIBLING of that div, not a child of either, so it renders exactly
              once at every breakpoint. Putting it inside `.services` would
              either duplicate it or hide it on one of the two.

              Brief 04 also requires the position to stay a ONE-LINE MOVE:
              Marketing may want the band below `<GoogleReviews />` after
              seeing it at preview. `RegionChooser` therefore carries no
              full-bleed background and no sibling-dependent spacing — cut the
              single line below and paste it after the reviews div, nothing
              else changes.
              --------------------------------------------------------------- */}
          <RegionChooser className="mt-[90px]" copy={c.regions} />

          {/* Google Reviews carousel — Elfsight (same widget ID as live site) */}
          <div className="homepage-google-reviews mt-[90px] mb-[90px]">
            <GoogleReviews />
          </div>

          {/* TikTok */}
          <TikTokFeed
            headline={c.tiktokHeadline}
            headlineClassName="tiktok-headline mt-10 leading-tight"
            className="home-tiktok overflow-x-auto"
          />
        </div>
      </section>

      {/* ============== CREAM block: WHY + NO DRIP CLUB + KNOWLEDGE HUB ============== */}
      <div className="cream bg-cream-100">
        <div className="w-[90%] lg:w-[81%] mx-auto">

          {/* WHY — pt-130, flex space-between, YouTube iframe + content split */}
          <section className="why pt-[130px] max-[900px]:pt-[50px] flex flex-col lg:flex-row lg:items-center justify-between gap-10">
            {/* mobile red label */}
            <p className="red-text why-label-mobile lg:hidden font-display font-bold text-brand-600 text-[28px] tracking-tight leading-none">
              {c.why.heading}
            </p>

            {/* YouTube embed */}
            <div className="w-full lg:w-[50%] aspect-video">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${c.why.videoId}?controls=0&rel=0&fs=0`}
                title={c.why.videoTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="w-full h-full rounded-lg"
              />
            </div>

            {/* why-content */}
            <div className="why-content w-full lg:w-1/2 lg:ml-[30px] text-navy-800">
              <h2 className="red-text hidden lg:block font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-none mb-[10px]">
                {c.why.heading}
              </h2>
              {c.why.body.map((p, i) => (
                <p key={i} className={i === 0 ? 'leading-relaxed text-base' : 'my-5 leading-relaxed text-base'}>
                  {p}
                </p>
              ))}
              <Link
                href="/why-j-blanton"
                className="link-button max-[480px]:w-full"
              >
                {c.why.ctaLabel}
              </Link>
            </div>
          </section>

          {/* NO DRIP CLUB — shared component (brief-11 §8 extracted it from here).
              Styling lives in globals.css under `.no-drip-club` so the exact theme
              values (overlay 0.78, skew label offsets, white pill) are matched
              rather than approximated (§11). */}
          <NoDripClubSection
            bodyHtml={renderCmsBlock(c.ndc.body, settings)}
            ctaLabel={c.ndc.ctaLabel}
            label={c.ndc.label}
            image={c.ndc.image}
            imageAlt={c.ndc.imageAlt}
          />

          {/* KNOWLEDGE HUB — 120px top margin, 3-column articles grid */}
          <section className="knowledge-hub mt-[120px] max-[768px]:mt-[30px] pb-[30px] max-[768px]:pb-0">
            <div className="align1 knowledge-hub flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
              <h2 className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-none">
                {c.knowledgeHub.heading}
              </h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 md:max-w-xl">
                <p className="text-navy-800 font-sans text-[19px] leading-[30px] max-[1280px]:text-[16px] max-[770px]:leading-[26px] flex-1">
                  {c.knowledgeHub.intro}
                </p>
                {/* Desktop-only — removes the phantom mobile button (brief-113 B4);
                    live shows no "view all articles" CTA below ~770px. */}
                <Link
                  href="/knowledge-hub"
                  className="link-button hidden md:flex flex-shrink-0"
                >
                  {c.knowledgeHub.ctaLabel}
                </Link>
              </div>
            </div>

            <ArticleGrid articles={articles} />
          </section>
        </div>
      </div>

      {/* ============== WHERE TO FIND US — the store locator ==============
          Brief 171 replaced `<LocationsSection>` (which wrapped the keyword-search
          Google iframe in `LocationsMap`) with a server-rendered, searchable
          locator over all 15 CMS offices. Same band, same position — last section
          before the footer.

          The mobile-only BOOK NOW under the old map is deliberately DROPPED
          (Marketing's call: the page carries plenty of booking CTAs above this
          point). `LocationsSection` and `LocationsMap` themselves are untouched —
          eight other pages still render them verbatim.

          ⚠️ SPACING: `md:pt-[90px]`, not the `md:pt-[150px]` this band inherited
          from the old section. 150px was the largest leading value on the page
          AND it stacked on the Knowledge Hub's `pb-[120px]` directly above,
          giving 270px between the last article card and this heading — roughly
          double every other section transition here (80 / 90 / 120 / 130px). The
          fix is at the BOUNDARY, not in one value: Knowledge Hub's bottom padding
          dropped to 30px (card breathing room) and this band leads with 90px, the
          same as `home-services-bg`, the page's other full-bleed coloured band.
          Total 120px, which is the page's rhythm. Mobile was already in family at
          60px and is unchanged. Change one of the two and the doubling comes
          back. */}
      <StoreLocator
        className="find-us relative z-0 bg-cream-100 pt-[60px] md:pt-[90px] pb-[30px] md:pb-[75px]"
        contentClassName="find-us-contents w-[90%] lg:w-[81%] mx-auto"
        offices={settings.offices}
        heading={c.findUs.heading}
        body={c.findUs.body}
        copy={c.locator}
        phone={settings.phoneDisplay}
        phoneHref={settings.phoneHref}
      />
    </>
  );
}
