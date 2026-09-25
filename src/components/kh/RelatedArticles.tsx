import ArticleGrid from '@/components/ArticleGrid';
import type { KhArticleCard } from '@/lib/cms/kh-taxonomy';

/**
 * Brief 188 (Track B1) — "Related Articles" at the end of every article, after
 * the body and before the closing CTA. The cards are the shared ArticleCard via
 * the same ArticleGrid the city pages use (`.city-articles`); no new card style.
 * Which three articles is decided by `getRelatedArticles` (kh-taxonomy.ts).
 * Renders nothing when there is nothing to show.
 */
export default function RelatedArticles({ articles }: { articles: KhArticleCard[] }) {
  if (articles.length === 0) return null;
  return (
    <section className="article-related city-articles" aria-labelledby="article-related-heading">
      <h2 id="article-related-heading">Related Articles</h2>
      <ArticleGrid articles={articles} />
    </section>
  );
}
