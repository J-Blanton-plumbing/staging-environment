/**
 * Sitemap RENDERING — XML serialization, the freshness (`<lastmod>`) queries,
 * and the in-process cache that keeps a bot fetch off Postgres (Brief 153,
 * Track B).
 *
 * `src/lib/sitemap/manifest.ts` decides WHICH URLs exist (registry-derived,
 * database-free, so `scripts/validate-sitemap.ts` can import it at build time).
 * This file decides what they look like on the wire.
 *
 * ─── The caching decision ──────────────────────────────────────────────────
 * Every sitemap route is still `force-dynamic`, exactly as the old flat sitemap
 * was, so a CMS publish is never hidden behind a build-time snapshot and the
 * build never has to reach a database (Brief 72). Freshness is instead bounded
 * by an in-process TTL memo, chosen over Next's `revalidate`/ISR for two
 * reasons: ISR would make these routes prerender candidates at build time (a
 * database read during `next build`, which this codebase deliberately does not
 * do), and a plain memo is legible — one map, one TTL per child, no interaction
 * with the router's data cache.
 *
 * TTLs:
 *   pages / cities / articles   15 minutes  — small queries, CMS edits show up fast
 *   city-service shards          6 hours    — ~2,800 rows each; the URL SET is
 *                                             static (registry × taxonomy) and only
 *                                             <lastmod> comes from the database
 *
 * The cache is per process. pm2 runs one instance, so that is one cache; if the
 * app is ever scaled out, each worker simply warms its own — the content is
 * identical, only the lastmod staleness window differs.
 */
import pool from '@/lib/db';
import { CANONICAL_BASE } from '@/lib/seo';
import { SITEMAP_STATIC_PAGES } from '@/lib/sitemap-pages';
import { SERVICE_CATEGORY_SLUGS } from '@/lib/services';
import { SUB_SERVICE_ROUTES } from '@/lib/content/service-taxonomy';
import { CITY_REGISTRY } from '@/lib/content/cities';
import { getAllServiceSlugs } from '@/lib/content/city-services';
import {
  CityServiceShard,
  SITEMAP_CHILDREN,
  citySlugsForShard,
} from '@/lib/sitemap/manifest';

/**
 * Legacy sub-services with a full static-content fallback
 * (`ServicePageTemplate` + `src/lib/content/services/*`). These render 200
 * regardless of DB status, so they are always listed.
 *
 * Brief 146 (Track B): `gas-lines` left this set — its static content file was
 * retired and `/gas-lines` now renders from `sub_service_pages` like the other
 * sub-service routes, so it 404s if that row is ever unpublished and must be
 * listed on the same "published row exists" condition as they are.
 */
const STATIC_FALLBACK_SUB_SERVICES = new Set(['sewer-rodding', 'hydro-jetting']);

/**
 * The `<lastmod>` sources, as `[name, sql]`. Exported so
 * `scripts/verify-sitemap-queries.ts` can run the EXACT same SQL against the
 * database on deploy and fail the pipeline on a wrong column/table name — the
 * defect class that shipped 248 city URLs with no lastmod for weeks (Brief 147,
 * Track D). Keep every sitemap query in here; a query written inline elsewhere
 * would escape that check.
 *
 * Brief 153 moved this out of `src/app/sitemap.ts`, which no longer exists —
 * `/sitemap.xml` is now a Route Handler emitting a `<sitemapindex>`.
 */
