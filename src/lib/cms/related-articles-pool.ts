import pool from '@/lib/db';
import { ARTICLES } from '@/lib/articles';
import type { ResolvableArticle } from '@/lib/cms/related-articles';

/**
 * Brief 92 — build the article POOL the Related Articles resolver runs against on
 * the PUBLIC render path. Mirrors `GET /api/cms/articles` (which the admin preview
 * uses): DB `cms_articles` first (newest-first by `created_at`), then any static
 * `ARTICLES` not yet migrated. The two share the same ordering + shape so the
 * editor preview and the live page resolve identically.
 *
 * Returns every article with its `status` + `category[]`; the resolver applies the
 * published-only filter itself (so a hand-picked draft is silently skipped rather
 * than erroring). DB rows carry real category values (display names today, per the
 * article editor); static rows carry a single display-name category. `slugifyCategory`
 * in the resolver bridges names ↔ taxonomy slugs, so category filtering works with
 * no migration.
 */
export async function getRelatedArticlesPool(): Promise<ResolvableArticle[]> {
  const client = await pool.connect();
  try {
    let dbRows: Array<{
      slug: string; title: string; excerpt: string | null; image: string | null;
      status: string; category: string[] | null;
    }> = [];
    try {
      const res = await client.query(
        `SELECT slug, title, excerpt, image, status, COALESCE(category, '{}') AS category
           FROM cms_articles
          ORDER BY created_at DESC`
      );
      dbRows = res.rows;
    } catch {
      // cms_articles may not exist yet — fall through to the static list only.
    }

    const dbArticles: ResolvableArticle[] = dbRows.map((a) => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt ?? '',
      image: a.image ?? '',
      href: `/knowledge-hub/${a.slug}`,
      category: Array.isArray(a.category) ? a.category : [],
      status: a.status,
    }));

    const dbSlugs = new Set(dbArticles.map((a) => a.slug));
    const staticArticles: ResolvableArticle[] = ARTICLES.filter((a) => !dbSlugs.has(a.slug)).map((a) => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      image: a.image,
      href: a.href,
      category: a.category ? [a.category] : [],
      status: 'published',
    }));

    return [...dbArticles, ...staticArticles];
  } finally {
    client.release();
  }
}
