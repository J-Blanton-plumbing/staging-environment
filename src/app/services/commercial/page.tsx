import Link from 'next/link';
import Image from 'next/image';
import { Phone, ArrowRight, Check } from 'lucide-react';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import CategoryHero from '@/components/CategoryHero';
import HeroNav from '@/components/HeroNav';
import CharacterPanel from '@/components/CharacterPanel';
import GoogleReviews from '@/components/GoogleReviews';
import TikTokFeed from '@/components/TikTokFeed';
import ArticleGrid from '@/components/ArticleGrid';
import LocationsSection from '@/components/LocationsSection';
import SubcategoriesGrid from '@/components/SubcategoriesGrid';
import { getArticles } from '@/lib/articles';
import { COMMERCIAL } from '@/lib/content/commercial';
import { getServiceCmsContent } from '@/lib/cms/service-pages';
import { getServicePreview } from '@/lib/cms/preview';
import { renderCmsBlock } from '@/lib/cms/sanitize';
import type { ServiceCmsContent } from '@/lib/cms/service-pages';
import PreviewBanner from '@/components/PreviewBanner';
import type { CommercialContent } from '@/lib/content/commercial';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Commercial Plumbing & Restaurant Services',
  description:
    "If your business is experiencing plumbing issues, we're here to help! From clogged drains to water heater problems, our expert team delivers fast, reliable solutions to keep your operations running smoothly.",
};

async function getContent(cmsOverride?: ServiceCmsContent): Promise<CommercialContent> {
  try {
    const cms = cmsOverride ?? await getServiceCmsContent('commercial');
    if (cms) {
      const { page, subcategoriesBlock, global: g } = cms;
      return {
        hero: { heading: page.hero_heading, intro: page.hero_intro },
        intro: { heading: page.intro_heading, body: page.intro_body },
        problems: { heading: page.problems_heading, items: page.problems_items },
        // Brief 98: subcategory items (incl. image) now come from the
        // `serviceSubcategories` block; falls back to nothing when absent.
        subcategories: {
          heading: page.subcategories_heading,
          items: subcategoriesBlock?.items ?? [],
        },
        serviceArea: { heading: g.service_area_heading, body: g.service_area_body },
        tiktok: { headline: g.tiktok_headline },
        preventative: { heading: page.preventative_heading, body: page.preventative_body },
        finalPitch: { tagline: page.final_pitch_tagline, body: page.final_pitch_body },
        heroImage: COMMERCIAL.heroImage,
        fImage: COMMERCIAL.fImage,
        f3Image: COMMERCIAL.f3Image,
        articles: { featuredSlugs: page.articles_featured_slugs },
      };
    }
  } catch {
    // DB unreachable — fall through to static fallback
  }
  return COMMERCIAL;
}

export default async function CommercialPage() {
  const settings = await getGlobalSettingsCached();
  const servicePreview = await getServicePreview('commercial');
  const previewDraft = servicePreview?.meta ?? null;
  const content = await getContent(servicePreview?.cms);
  const articles = getArticles(content.articles.featuredSlugs);

  return (
    <>
      {previewDraft && (
        <PreviewBanner
          label={previewDraft.label}
          creatorName={previewDraft.creator_name}
          editorUrl="/admin/commercial"
          liveUrl="/services/commercial"
          draftId={previewDraft.id}
          pageType="service"
          pageSlug="commercial"
        />
      )}
      <CategoryHero
        image={content.heroImage}
        heading={content.hero.heading}
        intro={content.hero.intro}
      />

      <HeroNav />

      <div className="cream bg-cream-100">
        <div className="w81 emergecy-plumbing w-[90%] lg:w-[81%] mx-auto pt-[80px] lg:pt-[120px]">

          <section className="f grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-[100px] lg:mb-[140px]">
            <div>
              <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-tight mb-6">
                {content.intro.heading}
              </p>
              <div
                className="custom-paragraphs cms-block-content space-y-4 text-navy-800 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: renderCmsBlock(content.intro.body, settings) }}
              />
            </div>
            <div className="aspect-[4/3] relative rounded-lg overflow-hidden shadow-card">
              <Image
                src={content.fImage}
                alt="Commercial Plumbing Services in Chicagoland"
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
                  {content.problems.heading}
                </p>
                {content.problems.items.length > 0 && (
                  <ul className="space-y-3 mb-8">
                    {content.problems.items.map((p) => (
                      <li key={p} className="service flex items-start gap-3 text-[16px] md:text-[18px]">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand-600 flex-shrink-0 mt-0.5">
                          <Check className="h-4 w-4" strokeWidth={3} />
                        </span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href={settings.phoneHref}
                  className="link-button inline-flex items-center gap-2 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded-full transition-colors duration-150"
                >
                  <Phone className="h-4 w-4" strokeWidth={2.5} />
                  MAKE A GOOD CALL
                </Link>
              </div>
            </div>
          </CharacterPanel>

          <SubcategoriesGrid heading={content.subcategories.heading} items={content.subcategories.items} />

          <LocationsSection
            className="ep-map mb-[100px] lg:mb-[140px]"
            contentClassName="ep-contents"
            headingClassName="leading-tight uppercase"
            bodyClassName="text-navy-800 leading-relaxed"
            heading={content.serviceArea.heading}
            body={[content.serviceArea.body]}
            showButton={false}
          />

          <section className="ep-gr mb-[80px]">
            <GoogleReviews />
          </section>

          <section className="ep-tiktok mb-[100px]">
            <TikTokFeed
              headline={content.tiktok.headline}
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
                {content.preventative.heading}
              </p>
              <div
                className="cms-block-content text-navy-800 leading-relaxed mb-6"
                dangerouslySetInnerHTML={{ __html: renderCmsBlock(content.preventative.body, settings) }}
              />
              <Link
                href="/no-drip-club"
                className="link-button hidden md:inline-flex items-center gap-2 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded-full transition-colors duration-150"
              >
                JOIN NOW <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            </div>
            <Link
              href="/no-drip-club"
              className="link-button md:hidden order-3 inline-flex items-center gap-2 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded-full transition-colors duration-150 self-start"
            >
              JOIN NOW <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </Link>
          </section>

          <section className="page-articles mb-[100px] lg:mb-[140px]">
            <ArticleGrid articles={articles} />
          </section>

          <section className="f3 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center pb-[100px] lg:pb-[140px]">
            <div className="aspect-[4/3] relative rounded-lg overflow-hidden shadow-card">
              <Image
                src={content.f3Image}
                alt="J. Blanton Plumbing"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-tight mb-6 uppercase">
                {content.finalPitch.tagline}
              </p>
              <div
                className="cms-block-content text-navy-800 leading-relaxed mb-6"
                dangerouslySetInnerHTML={{ __html: renderCmsBlock(content.finalPitch.body, settings) }}
              />
              <Link
                href={settings.phoneHref}
                className="link-button inline-flex items-center gap-2 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded-full transition-colors duration-150"
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
