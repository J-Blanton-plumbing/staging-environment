import type { ServiceContent } from '@/types/service';
import { ARTICLES } from '@/lib/articles';
import { ELFSIGHT_WIDGETS } from '@/lib/widgets';
import HeroNav from '@/components/HeroNav';
import ServiceHero from '@/components/ServiceHero';
import ServiceIntro from '@/components/ServiceIntro';
import ServiceProblems from '@/components/ServiceProblems';
import ServiceRelatedCards from '@/components/ServiceRelatedCards';
import NoDripClubSimple from '@/components/NoDripClubSimple';
import GoogleReviews from '@/components/GoogleReviews';
import TikTokFeed from '@/components/TikTokFeed';
import ArticleGrid from '@/components/ArticleGrid';
import ServiceClosingCTA from '@/components/ServiceClosingCTA';

/**
 * Generic sub-service page (brief-11, restructured brief-61). Renders the live
 * `/sewer-rodding` sections in order from a single `ServiceContent` data file —
 * every future service page is this same component fed a different data file.
 * No copy or image path is hardcoded here; the only inline copy is the §7 map
 * coverage band, which is identical on every service page.
 */
export default function ServicePageTemplate({
  content,
}: {
  content: ServiceContent;
}) {
  // §12 — reuse the shared articles component. The generic template isn't
  // service-aware, so it shows the 3 most recent posts.
  const articles = ARTICLES.slice(0, 3);

  return (
    <>
      {/* 1 — image hero */}
      <ServiceHero hero={content.hero} />

      {/* 2 — shared hero-nav strip (brief-07 defaults) */}
      <HeroNav />

      {/* 3 — expert intro (Cream, `.f` dual-image) */}
      <ServiceIntro expert={content.expertSection} />

      {/* 4 — common problems (Carmine) */}
      <ServiceProblems problems={content.problemsSection} />

      {/* 5 — related services cards (Cream) — skip when none defined */}
      {content.relatedServicesSection.cards.length > 0 && (
        <ServiceRelatedCards related={content.relatedServicesSection} />
      )}

      {/* 6 — body copy block 1 (Cream, text only) — skip when empty */}
      {content.secondarySection.paragraphs.length > 0 && (
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
      )}

      {/* 7 — service-area map (Cream). Live `.ep-map`: the Elfsight coverage
          widget with the "WE'RE ALMOST EVERYWHERE" label + paragraph. A SINGLE
          map instance is rendered and repositioned with `order` (map on top on
          mobile, right column on desktop) — rendering the widget twice (the live
          `.map1`/`.map2` trick) left one copy `display:none`, and Elfsight's
          lazy loader would only hydrate that hidden copy, so the visible map
          never rendered (brief-61 fix #3). The coverage copy is identical on
          every service page. Elfsight widgets show "something went wrong" on
          localhost — expected; they work on the production domain. */}
      <section className="bg-cream-100 py-[70px] md:py-[100px]">
        <div className="w-[90%] lg:w-[81%] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-[60px] items-center">
          <div className="order-2 lg:order-1">
            <p className="red-text font-display font-bold text-brand-600 text-[28px] md:text-[32px] leading-tight tracking-tight mb-4">
              WE&apos;RE ALMOST EVERYWHERE
            </p>
            <p className="font-sans text-navy-800 text-[16px] leading-[24px]">
              With more plumbers and more trucks at our disposal, we can cover more
              ground and reach your home quickly.
            </p>
          </div>
          <div className="order-1 lg:order-2">
            <div className={`elfsight-app-${ELFSIGHT_WIDGETS.map}`} data-elfsight-app-lazy />
          </div>
        </div>
      </section>

      {/* 8 — Google Reviews (Cream, Elfsight) */}
      <section className="bg-cream-100 py-[50px] md:py-[80px]">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <GoogleReviews />
        </div>
      </section>

      {/* 9 — TikTok feed (Cream, headline + Elfsight) */}
      <section className="bg-cream-100 py-[50px] md:py-[80px]">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <TikTokFeed headline="J Blanton Plumbing - Turning Bad Calls to Good Calls" />
        </div>
      </section>

      {/* 10 — No Drip Club (Cream, `.f2` two-column variant) */}
      <NoDripClubSimple
        title={content.noDropClubSection.title}
        body={content.noDropClubSection.body}
      />

      {/* 11 — body copy block 2 / preventive maintenance (Cream, text only —
          no image on the live page, brief-61 Track H) — skip when empty */}
      {content.preventiveSection.paragraphs.length > 0 && (
        <section className="bg-cream-100 py-[70px] md:py-[100px]">
          <div className="w-[90%] lg:w-[81%] mx-auto max-w-4xl">
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
        </section>
      )}

      {/* 12 — related articles (shared component, no section heading on live) */}
      <section className="bg-cream-100 pb-[70px] md:pb-[100px]">
        <div className="w-[90%] lg:w-[81%] mx-auto">
          <ArticleGrid articles={articles} />
        </div>
      </section>

      {/* 13 — closing CTA (Cream, `.f3.f3-left` two-column) */}
      <ServiceClosingCTA cta={content.closingCTA} />
    </>
  );
}
