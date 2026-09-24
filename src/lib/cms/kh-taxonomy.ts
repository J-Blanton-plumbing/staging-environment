/**
 * Brief 187 — Knowledge Hub taxonomy: queries (server only).
 *
 * Tables (created by `scripts/migrate-brief-187-kh-taxonomy.ts`):
 *   kh_terms           — topics + locations (regions and cities)
 *   cms_article_terms  — article ↔ term, with `is_primary` on the one primary topic
 *
 * ── THE RULES THIS FILE OWNS ────────────────────────────────────────────────
 * 1. "Published article" means exactly what the hub has always meant by it:
 *    `status = 'published'` AND a non-empty body. Every count, list and page
 *    below uses `PUBLISHED`, so a count on the admin screen can never disagree
 *    with what a topic page lists.
 * 2. Order is the hub's order (`created_at DESC, wp_post_id DESC NULLS LAST,
 *    id DESC` — Brief 122). Topic pages put primary-topic articles first.
 * 3. A city tag implies its region AT QUERY TIME. A region's page, count and
 *    city-page fallback include every child city's articles. The region is never
 *    written onto the article.
 * 4. Content state never errors a page: a missing table (a database the
 *    migration has not reached yet) or any query failure on a PUBLIC surface
 *    degrades to "no tags", which is exactly today's rendering. The public
 *    helpers catch; the admin/writer helpers throw, so an editor sees a failure.
 */
import type { PoolClient } from 'pg';
import pool from '@/lib/db';
import type { ArticleCardData } from '@/lib/cms/related-articles';
import {
  KH_CITY_ARTICLE_THRESHOLD,
  KH_MAX_SECONDARY_TOPICS,
  KH_PAGE_SIZE,
  khAreaHref,
  type ArticleTermSelection,
  type ArticleTermsDisplay,
  type KhTerm,
  type KhTermRef,
  type KhTermType,
} from '@/lib/cms/kh-taxonomy-types';

export const PUBLISHED = `a.status = 'published' AND (a.body->>'html') IS NOT NULL AND (a.body->>'html') <> ''`;
export const HUB_ORDER = `a.created_at DESC, a.wp_post_id DESC NULLS LAST, a.id DESC`;

/** A card on the hub / topic / area / city pages: the shared card shape plus its primary topic chip. */
export interface KhArticleCard extends ArticleCardData {
  topic: KhTermRef | null;
}

export interface KhArticlePage {
  articles: KhArticleCard[];
  total: number;
  /** 1-based. */
  page: number;
  pageCount: number;
}

/* ── Terms ─────────────────────────────────────────────────────────────────── */

type TermRow = {
  id: number; type: KhTermType; slug: string; name: string; parent_id: number | null;
  parent_slug: string | null; parent_name: string | null; registry_slug: string | null;
  intro_html: string | null; meta_title: string | null; meta_description: string | null;
  indexable: boolean; sort_order: number; published_count: string | number;
};

const TERM_SELECT = `
  WITH pub AS (SELECT a.id FROM cms_articles a WHERE ${PUBLISHED}),
  links AS (
    SELECT at.term_id, at.article_id
      FROM cms_article_terms at JOIN pub ON pub.id = at.article_id
    UNION
    SELECT t.parent_id, at.article_id
      FROM cms_article_terms at
      JOIN pub ON pub.id = at.article_id
      JOIN kh_terms t ON t.id = at.term_id
     WHERE t.parent_id IS NOT NULL
  ),
  counts AS (SELECT term_id, count(DISTINCT article_id) AS n FROM links GROUP BY term_id)
  SELECT t.id, t.type, t.slug, t.name, t.parent_id, p.slug AS parent_slug, p.name AS parent_name,
         t.registry_slug, t.intro_html, t.meta_title, t.meta_description, t.indexable, t.sort_order,
         COALESCE(c.n, 0) AS published_count
    FROM kh_terms t
    LEFT JOIN kh_terms p ON p.id = t.parent_id
    LEFT JOIN counts c ON c.term_id = t.id`;

