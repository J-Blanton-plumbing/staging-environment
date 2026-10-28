/**
 * Brief 221 (Track C) — the `aggregateRating` block added to the business nodes that already exist:
 * a hub's page-scoped Plumber node (`hubPlumberJsonLd`, also emitted by its City Service V2 pages) and
 * the homepage Organization. Never a Product, never Review nodes, never a second entity (Marketing,
 * 2026-10-28). Strings, in this key order, exactly as `jsonld-template.json` in Antonio's spec.
 *
 * Callers add it only when the SAME numbers are visible on the page (`ratingShownIn`), so schema and
 * copy can't disagree.
 */
import { formatRatingValue, type RatingFigures } from '@/lib/cms/tokens';

export function aggregateRatingJsonLd(f: RatingFigures) {
  return {
    '@type': 'AggregateRating',
    ratingValue: formatRatingValue(f.ratingValue),
    reviewCount: String(Math.round(f.reviewCount)),
    bestRating: '5',
    worstRating: '1',
  };
}

export type AggregateRatingNode = ReturnType<typeof aggregateRatingJsonLd>;
