import { getArticle } from '@/lib/articles';
import { getRelatedArticlesPool } from '@/lib/cms/related-articles-pool';
import type { ArticleCardData } from '@/lib/cms/related-articles';

/**
 * Brief 219 — the homepage Knowledge Hub cards from the editable `knowledge_hub_featured` slugs.
 *
 * A slug renders only when it is a PUBLISHED article (the Brief 92 pool: CMS rows with their status,
 * plus the static list for slugs the CMS doesn't have). Unknown and unpublished slugs are skipped, in
 * order — the editor flags them before publish.
 *
 * Card data: the static `ARTICLES` entry when the slug has one, else the CMS row. That keeps the three
 * cards the homepage has always shown byte-identical (their static titles / images differ from the
 * CMS rows — a Marketing follow-up in the Brief 219 report), while any newly picked article renders
 * from the CMS. A DB outage leaves the static list, i.e. today's cards.
 */
export async function getHomeFeaturedArticles(slugs: readonly string[]): Promise<ArticleCardData[]> {
  const pool = await getRelatedArticlesPool().catch(() => []);
  const published = new Map(pool.filter((a) => a.status === 'published').map((a) => [a.slug, a] as const));
  const out: ArticleCardData[] = [];
  for (const slug of slugs) {
    const fromPool = published.get(slug);
    const fromStatic = getArticle(slug);
    if (!fromPool && !(fromStatic && pool.length === 0)) continue;
    if (fromStatic) out.push(fromStatic);
    else if (fromPool) out.push({ slug: fromPool.slug, title: fromPool.title, excerpt: fromPool.excerpt, image: fromPool.image, href: fromPool.href });
  }
  return out;
}
