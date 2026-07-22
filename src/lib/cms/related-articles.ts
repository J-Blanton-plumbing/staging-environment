/**
 * Brief 92 — the Related Articles block resolver (pure, client-safe).
 *
 * This module is the SINGLE source of truth for turning a `relatedArticles` block
 * instance's `data` config into the ordered list of article cards to render. Both
 * the public page (`ServicePageTemplate`, server) and the admin live preview
 * (`BlockSelectionPanel`, client) import `resolveRelatedArticles`, so the Block-tab
 * preview can never drift from the live page.
 *
 * No DB import, no React — kept pure so the block registry, the server template,
 * and the client editor can all import it. The article POOL (which articles exist,
 * with their status + categories) is supplied by the caller: the server builds it
 * from `cms_articles` + static `ARTICLES`; the editor builds it from
 * `GET /api/cms/articles`. The resolver only reads the pool and the config.
 *
 * Hard rule (brief): an unconfigured instance renders EXACTLY as today — the newest
 * `3` published articles. `readRelatedArticlesConfig` returns `mode:'newest',
 * count:3` for empty `data`, and `resolveRelatedArticles` in that case is simply the
 * first 3 published articles of the (newest-first) pool.
 */

// ── Closed option lists (drive the registry-based sidebar controls) ─────────────

export const RELATED_ARTICLES_MODES = ['category', 'newest', 'handpick'] as const;
export type RelatedArticlesMode = (typeof RELATED_ARTICLES_MODES)[number];

export const RELATED_ARTICLES_COUNTS = [3, 6, 9] as const;
export type RelatedArticlesCount = (typeof RELATED_ARTICLES_COUNTS)[number];

/** Human labels for the three selection modes (used by the sidebar + helper copy). */
export const RELATED_ARTICLES_MODE_LABELS: Record<RelatedArticlesMode, string> = {
  category: 'Filter by category',
  newest: 'Newest',
  handpick: 'Hand-pick',
};

export const DEFAULT_RELATED_MODE: RelatedArticlesMode = 'newest';
export const DEFAULT_RELATED_COUNT: RelatedArticlesCount = 3;

/** The normalized, complete config the resolver + editor UI work against. */
export interface RelatedArticlesConfig {
  mode: RelatedArticlesMode;
  count: RelatedArticlesCount;
  /** category mode — selected category slugs. */
  categories: string[];
  /** handpick mode — article slugs, in display order (empties allowed in raw data). */
  handpicked: string[];
  /** category mode — article slugs to fill leftover slots, in order. */
  backfill: string[];
}

// ── Article shapes ──────────────────────────────────────────────────────────────

/**
 * Fallback thumbnail for articles with no `image`. The migrated `cms_articles`
 * rows carry a NULL image because the source articles have no featured image in
 * WordPress either. Rather than hand `next/image` an empty `src` (which renders
 * broken), fall back to a relevant brand photo. We deliberately do NOT use the live
 * site's generic `rectangle.webp` placeholder — it communicates nothing; a plumbing
 * photo at least reads as on-topic. A local asset, so no `remotePatterns` entry.
 */
export const FALLBACK_ARTICLE_IMAGE = '/images/hero-poster.webp';

/** The minimal fields an ArticleCard needs — what the resolver ultimately returns. */
export interface ArticleCardData {
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  href: string;
}

/** A pool entry: card data plus the metadata the resolver filters on. */
export interface ResolvableArticle extends ArticleCardData {
  /** Stored category values — display names (e.g. "Sewer Rodding") and/or slugs. */
  category: string[];
  /** 'published' | 'draft' — only published articles render publicly. */
  status: string;
}

// ── Config reading ──────────────────────────────────────────────────────────────

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [];

/**
 * Coerce a block instance's `data` into a complete, valid config. Unknown/absent
 * values fall back to the today-identical defaults (`newest` / `3`). This is the
 * only place defaults are applied, so preview and public render agree.
 */
