/**
 * The sitemap MANIFEST — which child sitemaps exist, and exactly which URL
 * paths each one may emit (Brief 153, Track B).
 *
 * ─── Why this file is database-free ────────────────────────────────────────
 * `scripts/validate-sitemap.ts` runs as `prebuild` with no database and no
 * network, and it has to be able to walk the whole index and check every URL
 * pattern a child can emit. So the *shape* of the sitemap lives here, derived
 * only from registries (`CITY_REGISTRY`, the service taxonomy, the category
 * list), and the *freshness data* (`<lastmod>`, published status) is added by
 * `src/lib/sitemap/render.ts`, which may touch Postgres. One source, two
 * consumers: the routes and the validator can never disagree about what the
 * sitemap contains.
 *
 * ─── Why an index instead of one flat file ─────────────────────────────────
 * Before this brief the sitemap was a single `force-dynamic` file listing 1,104
 * URLs, and it omitted the entire `/{city}/{service}` layer — 11,160 live,
 * self-canonical pages that Google could only reach by crawling internal links.
 * Adding them to the flat file would have meant every bot fetch of
 * /sitemap.xml re-reading the full set from Postgres. A `<sitemapindex>` with
 * cached children fixes both: the whole universe is advertised, and no single
 * request has to build all of it.
 *
 * ─── The children ──────────────────────────────────────────────────────────
 *   /sitemap.xml                    the <sitemapindex> — the only URL robots.txt
 *                                   advertises, and the only one to submit to GSC
 *   /sitemap-pages.xml              static pages + /services/* + top-level sub-services
 *   /sitemap-cities.xml             the /{city} landing pages
 *   /sitemap-articles.xml           /knowledge-hub/{slug}
 *   /sitemap-city-services-N.xml    /{city}/{service}, sharded by city-slug RANGE
 *
 * ─── Adding a shard ────────────────────────────────────────────────────────
 * Shards are keyed by a half-open city-slug range, NOT by an index into the
 * registry, so adding a city never moves an existing city into a different
 * child. Each shard needs a matching route directory
 * (`src/app/sitemap-city-services-{id}.xml/route.ts`) — three lines delegating
 * to `renderCityServiceShard`. The build-time validator fails if a declared
 * shard has no route, if a route has no declared shard, if the ranges leave a
 * gap or overlap, or if a shard grows past `SHARD_URL_CEILING`.
 */
import { CITY_REGISTRY } from '@/lib/content/cities';
import { getAllServiceSlugs } from '@/lib/content/city-services';
import { SERVICE_CATEGORY_SLUGS } from '@/lib/services';
import { SUB_SERVICE_ROUTES } from '@/lib/content/service-taxonomy';
import { SITEMAP_STATIC_PAGES } from '@/lib/sitemap-pages';
import { isCityServiceIndexable } from '@/lib/city-service-indexation';

/**
 * The sitemaps protocol caps a single file at 50,000 URLs / 50 MB uncompressed.
 * This ceiling is deliberately an order of magnitude below that: it is a
 * "split this shard" tripwire, not a protocol limit. The largest shard today is
 * ~2,835 URLs (~400 KB).
 */
export const SHARD_URL_CEILING = 10_000;

export interface CityServiceShard {
  /** 1-based id; also the filename suffix and the route directory name. */
  id: number;
  /** Inclusive lower bound on the city slug. '' means "no lower bound". */
  from: string;
  /** EXCLUSIVE upper bound on the city slug. '' means "no upper bound". */
  to: string;
}

/**
 * Half-open `[from, to)` city-slug ranges, contiguous and total: shard 1 has no
 * lower bound and the last shard has no upper bound, so EVERY possible slug
 * (including one starting with a digit, or with 'z') lands in exactly one
 * shard. Boundaries were chosen to even out today's 248 cities — 63 / 49 / 34 /
 * 42 / 60 — and are deliberately letter-based rather than count-based so the
 * membership of a shard does not shift when a city is added.
 */
export const CITY_SERVICE_SHARDS: readonly CityServiceShard[] = [
  { id: 1, from: '', to: 'd' }, // digits, a, b, c
  { id: 2, from: 'd', to: 'i' },
  { id: 3, from: 'i', to: 'm' },
  { id: 4, from: 'm', to: 'q' },
  { id: 5, from: 'q', to: '' }, // q … z
];

