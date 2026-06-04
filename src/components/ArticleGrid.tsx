import type { Article } from '@/lib/articles';
import ArticleCard from './ArticleCard';

/** The 3-column responsive grid of Knowledge Hub article cards. */
export default function ArticleGrid({ articles }: { articles: Article[] }) {
  return (
    <div className="articles-component grid grid-cols-1 md:grid-cols-3 gap-[30px]">
      {articles.map((article) => (
        <ArticleCard key={article.slug} article={article} />
      ))}
    </div>
  );
}
