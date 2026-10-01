import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import ArticleV2Template from '@/components/kh/ArticleV2Template';
import { getArticleForReview } from '@/lib/cms/article-review';
import { getArticleTermsDisplay, getRelatedArticles } from '@/lib/cms/kh-taxonomy';
import { articleCrumbs } from '@/lib/cms/kh-crumbs';
import { getGlobalSettingsCached, getRegionalPhonesCached } from '@/lib/cms/global-settings';
import { normalizeArticleTemplate } from '@/lib/cms/article-v2';
import { sanitizeArticleV2Content } from '@/lib/cms/article-v2-sanitize';
import { pageTitle } from '@/lib/seo';
import '../../../knowledge-hub/[slug]/article.css';

/**
 * Brief 195 — /review/knowledge-hub/[slug]: an UNPUBLISHED Knowledge Hub article
 * for managers without CMS logins.
 *
 * Access: Basic Auth in src/middleware.ts (any /review path), never a CMS
 * session. Not indexable: `X-Robots-Tag: noindex, nofollow` + `Cache-Control:
 * private, no-store` (next.config.mjs), the robots meta below, no canonical
 * (the root layout skips /review), no JSON-LD (`schema={false}`), no sitemap,
 * no analytics or WhatConverts (both mounts skip /review).
 *
 * Renders through the REAL Article V2 template — the same component and the same
 * sanitizers as /knowledge-hub/[slug] — so what managers read is what Publish
 * produces. Only V2 articles are reviewable here; anything else is a 404.
 *
 *   published  → 308 to /knowledge-hub/[slug]
 *   missing    → 404
 *   otherwise  → the latest saved version (src/lib/cms/article-review.ts)
 */
export const dynamic = 'force-dynamic';

const BANNER = 'Review copy, not published. Do not share this link outside J. Blanton.';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const robots = { index: false, follow: false };
  const review = await getArticleForReview(slug);
  if (review.kind !== 'unpublished') return { robots };
  const { article } = review;
  return {
    title: pageTitle(article.metaTitle) || article.title,
    description: article.metaDescription || article.excerpt,
    robots,
  };
}

export default async function ReviewArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const review = await getArticleForReview(slug);
  if (review.kind === 'missing') notFound();
  if (review.kind === 'published') permanentRedirect(`/knowledge-hub/${review.slug}`);
  const { article } = review;
  if (normalizeArticleTemplate(article.template) !== 'article-v2') notFound();

  const [terms, related, settings, regionalPhones] = await Promise.all([
    getArticleTermsDisplay(article.id),
    getRelatedArticles(article.id),
    getGlobalSettingsCached(),
    getRegionalPhonesCached(),
  ]);

  return (
    <>
      {/* Fixed pill at the bottom, not a top bar: a top bar sits over the site's
          fixed header. Raised above the V2 mobile call bar (≤980px, ~76px tall). */}
      <style>{`.jbp-review-banner{position:fixed;left:0;right:0;margin:0 auto;width:fit-content;bottom:16px;z-index:60;max-width:calc(100% - 32px);box-sizing:border-box;display:flex;align-items:center;gap:.6rem;background:#0A1B2E;color:#F9F3EC;padding:.55rem 1rem;border-radius:999px;box-shadow:0 6px 20px rgba(10,27,46,.3);font:600 13px/1.35 var(--font-nunito),Nunito,sans-serif}.jbp-review-banner b{background:#BC0E0E;color:#F9F3EC;padding:.1rem .5rem;border-radius:3px;font-weight:800;letter-spacing:.04em}@media (max-width:980px){.jbp-review-banner{bottom:92px;border-radius:12px}}`}</style>
      <div role="note" className="jbp-review-banner">
        <b>REVIEW</b>
        <span>{BANNER}</span>
      </div>
      <ArticleV2Template
        article={{ slug: article.slug, title: article.title, image: article.image, body: article.body }}
        v2={sanitizeArticleV2Content(article.v2)}
        terms={terms}
        related={related}
        crumbs={articleCrumbs(article, terms.primary)}
        settings={settings}
        regionalPhones={regionalPhones}
        schema={false}
      />
    </>
  );
}
