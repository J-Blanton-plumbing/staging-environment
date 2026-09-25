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
 *
 * Brief 188 (Track C): each DB article now carries its Knowledge Hub TOPIC slugs
 * (primary + secondary) in `topics`, and "category" mode filters on those. The
 * legacy `category` column is no longer read (it was empty on every article).
 * Static `ARTICLES` rows get no topics — every one of them is also a DB article,
 * so they never enter the pool (the dbSlugs filter), and no block depends on
 * their legacy category string (Brief 188 Track 0). The pool ORDER is unchanged
 * on purpose: every unconfigured block renders "newest 3" from it.
 */
export async function getRelatedArticlesPool(): Promise<ResolvableArticle[]> {
  const client = await pool.connect();
  try {
    let dbRows: Array<{
      slug: string; title: string; excerpt: string | null; image: string | null;
      id: number; status: string;
    }> = [];
    try {
      const res = await client.query(
        `SELECT id, slug, title, excerpt, image, status
           FROM cms_articles
          ORDER BY created_at DESC`
      );
      dbRows = res.rows;
    } catch {
      // cms_articles may not exist yet — fall through to the static list only.
    }

    // Topic slugs per article — a separate, guarded query so a database without
    // the taxonomy tables still resolves every block (with no topic matches).
    const topicsById = new Map<number, string[]>();
    try {
      const t = await client.query<{ article_id: number; slug: string }>(
        `SELECT at.article_id, t.slug FROM cms_article_terms at
           JOIN kh_terms t ON t.id = at.term_id AND t.type = 'topic'
          ORDER BY at.article_id, at.is_primary DESC, t.sort_order`
      );
      for (const r of t.rows) topicsById.set(r.article_id, [...(topicsById.get(r.article_id) ?? []), r.slug]);
    } catch {
      // taxonomy tables absent — no topics
    }

    const dbArticles: ResolvableArticle[] = dbRows.map((a) => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt ?? '',
      image: a.image ?? '',
      href: `/knowledge-hub/${a.slug}`,
      topics: topicsById.get(a.id) ?? [],
      status: a.status,
    }));

    const dbSlugs = new Set(dbArticles.map((a) => a.slug));
    const staticArticles: ResolvableArticle[] = ARTICLES.filter((a) => !dbSlugs.has(a.slug)).map((a) => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      image: a.image,
      href: a.href,
      topics: [],
      status: 'published',
    }));

    return [...dbArticles, ...staticArticles];
  } finally {
    client.release();
  }
}