export const SITEMAP_LASTMOD_SOURCES = {
  main: `SELECT slug, updated_at FROM main_pages`,
  category: `SELECT slug, updated_at FROM service_category_pages`,
  subService: `SELECT slug, COALESCE(updated_at, created_at) AS updated_at
           FROM sub_service_pages WHERE status = 'published'`,
  // `city_pages` keys on `city_slug`, not `slug` — the same column-name trap
  // Brief 144 hit in the canonical-override resolver. This query threw
  // `column "slug" does not exist` on every request; `safeQuery` swallowed
  // it, so the 248 city URLs shipped with NO <lastmod> at all and nothing
  // surfaced but a server-log line.
  city: `SELECT city_slug AS slug, updated_at FROM city_pages`,
  article: `SELECT slug, COALESCE(updated_at, created_at) AS updated_at
           FROM cms_articles WHERE status = 'published'`,
  emergencyPlumbing: `SELECT updated_at FROM emergency_plumbing_page ORDER BY updated_at DESC NULLS LAST LIMIT 1`,
  /**
   * Brief 153: `<lastmod>` for the /{city}/{service} shards, and the ONLY query
   * that reads the 11,160-row table. It is bounded to one shard's city range
   * (~2,800 rows) and sits behind a 6-hour memo, so a crawler sweeping all five
   * children costs five bounded reads a quarter-day, not 11,160 rows a request.
   * `$1`/`$2` are the shard's half-open slug bounds; '' means unbounded.
   */
  cityService: `SELECT city_slug, service_slug, updated_at
           FROM city_service_pages
          WHERE ($1 = '' OR city_slug >= $1)
            AND ($2 = '' OR city_slug <  $2)`,
  /**
   * Brief 153: rows that declare a canonical pointing somewhere else. A page
   * that canonicalises away must never appear in a sitemap — the live validator
   * fails the deploy on exactly that (Brief 152 Fix 3). Normally zero rows.
   */
  cityServiceCanonicalOverrides: `SELECT city_slug, service_slug
           FROM city_service_pages
          WHERE canonical_url IS NOT NULL AND btrim(canonical_url) <> ''`,
} as const;

/**
 * One resilient query — a DB hiccup degrades to "no lastmod", never a 500.
 *
 * Brief 147 (Track D): the swallow is deliberate, but it was also SILENT enough
 * to hide a hard defect for weeks (see the `city_pages` note above). Failures
 * now announce themselves: a named source, the failing SQL, the Postgres error
 * code, and a greppable `SITEMAP SOURCE FAILED` banner.
 */
async function safeQuery<T extends { [k: string]: unknown }>(
  source: string,
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  try {
    const res = await pool.query(sql, params);
    return res.rows as T[];
  } catch (err) {
    const e = err as { message?: string; code?: string };
    console.error(
      `\n${'!'.repeat(72)}\n[sitemap] SITEMAP SOURCE FAILED: "${source}" — its URLs will ship with NO <lastmod>.\n` +
        `  postgres ${e.code ?? '(no code)'}: ${e.message ?? String(err)}\n` +
        `  sql: ${sql.replace(/\s+/g, ' ').trim()}\n` +
        `  A 42703/42P01 code is a code defect (wrong column/table name), not a DB hiccup — fix the query.\n` +
        `${'!'.repeat(72)}\n`
    );
    return [];
  }
}

/* ── XML ──────────────────────────────────────────────────────────────────── */

export interface SitemapEntry {
  path: string;
  lastModified?: Date;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * Slugs are `[a-z0-9-]` by construction, so nothing here can currently need
 * escaping — this is a correctness guard for the day a slug rule loosens, not a
 * live concern. `&` must be replaced first or it would double-escape the rest.
 */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const absolute = (p: string) => (p && p !== '/' ? `${CANONICAL_BASE}${p}` : CANONICAL_BASE);

export function urlsetXml(entries: SitemapEntry[]): string {
  const body = entries
    .map((e) => {
      const parts = [`    <loc>${xmlEscape(absolute(e.path))}</loc>`];
      if (e.lastModified) parts.push(`    <lastmod>${e.lastModified.toISOString()}</lastmod>`);
      if (e.changeFrequency) parts.push(`    <changefreq>${e.changeFrequency}</changefreq>`);
      if (e.priority !== undefined) parts.push(`    <priority>${e.priority}</priority>`);
      return `  <url>\n${parts.join('\n')}\n  </url>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function sitemapIndexXml(children: Array<{ path: string; lastModified?: Date }>): string {
  const body = children
    .map((c) => {
      const parts = [`    <loc>${xmlEscape(absolute(c.path))}</loc>`];
      if (c.lastModified) parts.push(`    <lastmod>${c.lastModified.toISOString()}</lastmod>`);
      return `  <sitemap>\n${parts.join('\n')}\n  </sitemap>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
}

/** Standard response for every sitemap route. */
export function xmlResponse(xml: string, maxAgeSeconds: number): Response {
  return new Response(xml, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      // Mirrors the in-process TTL so an intermediary (nginx, CDN) and the app
      // agree on how stale a child may be.
      'cache-control': `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`,
    },
  });
}

/* ── In-process TTL cache ─────────────────────────────────────────────────── */

const TTL_FRESH_MS = 15 * 60 * 1000;
const TTL_CITY_SERVICE_MS = 6 * 60 * 60 * 1000;

interface CacheSlot {
  xml: string;
  expires: number;
}
const CACHE = new Map<string, CacheSlot>();
/** In-flight builds, so a burst of bot requests triggers ONE database read. */
const INFLIGHT = new Map<string, Promise<string>>();

async function cached(key: string, ttlMs: number, build: () => Promise<string>): Promise<string> {
  const hit = CACHE.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) return hit.xml;

