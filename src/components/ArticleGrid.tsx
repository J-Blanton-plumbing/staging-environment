import type { ArticleCardData } from '@/lib/cms/related-articles';
import ArticleCard from './ArticleCard';

/**
 * The 3-column responsive grid of Knowledge Hub article cards.
 *
 * Brief 92: the prop type was narrowed from the full `Article` to the minimal
 * `ArticleCardData` (slug/title/excerpt/image/href) the cards actually read. The
 * full `Article` is a structural superset, so every existing call site (homepage,
 * city pages, service-category pages) that passes `Article[]` still type-checks
 * unchanged — this only lets the Related Articles resolver feed a leaner shape.
 */
export default function ArticleGrid({ articles }: { articles: ArticleCardData[] }) {
  return (
    <div className="articles-component grid grid-cols-1 md:grid-cols-3 gap-[30px]">
      {articles.map((article) => (
        <ArticleCard key={article.slug} article={article} />
      ))}
    </div>
  );
}
