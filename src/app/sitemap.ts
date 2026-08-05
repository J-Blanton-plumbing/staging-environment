import { MetadataRoute } from 'next';
import pool from '@/lib/db';
import { SERVICE_CATEGORY_SLUGS } from '@/lib/services';
import { CITY_REGISTRY } from '@/lib/content/cities';
import { SUB_SERVICE_ROUTES } from '@/lib/content/service-taxonomy';
import { CANONICAL_BASE } from '@/lib/seo';

/**
 * Brief 127 (Track C): the sitemap is generated from the CMS's live, published
 * pages on every request, so it can never drift from the routes again (the old
 * version was a hand-maintained list that ended up advertising two 404s and
 * three redirects while omitting real pages).
 *
 * Rules:
 * - Every <loc> uses the production origin (CANONICAL_BASE) with no trailing
 *   slash; the homepage is the bare origin.
 * - Only URLs that return 200 are listed — redirect sources (/booking,
 *   /emergency, /why-us, /reviews, /services/emergency-plumbing) are excluded
 *   by construction because entries come from real route sources, not a list.
 * - <lastmod> comes from each page's own CMS updated_at; pages with no CMS row
 *   simply omit lastmod (a valid, stronger signal than one shared timestamp).
 * - /{city}/{service} combo pages (~10k) are deliberately not listed.
 */

// Reflect CMS publishes/edits immediately instead of serving a build-time snapshot.
export const dynamic = 'force-dynamic';

/*
 * `SUB_SERVICE_ROUTES` (the top-level sub-service route allowlist) now lives in
 * `@/lib/content/service-taxonomy` — Brief 138 moved it there so the sitemap,
 * the breadcrumb live-route check and the global services-menu link resolver all
 * read one list instead of three that can drift. A slug listed there 200s only
 * when its sub_service_pages row is published (SubServicePageView 404s
 * otherwise), so the sitemap still intersects it with the DB's published slugs.
 */

/**
 * Legacy sub-services with a full static-content fallback (ServicePageTemplate
 * + src/lib/content/services/*). These render 200 regardless of DB status, so
 * they are always listed.
 */
const STATIC_FALLBACK_SUB_SERVICES = new Set(['sewer-rodding', 'hydro-jetting', 'gas-lines']);

/**
 * Static top-level pages that always return 200. Slug 'home' in main_pages maps
 * to '/'. /hoa-line-piping is the standalone Brief 124 landing page (static
 * HTML in public/, served via rewrite).
 */