  const running = INFLIGHT.get(key);
  if (running) return running;

  const p = build()
    .then((xml) => {
      CACHE.set(key, { xml, expires: Date.now() + ttlMs });
      return xml;
    })
    .finally(() => {
      INFLIGHT.delete(key);
    });
  INFLIGHT.set(key, p);
  return p;
}

/** Test/ops hook — drop everything so the next request rebuilds. */
export function clearSitemapCache(): void {
  CACHE.clear();
}

/* ── Children ─────────────────────────────────────────────────────────────── */

type SlugRow = { slug: string; updated_at: Date | null };
const toMap = (rows: SlugRow[]): Map<string, Date> => {
  const m = new Map<string, Date>();
  for (const r of rows) if (r.updated_at) m.set(r.slug, new Date(r.updated_at));
  return m;
};

/** `/sitemap-pages.xml` — static pages, `/services/*`, top-level sub-services. */
export function renderPagesSitemap(): Promise<string> {
  return cached('pages', TTL_FRESH_MS, async () => {
    const [mainRows, categoryRows, subServiceRows, epRows] = await Promise.all([
      safeQuery<SlugRow>('main_pages', SITEMAP_LASTMOD_SOURCES.main),
      safeQuery<SlugRow>('service_category_pages', SITEMAP_LASTMOD_SOURCES.category),
      safeQuery<SlugRow>('sub_service_pages', SITEMAP_LASTMOD_SOURCES.subService),
      safeQuery<{ updated_at: Date | null }>(
        'emergency_plumbing_page',
        SITEMAP_LASTMOD_SOURCES.emergencyPlumbing
      ),
    ]);
    const mainLastMod = toMap(mainRows);
    const categoryLastMod = toMap(categoryRows);
    const subServiceLastMod = toMap(subServiceRows);
    const epLastMod = epRows[0]?.updated_at ? new Date(epRows[0].updated_at) : undefined;

    const entries: SitemapEntry[] = [
      ...SITEMAP_STATIC_PAGES.map((p) => ({
        path: p.path,
        lastModified:
          p.path === '/emergency-plumbing'
            ? epLastMod
            : p.mainSlug
              ? mainLastMod.get(p.mainSlug)
              : undefined,
        changeFrequency: p.changeFrequency,
        priority: p.priority,
      })),
      ...SERVICE_CATEGORY_SLUGS.map((slug) => ({
        path: `/services/${slug}`,
        lastModified: categoryLastMod.get(slug),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      })),
      // DB failure fallback: if the published-slug query returned nothing at
      // all, keep the static-fallback pair (they 200 no matter what) and skip
      // the rest rather than advertising pages that may be unpublished.
      ...SUB_SERVICE_ROUTES.filter(
        (slug) =>
          subServiceRows.some((r) => r.slug === slug) || STATIC_FALLBACK_SUB_SERVICES.has(slug)
      ).map((slug) => ({
        path: `/${slug}`,
        lastModified: subServiceLastMod.get(slug),
        changeFrequency: 'monthly' as const,
        priority: 0.7,
      })),
    ];
    return urlsetXml(entries);
  });
}

