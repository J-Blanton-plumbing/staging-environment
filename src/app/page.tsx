import Link from 'next/link';
import Image from 'next/image';
import { Phone } from 'lucide-react';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import ServiceCard from '@/components/ServiceCard';
import ServicesAccordion from '@/components/ServicesAccordion';
import HeroNav from '@/components/HeroNav';
import HomeHeroVideo from '@/components/HomeHeroVideo';
import GoogleReviews from '@/components/GoogleReviews';
import TikTokFeed from '@/components/TikTokFeed';
import ArticleGrid from '@/components/ArticleGrid';
import LocationsSection from '@/components/LocationsSection';
import NoDripClubSection from '@/components/NoDripClubSection';
import { renderCmsBlock } from '@/lib/cms/sanitize';
import { SERVICES } from '@/lib/services';
import { getArticles } from '@/lib/articles';
import { HOME } from '@/lib/content/home';
import { getMainPageContent } from '@/lib/cms/main-pages';
import { getMainPagePreview } from '@/lib/cms/preview';
import PreviewBanner from '@/components/PreviewBanner';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Chicago Plumbing Experts | Make a Good Call',
  description: 'J. Blanton Plumbing — Chicago and suburbs, over 30 years.',
};

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
  const articles = getArticles(HOME.knowledgeHub.featuredSlugs);

  return (
    <>
      {preview && <PreviewBanner label={preview.meta.label} creatorName={preview.meta.creator_name} editorUrl="/admin/home" liveUrl="/" draftId={preview.meta.id} pageType="main" pageSlug="home" />}
      {/* ============== HERO: 100vh, bright video, bottom-aligned content ============== */}
      <section className="test-hero relative w-full h-screen overflow-hidden bg-navy-900">
        <HomeHeroVideo />

        <div className="test-hero-body absolute inset-0 z-[2] flex items-end">
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
                <Link href={settings.phoneHref} className="text-white hover:text-brand-400 transition-colors">
                  {home.hero.headingCta}
                </Link>
              </p>
              <p className="font-display font-bold uppercase text-white text-[40px] leading-[1.1] tracking-tight mt-[15px] max-[1280px]:text-[30px] max-[780px]:text-[26px]">
                {home.hero.headingTagline}
              </p>
            </div>

            <div className="r lg:w-1/2 flex flex-col">
              <p className="intro font-display font-medium text-white text-[22px] md:text-[30px] leading-[1.16] mb-7">
                {home.hero.intro}
              </p>
              <Link
                href={settings.phoneHref}
                className="test-hero-contact inline-flex items-center self-start bg-accent-500 hover:bg-brand-600 text-white font-display font-bold px-7 py-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.25)] transition-colors duration-150"
              >
                <span className="w-5 h-5 mr-2.5 flex items-center justify-center">
                  <Phone className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <span className="text-lg lg:text-xl tracking-wide">{settings.phoneDisplay}</span>
              </Link>
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
          <section className="knowledge-hub mt-[120px] max-[768px]:mt-[30px] pb-[120px] max-[768px]:pb-0">
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

      {/* ============== FIND US — locations map ============== */}
      <LocationsSection
        className="find-us relative z-0 bg-cream-100 pt-[60px] md:pt-[150px] pb-[30px] md:pb-[75px]"
        contentsClassName="find-us-contents w-[90%] lg:w-[81%] mx-auto"
        headingClassName="leading-none"
        bodyClassName="text-navy-800 text-base leading-relaxed"
        heading={home.findUs.heading}
        body={findUsBody}
        mobileButton
      />
    </>
  );
}
