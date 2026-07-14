import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Phone, ArrowRight, Check } from 'lucide-react';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { SERVICE_CATEGORY_SLUGS, isServiceCategorySlug } from '@/lib/services';
import CategoryHero from '@/components/CategoryHero';
import HeroNav from '@/components/HeroNav';
import CharacterPanel from '@/components/CharacterPanel';
import GoogleReviews from '@/components/GoogleReviews';
import TikTokFeed from '@/components/TikTokFeed';
import ArticleGrid from '@/components/ArticleGrid';
import LocationsSection from '@/components/LocationsSection';
import PreviewBanner from '@/components/PreviewBanner';
import { getArticles } from '@/lib/articles';
import { getServiceCmsContent } from '@/lib/cms/service-pages';
import { getServicePreview } from '@/lib/cms/preview';
import type { ServiceCmsContent } from '@/lib/cms/service-pages';
import type { Metadata } from 'next';

// Force SSR so DB edits and drafts are reflected immediately
export const dynamic = 'force-dynamic';

// Brief 76 (DM-1): only the canonical service-category slugs may resolve here.
// Any other slug (e.g. `hvac-services`, or DB rows like `hydro-jetting` that
// have their own top-level route) must 404 instead of falling through to
// on-demand SSR and duplicating a canonical page. `dynamicParams = false`
// rejects unlisted params, and the explicit allowlist check in the component
// below is a hard backstop that holds even with `force-dynamic`.
export const dynamicParams = false;

export function generateStaticParams() {
  return SERVICE_CATEGORY_SLUGS.map(slug => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isServiceCategorySlug(slug)) return {};
  const cms = await getServiceCmsContent(slug).catch(() => null);
  if (!cms) return {};
  return {
    title: cms.page.meta_title ?? cms.page.hero_heading ?? slug,
    description: cms.page.meta_description ?? cms.page.hero_intro ?? undefined,
  };
}

const FALLBACK_HERO = '/images/hero-plumbing.webp';
const FALLBACK_F    = '/images/preventative.webp';
const FALLBACK_F3   = '/images/plumbing-f3.webp';

function buildContent(cms: ServiceCmsContent) {
  const { page, subcategories, global: g } = cms;
  return {
    hero:          { heading: page.hero_heading,           intro: page.hero_intro },
    intro:         { heading: page.intro_heading,          body:  page.intro_body },
    problems:      { heading: page.problems_heading,       items: page.problems_items },
    subcategories: {
      heading: page.subcategories_heading,
      items: subcategories.map(s => ({
        label: s.label,
        href:  s.href,
        desc:  s.description,
      })),
    },
    serviceArea:   { heading: g?.service_area_heading ?? '', body: g?.service_area_body ?? '' },
    tiktok:        { headline: g?.tiktok_headline ?? '' },
    preventative:  { heading: page.preventative_heading,  body: page.preventative_body },
    finalPitch:    { tagline: page.final_pitch_tagline,    body: page.final_pitch_body },
    heroImage:     page.hero_image  || FALLBACK_HERO,
    fImage:        page.f_image     || FALLBACK_F,
    f3Image:       page.f3_image    || FALLBACK_F3,
    articles:      { featuredSlugs: page.articles_featured_slugs },
    metaTitle:     page.meta_title,
    metaDescription: page.meta_description,
  };
}

