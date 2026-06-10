'use client';

import { useEffect, useState } from 'react';
import ArticleCard from '@/components/ArticleCard';
import type { Article } from '@/lib/articles';

interface ArticlesResponse {
  articles: Article[];
  total: number;
  page: number;
  pageSize: number;
}

export default function ArticlesSection() {
  const [page, setPage] = useState(0);
  const [data, setData] = useState<ArticlesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/articles?page=${page}`)
      .then((r) => r.json())
      .then((d: ArticlesResponse) => {
        setData(d);
        setLoading(false);
      });
  }, [page]);

  const hasPrev = page > 0;
  const hasNext = data ? (page + 1) * data.pageSize < data.total : false;

  return (
    <div>
      <div className="articles-nav">
        <button
          className={`button${!hasPrev || loading ? ' disabled' : ''}`}
          onClick={() => { if (hasPrev && !loading) setPage((p) => p - 1); }}
          aria-disabled={!hasPrev || loading}
        >
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" aria-hidden="true">
              <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" d="M328 112L184 256l144 144"/>
            </svg>
          </div>
          <p>{loading ? 'Loading…' : 'Back'}</p>
        </button>
        <button
          className={`button${!hasNext || loading ? ' disabled' : ''}`}
          onClick={() => { if (hasNext && !loading) setPage((p) => p + 1); }}
          aria-disabled={!hasNext || loading}
        >
          <p>{loading ? 'Loading…' : 'Next'}</p>
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" aria-hidden="true">
              <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" d="m184 112l144 144l-144 144"/>
            </svg>
          </div>
        </button>
      </div>
      <div id="kh-articles">
        {data?.articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </div>
  );
}
