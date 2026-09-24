import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTerm, getTopicFilterRow, listTermArticles, parsePageParam, type KhArticlePage } from '@/lib/cms/kh-taxonomy';
import { khTopicHref } from '@/lib/cms/kh-taxonomy-types';
import TermListingPage, { termMetadata } from '../../TermListingPage';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string }; searchParams: { page?: string | string[] } };

/**
 * Brief 187 (C4) — `/knowledge-hub/topic/{slug}`.
 *
 *   • unknown slug                       → 404
 *   • malformed or past-the-end `?page=` → 404
 *   • known topic with zero articles     → 200, "No articles here yet", noindex.
 *     NOT a 404: an empty topic is content state, not a missing page.
 *
 * Lists articles whose primary OR secondary topic this is, primary first, then
 * the hub's order.
 */
async function load(slug: string) {
  try {
    return await getTerm('topic', slug);
  } catch (err) {
    // A database failure is not proof the topic doesn't exist, but there is
    // nothing to render without the row; a logged 404 is the honest answer.
    console.error(`[knowledge-hub/topic/${slug}] term unavailable:`, err);
    return null;
  }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const term = await load(params.slug);
  const page = parsePageParam(searchParams.page);
  if (!term || !page) return {};
  return termMetadata(
    term,
    page,
    khTopicHref(term.slug),
    `${term.name} articles from J. Blanton Plumbing — plumbing tips and answers from Chicagoland and Central Ohio's plumbing experts.`
  );
}

export default async function TopicPage({ params, searchParams }: Props) {
  const page = parsePageParam(searchParams.page);
  if (page === null) notFound();
  const term = await load(params.slug);
  if (!term) notFound();

  let data: KhArticlePage | null = null;
  try {
    data = await listTermArticles(term, page);
  } catch (err) {
    console.error(`[knowledge-hub/topic/${term.slug}] articles unavailable:`, err);
  }
  if (data && page > data.pageCount) notFound();

  return (
    <TermListingPage
      term={term}
      data={data}
      basePath={khTopicHref(term.slug)}
      filterTopics={await getTopicFilterRow()}
    />
  );
}