export default async function ServiceCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Brief 76 (DM-1): hard backstop so an unlisted slug can never render a
  // duplicate/orphaned page, even if `dynamicParams` is bypassed by SSR.
  if (!isServiceCategorySlug(slug)) notFound();

  const settings = await getGlobalSettingsCached();

  const preview = await getServicePreview(slug);
  const cms = preview?.cms ?? await getServiceCmsContent(slug).catch(() => null);

  if (!cms) notFound();

  const content  = buildContent(cms);
  const articles = getArticles(content.articles.featuredSlugs);

  return (
    <>
      {preview?.meta && (
        <PreviewBanner
          label={preview.meta.label}
          creatorName={preview.meta.creator_name}
          editorUrl={`/admin/${slug}`}
          liveUrl={`/services/${slug}`}
          draftId={preview.meta.id}
          pageType="service"
          pageSlug={slug}
        />
      )}

      <CategoryHero
        image={content.heroImage}
        heading={content.hero.heading}
        intro={content.hero.intro}
      />

      <HeroNav />

      <div className="cream bg-cream-100">
        <div className="w81 w-[90%] lg:w-[81%] mx-auto pt-[80px] lg:pt-[120px]">

          {/* Intro + image */}
          <section className="f grid grid-cols-1 lg:grid-cols-2 gap-10 items-center mb-[100px] lg:mb-[140px]">
            <div>
              <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-tight mb-6">
                {content.intro.heading}
              </p>
              <div className="custom-paragraphs space-y-4 text-navy-800 leading-relaxed">
                <p>{content.intro.body}</p>
              </div>
            </div>
            <div className="aspect-[4/3] relative rounded-lg overflow-hidden shadow-card">
              <Image
                src={content.fImage}
                alt={content.intro.heading}
                fill
                className="object-cover"
              />
            </div>
          </section>

          {/* Problems panel */}
          {content.problems.items.length > 0 && (
            <CharacterPanel
              className="ep-card ndc-section mb-[100px] lg:mb-[140px]"
              characterClassName="char hidden lg:block relative lg:w-[400px] lg:h-[520px] flex-shrink-0"
            >
              <div className="a flex-1 w-full px-8 md:px-12 lg:px-8 lg:pr-16 py-10 lg:py-16 text-white">
                <div className="r">
                  <p className="label font-display font-bold text-[28px] md:text-[36px] lg:text-[42px] leading-tight mb-6 uppercase tracking-tight">
                    {content.problems.heading}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {content.problems.items.map(item => (
                      <li key={item} className="service flex items-start gap-3 text-[16px] md:text-[18px]">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand-600 flex-shrink-0 mt-0.5">
                          <Check className="h-4 w-4" strokeWidth={3} />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
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
          )}

          {/* Subcategories */}
          {content.subcategories.items.length > 0 && (
            <section className="ep-subcategories mb-[100px] lg:mb-[140px]">
              <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] tracking-tight leading-tight mb-10 text-center">
                {content.subcategories.heading}
              </p>
              <div className="services grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {content.subcategories.items.map(sub => (
                  <Link
                    key={sub.label}
                    href={sub.href}
                    className="card group flex flex-col bg-white rounded-lg overflow-hidden hover:shadow-card hover:-translate-y-1 transition-[box-shadow,transform] duration-200 cursor-pointer"
                  >
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
          )}

          {/* Service area */}
          {content.serviceArea.heading && (
            <LocationsSection
              className="ep-map mb-[100px] lg:mb-[140px]"
              contentClassName="ep-contents"
              headingClassName="leading-tight uppercase"
              bodyClassName="text-navy-800 leading-relaxed"
              heading={content.serviceArea.heading}
              body={[content.serviceArea.body]}
              showButton={false}
            />
          )}

          <section className="ep-gr mb-[80px]">
            <GoogleReviews />
          </section>

          {content.tiktok.headline && (
            <section className="ep-tiktok mb-[100px]">
              <TikTokFeed
                headline={content.tiktok.headline}
                headlineClassName="ep-tiktok-headline"
              />
            </section>
          )}

          {/* Preventative / NDC */}
          {content.preventative.heading && (
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
                <p className="text-navy-800 leading-relaxed mb-6 whitespace-pre-line">
                  {content.preventative.body}
                </p>
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
          )}

          {/* Articles */}
          {articles.length > 0 && (
            <section className="page-articles mb-[100px] lg:mb-[140px]">
              <ArticleGrid articles={articles} />
            </section>
          )}

          {/* Final pitch */}
          {content.finalPitch.tagline && (
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
                <p className="text-navy-800 leading-relaxed mb-6">
                  {content.finalPitch.body}
                </p>
                <Link
                  href={settings.phoneHref}
                  className="link-button inline-flex items-center gap-2 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded-full transition-colors duration-150"
                >
                  <Phone className="h-4 w-4" strokeWidth={2.5} />
                  MAKE A GOOD CALL
                </Link>
              </div>
            </section>
          )}

        </div>
      </div>
    </>
  );
}
