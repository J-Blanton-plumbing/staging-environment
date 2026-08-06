import { Fragment, type ReactNode } from 'react';
import type { ServiceContent } from '@/types/service';
import { ARTICLES } from '@/lib/articles';
import { ELFSIGHT_WIDGETS } from '@/lib/widgets';
import {
  NDC_DEFAULT_BODY,
  FALLBACK_CTA_IMAGE,
  resolveBlockStyle,
  readTwoColumnPosition,
  readTwoColumnButton,
} from '@/lib/cms/sub-service-blocks';
import type { ResolvedBlockStyle, BlockPosition } from '@/lib/cms/sub-service-blocks';
import {
  readRelatedArticlesConfig,
  resolveRelatedArticles,
  type ResolvableArticle,
  type ArticleCardData,
} from '@/lib/cms/related-articles';
import HeroNav from '@/components/HeroNav';
import Breadcrumbs from '@/components/Breadcrumbs';
import { subServiceCrumbs } from '@/lib/content/service-taxonomy';
import ServiceHero from '@/components/ServiceHero';
import ServiceIntro from '@/components/ServiceIntro';
import ServiceProblems from '@/components/ServiceProblems';
import ServiceRelatedCards from '@/components/ServiceRelatedCards';
import NoDripClubSimple from '@/components/NoDripClubSimple';
import GoogleReviews from '@/components/GoogleReviews';
import TikTokFeed from '@/components/TikTokFeed';
import ArticleGrid from '@/components/ArticleGrid';
import ServiceClosingCTA from '@/components/ServiceClosingCTA';
import CityServicesMenu from '@/components/CityServicesMenu';

/**
 * Generic sub-service page (brief-11, restructured brief-61). Renders the live
 * `/sewer-rodding` sections in order from a single `ServiceContent` data file —
 * every future service page is this same component fed a different data file.
 * No copy or image path is hardcoded here; the only inline copy is the §7 map
 * coverage band, which is identical on every service page.
 *
 * Brief 89 → Brief 90 (Track B): DB-backed sub-service pages now pass a per-instance
 * `blocks` array (`{ id, type, data }[]`) so their sections render in the saved
 * order AND from each instance's own content — the SAME block type may appear
 * more than once (free page-builder). Each block's JSX is produced by a shared
 * section helper, so a single instance of every block renders byte-for-byte the
 * same as before Track B.
 *
 * Static-content service pages (`/sewer-rodding`, `/gas-lines`, `/hydro-jetting`)
 * pass no `blocks` and fall back to the fixed default order over the flat
 * `content` fields — including the three "ghost" sections (related / secondary /
 * preventive) that only ever have content on the hand-built static routes.
 */

// Default top-to-bottom order for static-content pages. Includes the chrome-bound
// hero plus the three ghost sections (related / secondary / preventive) in their
// historical positions — each is guarded, so it only renders when populated.
const DEFAULT_ORDER: string[] = [
  'hero',
  'intro',
  'listSection',
  'relatedServices',
  'secondary',
  'map',
  'googleReviews',
  'tiktokFeed',
  'noDripClub',
  'preventive',
  'relatedArticles',
  'finalCta',
];

const asStr = (v: unknown): string => (typeof v === 'string' ? v : '');

// ── Shared section renderers ───────────────────────────────────────────────────
// One source of JSX per section, reused by the static-content path (fed from the
// flat `content` fields) and the DB per-instance path (fed from each block's
// `data`). This is what guarantees single-instance parity with the pre-Track-B
// output — both paths call the identical helper.

function heroNode(hero: ServiceContent['hero'], slug: string, key: string): ReactNode {
  return (
    <Fragment key={key}>
      {/* 1 — image hero */}
      <ServiceHero hero={hero} />
      {/* 2 — shared hero-nav strip (brief-07 defaults) */}
      <HeroNav />
      {/* 2b — SEO breadcrumb (Brief 64) — Home › Category › Hub (current) */}
      <div className="bg-cream-100">
        <Breadcrumbs items={subServiceCrumbs(slug)} />
      </div>
    </Fragment>
  );
}

function introNode(
  expert: ServiceContent['expertSection'],
  key: string,
  position?: BlockPosition,
  button?: { label: string; href: string } | null
): ReactNode {
  // 3 — 2 Column Section (Cream). Brief 93: optional alignment + optional button.
  // With neither set (static pages + existing intros) this is the historical `.f`
  // intro layout, unchanged.
  return <ServiceIntro key={key} expert={expert} position={position} button={button} />;
}

function listNode(problems: ServiceContent['problemsSection'], key: string, style?: ResolvedBlockStyle | null): ReactNode {
  // 4 — common problems (Carmine). Brief 91: optional per-instance style override.
  return <ServiceProblems key={key} problems={problems} style={style} />;
}

