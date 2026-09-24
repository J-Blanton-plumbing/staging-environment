import Image from 'next/image';
import type { Metadata } from 'next';
import HeroNav from '@/components/HeroNav';
import ScheduleTrigger from '@/components/schedule/ScheduleTrigger';
import Breadcrumbs from '@/components/Breadcrumbs';
import { termCrumbs } from '@/lib/cms/kh-crumbs';
import TopicServiceLink from '@/components/kh/TopicServiceLink';
import { KNOWLEDGE_HUB } from '@/lib/content/knowledge-hub';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import { canonicalUrlFor, pageTitle } from '@/lib/seo';
import type { KhArticlePage } from '@/lib/cms/kh-taxonomy';
import type { KhTerm, KhTermRef } from '@/lib/cms/kh-taxonomy-types';
import ArticlesSection from './ArticlesSection';
import TopicFilterRow from './TopicFilterRow';
import './knowledge-hub.css';
import './[slug]/article.css';

/**
 * Brief 187 (C4 / C5) — the ONE layout behind `/knowledge-hub/topic/{slug}` and
 * `/knowledge-hub/area/{slug}`.
 *
 * Deliberately NOT a new page type: it is the hub's own chrome — the `.kh-page`
 * hero (same image, the term name as the single <h1>), `HeroNav`, the cream
 * block with the same `ArticlesSection` grid and anchor pagination — closed by
 * the article page's "NEED AN EXPERT?" CTA (its markup and article.css rules,
 * reused as-is under an `.article-page` wrapper).
 */

/** Plain-text excerpt of the intro, for a fallback meta description. */
function introExcerpt(html: string, max = 155): string {
  const text = sanitizeCmsHtml(html).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

/**
 * Robots: `noindex, follow` when the "Show in Google" switch is off OR the term
 * has no published articles (an empty page must never be indexed, whatever the
 * switch says). `follow` stays on so crawlers still reach the articles. An
 * indexable page sets no robots meta at all, and page 1 keeps the root layout's
 * self-referencing canonical; page 2+ is self-canonical including `?page=n`.
 */
export function termMetadata(term: KhTerm, page: number, basePath: string, fallbackDescription: string): Metadata {
  const baseTitle = pageTitle(term.metaTitle) || `${term.name} Articles`;
  const meta: Metadata = {
    title: page > 1 ? `${baseTitle} – Page ${page}` : baseTitle,
    description: term.metaDescription?.trim() || introExcerpt(term.introHtml) || fallbackDescription,
  };
  if (!term.indexable || term.publishedCount === 0) meta.robots = { index: false, follow: true };
  if (page > 1) meta.alternates = { canonical: `${canonicalUrlFor(basePath)}?page=${page}` };
  return meta;
}

export default function TermListingPage({
  term,
  data,
  basePath,
  filterTopics,
  servicesLink,
}: {
  term: KhTerm;
  data: KhArticlePage | null;
  basePath: string;
  /** Topic pages: the filter row, with this topic active. */
  filterTopics?: KhTermRef[];
  /** Area pages: the link to the matching city / region page. */
  servicesLink?: { prompt: string; label: string; href: string };
}) {
  const { hero } = KNOWLEDGE_HUB;
  const intro = term.introHtml.trim() ? sanitizeCmsHtml(term.introHtml) : '';

  return (
    <div className="kh-page">
      {/* HERO — the hub's hero, headed by the term */}
      <div className="hero">
        <div className="img-s">
          <Image src={hero.image} alt="Knowledge Hub hero" fill sizes="45vw" priority style={{ objectFit: 'cover' }} />
        </div>
        {/* hero-contents avoids the Tailwind .contents { display: contents } collision */}
        <div className="hero-contents">
          <div className="w">
            <h1>{term.name}</h1>
            <ScheduleTrigger label={<p>SCHEDULE A SERVICE</p>} />
          </div>
        </div>
      </div>

      <HeroNav />

      <div className="cream kh-cream-crumbs">
        <div className="kh">
          {/* Brief 188 (Track D): the visible trail + this page's one BreadcrumbList */}
          <div className="kh-crumbs">
            <Breadcrumbs items={termCrumbs(term)} />
          </div>

          {intro && <div className="kh-term-intro" dangerouslySetInnerHTML={{ __html: intro }} />}

          {servicesLink && (
            <div className="kh-term-services">
              <p>{servicesLink.prompt}</p>
              <a className="link-button" href={servicesLink.href}>
                {servicesLink.label} &rarr;
              </a>
            </div>
          )}

          {filterTopics && <TopicFilterRow topics={filterTopics} activeSlug={term.type === 'topic' ? term.slug : null} />}

          <ArticlesSection data={data} basePath={basePath} emptyMessage="No articles here yet." />

          {/* Brief 188 (Track E): topic pages only — locations carry no service link */}
          {term.type === 'topic' && <TopicServiceLink href={term.serviceHref} text={term.serviceCtaText} />}
        </div>
      </div>

      {/* CLOSING CTA — the article page's, reused verbatim */}
      <div className="article-page">
        <div className="article-footer-cta">
          <h2>NEED AN EXPERT?</h2>
          <h3>MAKE A GOOD CALL.</h3>
          <p>We&rsquo;re here to help with all your plumbing needs</p>
          <ScheduleTrigger label={<p>SCHEDULE NOW</p>} />
        </div>
      </div>
    </div>
  );
}