function toTerm(r: TermRow): KhTerm {
  return {
    id: r.id,
    type: r.type,
    slug: r.slug,
    name: r.name,
    parentId: r.parent_id,
    parentSlug: r.parent_slug,
    parentName: r.parent_name,
    registrySlug: r.registry_slug,
    introHtml: r.intro_html ?? '',
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
    indexable: r.indexable,
    sortOrder: r.sort_order,
    publishedCount: Number(r.published_count) || 0,
  };
}

/**
 * Stable display order: topics by sort_order; locations as regions (by
 * sort_order) each followed by its cities (by name).
 */
function orderTerms(terms: KhTerm[]): KhTerm[] {
  const topics = terms.filter((t) => t.type === 'topic').sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const regions = terms.filter((t) => t.type === 'location' && t.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder);
  const locations: KhTerm[] = [];
  for (const r of regions) {
    locations.push(r);
    locations.push(...terms.filter((t) => t.parentId === r.id).sort((a, b) => a.name.localeCompare(b.name)));
  }
  const placed = new Set(locations.map((t) => t.id));
  const orphans = terms.filter((t) => t.type === 'location' && !placed.has(t.id));
  return [...topics, ...locations, ...orphans];
}

/** Every term with its published-article count. Throws — admin / editor use. */
export async function listTerms(): Promise<KhTerm[]> {
  const res = await pool.query<TermRow>(TERM_SELECT);
  return orderTerms(res.rows.map(toTerm));
}

/** One term by type + slug, or null. Throws — the page decides what a failure means. */
export async function getTerm(type: KhTermType, slug: string): Promise<KhTerm | null> {
  const res = await pool.query<TermRow>(`${TERM_SELECT} WHERE t.type = $1 AND t.slug = $2`, [type, slug]);
  return res.rows[0] ? toTerm(res.rows[0]) : null;
}

/** The hub filter row: topics with at least one published article, in topic order. Never throws. */
export async function getTopicFilterRow(): Promise<KhTermRef[]> {
  try {
    const terms = await listTerms();
    return terms.filter((t) => t.type === 'topic' && t.publishedCount > 0).map(({ slug, name }) => ({ slug, name }));
  } catch (err) {
    console.error('[kh-taxonomy] topic filter row unavailable — rendering none:', (err as Error).message);
    return [];
  }
}

/* ── Article lists ─────────────────────────────────────────────────────────── */

type CardRow = { id: number; slug: string; title: string; excerpt: string | null; image: string | null };

const toCard = (r: CardRow, topic: KhTermRef | null): KhArticleCard => ({
  slug: r.slug,
  title: r.title,
  excerpt: r.excerpt || '',
  image: r.image || '',
  href: `/knowledge-hub/${r.slug}`,
  topic,
});

/** Primary topic per article id. Never throws — a failure means "no chips", i.e. today's cards. */
async function primaryTopicsFor(ids: number[]): Promise<Map<number, KhTermRef>> {
  const out = new Map<number, KhTermRef>();
  if (ids.length === 0) return out;
  try {
    const res = await pool.query<{ article_id: number; slug: string; name: string }>(
      `SELECT at.article_id, t.slug, t.name
         FROM cms_article_terms at
         JOIN kh_terms t ON t.id = at.term_id AND t.type = 'topic'
        WHERE at.is_primary AND at.article_id = ANY($1::int[])`,
      [ids]
    );
    for (const r of res.rows) out.set(r.article_id, { slug: r.slug, name: r.name });
  } catch (err) {
    console.error('[kh-taxonomy] primary topics unavailable — cards render without chips:', (err as Error).message);
  }
  return out;
}

async function withTopics(rows: CardRow[]): Promise<KhArticleCard[]> {
  const topics = await primaryTopicsFor(rows.map((r) => r.id));
  return rows.map((r) => toCard(r, topics.get(r.id) ?? null));
}

/** `?page=` → a 1-based page number, or null when the value is not a positive integer. */
export function parsePageParam(raw: string | string[] | undefined): number | null {
  if (raw === undefined) return 1;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!/^[1-9]\d{0,5}$/.test(v)) return null;
  return Number(v);
}

const pageCountFor = (total: number) => Math.max(1, Math.ceil(total / KH_PAGE_SIZE));

/**
 * One page of the hub grid — the same rows, order and page size `/api/articles`
 * always served, now server-rendered so `?page=n` is a crawlable URL.
 * Throws: the hub page renders its own error state.
 */
