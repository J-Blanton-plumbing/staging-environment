import pool from '@/lib/db';

/**
 * Brief 195 — what the password-protected review route shows for an article.
 *
 *   missing    → 404
 *   published  → 308 to the public URL (the review copy is never a second
 *                public copy of a live article)
 *   unpublished → the article as its LATEST SAVED VERSION has it: the live row
 *                 with that version's content laid over it, key for key, exactly
 *                 the overlay the editor's Preview does in
 *                 src/app/knowledge-hub/[slug]/page.tsx (Brief 190). So an
 *                 editor's Save in /admin shows up here without publishing.
 *
 * "Latest saved version" = the newest version row (created_at, then id). The
 * page_drafts table has no saved-at column: a Save rewrites a version's content
 * in place, so the newest version is the one being worked on. With no version
 * at all, the live row renders as stored.
 *
 * Tags and related cards are read from the live tables by the caller, as the
 * editor's Preview does — a version's `terms` / `related` reach those tables
 * only on Publish (Brief 187/188).
 */
export type ArticleReview =
  | { kind: 'missing' }
  | { kind: 'published'; slug: string }
  | {
      kind: 'unpublished';
      article: {
        id: number;
        slug: string;
        title: string;
        excerpt: string;
        image: string;
        body: string;
        metaTitle: string;
        metaDescription: string;
        template: unknown;
        v2: unknown;
      };
      version: { id: number; label: string } | null;
    };

export async function getArticleForReview(slug: string): Promise<ArticleReview> {
  const res = await pool.query(
    `SELECT a.id, a.slug, a.title, a.excerpt, a.image, a.body, a.meta_title, a.meta_description, a.status,
            to_jsonb(a) -> 'template' AS template, to_jsonb(a) -> 'v2' AS v2
       FROM cms_articles a WHERE a.slug = $1 LIMIT 1`,
    [slug]
  );
  const row = res.rows[0];
  if (!row) return { kind: 'missing' };
  if (row.status === 'published') return { kind: 'published', slug: row.slug as string };

  const article = {
    id: row.id as number,
    slug: row.slug as string,
    title: row.title as string,
    excerpt: (row.excerpt ?? '') as string,
    image: (row.image ?? '') as string,
    body: (row.body?.html ?? '') as string,
    metaTitle: (row.meta_title ?? '') as string,
    metaDescription: (row.meta_description ?? '') as string,
    template: (row.template ?? null) as unknown,
    v2: (row.v2 ?? null) as unknown,
  };

  const v = await pool.query<{ id: number; label: string; content: unknown }>(
    `SELECT id, label, content FROM page_drafts
      WHERE page_type = 'article' AND page_slug = $1
      ORDER BY created_at DESC, id DESC LIMIT 1`,
    [article.slug]
  );
  const latest = v.rows[0];
  if (latest) {
    const c =
      latest.content && typeof latest.content === 'object' && !Array.isArray(latest.content)
        ? (latest.content as Record<string, unknown>)
        : {};
    const str = (k: string) => (typeof c[k] === 'string' ? (c[k] as string) : undefined);
    article.title = str('title') ?? article.title;
    article.excerpt = str('excerpt') ?? article.excerpt;
    article.body = str('body') ?? article.body;
    article.image = str('image') ?? article.image;
    article.metaTitle = str('metaTitle') ?? article.metaTitle;
    article.metaDescription = str('metaDescription') ?? article.metaDescription;
    if ('template' in c) article.template = c.template;
    if ('v2' in c) article.v2 = c.v2;
  }

  return { kind: 'unpublished', article, version: latest ? { id: latest.id, label: latest.label } : null };
}
