import { MetadataRoute } from 'next';
import pool from '@/lib/db';
import { SERVICE_CATEGORY_SLUGS } from '@/lib/services';
import { CITY_REGISTRY } from '@/lib/content/cities';
import { SUB_SERVICE_ROUTES } from '@/lib/content/service-taxonomy';
import { CANONICAL_BASE } from '@/lib/seo';
import { SITEMAP_STATIC_PAGES } from '@/lib/sitemap-pages';

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
 *
 * Brief 146 (Track B): `gas-lines` left this set — its static content file was
 * retired and `/gas-lines` now renders from `sub_service_pages` like the other
 * 19 sub-service routes, so it 404s if that row is ever unpublished and must be
 * listed on the same "published row exists" condition as they are.
 */
const STATIC_FALLBACK_SUB_SERVICES = new Set(['sewer-rodding', 'hydro-jetting']);

/**
 * Static top-level pages that always return 200. Slug 'home' in main_pages maps
 * to '/'.
 *
 * Brief 152 (Fix 3) moved the list to `src/lib/sitemap-pages.ts` so
 * `scripts/validate-sitemap.ts` can import it at build time without pulling in
 * `pg`. Add or remove entries THERE — and read the rules in that file's header
 * first, because the validator enforces them and will fail the build.
 */
const STATIC_PAGES = SITEMAP_STATIC_PAGES;

type LastModMap = Map<string, Date>;

/**
 * One resilient query — a DB hiccup degrades to "no lastmod", never a 500.
 *
 * Brief 147 (Track D): the swallow is deliberate, but it was also SILENT enough to
 * hide a hard defect for weeks. `SELECT slug … FROM city_pages` referenced a column
 * that does not exist (it is `city_slug`), so it threw on every single request and
 * all 248 city URLs shipped with no `<lastmod>` at all — visible only as one
 * unlabelled `console.error` line among thousands. Failures now announce
 * themselves: a named source, the failing SQL, the Postgres error code, and a
 * greppable `SITEMAP SOURCE FAILED` banner, plus a one-line summary below so a
 * partial sitemap can be spotted without reading the whole log.
 *
 * `scripts/verify-sitemap-queries.ts` (wired into deploy.yml) runs the same
 * queries before the build and FAILS the deploy on a column/table/syntax error, so
 * the next typo of this class cannot reach staging at all.
 */
async function safeQuery<T extends { [k: string]: unknown }>(
  source: string,
  sql: string,
  // Collected per render (never module state — sitemap renders can overlap).
  failed: string[]
): Promise<T[]> {
  try {
    const res = await pool.query(sql);
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
    failed.push(source);
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

/**
 * The six `<lastmod>` sources, as `[name, sql]`. Exported so
 * `scripts/verify-sitemap-queries.ts` can run the EXACT same SQL against the
 * database on deploy and fail the pipeline on a wrong column/table name — the
 * defect class that shipped 248 city URLs with no lastmod for weeks (Brief 147,
 * Track D). Keep every sitemap query in here; a query written inline below would
 * escape that check.
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
} as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const failed: string[] = [];
  const [mainRows, categoryRows, subServiceRows, cityRows, articleRows, epRows] =
    await Promise.all([
      safeQuery<{ slug: string; updated_at: Date | null }>('main_pages', SITEMAP_LASTMOD_SOURCES.main, failed),
      safeQuery<{ slug: string; updated_at: Date | null }>('service_category_pages', SITEMAP_LASTMOD_SOURCES.category, failed),
      safeQuery<{ slug: string; updated_at: Date | null }>('sub_service_pages', SITEMAP_LASTMOD_SOURCES.subService, failed),
      safeQuery<{ slug: string; updated_at: Date | null }>('city_pages', SITEMAP_LASTMOD_SOURCES.city, failed),
      safeQuery<{ slug: string; updated_at: Date | null }>('cms_articles', SITEMAP_LASTMOD_SOURCES.article, failed),
      safeQuery<{ updated_at: Date | null }>('emergency_plumbing_page', SITEMAP_LASTMOD_SOURCES.emergencyPlumbing, failed),
    ]);
  if (failed.length > 0) {
    console.error(
      `[sitemap] ${failed.length} of ${Object.keys(SITEMAP_LASTMOD_SOURCES).length} lastmod sources FAILED: ${failed.join(', ')}`
    );
  }

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
