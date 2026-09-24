import ArticleCard from '@/components/ArticleCard';
import type { KhArticlePage } from '@/lib/cms/kh-taxonomy';

/**
 * The paginated article grid shared by the hub, topic and area pages.
 *
 * Brief 187 (C3): SERVER-RENDERED from `?page=n`. It used to be a client
 * component whose Back/Next were `<button>`s fetching `/api/articles`, so a
 * crawler (or anyone with JS off) only ever saw page 1 — and not even that,
 * since the first page also loaded after hydration. Back/Next are now real
 * `<a href>` links and every page's cards are in the HTML.
 *
 * SAME VISUAL: the markup keeps `.articles-nav > .button` (+ `.disabled`) and
 * `#kh-articles`, which is everything knowledge-hub.css keys on. A disabled
 * control is a `<span>` (no href — there is nowhere to go), styled by the same
 * `.button.disabled` rule the old `<button>` used. Page 1's link is the bare
 * path, never `?page=1`, so there is exactly one URL for it.
 */
function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

const BACK_ICON = (
  <div>
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" d="M328 112L184 256l144 144"/>
    </svg>
  </div>
);
const NEXT_ICON = (
  <div>
    <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="48" d="m184 112l144 144l-144 144"/>
    </svg>
  </div>
);

export default function ArticlesSection({
  data,
  basePath,
  emptyMessage = 'No articles here yet.',
}: {
  /** null = the query failed; the section shows its retryable notice. */
  data: KhArticlePage | null;
  /** The listing's own path (`/knowledge-hub`, `/knowledge-hub/topic/sewers`…). */
  basePath: string;
  emptyMessage?: string;
}) {
  const page = data?.page ?? 1;
  const hasPrev = !!data && page > 1;
  const hasNext = !!data && page < data.pageCount;

  return (
    <div>
      <div className="articles-nav">
        {hasPrev ? (
          <a className="button" href={pageHref(basePath, page - 1)} rel="prev">
            {BACK_ICON}
            <p>Back</p>
          </a>
        ) : (
          <span className="button disabled" aria-disabled="true">
            {BACK_ICON}
            <p>Back</p>
          </span>
        )}
        {hasNext ? (
          <a className="button" href={pageHref(basePath, page + 1)} rel="next">
            <p>Next</p>
            {NEXT_ICON}
          </a>
        ) : (
          <span className="button disabled" aria-disabled="true">
            <p>Next</p>
            {NEXT_ICON}
          </span>
        )}
      </div>
      <div id="kh-articles">
        {!data ? (
          <p className="articles-error">
            We couldn&rsquo;t load articles right now.{' '}
            <a href={pageHref(basePath, page)}>Try again</a>
          </p>
        ) : data.articles.length === 0 ? (
          <p className="articles-error">{emptyMessage}</p>
        ) : (
          data.articles.map((article) => <ArticleCard key={article.slug} article={article} />)
        )}
      </div>
    </div>
  );
}
