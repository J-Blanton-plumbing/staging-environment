import Link from 'next/link';
import Image from 'next/image';
import { Phone, ArrowRight } from 'lucide-react';
import { SITE } from '@/lib/site';
import ServiceCard from '@/components/ServiceCard';
import ServicesAccordion from '@/components/ServicesAccordion';
import HeroNav from '@/components/HeroNav';
import GoogleReviews from '@/components/GoogleReviews';
import TikTokFeed from '@/components/TikTokFeed';
import ArticleGrid from '@/components/ArticleGrid';
import LocationsSection from '@/components/LocationsSection';
import NoDripClubSection from '@/components/NoDripClubSection';
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
  const preview = await getMainPagePreview('home');
  const db = preview?.content ?? await getMainPageContent('home').catch(() => null);
  const d = db ?? {};
  const m = (dbVal: unknown, fb: string) => (typeof dbVal === 'string' && dbVal) ? dbVal : fb;
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
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/images/hero-poster.webp"
          className="absolute inset-0 w-full h-full object-cover z-[1]"
        >
          <source src="/videos/chicago-plumbing.webm" type="video/webm" />
        </video>

        <div className="test-hero-body absolute inset-0 z-[2] flex items-end">
          <div className="test-hero-contents w-[90%] mx-auto mb-[80px] lg:mb-[150px] flex flex-col lg:flex-row">
            <div className="l lg:w-1/2 lg:mr-[15px] relative mb-10 lg:mb-0">
              {/* 24/7 badge sits ABOVE the headline, clear of the text (F-13 / §8) */}
              <Image
                src="/images/247.webp"
                alt="24/7"
                width={100}
                height={100}
                priority
                className="block mb-4 w-[100px] h-[100px]"
              />
              <h1 className="font-display font-bold uppercase text-white text-[32px] md:text-[40px] leading-[1.05] tracking-tight">
                {home.hero.heading}
              </h1>
              <h1 className="font-display font-bold uppercase text-[40px] md:text-[50px] leading-[1.05] tracking-tight">
                <Link href={SITE.phoneHref} className="text-white hover:text-brand-400 transition-colors">
                  {home.hero.headingCta}
                </Link>
              </h1>
              <h1 className="font-display font-bold uppercase text-white text-[28px] md:text-[40px] leading-[1.1] tracking-tight mt-[15px]">
                {home.hero.headingTagline}
              </h1>
            </div>

            <div className="r lg:w-1/2 flex flex-col">
              <p className="intro font-display font-medium text-white text-[22px] md:text-[30px] leading-[1.16] mb-7">
                {home.hero.intro}
              </p>
              <Link
                href={SITE.phoneHref}
                className="test-hero-contact inline-flex items-center self-start bg-accent-500 hover:bg-brand-600 text-white font-display font-bold px-7 py-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.25)] transition-colors duration-150"
              >
                <span className="w-5 h-5 mr-2.5 flex items-center justify-center">
                  <Phone className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <span className="text-lg lg:text-xl tracking-wide">{SITE.phone}</span>
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
              <p className="text-navy-800 text-base leading-relaxed flex-1">
                {home.services.intro}
              </p>
              <Link
                href="/services"
                className="flex-shrink-0 inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-display font-semibold text-sm tracking-wider px-5 py-3 rounded-full transition-colors duration-150 whitespace-nowrap"
              >
                VIEW PAGE <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
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
          <section className="why pt-[130px] flex flex-col lg:flex-row lg:items-center justify-between gap-10">
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
              <p className="leading-relaxed text-base">
                {HOME.why.body[0]}
              </p>
              <p className="my-5 leading-relaxed text-base">
                {HOME.why.body[1]}
              </p>
              <Link
                href="/why-us"
                className="link-button inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-display font-semibold text-sm tracking-wider px-5 py-3 rounded-full transition-colors duration-150"
              >
                MEET OUR TEAM <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            </div>
          </section>

          {/* NO DRIP CLUB — shared component (brief-11 §8 extracted it from here).
              Styling lives in globals.css under `.no-drip-club` so the exact theme
              values (overlay 0.78, skew label offsets, white pill) are matched
              rather than approximated (§11). */}
          <NoDripClubSection body={HOME.noDripClub.body} />

          {/* KNOWLEDGE HUB — 120px top margin, 3-column articles grid */}
          <section className="knowledge-hub mt-[120px] pb-[120px]">
            <div className="align1 knowledge-hub flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
              <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-none">
                {home.knowledgeHub.heading}
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 md:max-w-xl">
                <p className="text-navy-800 text-base leading-relaxed flex-1">
                  {home.knowledgeHub.intro}
                </p>
                <Link
                  href="/knowledge-hub"
                  className="link-button flex-shrink-0 inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-display font-semibold text-sm tracking-wider px-5 py-3 rounded-full transition-colors duration-150 whitespace-nowrap"
                >
                  VIEW ALL ARTICLES <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
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
        body={HOME.findUs.body}
        mobileButton
      />
    </>
  );
}
