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
import { renderCmsBlock } from '@/lib/cms/sanitize';
import { SERVICES } from '@/lib/services';
import { getArticles } from '@/lib/articles';
import { HOME } from '@/lib/content/home';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getMainPagePreview } from '@/lib/cms/preview';
import PreviewBanner from '@/components/PreviewBanner';
import type { Metadata } from 'next';
import { getMainPageMeta } from '@/lib/cms/page-meta';

/* ═══════════════════════════════════════════════════════════════════════════
 * HERO v5 PREVIEW FLAG — added 2026-09-02 for Marketing review.
 *
 * `true`  → the reworked hero (one left column, two-tier H1, 24/7 perched on
 *           the first letter, Nunito intro, CTA label above a 10px-radius
 *           phone pill).
 * `false` → the shipped hero, byte-for-byte. The original JSX is preserved
 *           verbatim as the else-branch below, so flipping this word is a
 *           complete revert. Nothing here is approved yet.
 *
 * This flag changes LAYOUT AND TYPE ONLY. Every string still comes from the
 * CMS (`main_pages` row `home`: hero_heading / hero_cta / hero_tagline /
 * hero_intro), and a saved DB value always beats the `HOME.hero` fallback in
 * `home.ts` — so the copy is reviewed by editing /admin/home, not this file.
 * `HOME.hero.headingTagline` in particular is marketing-locked by Columbus
 * Integration Brief 04 Track A and is deliberately left untouched.
 *
 * The two-tier H1 reads ONE field and splits it on a `|`: text before the pipe
 * is the large first tier, text after it the smaller second tier. So the
 * Heading field wants "Plumbing Experts in | Chicagoland & Central Ohio". A
 * heading with no pipe still renders correctly, as a single tier.
 * ═════════════════════════════════════════════════════════════════════════ */
const HERO_V5_PREVIEW = true;

/*
 * The proposed copy, so the preview needs no admin login and no DB write.
 *
 * This is an OVERRIDE, not a save: it applies only while HERO_V5_PREVIEW is
 * true, and only to what this page renders. `home.ts` is untouched (its
 * `headingTagline` is marketing-locked by Brief 04 Track A), and the CMS row
 * is untouched, so nothing here can leak into a deploy or overwrite an editor
 * field. When the copy is approved, it gets typed into /admin/home and these
 * four lines are deleted along with the flag.
 *
 * Note the eyebrow drops Ohio from the locked tagline. That is Marketing's
 * call and the new H1 carries Ohio instead — but it IS a change to locked
 * copy, so it must be re-approved before it reaches the CMS.
 */
const HERO_V5_COPY = {
  heading: 'Plumbing Experts in | Chicagoland & Central Ohio',
  headingCta: 'Make a Good Call',
  headingTagline: 'Serving Homeowners for 30+ Years',
  intro:
    'From clogged drains to full sewer line work, we always answer your call and all your questions. Our technicians will walk you through your options and give you a flat rate before work begins. No surprises.',
};

export const dynamic = 'force-dynamic';