/** `/sitemap-cities.xml` — the `/{city}` landing pages. */
export function renderCitiesSitemap(): Promise<string> {
  return cached('cities', TTL_FRESH_MS, async () => {
    const cityLastMod = toMap(await safeQuery<SlugRow>('city_pages', SITEMAP_LASTMOD_SOURCES.city));
    return urlsetXml(
      CITY_REGISTRY.map((c) => ({
        path: `/${c.slug}`,
        lastModified: cityLastMod.get(c.slug),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      }))
    );
  });
}

/** `/sitemap-articles.xml` — published Knowledge Hub articles. */
export function renderArticlesSitemap(): Promise<string> {
  return cached('articles', TTL_FRESH_MS, async () => {
    const rows = await safeQuery<SlugRow>('cms_articles', SITEMAP_LASTMOD_SOURCES.article);
    return urlsetXml(
      rows.map((a) => ({
        path: `/knowledge-hub/${a.slug}`,
        lastModified: a.updated_at ? new Date(a.updated_at) : undefined,
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      }))
    );
  });
}

/**
 * `/sitemap-city-services-N.xml` — the `/{city}/{service}` combos in one shard.
 *
 * The URL SET is entirely registry-derived and needs no database: the route
 * renders whenever `getCity()` and `getCityService()` both resolve. Two bounded
 * queries add freshness and safety on top — `<lastmod>` for the shard's cities,
 * and the (normally empty) set of rows that canonicalise elsewhere, which are
 * excluded because a sitemap must list only self-canonical URLs.
 */
export function renderCityServiceShard(shard: CityServiceShard): Promise<string> {
  return cached(`city-services-${shard.id}`, TTL_CITY_SERVICE_MS, async () => {
    const [lastModRows, overrideRows] = await Promise.all([
      safeQuery<{ city_slug: string; service_slug: string; updated_at: Date | null }>(
        `city_service_pages (shard ${shard.id})`,
        SITEMAP_LASTMOD_SOURCES.cityService,
        [shard.from, shard.to]
      ),
      safeQuery<{ city_slug: string; service_slug: string }>(
        'city_service_pages canonical_url overrides',
        SITEMAP_LASTMOD_SOURCES.cityServiceCanonicalOverrides
      ),
    ]);

    const lastMod = new Map<string, Date>();
    for (const r of lastModRows) {
      if (r.updated_at) lastMod.set(`${r.city_slug}/${r.service_slug}`, new Date(r.updated_at));
    }
    const canonicalisesElsewhere = new Set(
      overrideRows.map((r) => `${r.city_slug}/${r.service_slug}`)
    );
    if (canonicalisesElsewhere.size > 0) {
      console.warn(
        `[sitemap] ${canonicalisesElsewhere.size} city-service row(s) declare a canonical_url ` +
          'override and are EXCLUDED from the sitemap (a sitemap lists only self-canonical URLs).'
      );
    }

    const services = getAllServiceSlugs().slice().sort();
    const entries: SitemapEntry[] = [];
    for (const city of citySlugsForShard(shard)) {
      for (const service of services) {
        const key = `${city}/${service}`;
        if (canonicalisesElsewhere.has(key)) continue;
        entries.push({
          path: `/${key}`,
          lastModified: lastMod.get(key),
          changeFrequency: 'monthly',
          priority: 0.4,
        });
      }
    }
    return urlsetXml(entries);
  });
}

/**
 * `/sitemap.xml` — the index. No database: a child's own `<lastmod>` would mean
 * building that child, which is the cost the index exists to avoid.
 */
export function renderSitemapIndex(): string {
  return sitemapIndexXml(SITEMAP_CHILDREN.map((c) => ({ path: c.path })));
}

export const SITEMAP_TTL = {
  fresh: TTL_FRESH_MS / 1000,
  cityService: TTL_CITY_SERVICE_MS / 1000,
} as const;
