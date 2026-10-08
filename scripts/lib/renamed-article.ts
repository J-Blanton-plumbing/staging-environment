/**
 * Brief 202 (Track A1), generalised in Brief 203 — the ONE way a deploy-script chain finds an article
 * that a later brief RENAMED.
 *
 * A create-once seed guards on "slug exists → ALREADY-EXISTS", and its update scripts look the article
 * up by slug. Rename the article and, on the next deploy, the seed finds "no article" and creates a
 * SECOND draft at the old slug, and every update then "applies" to it (CLAUDE.md gotcha 27). So every
 * script in such a chain resolves the article under ALL of its slugs through this helper:
 *   • exactly one row  → that row and the slug it has NOW (versions are keyed by it, page_drafts.page_slug);
 *   • none             → the script's own "no article" path;
 *   • two or more      → never written by the chain; reported as a guard (NOT-APPLIED), exit 0.
 * Each article keeps its own slug constants in a small module (hose-bib-article.ts, older-homes-article.ts).
 */

export interface Queryable {
  query<R = Record<string, unknown>>(text: string, values?: unknown[]): Promise<{ rows: R[] }>;
}

export interface ArticleRef {
  id: number;
  slug: string;
  status: string;
}

export type ArticleLookup =
  | ({ kind: 'one' } & ArticleRef)
  | { kind: 'none' }
  | { kind: 'both'; rows: ArticleRef[] };

export async function findArticleUnderSlugs(c: Queryable, slugs: readonly string[]): Promise<ArticleLookup> {
  const rows = (
    await c.query<ArticleRef>('SELECT id, slug, status FROM cms_articles WHERE slug = ANY($1::text[]) ORDER BY id', [slugs])
  ).rows;
  if (rows.length === 0) return { kind: 'none' };
  if (rows.length > 1) return { kind: 'both', rows };
  return { kind: 'one', ...rows[0] };
}

/** One line naming every row found, for a verdict. */
export function describeBoth(rows: ArticleRef[]): string {
  return `two articles (${rows.map((r) => `id ${r.id} /${r.slug} ${r.status}`).join('; ')}) — expected one; nothing written`;
}