export async function listHubArticles(page: number): Promise<KhArticlePage> {
  const [rows, count] = await Promise.all([
    pool.query<CardRow>(
      `SELECT a.id, a.slug, a.title, a.excerpt, a.image FROM cms_articles a
        WHERE ${PUBLISHED} ORDER BY ${HUB_ORDER} LIMIT $1 OFFSET $2`,
      [KH_PAGE_SIZE, (page - 1) * KH_PAGE_SIZE]
    ),
    pool.query<{ n: string }>(`SELECT count(*) AS n FROM cms_articles a WHERE ${PUBLISHED}`),
  ]);
  const total = Number(count.rows[0].n) || 0;
  return { articles: await withTopics(rows.rows), total, page, pageCount: pageCountFor(total) };
}

/**
 * One page of a topic's or location's articles.
 *   • topic    — primary OR secondary; primary-topic articles first, then hub order.
 *   • region   — tagged with the region OR any of its cities (implied at query time).
 *   • city     — tagged with the city.
 */
export async function listTermArticles(term: KhTerm, page: number): Promise<KhArticlePage> {
  const includeChildren = term.type === 'location' && term.parentId === null;
  const scope = `
    WITH scope AS (SELECT id FROM kh_terms WHERE id = $1 OR ($2::boolean AND parent_id = $1)),
    m AS (
      SELECT at.article_id, bool_or(at.is_primary AND at.term_id = $1) AS prim
        FROM cms_article_terms at
       WHERE at.term_id IN (SELECT id FROM scope)
       GROUP BY at.article_id
    )`;
  const [rows, count] = await Promise.all([
    pool.query<CardRow>(
      `${scope}
       SELECT a.id, a.slug, a.title, a.excerpt, a.image
         FROM cms_articles a JOIN m ON m.article_id = a.id
        WHERE ${PUBLISHED}
        ORDER BY m.prim DESC, ${HUB_ORDER}
        LIMIT $3 OFFSET $4`,
      [term.id, includeChildren, KH_PAGE_SIZE, (page - 1) * KH_PAGE_SIZE]
    ),
    pool.query<{ n: string }>(
      `${scope} SELECT count(*) AS n FROM cms_articles a JOIN m ON m.article_id = a.id WHERE ${PUBLISHED}`,
      [term.id, includeChildren]
    ),
  ]);
  const total = Number(count.rows[0].n) || 0;
  return { articles: await withTopics(rows.rows), total, page, pageCount: pageCountFor(total) };
}

/* ── One article's terms ───────────────────────────────────────────────────── */

type ArticleTermRow = { type: KhTermType; slug: string; name: string; is_primary: boolean; sort_order: number; parent_id: number | null };

async function articleTermRows(articleId: number): Promise<ArticleTermRow[]> {
  const res = await pool.query<ArticleTermRow>(
    `SELECT t.type, t.slug, t.name, at.is_primary, t.sort_order, t.parent_id
       FROM cms_article_terms at JOIN kh_terms t ON t.id = at.term_id
      WHERE at.article_id = $1`,
    [articleId]
  );
  return res.rows;
}

function splitRows(rows: ArticleTermRow[]) {
  const topics = rows.filter((r) => r.type === 'topic').sort((a, b) => a.sort_order - b.sort_order);
  const primary = topics.find((r) => r.is_primary) ?? null;
  const secondary = topics.filter((r) => r !== primary);
  // Regions first, then cities, each A→Z.
  const locations = rows
    .filter((r) => r.type === 'location')
    .sort((a, b) => Number(a.parent_id !== null) - Number(b.parent_id !== null) || a.name.localeCompare(b.name));
  return { primary, secondary, locations };
}

/** For the editor: the article's live tags, as slugs. Throws. */
export async function getArticleTermSelection(articleId: number): Promise<ArticleTermSelection> {
  const { primary, secondary, locations } = splitRows(await articleTermRows(articleId));
  return {
    primary: primary?.slug ?? null,
    secondary: secondary.map((r) => r.slug),
    locations: locations.map((r) => r.slug),
  };
}