function mapNode(key: string): ReactNode {
  // 7 — service-area map (Cream). Live `.ep-map`: the Elfsight coverage widget
  //     with the "WE'RE ALMOST EVERYWHERE" label + paragraph. Copy is identical on
  //     every service page. Elfsight widgets show "something went wrong" on
  //     localhost — expected; they work on the production domain.
  return (
    <section key={key} className="bg-cream-100 py-[70px] md:py-[100px]">
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
  );
}

function googleReviewsNode(key: string): ReactNode {
  // 8 — Google Reviews (Cream, Elfsight)
  return (
    <section key={key} className="bg-cream-100 py-[50px] md:py-[80px]">
      <div className="w-[90%] lg:w-[81%] mx-auto">
        <GoogleReviews />
      </div>
    </section>
  );
}

function tiktokNode(key: string): ReactNode {
  // 9 — TikTok feed (Cream, headline + Elfsight)
  return (
    <section key={key} className="bg-cream-100 py-[50px] md:py-[80px]">
      <div className="w-[90%] lg:w-[81%] mx-auto">
        <TikTokFeed headline="J Blanton Plumbing - Turning Bad Calls to Good Calls" />
      </div>
    </section>
  );
}

function ndcNode(title: string | undefined, body: string, key: string, style?: ResolvedBlockStyle | null): ReactNode {
  // 10 — No Drip Club (Cream, `.f2` two-column variant). Brief 91: optional style.
  return <NoDripClubSimple key={key} title={title} body={body} style={style} />;
}

function servicesMenuNode(key: string): ReactNode {
  // Brief 139 — the OUR SERVICES menu as an insertable placement block.
  //
  // NO `citySlug`: a sub-service page is not a city, so the menu resolves every
  // item to its GLOBAL destination through `globalServiceHref()` (own hub page →
  // /emergency-plumbing special case → parent /services/{category} fallback).
  // Passing a slug here would emit `/{slug}/{service}` links with no route
  // behind them — the exact Brief 138 bug.
  //
  // The wrapper reproduces the CONTEXT the menu already has on city pages (cream
  // background + the shared 90%/81% content column, cf. `.city-page-content`),
  // matching this template's own section convention. The component itself is
  // untouched — no style overrides, no fork.
  return (
    <section key={key} className="bg-cream-100">
      <div className="w-[90%] lg:w-[81%] mx-auto">
        <CityServicesMenu />
      </div>
    </section>
  );
}

function relatedArticlesNode(articles: ArticleCardData[], key: string): ReactNode {
  // 12 — related articles (shared component, no section heading on live).
  // Brief 92: `articles` is now the RESOLVED list (mode/count/category/handpick),
  // not always the newest 3. The grid markup + card styling are unchanged.
  if (articles.length === 0) return null;
  return (
    <section key={key} className="bg-cream-100 pb-[70px] md:pb-[100px]">
      <div className="w-[90%] lg:w-[81%] mx-auto">
        <ArticleGrid articles={articles} />
      </div>
    </section>
  );
}

/** Map the static `ARTICLES` list into the resolver's pool shape (public fallback). */
function staticArticlePool(): ResolvableArticle[] {
  return ARTICLES.map((a) => ({
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    image: a.image,
    href: a.href,
    category: a.category ? [a.category] : [],
    status: 'published',
  }));
}

function finalCtaNode(cta: ServiceContent['closingCTA'], key: string): ReactNode {
  // 13 — closing CTA (Cream, `.f3.f3-left` two-column)
  return <ServiceClosingCTA key={key} cta={cta} />;
}