const STATIC_PAGES: Array<{ path: string; mainSlug?: string; changeFrequency: 'weekly' | 'monthly' | 'yearly'; priority: number }> = [
  { path: '',                    mainSlug: 'home',             changeFrequency: 'weekly',  priority: 1 },
  { path: '/services',                                         changeFrequency: 'monthly', priority: 0.9 },
  { path: '/emergency-plumbing',                               changeFrequency: 'monthly', priority: 0.9 },
  { path: '/contact',                                          changeFrequency: 'monthly', priority: 0.8 },
  { path: '/no-drip-club',       mainSlug: 'no-drip-club',     changeFrequency: 'monthly', priority: 0.8 },
  { path: '/customer-stories',   mainSlug: 'customer-stories', changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/why-j-blanton',      mainSlug: 'why-j-blanton',    changeFrequency: 'monthly', priority: 0.7 },
  { path: '/locations',          mainSlug: 'locations',        changeFrequency: 'monthly', priority: 0.7 },
  { path: '/knowledge-hub',      mainSlug: 'knowledge-hub',    changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/financing',          mainSlug: 'financing',        changeFrequency: 'monthly', priority: 0.6 },
  { path: '/help-and-support',   mainSlug: 'help-and-support', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/hoa-line-piping',                                  changeFrequency: 'monthly', priority: 0.6 },
  { path: '/j-blanton-is-hiring',                              changeFrequency: 'monthly', priority: 0.4 },
  { path: '/privacy-policy',                                   changeFrequency: 'yearly',  priority: 0.3 },
];

type LastModMap = Map<string, Date>;

/** One resilient query — a DB hiccup degrades to "no lastmod", never a 500. */
async function safeQuery<T extends { [k: string]: unknown }>(sql: string): Promise<T[]> {
  try {
    const res = await pool.query(sql);
    return res.rows as T[];
  } catch (err) {
    console.error('[sitemap] query failed, continuing without this source:', err);
    return [];
  }
}

function entry(
  path: string,
  lastModified: Date | undefined,
  changeFrequency: 'weekly' | 'monthly' | 'yearly',
  priority: number
): MetadataRoute.Sitemap[number] {
  return {
    url: path ? `${CANONICAL_BASE}${path}` : CANONICAL_BASE,
    ...(lastModified ? { lastModified } : {}),
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [mainRows, categoryRows, subServiceRows, cityRows, articleRows, epRows] =
    await Promise.all([
      safeQuery<{ slug: string; updated_at: Date | null }>(
        `SELECT slug, updated_at FROM main_pages`
      ),
      safeQuery<{ slug: string; updated_at: Date | null }>(
        `SELECT slug, updated_at FROM service_category_pages`
      ),
      safeQuery<{ slug: string; updated_at: Date | null }>(
        `SELECT slug, COALESCE(updated_at, created_at) AS updated_at
           FROM sub_service_pages WHERE status = 'published'`
      ),
      safeQuery<{ slug: string; updated_at: Date | null }>(
        `SELECT slug, updated_at FROM city_pages`
      ),
      safeQuery<{ slug: string; updated_at: Date | null }>(
        `SELECT slug, COALESCE(updated_at, created_at) AS updated_at
           FROM cms_articles WHERE status = 'published'`
      ),
      safeQuery<{ updated_at: Date | null }>(
        `SELECT updated_at FROM emergency_plumbing_page ORDER BY updated_at DESC NULLS LAST LIMIT 1`
      ),
    ]);

  const toMap = (rows: Array<{ slug: string; updated_at: Date | null }>): LastModMap => {
    const m: LastModMap = new Map();
    for (const r of rows) if (r.updated_at) m.set(r.slug, new Date(r.updated_at));
    return m;
  };

  const mainLastMod = toMap(mainRows);
  const categoryLastMod = toMap(categoryRows);
  const subServiceLastMod = toMap(subServiceRows);
  const cityLastMod = toMap(cityRows);
  const epLastMod = epRows[0]?.updated_at ? new Date(epRows[0].updated_at) : undefined;

  // ── Static top-level pages ────────────────────────────────────────────────
  const staticEntries = STATIC_PAGES.map((p) =>
    entry(
      p.path,
      p.path === '/emergency-plumbing'
        ? epLastMod
        : p.mainSlug
          ? mainLastMod.get(p.mainSlug)
          : undefined,
      p.changeFrequency,
      p.priority
    )
  );

  // ── Service category pages (/services/*) ─────────────────────────────────
  const categoryEntries = SERVICE_CATEGORY_SLUGS.map((slug) =>
    entry(`/services/${slug}`, categoryLastMod.get(slug), 'monthly', 0.8)
  );

  // ── Sub-service pages (top-level routes) ─────────────────────────────────
  // DB failure fallback: if the published-slug query returned nothing at all,
  // keep the static-fallback trio (they 200 no matter what) and skip the rest.
  const publishedSubServices = new Set(subServiceRows.map((r) => r.slug));
  const subServiceEntries = SUB_SERVICE_ROUTES.filter(
    (slug) => publishedSubServices.has(slug) || STATIC_FALLBACK_SUB_SERVICES.has(slug)
  ).map((slug) => entry(`/${slug}`, subServiceLastMod.get(slug), 'monthly', 0.7));

  // ── City pages (registry is the routing source of truth) ─────────────────
  const cityEntries = CITY_REGISTRY.map((c) =>
    entry(`/${c.slug}`, cityLastMod.get(c.slug), 'monthly', 0.6)
  );

  // ── Knowledge Hub articles ────────────────────────────────────────────────
  const articleEntries = articleRows.map((a) =>
    entry(
      `/knowledge-hub/${a.slug}`,
      a.updated_at ? new Date(a.updated_at) : undefined,
      'monthly',
      0.5
    )
  );

  return [
    ...staticEntries,
    ...categoryEntries,
    ...subServiceEntries,
    ...cityEntries,
    ...articleEntries,
  ];
}