/** For the public article page. Never throws — a failure renders no chips (today's page). */
export async function getArticleTermsDisplay(articleId: number): Promise<ArticleTermsDisplay> {
  try {
    const { primary, secondary, locations } = splitRows(await articleTermRows(articleId));
    const ref = (r: ArticleTermRow): KhTermRef => ({ slug: r.slug, name: r.name });
    return { primary: primary ? ref(primary) : null, secondary: secondary.map(ref), locations: locations.map(ref) };
  } catch (err) {
    console.error('[kh-taxonomy] article terms unavailable — rendering no chips:', (err as Error).message);
    return { primary: null, secondary: [], locations: [] };
  }
}

/**
 * Replace an article's tags with exactly `selection`, inside the caller's
 * transaction. Used by the article PUBLISH writer and by the Stop 2 apply script.
 *
 * Slugs are resolved against the real term list: an unknown slug is dropped and
 * returned in `unknown` (never an exception — content state must not fail a
 * publish or a deploy). The primary topic is written with is_primary = true and
 * nothing else ever is, which is what makes the one-primary index mean
 * "one primary TOPIC".
 */
export async function writeArticleTerms(
  client: PoolClient,
  articleId: number,
  selection: ArticleTermSelection
): Promise<{ written: number; unknown: string[] }> {
  const topicSlugs = [selection.primary, ...selection.secondary].filter((s): s is string => !!s);
  const res = await client.query<{ id: number; type: KhTermType; slug: string }>(
    `SELECT id, type, slug FROM kh_terms
      WHERE (type = 'topic' AND slug = ANY($1::text[])) OR (type = 'location' AND slug = ANY($2::text[]))`,
    [topicSlugs, selection.locations]
  );
  const topicId = new Map(res.rows.filter((r) => r.type === 'topic').map((r) => [r.slug, r.id]));
  const locationId = new Map(res.rows.filter((r) => r.type === 'location').map((r) => [r.slug, r.id]));
  const unknown: string[] = [];

  const rows: Array<[number, boolean]> = [];
  const primaryId = selection.primary ? topicId.get(selection.primary) : undefined;
  if (selection.primary && primaryId === undefined) unknown.push(`topic:${selection.primary}`);
  if (primaryId !== undefined) rows.push([primaryId, true]);
  for (const s of selection.secondary) {
    const id = topicId.get(s);
    if (id === undefined) { unknown.push(`topic:${s}`); continue; }
    if (rows.some(([x]) => x === id)) continue;
    if (rows.filter(([, p]) => !p).length >= KH_MAX_SECONDARY_TOPICS) continue;
    rows.push([id, false]);
  }
  for (const s of selection.locations) {
    const id = locationId.get(s);
    if (id === undefined) { unknown.push(`location:${s}`); continue; }
    if (!rows.some(([x]) => x === id)) rows.push([id, false]);
  }

  await client.query(`DELETE FROM cms_article_terms WHERE article_id = $1`, [articleId]);
  for (const [termId, isPrimary] of rows) {
    await client.query(
      `INSERT INTO cms_article_terms (article_id, term_id, is_primary) VALUES ($1, $2, $3)`,
      [articleId, termId, isPrimary]
    );
  }
  clearKhTaxonomyCache();
  return { written: rows.length, unknown };
}

/* ── City pages (Track C6) ─────────────────────────────────────────────────── */

export interface CityTaggedArticles {
  articles: KhArticleCard[];
  /** "More {name} articles" → the area page of the city, or of its region on the fallback. */
  more: { label: string; href: string };
}

type LocationIndex = Map<string, CityTaggedArticles>;
const CITY_TTL_MS = 60 * 1000;
let cityIndex: { value: LocationIndex; expires: number } | null = null;
let cityIndexInflight: Promise<LocationIndex> | null = null;

/** Drop the in-process city index (called after any tag write). */
export function clearKhTaxonomyCache(): void {
  cityIndex = null;
}

/**
 * Build `registry_slug → the newest 3 tagged articles` for every city whose own
 * tags, or failing that its region's, reach the threshold. ONE query for the
 * whole site, memoised for a minute, so ~11,000 city and city-service pages do
 * not each hit Postgres. With zero tags the map is empty and every page keeps
 * today's hand-picked articles.
 */