/**
 * Every city slug whose `/{city}/{service}` layer is eligible for the sitemap.
 *
 * Columbus Integration Brief 02 (Track C): the Ohio city-service pages ship
 * `noindex, follow` until their per-area rewrite lands, and a `noindex` URL must
 * not be in the sitemap — the build validator fails on exactly that, correctly.
 * `isCityServiceIndexable` is the SAME function the route's `robots` metadata
 * calls, so a city cannot be noindex-and-listed or indexed-and-missing; one list
 * (`CITY_SERVICE_INDEXED_OHIO_CITIES`) moves both.
 *
 * Every Illinois city is eligible, so the shard contents are unchanged by this
 * brief.
 */
export function cityServiceEligibleSlugs(): string[] {
  return CITY_REGISTRY.map((c) => c.slug).filter(isCityServiceIndexable);
}

/**
 * The city slugs belonging to one shard, in slug order.
 *
 * Scoped to the eligible set above, NOT the whole registry: a shard's job is to
 * list the URLs the sitemap advertises, and a city held back by the indexation
 * policy has none. The shard RANGES still cover every possible slug, so an area
 * being cleared for indexing later needs no shard change — it simply starts
 * appearing in the shard its slug already falls in.
 */
export function citySlugsForShard(shard: CityServiceShard): string[] {
  return cityServiceEligibleSlugs()
    .filter((slug) => (shard.from === '' || slug >= shard.from) && (shard.to === '' || slug < shard.to))
    .sort();
}

/**
 * Every `/{city}/{service}` path in one shard.
 *
 * The universe is the exact set `src/app/[city]/[service]/page.tsx` serves: it
 * renders whenever `getCity(city)` AND `getCityService(service)` both resolve,
 * and 404s otherwise. Deriving from the same two registries — rather than from
 * the old WordPress inventory, which contains combos the new site never had —
 * is what makes "listed in the sitemap" and "returns 200" the same statement.
 */
export function cityServicePathsForShard(shard: CityServiceShard): string[] {
  const services = getAllServiceSlugs().slice().sort();
  const out: string[] = [];
  for (const city of citySlugsForShard(shard)) {
    for (const service of services) out.push(`/${city}/${service}`);
  }
  return out;
}

/** Non-article, non-city URLs: static pages, category hubs, sub-service hubs. */
export function pagesSitemapPaths(): string[] {
  return [
    ...SITEMAP_STATIC_PAGES.map((p) => p.path || '/'),
    ...SERVICE_CATEGORY_SLUGS.map((s) => `/services/${s}`),
    ...SUB_SERVICE_ROUTES.map((s) => `/${s}`),
  ];
}

/** The `/{city}` landing pages. */
export function citySitemapPaths(): string[] {
  return CITY_REGISTRY.map((c) => `/${c.slug}`);
}

export type SitemapChildKind = 'pages' | 'cities' | 'articles' | 'city-services';

export interface SitemapChild {
  /** Path of the child sitemap itself, e.g. `/sitemap-cities.xml`. */
  path: string;
  kind: SitemapChildKind;
  /** Present only on `city-services` children. */
  shard?: CityServiceShard;
  /**
   * Every URL path this child may emit, or `null` when the set is
   * database-driven and therefore unknowable at build time (articles). The
   * validator checks patterns where it can and defers the rest to the live
   * validator, which is the only thing that can see published rows.
   */
  paths: () => string[] | null;
}

/** The full child list, in the order the index advertises them. */
export const SITEMAP_CHILDREN: readonly SitemapChild[] = [
  { path: '/sitemap-pages.xml', kind: 'pages', paths: pagesSitemapPaths },
  { path: '/sitemap-cities.xml', kind: 'cities', paths: citySitemapPaths },
  { path: '/sitemap-articles.xml', kind: 'articles', paths: () => null },
  ...CITY_SERVICE_SHARDS.map(
    (shard): SitemapChild => ({
      path: `/sitemap-city-services-${shard.id}.xml`,
      kind: 'city-services',
      shard,
      paths: () => cityServicePathsForShard(shard),
    })
  ),
];
