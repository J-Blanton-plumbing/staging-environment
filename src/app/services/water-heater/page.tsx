import Link from 'next/link';
import Image from 'next/image';
import { Phone, ArrowRight, Check } from 'lucide-react';
import { SITE } from '@/lib/site';
import CategoryHero from '@/components/CategoryHero';
import HeroNav from '@/components/HeroNav';
import CharacterPanel from '@/components/CharacterPanel';
import GoogleReviews from '@/components/GoogleReviews';
import TikTokFeed from '@/components/TikTokFeed';
import ArticleGrid from '@/components/ArticleGrid';
import LocationsSection from '@/components/LocationsSection';
import { getArticles } from '@/lib/articles';
import { WATER_HEATER } from '@/lib/content/water-heater';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Water Heater Installation & Repair in Chicagoland | J. Blanton Plumbing',
  description:
    'When hot water disappears, our licensed plumbers provide fast water heater repair and expert water heater installation to restore comfort day or night.',
};

export default function WaterHeaterPage() {
  const articles = getArticles(WATER_HEATER.articles.featuredSlugs);

  return (
    <>
      <CategoryHero
        image={WATER_HEATER.heroImage}
        heading={WATER_HEATER.hero.heading}
        intro={WATER_HEATER.hero.intro}
      />

      <HeroNav />

      <div className="cream bg-cream-100">
        <div className="w81 emergecy-plumbing w-[90%] lg:w-[81%] mx-auto pt-[80px] lg:pt-[120px]">

          <section className="f grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-[100px] lg:mb-[140px]">
            <div>
              <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-tight mb-6">
                {WATER_HEATER.intro.heading}
              </p>
              <div className="custom-paragraphs space-y-4 text-navy-800 leading-relaxed">
                {WATER_HEATER.intro.body.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
            <div className="aspect-[4/3] relative rounded-lg overflow-hidden shadow-card">
              <Image
                src={WATER_HEATER.fImage}
                alt="Water Heater Services in Chicagoland"
                fill
                className="object-cover"
              />
            </div>
          </section>

          <CharacterPanel
            className="ep-card ndc-section mb-[100px] lg:mb-[140px]"
            characterClassName="char hidden lg:block relative lg:w-[400px] lg:h-[520px] flex-shrink-0"
          >
            <div className="a flex-1 w-full px-8 md:px-12 lg:px-8 lg:pr-16 py-10 lg:py-16 text-white">
              <div className="r">
                <p className="label font-display font-bold text-[28px] md:text-[36px] lg:text-[42px] leading-tight mb-6 uppercase tracking-tight">
                  {WATER_HEATER.problems.heading}
                </p>
                <ul className="space-y-3 mb-8">
                  {WATER_HEATER.problems.items.map((p) => (
                    <li key={p} className="service flex items-start gap-3 text-[16px] md:text-[18px]">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand-600 flex-shrink-0 mt-0.5">
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={SITE.phoneHref}
                  className="link-button inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded transition-colors"
                >
                  <Phone className="h-4 w-4" strokeWidth={2.5} />
                  MAKE A GOOD CALL
                </Link>
              </div>
            </div>
          </CharacterPanel>

          <section className="ep-subcategories mb-[100px] lg:mb-[140px]">
            <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-tight mb-10 text-center">
              {WATER_HEATER.subcategories.heading}
            </p>
            <div className="services grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {WATER_HEATER.subcategories.items.map((sub) => (
                <Link
                  key={sub.label}
                  href={sub.href}
                  className="card group flex flex-col bg-white rounded-lg overflow-hidden hover:shadow-card transition-shadow"
                >
                  <div className="aspect-[4/3] bg-cream-200 overflow-hidden">
                    <Image
                      src={sub.image}
                      alt={sub.label}
                      width={400}
                      height={300}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <p className="label font-display font-bold italic uppercase text-navy-800 text-[18px] mb-2 leading-tight">
                      {sub.label}
                    </p>
                    <p className="desc text-sm text-navy-800 leading-relaxed mb-4 flex-1">
                      {sub.desc}
                    </p>
                    <span className="inline-flex items-center gap-2 text-navy-800 font-display font-bold text-sm group-hover:text-brand-600 transition-colors">
                      Read more <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ep-new-section 1 — installation pitch (water heater only) */}
          <section className="ep-new-section mb-[100px] lg:mb-[140px]">
            <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-tight mb-6">
              {WATER_HEATER.extraSection1.heading}
            </p>
            <div className="space-y-4 text-navy-800 leading-relaxed">
              <p>{WATER_HEATER.extraSection1.para1}</p>
              <p>{WATER_HEATER.extraSection1.para2}</p>
            </div>
          </section>

          <LocationsSection
            className="ep-map mb-[100px] lg:mb-[140px]"
            contentClassName="ep-contents"
            headingClassName="leading-tight uppercase"
            bodyClassName="text-navy-800 leading-relaxed"
            heading={WATER_HEATER.serviceArea.heading}
            body={[WATER_HEATER.serviceArea.body]}
            showButton={false}
          />

          <section className="ep-gr mb-[80px]">
            <GoogleReviews />
          </section>

          <section className="ep-tiktok mb-[100px]">
            <TikTokFeed
              headline={WATER_HEATER.tiktok.headline}
              headlineClassName="ep-tiktok-headline"
            />
          </section>

          <section className="f2 grid grid-cols-1 md:grid-cols-2 gap-10 items-center mb-[100px] lg:mb-[140px]">
            <div className="aspect-[4/3] relative rounded-lg overflow-hidden shadow-card order-2 md:order-1">
              <Image
                src="/images/preventative.webp"
                alt="Preventative Plumbing"
                fill
                className="object-cover"
              />
            </div>
            <div className="order-1 md:order-2">
              <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-tight mb-6 uppercase">
                {WATER_HEATER.preventative.heading}
              </p>
              <p className="text-navy-800 leading-relaxed mb-6 whitespace-pre-line">
                {WATER_HEATER.preventative.body}
              </p>
              <Link
                href="/no-drip-club"
                className="link-button hidden md:inline-flex items-center gap-2 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded transition-colors"
              >
                JOIN NOW <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            </div>
            <Link
              href="/no-drip-club"
              className="link-button md:hidden order-3 inline-flex items-center gap-2 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded transition-colors self-start"
            >
              JOIN NOW <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </section>

          {/* ep-new-section 2 — maintenance pitch (water heater only) */}
          <section className="ep-new-section mb-[100px] lg:mb-[140px]">
            <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-tight mb-6">
              {WATER_HEATER.extraSection2.heading}
            </p>
            <div className="space-y-4 text-navy-800 leading-relaxed">
              <p>{WATER_HEATER.extraSection2.para1}</p>
              <p>{WATER_HEATER.extraSection2.para2}</p>
            </div>
          </section>

          <section className="page-articles mb-[100px] lg:mb-[140px]">
            <ArticleGrid articles={articles} />
          </section>

          <section className="f3 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center pb-[100px] lg:pb-[140px]">
            <div className="aspect-[4/3] relative rounded-lg overflow-hidden shadow-card">
              <Image
                src={WATER_HEATER.f3Image}
                alt="J. Blanton Plumbing"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-tight mb-6 uppercase">
                {WATER_HEATER.finalPitch.tagline}
              </p>
              <p className="text-navy-800 leading-relaxed mb-6">
                {WATER_HEATER.finalPitch.body}
              </p>
              <Link
                href={SITE.phoneHref}
                className="link-button inline-flex items-center gap-2 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded transition-colors"
              >
                <Phone className="h-4 w-4" strokeWidth={2.5} />
                MAKE A GOOD CALL
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
