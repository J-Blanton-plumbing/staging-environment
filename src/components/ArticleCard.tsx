import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { FALLBACK_ARTICLE_IMAGE, type ArticleCardData } from '@/lib/cms/related-articles';

/** A single Knowledge Hub article card (image + title + excerpt + "Read more"). */
export default function ArticleCard({ article }: { article: ArticleCardData }) {
  // Migrated DB articles often have no hero image; never pass an empty src to
  // next/image (it renders broken) — fall back to a brand thumbnail.
  const imageSrc = article.image || FALLBACK_ARTICLE_IMAGE;
  return (
    <article className="article-card bg-white rounded-lg overflow-hidden shadow-soft flex flex-col">
      <Link href={article.href} className="aspect-[16/10] bg-cream-200 overflow-hidden block">
        <Image
          src={imageSrc}
          alt={article.title}
          width={400}
          height={250}
          className="w-full h-full object-cover"
        />
      </Link>
      <div className="p-6 flex flex-col flex-1">
        <Link href={article.href}>
          <p className="article-title font-display font-bold text-navy-800 text-[20px] mb-2 leading-tight hover:text-brand-600 transition-colors">
            {article.title}
          </p>
        </Link>
        <p className="text-sm text-navy-800 mb-5 leading-relaxed flex-1">
          {article.excerpt}
        </p>
        <Link href={article.href} className="inline-flex items-center gap-2 text-navy-800 font-display font-bold text-sm hover:text-brand-600 transition-colors">
          Read more <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
        </Link>
      </div>
    </article>
  );
}