/**
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
  title: 'Chicago Plumbing Experts | Make a Good Call',
  description: 'J. Blanton Plumbing — Chicago and suburbs, over 30 years.',
};

export async function generateMetadata(): Promise<Metadata> {
  const meta = await getMainPageMeta('home', STATIC_META);
  return { title: meta.title, description: meta.description };
}

export default async function HomePage() {
  const settings = await getGlobalSettingsCached();
  const preview = await getMainPagePreview('home');
  const db = preview?.content ?? await getMainPageContent('home').catch(() => null);
  const d = db ?? {};
  const m = (dbVal: unknown, fb: string) => (typeof dbVal === 'string' && dbVal) ? dbVal : fb;
  // Brief 95 (A.4): why_body/find_us_body were saved but page.tsx always rendered
  // the static arrays — wire them. Textareas are multi-paragraph, blank-line
  // separated (matches the convention used elsewhere, e.g. admin/city-service).
  const paragraphs = (dbVal: unknown, fb: string[]): string[] => {
    if (typeof dbVal !== 'string' || !dbVal.trim()) return fb;
    const parts = dbVal.split('\n\n').map(s => s.trim()).filter(Boolean);
    return parts.length > 0 ? parts : fb;
  };
  const whyBody = paragraphs(d.why_body, HOME.why.body);
  const findUsBody = paragraphs(d.find_us_body, HOME.findUs.body);
  const home = {
    hero: { ...HOME.hero, heading: m(d.hero_heading, HOME.hero.heading), headingCta: m(d.hero_cta, HOME.hero.headingCta), headingTagline: m(d.hero_tagline, HOME.hero.headingTagline), intro: m(d.hero_intro, HOME.hero.intro) },
    services: { ...HOME.services, heading: m(d.services_heading, HOME.services.heading), intro: m(d.services_intro, HOME.services.intro) },
    why: { ...HOME.why, heading: m(d.why_heading, HOME.why.heading) },
    knowledgeHub: { ...HOME.knowledgeHub, heading: m(d.knowledge_hub_heading, HOME.knowledgeHub.heading), intro: m(d.knowledge_hub_intro, HOME.knowledgeHub.intro) },
    findUs: { ...HOME.findUs, heading: m(d.find_us_heading, HOME.findUs.heading) },
  };
  // Copy override — preview only, see HERO_V5_COPY above. With the flag off,
  // `hero` is exactly what the CMS (or the home.ts fallback) supplies.
  const hero = HERO_V5_PREVIEW ? { ...home.hero, ...HERO_V5_COPY } : home.hero;
  // Two-tier H1 — `heroLine2` is undefined when the Heading carries no `|`,
  // and its <span> is then not rendered at all.
  const [heroLine1, heroLine2] = hero.heading.split('|').map((part) => part.trim());

  const articles = getArticles(HOME.knowledgeHub.featuredSlugs);

  return (
    <>
      {preview && <PreviewBanner label={preview.meta.label} creatorName={preview.meta.creator_name} editorUrl="/admin/home" liveUrl="/" draftId={preview.meta.id} pageType="main" pageSlug="home" />}
      {/* ============== HERO: 100vh, bright video, bottom-aligned content ============== */}
      <section className="test-hero relative w-full h-screen overflow-hidden bg-navy-900">
        <HomeHeroVideo />

        <div className="test-hero-body absolute inset-0 z-[2] flex items-end">
          {HERO_V5_PREVIEW ? (
            /* ── v5: one left column, two-tier H1, 24/7 on the "P" ──────────
               Reading order top→bottom: eyebrow, H1, intro, CTA label, phone
               pill. The old layout put the intro in a right-hand column whose
               top sat ~32px ABOVE the H1, so the eye read the paragraph first;
               a single column removes that problem instead of tuning around
               it. `max-w-[720px]` stops the intro sprawling across the video. */
            <div className="test-hero-contents w-[90%] mx-auto mb-[80px] lg:mb-[150px] flex flex-col">
              {/* `mx-auto` belongs to the 90% band (left edge at 5%, matching
                  every other section). The width cap goes on THIS inner column,
                  never on the band — putting max-w on the band made mx-auto
                  centre the text block instead of left-aligning it. */}
              <div className="w-full max-w-[640px] flex flex-col items-start">
              {/* Eyebrow — the 14px/600/1px-tracking label step this page
                  already uses elsewhere. The 46px bottom margin is not
                  decorative: it is the clearance the 24/7 mark needs to sit
                  above the headline without touching this line. */}
              <p className="font-display font-semibold uppercase text-white text-[14px] leading-[20px] tracking-[1px] opacity-90 mb-[46px] max-[780px]:text-[12px] max-[780px]:tracking-[1.2px] max-[780px]:mb-[34px]">
                {hero.headingTagline}
              </p>

              {/* Two tiers from ONE CMS field, split on `|` (see heroLine1/2).
                  Tier 1 leads at 52px, tier 2 supports at 36px — a 1.4 ratio,
                  matching the step spacing the rest of the page uses. */}
              <h1 className="relative font-display font-bold uppercase text-white tracking-[-0.02em] m-0">
                {/* The mark is nailed to the top-left of the first letter, so
                    its offsets are tuned to THIS asset at THIS size — change
                    tier 1's font-size or its first word and these need
                    re-tuning. `absolute` (not inline) is deliberate: inline
                    inflated the first line box and opened a visible gap
                    between the two tiers. */}
                <Image
                  src="/images/247.webp"
                  alt="24/7"
                  width={100}
                  height={100}
                  priority
                  className="absolute z-10 left-[-11px] top-[-19px] w-[74px] h-auto max-[780px]:w-[60px] max-[780px]:left-[-8px] max-[780px]:top-[-16px]"
                />
                <span
                  className="block"
                  style={{ fontSize: 'clamp(30px, 4.05vw, 60px)', lineHeight: 1, letterSpacing: '-0.025em' }}
                >
                  {heroLine1}
                </span>
                {heroLine2 && (
                  <span
                    className="block"
                    style={{ fontSize: 'clamp(26px, 2.85vw, 42px)', lineHeight: 1.06, letterSpacing: '-0.02em' }}
                  >
                    {heroLine2}
                  </span>
                )}
              </h1>

              {/* Nunito (`font-sans`), not Industry. Body copy everywhere else
                  on this page is Nunito 16/26-30; the old hero was the only
                  place setting a paragraph in Industry Medium at 30px, which
                  is what made it compete with the headline. */}
              <p className="intro font-sans font-normal text-white text-[18px] leading-[30px] mt-[22px] mb-0 max-w-[52ch] max-[780px]:text-[16px] max-[780px]:leading-[27px]">
                {hero.intro}
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
                  {hero.headingCta}
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
          ) : (
            <div className="test-hero-contents w-[90%] mx-auto mb-[80px] lg:mb-[150px] flex flex-col lg:flex-row">
              <div className="l lg:w-1/2 lg:mr-[15px] relative mb-10 lg:mb-0">
                {/* 24/7 badge overlaps the top of the headline, matching the live
                    `.test-hero .l img` overlay (home.css:35-40, 119-123, 148-150) —
                    absolutely positioned so it sits integrated into the title block
                    instead of stacked above it as a separate element (brief-113 B1). */}
                <Image
                  src="/images/247.webp"
                  alt="24/7"
                  width={100}
                  height={100}
                  priority
                  className="absolute z-10 top-[-33px] left-[-35px] w-[100px] h-[100px] max-[780px]:w-[80px] max-[780px]:h-[80px] max-[780px]:top-[-30px] max-[780px]:left-[-20px] max-[390px]:left-[-10px]"
                />
                <h1 className="font-display font-bold uppercase text-white text-[40px] leading-[1.05] tracking-tight max-[1280px]:text-[30px] max-[780px]:text-[26px]">
                  {home.hero.heading}
                </h1>
                {/* Brief 132: these two lines were <h1> and are now <p> — a page must
                    have exactly one H1 (line 1 above), and a linked phone number should
                    never be a heading. Classes are unchanged, so rendering is identical
                    (Tailwind preflight zeroes margins and normalizes font-size for both
                    tags, and every property globals.css sets on h1 — font-display,
                    font-bold, tracking-tight, text colour — is restated inline here). */}
                <p className="font-display font-bold uppercase text-navy-800 text-[50px] leading-[1.05] tracking-tight max-[780px]:text-[26px]">
                  <PhoneLink
                    href={settings.phoneHref}
                    display={settings.phoneDisplay}
                    className="text-white hover:text-brand-400 transition-colors"
                  >
                    {home.hero.headingCta}
                  </PhoneLink>
                </p>
                <p className="font-display font-bold uppercase text-white text-[40px] leading-[1.1] tracking-tight mt-[15px] max-[1280px]:text-[30px] max-[780px]:text-[26px]">
                  {home.hero.headingTagline}
                </p>
              </div>

              <div className="r lg:w-1/2 flex flex-col">
                <p className="intro font-display font-medium text-white text-[22px] md:text-[30px] leading-[1.16] mb-7">
                  {home.hero.intro}
                </p>
                {/* PhoneLink/PhoneNumber so React renders the WhatConverts tracking
                    number rather than letting the vendor patch it in. This CTA was
                    confirmed on iOS to DISPLAY the tracking number and DIAL the
                    default one — the vendor swapped the text but the href did not
                    hold. Markup is unchanged; only the anchor and the number text
                    are now React-owned. */}
                <PhoneLink
                  href={settings.phoneHref}
                  display={settings.phoneDisplay}
                  className="test-hero-contact inline-flex items-center self-start bg-accent-500 hover:bg-brand-600 text-white font-display font-bold px-7 py-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.25)] transition-colors duration-150"
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
          )}
        </div>
      </section>

      {/* ============== HERO-NAV ============== */}
      {/* Homepage exception (matches live): HELP & SUPPORT → /no-drip-club (§10) */}
      <HeroNav helpHref="/no-drip-club" />

      {/* ============== SERVICES (cream bg) + Google Reviews + TikTok ============== */}
      <section className="home-services-bg bg-cream-100 pt-[90px] pb-16 md:pb-24 relative z-0">
        <div className="home-services w-[90%] lg:w-[81%] mx-auto relative z-[2]">
          <div className="align1 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-12 md:mb-[60px]">
            <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-none">
              {home.services.heading}
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 md:max-w-2xl">
              <p className="text-navy-800 font-sans text-[19px] leading-[30px] max-[1280px]:text-[16px] max-[770px]:leading-[26px] flex-1">
                {home.services.intro}
              </p>
              {/* Desktop-only — live hides this row's CTA on mobile (the accordion
                  below has its own full-width "VIEW ALL SERVICES" button; brief-113 B2). */}
              <Link
                href="/services"
                className="link-button hidden md:flex flex-shrink-0"
              >
                VIEW PAGE
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
          <RegionChooser className="mt-[90px]" />

          {/* Google Reviews carousel — Elfsight (same widget ID as live site) */}
          <div className="homepage-google-reviews mt-[90px] mb-[90px]">
            <GoogleReviews />
          </div>

          {/* TikTok */}
          <TikTokFeed
            headline={HOME.tiktok.headline}
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
              {home.why.heading}
            </p>

            {/* YouTube embed */}
            <div className="w-full lg:w-[50%] aspect-video">
              <iframe
                src="https://www.youtube-nocookie.com/embed/ZDFzUtjBUCk?controls=0&rel=0&fs=0"
                title="Why J. Blanton"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="w-full h-full rounded-lg"
              />
            </div>

            {/* why-content */}
            <div className="why-content w-full lg:w-1/2 lg:ml-[30px] text-navy-800">
              <p className="red-text hidden lg:block font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-none mb-[10px]">
                {home.why.heading}
              </p>
              {whyBody.map((p, i) => (
                <p key={i} className={i === 0 ? 'leading-relaxed text-base' : 'my-5 leading-relaxed text-base'}>
                  {p}
                </p>
              ))}
              <Link
                href="/why-j-blanton"
                className="link-button max-[480px]:w-full"
              >
                MEET OUR TEAM
              </Link>
            </div>
          </section>

          {/* NO DRIP CLUB — shared component (brief-11 §8 extracted it from here).
              Styling lives in globals.css under `.no-drip-club` so the exact theme
              values (overlay 0.78, skew label offsets, white pill) are matched
              rather than approximated (§11). */}
          <NoDripClubSection bodyHtml={renderCmsBlock(HOME.noDripClub.body, settings)} />

          {/* KNOWLEDGE HUB — 120px top margin, 3-column articles grid */}
          <section className="knowledge-hub mt-[120px] max-[768px]:mt-[30px] pb-[30px] max-[768px]:pb-0">
            <div className="align1 knowledge-hub flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
              <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-none">
                {home.knowledgeHub.heading}
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 md:max-w-xl">
                <p className="text-navy-800 font-sans text-[19px] leading-[30px] max-[1280px]:text-[16px] max-[770px]:leading-[26px] flex-1">
                  {home.knowledgeHub.intro}
                </p>
                {/* Desktop-only — removes the phantom mobile button (brief-113 B4);
                    live shows no "view all articles" CTA below ~770px. */}
                <Link
                  href="/knowledge-hub"
                  className="link-button hidden md:flex flex-shrink-0"
                >
                  VIEW ALL ARTICLES
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
        heading={home.findUs.heading}
        body={findUsBody}
        phone={settings.phoneDisplay}
        phoneHref={settings.phoneHref}
      />
    </>
  );
}
