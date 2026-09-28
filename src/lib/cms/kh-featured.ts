/**
 * Brief 193 — the Knowledge Hub "Featured Article" card: data (server only).
 *
 * ONE article, picked by slug (`main_pages.content.featured_article_slug`,
 * falling back to `KNOWLEDGE_HUB.featuredArticleSlug`). FAILS CLOSED: a blank
 * slug, an unknown slug, an unpublished article (the hub's own `PUBLISHED`
 * rule) or any database error returns null, and the page renders no section at
 * all — never an error, an empty box or a 500. The featured slug must never be
 * a reason the hub (or a deploy health check against it) fails.
 */
import pool from '@/lib/db';
import { PUBLISHED } from '@/lib/cms/kh-taxonomy';
import type { KhTermRef } from '@/lib/cms/kh-taxonomy-types';
import { FALLBACK_ARTICLE_IMAGE } from '@/lib/cms/related-articles';
import { DEFAULT_BYLINE_NAME, bylineInitials, normalizeArticleV2, normalizeArticleTemplate, readMinutes } from '@/lib/cms/article-v2';
import { buildV2Body, countWords, htmlToText } from '@/lib/cms/article-v2-body';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';

/** At most this many Key Takeaways on the card (the article shows all of them). */
export const FEATURED_MAX_TAKEAWAYS = 3;

export interface FeaturedArticle {
  slug: string;
  href: string;
  title: string;
  /** `v2.dek`, else the excerpt. Plain text. */
  dek: string;
  /** Never empty: FALLBACK_ARTICLE_IMAGE when the article has none. */
  image: string;
  imageAlt: string;
  topic: KhTermRef | null;
  takeaways: string[];
  bylineName: string;
  bylineInitials: string;
  readMinutes: number;
}

type Row = {
  id: number; slug: string; title: string; excerpt: string | null; image: string | null;
  template: string | null; v2: unknown; body: { html?: string } | null;
  topic_slug: string | null; topic_name: string | null;
};

/**
 * The same "N min read" the article page shows. For a V2 article that is the
 * ArticleV2Template sum (body + takeaways + FAQs + placed components; body
 * words are counted before token resolution there too). A V1 article page shows
 * no read time, so its card counts the sanitized body.
 */
function articleWordCount(bodyHtml: string, template: string | null, v2Raw: unknown): number {
  if (normalizeArticleTemplate(template) !== 'article-v2') {
    return countWords(htmlToText(sanitizeCmsHtml(bodyHtml)));
  }
  const v2 = normalizeArticleV2(v2Raw);
  const body = buildV2Body(bodyHtml);
  const components = new Map(v2.components.map((c) => [c.name, c]));
  return (
    body.wordCount +
    v2.takeaways.reduce((n, t) => n + countWords(t), 0) +
    v2.faqs.reduce((n, f) => n + countWords(f.q) + countWords(htmlToText(f.a)), 0) +
    body.sections
      .flatMap((sec) => sec.parts)
      .reduce((n, part) => {
        if (part.kind !== 'component') return n;
        const c = components.get(part.name);
        if (!c) return n;
        return n + c.items.reduce((m, it) => m + countWords(it.title) + countWords(htmlToText(it.text)) + it.checklist.reduce((k, x) => k + countWords(x), 0) + countWords(it.link_label), 0);
      }, 0)
  );
}

/** The featured card's data, or null (blank / unknown / unpublished slug, or any error). Never throws. */
export async function getFeaturedArticle(slug: string | null | undefined): Promise<FeaturedArticle | null> {
  const s = typeof slug === 'string' ? slug.trim() : '';
  if (!s) return null;
  try {
    // The primary topic: the same cms_article_terms ⋈ kh_terms (topic, is_primary)
    // join as `primaryTopicsFor` in kh-taxonomy.ts, for one article.
    const res = await pool.query<Row>(
      `SELECT a.id, a.slug, a.title, a.excerpt, a.image, a.template, a.v2, a.body,
              t.slug AS topic_slug, t.name AS topic_name
         FROM cms_articles a
         LEFT JOIN cms_article_terms at ON at.article_id = a.id AND at.is_primary
         LEFT JOIN kh_terms t ON t.id = at.term_id AND t.type = 'topic'
        WHERE a.slug = $1 AND ${PUBLISHED}
        ORDER BY t.slug IS NULL
        LIMIT 1`,
      [s]
    );
    const row = res.rows[0];
    if (!row) return null;
    // V2 fields only on a V2 article: a V2 → V1 switch keeps the `v2` JSONB (it
    // is non-destructive, Brief 190), and the card must not show a dek /
    // takeaways / byline the article page itself no longer renders.
    const isV2 = normalizeArticleTemplate(row.template) === 'article-v2';
    const v2 = normalizeArticleV2(isV2 ? row.v2 : null);
    const bylineName = v2.byline_name.trim() || DEFAULT_BYLINE_NAME;
    return {
      slug: row.slug,
      href: `/knowledge-hub/${row.slug}`,
      title: row.title,
      dek: v2.dek.trim() || (row.excerpt ?? '').trim(),
      image: row.image || FALLBACK_ARTICLE_IMAGE,
      imageAlt: v2.image_alt.trim() || row.title,
      topic: row.topic_slug && row.topic_name ? { slug: row.topic_slug, name: row.topic_name } : null,
      takeaways: v2.takeaways.map((t) => t.trim()).filter(Boolean).slice(0, FEATURED_MAX_TAKEAWAYS),
      bylineName,
      bylineInitials: bylineInitials(bylineName),
      readMinutes: readMinutes(articleWordCount(row.body?.html ?? '', row.template, row.v2)),
    };
  } catch (err) {
    console.error('[knowledge-hub] featured unavailable:', err);
    return null;
  }
}