export default function ServicePageTemplate({
  content,
  blockOrder,
  blocks,
  articlePool,
  hideNoDripClub = false,
}: {
  content: ServiceContent;
  /** Brief 89: ordered block-type list for DB-backed pages (legacy fallback). */
  blockOrder?: string[];
  /** Brief 90: authoritative per-instance block list for DB-backed pages. */
  blocks?: ServiceContent['blocks'];
  /**
   * Brief 92: the article pool for the Related Articles resolver (DB + static,
   * newest-first). Supplied by the DB-backed renderer; static-content pages omit
   * it and fall back to the static article list.
   */
  articlePool?: ResolvableArticle[];
  /**
   * Brief 143 (Track A): suppress the No Drip Club section entirely. Set for
   * COMMERCIAL pages — the membership is residential-only, so the section must
   * not appear there regardless of what `ndc_title`/`ndc_body` contain. The
   * caller decides via `isCommercialServicePage`; the content rows are left
   * populated on purpose, so this is reversible by flipping the rule alone.
   * Applies to BOTH render paths below (per-instance blocks and static content),
   * and to every duplicate `noDripClub` instance on a page.
   */
  hideNoDripClub?: boolean;
}) {
  // §12 — reuse the shared articles component. Static-content pages that carry no
  // config still show the 3 most recent static posts (unchanged behavior).
  const articles = ARTICLES.slice(0, 3);
  const pool = articlePool ?? staticArticlePool();

  // ── Brief 90 DB path: render each instance from its own `data` (duplicates OK) ──
  if (blocks && blocks.length > 0) {
    return (
      <>
        {blocks.map((b) => {
          const d = b.data ?? {};
          switch (b.type) {
            case 'hero':
              // Single, non-removable instance — render the resolved primary hero
              // (identical output to pre-Track-B), keyed by instance id.
              return heroNode(content.hero, content.slug, b.id);
            case 'intro':
              // Brief 93: the "2 Column Section". Alignment (data.style.position)
              // and the optional button (data.button) flow through; both default
              // to the historical intro look when unset.
              return introNode(
                {
                  heading: asStr(d.introHeading),
                  image1: asStr(d.fImage),
                  image2: '',
                  paragraphs: d.introBody ? [asStr(d.introBody)] : [],
                },
                b.id,
                readTwoColumnPosition(d),
                readTwoColumnButton(d)
              );
            case 'listSection':
              return listNode(
                {
                  heading: asStr(d.problemsHeading),
                  problems: Array.isArray(d.problemsItems) ? (d.problemsItems as string[]) : [],
                },
                b.id,
                resolveBlockStyle('listSection', d)
              );
            case 'map':
              return mapNode(b.id);
            case 'googleReviews':
              return googleReviewsNode(b.id);
            case 'tiktokFeed':
              return tiktokNode(b.id);
            case 'servicesMenu':
              // Brief 139 — placement only; `data` is empty by design.
              return servicesMenuNode(b.id);
            case 'noDripClub':
              // Brief 143 (Track A): commercial pages never render this section.
              // Checked per instance so a page carrying more than one is fully covered.
              if (hideNoDripClub) return null;
              return ndcNode(
                asStr(d.ndcTitle) || undefined,
                asStr(d.ndcBody) || NDC_DEFAULT_BODY,
                b.id,
                resolveBlockStyle('noDripClub', d)
              );
            case 'relatedArticles':
              // Brief 92: resolve this instance's config against the pool through
              // the shared resolver — the SAME one the admin live preview uses.
              return relatedArticlesNode(resolveRelatedArticles(readRelatedArticlesConfig(d), pool), b.id);
            case 'finalCta':
              return finalCtaNode(
                {
                  heading: asStr(d.ctaHeading),
                  body: asStr(d.ctaBody),
                  image: asStr(d.f3Image) || FALLBACK_CTA_IMAGE,
                },
                b.id
              );
            default:
              return null;
          }
        })}
      </>
    );
  }

  // ── Static-content path: fixed default order over the flat `content` fields ────
  // Byte-for-byte the historical render, including the three guarded ghost sections.
  const sections: Record<string, ReactNode> = {
    hero: heroNode(content.hero, content.slug, 'hero'),
    intro: introNode(content.expertSection, 'intro'),
    listSection: listNode(content.problemsSection, 'listSection'),

    // 5 — related services cards (Cream) — ghost: only static pages populate it
    relatedServices:
      content.relatedServicesSection.cards.length > 0 ? (
        <ServiceRelatedCards key="relatedServices" related={content.relatedServicesSection} />
      ) : null,

    // 6 — body copy block 1 (Cream, text only) — ghost: skip when empty
    secondary:
      content.secondarySection.paragraphs.length > 0 ? (
        <section key="secondary" className="bg-cream-100 py-[70px] md:py-[100px]">
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
      ) : null,

    map: mapNode('map'),
    googleReviews: googleReviewsNode('googleReviews'),
    tiktokFeed: tiktokNode('tiktokFeed'),
    // Brief 143 (Track A): null on commercial pages — same rule as the blocks path.
    noDripClub: hideNoDripClub
      ? null
      : ndcNode(content.noDropClubSection.title, content.noDropClubSection.body, 'noDripClub'),

    // 11 — body copy block 2 / preventive maintenance (Cream, text only) — ghost
    preventive:
      content.preventiveSection.paragraphs.length > 0 ? (
        <section key="preventive" className="bg-cream-100 py-[70px] md:py-[100px]">
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
      ) : null,

    relatedArticles: relatedArticlesNode(articles, 'relatedArticles'),
    finalCta: finalCtaNode(content.closingCTA, 'finalCta'),
  };

  // DB-backed pages that only supply a legacy `blockOrder` still order the 9
  // rendering blocks; static pages fall back to the fixed historical order.
  const order = blockOrder && blockOrder.length > 0 ? blockOrder : DEFAULT_ORDER;

  return <>{order.map((type) => sections[type] ?? null)}</>;
}
