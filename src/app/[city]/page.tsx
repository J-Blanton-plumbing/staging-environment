import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CITY_REGISTRY,
  getArea,
  getCity,
  getCoverageContent,
  getGridCities,
  getLocalOfficeContent,
  getOffice,
} from '@/lib/content/cities';
import { DEFAULT_ARTICLE_SLUGS, WATER_TESTING_FAQS } from '@/lib/content/cities/shared';
import { getArticles } from '@/lib/articles';
import CoverageAreaCity from '@/components/CoverageAreaCity';
import LocalOfficeCity from '@/components/LocalOfficeCity';

/**
 * Shared dynamic city builder (brief-10, routing DECIDED 2026-06-03).
 *
 * One route tree over the city registry: each entry carries a `type`, and this
 * builder renders the matching template — `coverage-area` → CoverageAreaCity
 * (this brief), `local-office` → LocalOfficeCity (the Brief 09 video-hero layout,
 * folded in from the old standalone `/evanston` route). Adding or re-typing a
 * city is a registry edit, no code change.
 */

// Only registry slugs are valid pages; anything else 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return CITY_REGISTRY.map((c) => ({ city: c.slug }));
}

export function generateMetadata({ params }: { params: { city: string } }): Metadata {
  const entry = getCity(params.city);
  if (!entry) return {};

  if (entry.type === 'local-office') {
    const content = getLocalOfficeContent(entry.slug);
    return content ? { title: content.meta.title, description: content.meta.description } : {};
  }

  const content = getCoverageContent(entry.slug);
  return {
    title: content?.meta?.title ?? `${entry.name} Plumber`,
    description:
      content?.meta?.description ??
      `J. Blanton Plumbing serves ${entry.name}, IL with 24/7 emergency plumbing, drain, sewer, and water heater service. 30+ years, same-day available. Call (773) 724-9272.`,
  };
}

export default function CityPage({ params }: { params: { city: string } }) {
  const entry = getCity(params.city);
  if (!entry) notFound();

  if (entry.type === 'local-office') {
    const content = getLocalOfficeContent(entry.slug);
    if (!content) notFound();
    return <LocalOfficeCity city={content} />;
  }

  const content = getCoverageContent(entry.slug);
  const articles = getArticles(content?.articleSlugs ?? DEFAULT_ARTICLE_SLUGS);

  return (
    <CoverageAreaCity
      name={entry.name}
      content={content}
      office={getOffice(entry.slug)}
      area={getArea(entry.slug)}
      articles={articles}
      faqs={WATER_TESTING_FAQS}
      cities={getGridCities()}
    />
  );
}
