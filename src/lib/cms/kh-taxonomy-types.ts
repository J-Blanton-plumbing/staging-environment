/**
 * Brief 187 — Knowledge Hub taxonomy: the CLIENT-SAFE half.
 *
 * Types, constants and the pure normaliser shared by the article editor (a
 * client component), the server queries in `kh-taxonomy.ts`, the article
 * publish writer and the Stop 1 / Stop 2 backfill scripts. No database import
 * here, so this file can be bundled into the admin UI.
 */

export type KhTermType = 'topic' | 'location';

/** One row of `kh_terms`, as the app sees it. */
export interface KhTerm {
  id: number;
  type: KhTermType;
  slug: string;
  name: string;
  /** Locations only: the region a city belongs to. NULL on topics and regions. */
  parentId: number | null;
  parentSlug: string | null;
  parentName: string | null;
  /** Locations only: the matching `CITY_REGISTRY` slug (city) or `/locations/{slug}` (region). */
  registrySlug: string | null;
  introHtml: string;
  metaTitle: string | null;
  metaDescription: string | null;
  /** The "Show in Google" switch. */
  indexable: boolean;
  sortOrder: number;
  /**
   * Published articles filed under this term. A region counts its own tags AND
   * every child city's (a city tag implies its region at query time).
   */
  publishedCount: number;
}

/** The minimum a chip needs. */
export interface KhTermRef {
  slug: string;
  name: string;
}

/**
 * An article's tags as stored in a DRAFT VERSION (`page_drafts.content.terms`)
 * and as sent by the editor. Keyed by SLUG, not id: ids are not portable between
 * databases (dev / staging / production), slugs are.
 */
export interface ArticleTermSelection {
  primary: string | null;
  secondary: string[];
  locations: string[];
}

/** An article's tags, resolved for display. */
export interface ArticleTermsDisplay {
  primary: KhTermRef | null;
  secondary: KhTermRef[];
  locations: KhTermRef[];
}

export const EMPTY_TERM_SELECTION: ArticleTermSelection = { primary: null, secondary: [], locations: [] };

/** The nine topics, in display order. SEED data only — `kh_terms` is the source of truth once seeded. */
export const KH_TOPIC_SEED = [
  { slug: 'sewers', name: 'Sewers' },
  { slug: 'drains', name: 'Drains' },
  { slug: 'water-heaters', name: 'Water Heaters' },
  { slug: 'gas-lines', name: 'Gas Lines' },
  { slug: 'water-quality', name: 'Water Quality' },
  { slug: 'emergency', name: 'Emergency' },
  { slug: 'commercial', name: 'Commercial' },
  { slug: 'plumbing-tips', name: 'Plumbing Tips' },
  { slug: 'company-news', name: 'Company News' },
] as const;

/** Articles per page on the hub, topic and area pages — the hub's historical PAGE_SIZE. */
export const KH_PAGE_SIZE = 9;

/** Secondary topics an article may carry, in addition to its one primary topic. */
export const KH_MAX_SECONDARY_TOPICS = 2;

/** A city page switches to its tagged articles once it (or its region) has at least this many. */
export const KH_CITY_ARTICLE_THRESHOLD = 3;

export const khTopicHref = (slug: string) => `/knowledge-hub/topic/${slug}`;
export const khAreaHref = (slug: string) => `/knowledge-hub/area/${slug}`;

const asSlugList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim() !== '').map((s) => s.trim()) : [];

/**
 * Coerce an untrusted value (a draft's stored content, a request body) into a
 * valid selection, or `null` when the value carries no `terms` at all.
 *
 * `null` is meaningful and is NOT the same as "no tags": a version saved before
 * Brief 187 has no `terms` key, and publishing it must leave the article's tags
 * alone rather than wipe them. An explicit empty selection DOES clear them.
 *
 * Rules applied here (the writer re-applies them against the real term list):
 *   • the primary topic is never also a secondary topic;
 *   • at most KH_MAX_SECONDARY_TOPICS secondaries, first ones win;
 *   • duplicates dropped, order kept.
 */
export function normalizeTermSelection(raw: unknown): ArticleTermSelection | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const primary = typeof r.primary === 'string' && r.primary.trim() ? r.primary.trim() : null;
  const secondary = Array.from(new Set(asSlugList(r.secondary)))
    .filter((s) => s !== primary)
    .slice(0, KH_MAX_SECONDARY_TOPICS);
  const locations = Array.from(new Set(asSlugList(r.locations)));
  return { primary, secondary, locations };
}

export function sameTermSelection(a: ArticleTermSelection, b: ArticleTermSelection): boolean {
  const key = (s: ArticleTermSelection) =>
    JSON.stringify([s.primary, [...s.secondary].sort(), [...s.locations].sort()]);
  return key(a) === key(b);
}