async function buildCityIndex(): Promise<LocationIndex> {
  const [terms, links] = await Promise.all([
    pool.query<{ id: number; slug: string; name: string; parent_id: number | null; registry_slug: string | null }>(
      `SELECT id, slug, name, parent_id, registry_slug FROM kh_terms WHERE type = 'location'`
    ),
    pool.query<CardRow & { term_id: number }>(
      `SELECT at.term_id, a.id, a.slug, a.title, a.excerpt, a.image
         FROM cms_article_terms at
         JOIN kh_terms t ON t.id = at.term_id AND t.type = 'location'
         JOIN cms_articles a ON a.id = at.article_id
        WHERE ${PUBLISHED}
        ORDER BY ${HUB_ORDER}`
    ),
  ]);
  const byId = new Map(terms.rows.map((t) => [t.id, t]));
  // Buckets in hub order (the rows are already sorted), deduped per bucket.
  const buckets = new Map<number, CardRow[]>();
  const seen = new Map<number, Set<number>>();
  const push = (termId: number, row: CardRow) => {
    const s = seen.get(termId) ?? new Set<number>();
    if (s.has(row.id)) return;
    s.add(row.id);
    seen.set(termId, s);
    const b = buckets.get(termId) ?? [];
    b.push(row);
    buckets.set(termId, b);
  };
  for (const row of links.rows) {
    push(row.term_id, row);
    const parent = byId.get(row.term_id)?.parent_id;
    if (parent) push(parent, row);
  }

  const index: LocationIndex = new Map();
  const needTopics = new Set<number>();
  const picks: Array<[string, CardRow[], { label: string; href: string }]> = [];
  for (const t of terms.rows) {
    if (t.parent_id === null || !t.registry_slug) continue; // cities only
    const own = buckets.get(t.id) ?? [];
    let chosen: CardRow[] | null = null;
    let more: { label: string; href: string } | null = null;
    if (own.length >= KH_CITY_ARTICLE_THRESHOLD) {
      chosen = own.slice(0, KH_CITY_ARTICLE_THRESHOLD);
      more = { label: `More ${t.name} articles`, href: khAreaHref(t.slug) };
    } else {
      const region = byId.get(t.parent_id);
      const regional = region ? buckets.get(region.id) ?? [] : [];
      if (region && regional.length >= KH_CITY_ARTICLE_THRESHOLD) {
        chosen = regional.slice(0, KH_CITY_ARTICLE_THRESHOLD);
        more = { label: `More ${region.name} articles`, href: khAreaHref(region.slug) };
      }
    }
    if (chosen && more) {
      chosen.forEach((r) => needTopics.add(r.id));
      picks.push([t.registry_slug, chosen, more]);
    }
  }
  const topics = await primaryTopicsFor(Array.from(needTopics));
  for (const [slug, rows, more] of picks) {
    index.set(slug, { articles: rows.map((r) => toCard(r, topics.get(r.id) ?? null)), more });
  }
  return index;
}

/**
 * The tagged articles a city page should show instead of its hand-picked
 * defaults, or `null` to keep today's behaviour exactly. Never throws.
 */
export async function getCityTaggedArticles(citySlug: string): Promise<CityTaggedArticles | null> {
  try {
    const now = Date.now();
    if (!cityIndex || cityIndex.expires <= now) {
      if (!cityIndexInflight) {
        cityIndexInflight = buildCityIndex()
          // A failure (e.g. a database the migration has not reached) is cached
          // as "no tagged cities" for the same minute, so it costs one query and
          // one log line per minute rather than one per page view.
          .catch((err: Error): LocationIndex => {
            console.error('[kh-taxonomy] city articles unavailable — keeping the default picks:', err.message);
            return new Map();
          })
          .then((value) => {
            cityIndex = { value, expires: Date.now() + CITY_TTL_MS };
            return value;
          })
          .finally(() => {
            cityIndexInflight = null;
          });
      }
      return (await cityIndexInflight).get(citySlug) ?? null;
    }
    return cityIndex.value.get(citySlug) ?? null;
  } catch (err) {
    console.error('[kh-taxonomy] city articles unavailable — keeping the default picks:', (err as Error).message);
    return null;
  }
}
