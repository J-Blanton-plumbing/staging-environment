import type { ServiceContent } from '@/types/service';
import { ARTICLES } from '@/lib/articles';
import HeroNav from '@/components/HeroNav';
import ServiceHero from '@/components/ServiceHero';
import ServiceIntro, { ServiceImage } from '@/components/ServiceIntro';
import ServiceProblems from '@/components/ServiceProblems';
import ServiceRelatedCards from '@/components/ServiceRelatedCards';
import NoDripClubSection from '@/components/NoDripClubSection';
import ArticleGrid from '@/components/ArticleGrid';
import ServiceClosingCTA from '@/components/ServiceClosingCTA';

/**
 * Generic sub-service page (brief-11). Renders the 11 live `/sewer-rodding`
 * sections in order from a single `ServiceContent` data file — every future
 * service page is this same component fed a different data file. No copy or
 * image path is hardcoded here; the only inline copy is the §7 coverage band,
 * which is identical on every service page (brief-11 §7).
 */
export default function ServicePageTemplate({
  content,
}: {
  content: ServiceContent;
}) {
  // §10 — reuse the shared articles component (brief-11 §10). The generic
  // template isn't service-aware, so it shows the 3 most recent posts.
  const articles = ARTICLES.slice(0, 3);

  return (
    <>
      {/* 1 — image hero */}
      <ServiceHero hero={content.hero} />

      {/* 2 — shared hero-nav strip (brief-07 defaults) */}
      <HeroNav />

      {/* 3 — expert intro (Cream) */}
      <ServiceIntro expert={content.expertSection} />

      {/* 4 — common problems (Carmine) */}
      <ServiceProblems problems={content.problemsSection} />

      {/* 5 — related services cards (Cream) */}
      <ServiceRelatedCards related={content.relatedServicesSection} />

      {/* 6 — secondary content (Cream, text only) */}
      <section className="bg-cream-100 py-[70px] md:py-[100px]">
        <div className="w-[90%] lg:w-[81%] mx-auto max-w-4xl">
          <h2 className="font-display font-bold text-brand-600 text-[28px] md:text-[32px] leading-tight tracking-tight mb-8">
            {content.secondarySection.heading}
          </h2>
          <div className="text-navy-800 space-y-5">
            {content.secondarySection.paragraphs.map((p, i) => (
              <p key={i} className="font-sans text-[16px] leading-[24px]">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* 7 — coverage / tagline band (generic — same on every service page) */}
      <section className="bg-navy-800 text-white py-[60px] md:py-[80px]">
        <div className="w-[90%] lg:w-[81%] mx-auto max-w-3xl text-center">
          <h2 className="font-display font-bold text-white text-[28px] md:text-[32px] leading-tight tracking-tight">
            WE&apos;RE ALMOST EVERYWHERE
          </h2>
          <p className="mt-5 font-sans text-cream-100 text-[16px] leading-[24px]">
            With more plumbers and more trucks at our disposal, we can cover more
            ground and reach your home quickly.
          </p>
          <p className="mt-7 font-display font-bold text-white text-[18px] md:text-[20px] tracking-wide">
            J Blanton Plumbing - Turning Bad Calls to Good Calls
          </p>
        </div>
      </section>

      {/* 8 — No Drip Club (Carmine, shared component, service-specific body) */}
      <div className="bg-cream-100">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <NoDripClubSection body={content.noDropClubSection.body} ctaLabel="JOIN NOW" />
        </div>
      </div>

      {/* 9 — preventive maintenance (Cream, text + image) */}
      <section className="bg-cream-100 py-[70px] md:py-[100px]">
        <div className="w-[90%] lg:w-[81%] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-[60px] items-center">
          <div>
            <h2 className="font-display font-bold text-brand-600 text-[28px] md:text-[32px] leading-tight tracking-tight mb-8">
              {content.preventiveSection.heading}
            </h2>
            <div className="text-navy-800 space-y-5">
              {content.preventiveSection.paragraphs.map((p, i) => (
                <p key={i} className="font-sans text-[16px] leading-[24px]">
                  {p}
                </p>
              ))}
            </div>
          </div>
          {/* Image right on desktop, stacks below on mobile */}
          <ServiceImage
            src={content.preventiveSection.image}
            className="aspect-[4/3] w-full order-first lg:order-last"
          />
        </div>
      </section>

      {/* 10 — related articles (shared component) */}
      <section className="bg-cream-100 pb-[70px] md:pb-[100px]">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <h2 className="font-display font-bold text-brand-600 text-[28px] md:text-[32px] leading-tight tracking-tight mb-10">
            From the Knowledge Hub
          </h2>
          <ArticleGrid articles={articles} />
        </div>
      </section>

      {/* 11 — closing CTA (Carmine) */}
      <ServiceClosingCTA cta={content.closingCTA} />
    </>
  );
}
