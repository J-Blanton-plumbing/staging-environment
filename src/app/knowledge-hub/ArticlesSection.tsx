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
  const [error, setError] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    // Brief 108 (Group D1): the previous version had no error/abort handling, so
    // any failed /api/articles request (e.g. a 500 with a non-JSON body) left the
    // promise rejected and `loading` stuck at `true` forever — the permanent
    // "Loading…" the QC saw (OC-08). Reset loading in every outcome, ignore
    // out-of-order responses when paginating quickly, and surface a retryable
    // error instead of hanging.
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(false);

    fetch(`/api/articles?page=${page}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`articles endpoint returned ${r.status}`);
        return r.json();
      })
      .then((d: ArticlesResponse) => {
        if (!active) return;
        setData(d);
        setLoading(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || !active) return;
        console.error('ArticlesSection: failed to load articles', err);
        setError(true);
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [page, reloadNonce]);

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
        {error ? (
          <p className="articles-error">
            We couldn&rsquo;t load articles right now.{' '}
            <button type="button" onClick={() => setReloadNonce((n) => n + 1)}>Try again</button>
          </p>
        ) : (
          data?.articles.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))
        )}
      </div>
    </div>
  );
}
