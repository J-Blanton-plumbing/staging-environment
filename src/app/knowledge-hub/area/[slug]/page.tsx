import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getTerm, listTermArticles, parsePageParam, type KhArticlePage } from '@/lib/cms/kh-taxonomy';
import { khAreaHref, type KhTerm } from '@/lib/cms/kh-taxonomy-types';
import TermListingPage, { termMetadata } from '../../TermListingPage';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string }; searchParams: { page?: string | string[] } };

/**
 * Brief 187 (C5) — `/knowledge-hub/area/{slug}`, one per region and city.
 *
 * Same rules as the topic page (404 on an unknown slug or a bad page; 200 +
 * noindex when empty), with three differences:
 *   • a REGION lists its own articles plus every child city's;
 *   • `indexable` defaults to false for locations, so these pages are
 *     `noindex, follow` until Marketing flips "Show in Google";
 *   • a prominent link to the matching city / region page. These pages exist to
 *     support the city pages, not to compete with them.
 */
async function load(slug: string) {
  try {
    return await getTerm('location', slug);
  } catch (err) {
    console.error(`[knowledge-hub/area/${slug}] term unavailable:`, err);
    return null;
  }
}

/** City → `/{registry_slug}`; region → `/locations/{registry_slug}`. */
function servicesLinkFor(term: KhTerm) {
  const slug = term.registrySlug || term.slug;
  const isRegion = term.parentId === null;
  return {
    prompt: `Need a plumber in ${term.name}?`,
    label: `${term.name} services`,
    href: isRegion ? `/locations/${slug}` : `/${slug}`,
  };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const term = await load(params.slug);
  const page = parsePageParam(searchParams.page);
  if (!term || !page) return {};
  return termMetadata(
    term,
    page,
    khAreaHref(term.slug),
    `Plumbing articles for ${term.name} homeowners from J. Blanton Plumbing.`
  );
}

export default async function AreaPage({ params, searchParams }: Props) {
  const page = parsePageParam(searchParams.page);
  if (page === null) notFound();
  const term = await load(params.slug);
  if (!term) notFound();

  let data: KhArticlePage | null = null;
  try {
    data = await listTermArticles(term, page);
  } catch (err) {
    console.error(`[knowledge-hub/area/${term.slug}] articles unavailable:`, err);
  }
  if (data && page > data.pageCount) notFound();

  return (
    <TermListingPage term={term} data={data} basePath={khAreaHref(term.slug)} servicesLink={servicesLinkFor(term)} />
  );
}