export function readRelatedArticlesConfig(data: Record<string, unknown> | undefined): RelatedArticlesConfig {
  const d = data ?? {};
  const mode = (RELATED_ARTICLES_MODES as readonly string[]).includes(d.mode as string)
    ? (d.mode as RelatedArticlesMode)
    : DEFAULT_RELATED_MODE;
  const count = (RELATED_ARTICLES_COUNTS as readonly number[]).includes(d.count as number)
    ? (d.count as RelatedArticlesCount)
    : DEFAULT_RELATED_COUNT;
  return {
    mode,
    count,
    categories: asStringArray(d.categories),
    handpicked: asStringArray(d.handpicked),
    backfill: asStringArray(d.backfill),
  };
}

// ── Category matching ───────────────────────────────────────────────────────────

/**
 * Normalize a category label or slug to a comparable slug. Articles store category
 * DISPLAY NAMES (e.g. "Sewer Rodding") while the sidebar picker stores the taxonomy
 * SLUG (e.g. "sewer-rodding" from `/api/cms/service-categories`). Slugifying both
 * sides lets the two match without a data migration — and a raw slug already stored
 * on an article still matches itself.
 */
export function slugifyCategory(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Does an article belong to ANY of the selected category slugs? */
export function articleMatchesCategory(article: ResolvableArticle, selectedSlugs: string[]): boolean {
  if (selectedSlugs.length === 0) return false;
  const have = new Set<string>();
  for (const c of article.category) {
    have.add(c);
    have.add(slugifyCategory(c));
  }
  return selectedSlugs.some((s) => have.has(s) || have.has(slugifyCategory(s)));
}

// ── Resolver ────────────────────────────────────────────────────────────────────

/**
 * Resolve a config + article pool into the ordered card list to render. The pool
 * MUST be supplied newest-first (the caller sorts it). De-duplicates by slug and
 * only ever emits PUBLISHED articles; unpublished / missing slugs are skipped.
 *
 *  • newest   → the newest `count` published articles.
 *  • category → published articles whose category[] overlaps a selected slug, newest
 *               first, capped at `count`; if short, append `backfill` slugs in order
 *               (skipping dupes/missing/unpublished); if still short, fewer cards.
 *  • handpick → exactly the `handpicked` slugs, in order, skipping empty/missing.
 */
export function resolveRelatedArticles(
  config: RelatedArticlesConfig,
  pool: ResolvableArticle[]
): ArticleCardData[] {
  const published = pool.filter((a) => a.status === 'published');
  const bySlug = new Map<string, ResolvableArticle>();
  for (const a of published) if (!bySlug.has(a.slug)) bySlug.set(a.slug, a);

  const out: ResolvableArticle[] = [];
  const seen = new Set<string>();
  const push = (a: ResolvableArticle | undefined) => {
    if (a && !seen.has(a.slug)) {
      seen.add(a.slug);
      out.push(a);
    }
  };

  if (config.mode === 'handpick') {
    for (const slug of config.handpicked) {
      if (out.length >= config.count) break; // never exceed the chosen count
      if (!slug) continue; // empty picker field
      push(bySlug.get(slug));
    }
    return toCards(out);
  }

  if (config.mode === 'category') {
    for (const a of published) {
      if (out.length >= config.count) break;
      if (articleMatchesCategory(a, config.categories)) push(a);
    }
    // Backfill leftover slots, in order, from explicit slugs.
    for (const slug of config.backfill) {
      if (out.length >= config.count) break;
      if (!slug) continue;
      push(bySlug.get(slug));
    }
    return toCards(out.slice(0, config.count));
  }

  // newest (default / today's behavior)
  for (const a of published) {
    if (out.length >= config.count) break;
    push(a);
  }
  return toCards(out);
}

function toCards(list: ResolvableArticle[]): ArticleCardData[] {
  return list.map(({ slug, title, excerpt, image, href }) => ({ slug, title, excerpt, image, href }));
}
