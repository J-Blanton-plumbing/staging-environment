/**
 * Brief 152 (Fix 3) — BUILD-TIME sitemap + redirect validator. Wired into
 * `npm run build` as the `prebuild` script, so a violation FAILS THE BUILD.
 *
 * ─── Why this exists ───────────────────────────────────────────────────────
 * `/hoa-line-piping` sat in sitemap.xml advertising a hard 404 to Google for
 * weeks. Brief 125 renamed the HOA cluster to `/hoa-pipe-lining` and nothing
 * connected that rename to the hand-maintained list in the sitemap. Two of the
 * three Google Search Console alert emails that triggered Brief 152 were
 * sitemap-scoped. A slug change must not be able to leave a stale sitemap entry
 * behind again — so this runs before every build, with no database and no
 * network, and refuses to let one through.
 *
 * ─── What it checks ────────────────────────────────────────────────────────
 *  1. FORM      — every sitemap path is canonical: lowercase, leading slash, no
 *                 trailing slash, no doubled slashes, no query/fragment.
 *  2. SERVED    — every sitemap path resolves to a real route: a `page.tsx`
 *                 under src/app (walking dynamic `[segment]` directories) or a
 *                 file in public/ reachable through a `beforeFiles` rewrite.
 *  3. NOT A REDIRECT — no sitemap path is a source in next.config.mjs
 *                 `redirects()`, in the generated legacy map, or in the
 *                 hand-maintained alias map. A sitemap must list destinations,
 *                 never redirect sources.
 *  4. NOT NOINDEX — no sitemap path resolves to a route whose metadata declares
 *                 `index: false` (e.g. /thank-you).
 *  5. NO CHAINS  — no redirect target is itself a redirect source, and no target
 *                 carries a trailing slash (which would bounce back through the
 *                 middleware normalizer and make a two-hop chain).
 *  6. ALIAS SANITY — no alias entry contradicts the generated legacy map, and no
 *                 alias key is a path the build actually serves (that would
 *                 redirect a working page away).
 *  7. CONFIG     — `skipTrailingSlashRedirect` is still true (Fix 1 is dead code
 *                 without it) and the `X-Robots-Tag` rules are still present
 *                 (Fix 4).
 *
 * What it CANNOT check: that a CMS-driven URL is published, or that a live page's
 * rendered canonical matches. Both need a running app and a database — that is
 * `scripts/validate-sitemap-live.mjs`, wired into the post-deploy health check.
 *
 * ─── Escape hatch ──────────────────────────────────────────────────────────
 * `SKIP_SITEMAP_VALIDATION=1` bypasses the whole script with a loud banner. It
 * exists only so a false positive here can never wedge an emergency deploy of the
 * LIVE site — an outage is a worse failure than a stale sitemap entry. If you
 * reach for it, fix the validator in the same day.
 *
 * Run directly:
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/validate-sitemap.ts
 */
import { execFileSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

import { SERVICE_CATEGORY_SLUGS } from '@/lib/services';
import { CITY_REGISTRY } from '@/lib/content/cities';
import { getAllServiceSlugs } from '@/lib/content/city-services';
import { LEGACY_CATEGORY_TARGETS, SUB_SERVICE_ROUTES } from '@/lib/content/service-taxonomy';
import { SITEMAP_STATIC_PAGES } from '@/lib/sitemap-pages';
import { allRedirectPairs, allRedirectSources } from '@/lib/redirects/lookup';
import { ALIAS_REDIRECTS, MANUAL_ALIAS_REDIRECTS } from '@/lib/redirects/alias-redirects';
import {
  allCityScopedRedirectPairs,
  lookupCityScopedRedirect,
} from '@/lib/redirects/city-scoped';
import {
  CITY_SERVICE_SHARDS,
  SHARD_URL_CEILING,
  SITEMAP_CHILDREN,
  cityServiceEligibleSlugs,
  citySlugsForShard,
} from '@/lib/sitemap/manifest';
import { isCityServiceIndexable } from '@/lib/city-service-indexation';
import { NON_PUBLIC_SUBDOMAINS } from '@/lib/non-public-hosts';
import legacyRedirectMap from '@/lib/redirects/legacy-redirect-map.json';

const REPO = path.resolve(__dirname, '..');
const APP_DIR = path.join(REPO, 'src', 'app');
const PUBLIC_DIR = path.join(REPO, 'public');

const errors: string[] = [];
const notes: string[] = [];
function fail(msg: string) {
  errors.push(msg);
}

// ── next.config.mjs, as the config itself resolves it ────────────────────────
interface NextRedirect {
  source: string;
  destination: string;
  statusCode?: number;
  permanent?: boolean;
}
interface NextConfigDump {
  redirects: NextRedirect[];
  rewrites: { beforeFiles?: Array<{ source: string; destination: string }> };
  skipTrailingSlashRedirect: boolean;
  headers: Array<{
    source: string;
    has?: Array<{ type: string; value: string }>;
    headers: Array<{ key: string; value: string }>;
  }>;
}

function loadNextConfig(): NextConfigDump {
  const dumper = path.join(REPO, 'scripts', 'lib', 'dump-next-config.mjs');
  const raw = execFileSync(process.execPath, [dumper], { encoding: 'utf8', cwd: REPO });
  return JSON.parse(raw) as NextConfigDump;
}

// ── Route resolution against src/app ────────────────────────────────────────
const PAGE_FILES = ['page.tsx', 'page.ts', 'page.jsx', 'page.js'];

function pageFileIn(dir: string): string | null {
  for (const f of PAGE_FILES) {
    const p = path.join(dir, f);
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Memoized — Brief 153 pushed the checked URL count from 293 to ~11,500, and an
 * un-cached readdir+stat per path segment turned a sub-second `prebuild` into a
 * minute of syscalls.
 */
const DIR_CACHE = new Map<string, string[]>();
function dirsIn(dir: string): string[] {
  const hit = DIR_CACHE.get(dir);
  if (hit) return hit;
  let out: string[] = [];
  try {
    out = readdirSync(dir).filter((n) => statSync(path.join(dir, n)).isDirectory());
  } catch {
    out = [];
  }
  DIR_CACHE.set(dir, out);
  return out;
}

interface RouteMatch {
  /** Absolute path of the page file that would render this URL. */
  file: string;
  /** Repo-relative route id, e.g. `[city]/page.tsx` — the dynamic-segment shape. */
  id: string;
  /** True when the match required at least one `[dynamic]` directory. */
  dynamic: boolean;
}

/**
 * Resolve a URL path to the `page.tsx` that renders it, preferring a literal
 * segment over a dynamic one (which is exactly how Next resolves).
 *
 * A dynamic match is NOT proof the URL serves. `src/app/[city]/page.tsx` sets
 * `dynamicParams = false`, so it renders ONLY registry slugs and 404s everything
 * else — a naive "a route matched" check would have declared a deleted page
 * healthy simply because `/anything` matches `[city]`. Callers must therefore
 * check `dynamic` and validate the slug against whatever list feeds that segment.
 */
function resolveAppRoute(urlPath: string): RouteMatch | null {
  const segments = urlPath.split('/').filter(Boolean);
  const parts: string[] = [];
  let dir = APP_DIR;
  let dynamic = false;
  for (const seg of segments) {
    const children = dirsIn(dir);
    if (children.includes(seg)) {
      dir = path.join(dir, seg);
      parts.push(seg);
      continue;
    }
    const catchAll = children.find((c) => /^\[\.\.\..+\]$/.test(c));
    if (catchAll) {
      const file = pageFileIn(path.join(dir, catchAll));
      return file ? { file, id: [...parts, catchAll, path.basename(file)].join('/'), dynamic: true } : null;
    }
    const dyn = children.find((c) => /^\[[^.].*\]$/.test(c));
    if (dyn) {
      dir = path.join(dir, dyn);
      parts.push(dyn);
      dynamic = true;
      continue;
    }
    return null;
  }
  const file = pageFileIn(dir);
  return file ? { file, id: [...parts, path.basename(file)].join('/'), dynamic } : null;
}

/**
 * Dynamic routes whose param list this validator can vouch for. The value is a
 * predicate over the URL path. Anything not listed here cannot be proven
 * statically and is reported rather than waved through.
 */
const CITY_SLUGS = new Set(CITY_REGISTRY.map((c) => c.slug));
const CITY_SERVICE_SLUGS = new Set(getAllServiceSlugs());
const PROVABLE_DYNAMIC_ROUTES: Record<string, (urlPath: string) => boolean> = {
  // `dynamicParams = false` — only registered slugs render.
  '[city]/page.tsx': (p) => CITY_SLUGS.has(p.replace(/^\//, '')),
  // Brief 153: `[city]/[service]` is `dynamicParams = true`, but its body calls
  // `notFound()` unless BOTH lookups resolve — so registry membership is the
  // proof, exactly as it is for `[city]`.
  '[city]/[service]/page.tsx': (p) => {
    const [city, service] = p.split('/').filter(Boolean);
    return CITY_SLUGS.has(city) && CITY_SERVICE_SLUGS.has(service);
  },
  /*
   * Columbus Integration Brief 02 (Track C): `[city]/[service]` also carries a
   * CONDITIONAL noindex, which `declaresNoindex()` cannot see — it greps the
   * route file for a literal `index: false`, and the route delegates to
   * `cityServiceRobots()` instead (a literal there would fail all 11,160 Illinois
   * city-service URLs at once). The equivalent check for that route is the
   * eligible-vs-held shard split further down, plus the per-path indexability
   * assertion inside the sitemap-path loop.
   */
  // Article slugs live in the CMS; the live validator (scripts/validate-seo-routing.mjs)
  // is the only thing that can confirm a given one is published.
  'knowledge-hub/[slug]/page.tsx': () => true,
};

/** Resolve a path to a public/ file via a `beforeFiles` rewrite, if any. */
function resolveRewrittenStatic(urlPath: string, cfg: NextConfigDump): string | null {
  for (const r of cfg.rewrites.beforeFiles ?? []) {
    if (r.source !== urlPath) continue;
    const file = path.join(PUBLIC_DIR, r.destination.replace(/^\//, ''));
    return existsSync(file) ? file : null;
  }
  return null;
}

/**
 * Does the resolved route file declare itself noindex?
 *
 * Comments are stripped FIRST. This is a source-text grep, not a parse, and
 * without the strip it matched the phrase `index: false` written inside a block
 * comment in `[city]/[service]/page.tsx` — which failed all 11,160 Illinois
 * city-service sitemap URLs at once because a comment happened to name the
 * pattern it was documenting. A route is noindex because of what it EXECUTES;
 * prose about noindex is not a declaration.
 */
function declaresNoindex(file: string): boolean {
  const src = readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '') // block comments, incl. JSDoc
    .replace(/^[ \t]*\/\/.*$/gm, ''); // whole-line // comments
  return /index\s*:\s*false/.test(src);
}

const main = () => {
  if (process.env.SKIP_SITEMAP_VALIDATION === '1') {
    console.warn(
      `\n${'!'.repeat(72)}\n` +
        '[validate-sitemap] SKIPPED via SKIP_SITEMAP_VALIDATION=1.\n' +
        'The sitemap and redirect map are NOT validated for this build. This flag\n' +
        'exists only to unblock an emergency deploy — fix the validator today.\n' +
        `${'!'.repeat(72)}\n`
    );
    return;
  }

  const cfg = loadNextConfig();

  // ── 7. Config invariants ──────────────────────────────────────────────────
  if (!cfg.skipTrailingSlashRedirect) {
    fail(
      'next.config.mjs: `skipTrailingSlashRedirect` is not true. Brief 152 Fix 1 moved ' +
        'trailing-slash handling into src/middleware.ts; without this flag Next 308s first ' +
        'and every slashed alias becomes a two-hop chain again, with the middleware branch ' +
        'dead code.'
    );
  }
  const robotsRules = cfg.headers.filter((h) =>
    h.headers.some((x) => x.key.toLowerCase() === 'x-robots-tag' && /noindex/i.test(x.value))
  );
  for (const prefix of ['/admin', '/api']) {
    if (!robotsRules.some((h) => h.source === prefix || h.source === `${prefix}/:path*`)) {
      fail(
        `next.config.mjs headers(): no \`X-Robots-Tag: noindex\` rule covers ${prefix}. ` +
          'Brief 152 Fix 4 replaced the robots.txt Disallow with this header — dropping it ' +
          'leaves those URLs indexable with nothing to remove them.'
      );
    }
  }

  // ── Brief 153 (Track E): the clone-host noindex rules ────────────────────
  const hostNoindexValues = new Set(
    cfg.headers
      .filter((h) =>
        h.headers.some((x) => x.key.toLowerCase() === 'x-robots-tag' && /noindex/i.test(x.value))
      )
      .flatMap((h) => (h.has ?? []).filter((c) => c.type === 'host').map((c) => c.value))
  );
  for (const sub of NON_PUBLIC_SUBDOMAINS) {
    const host = `${sub}.jblantonplumbing.com`;
    if (!hostNoindexValues.has(host)) {
      fail(
        `next.config.mjs headers(): no host-scoped \`X-Robots-Tag: noindex\` rule for "${host}", ` +
          'but src/lib/non-public-hosts.ts lists it in NON_PUBLIC_SUBDOMAINS. The two must agree ' +
          '(Brief 153 Track E): robots.txt Disallow stops new discovery, the header removes what ' +
          'is already indexed, and neither works alone.'
      );
    }
  }
  for (const host of hostNoindexValues) {
    const sub = host.replace(/\.jblantonplumbing\.com$/, '');
    if (!NON_PUBLIC_SUBDOMAINS.includes(sub)) {
      fail(
        `next.config.mjs headers(): host-scoped noindex rule for "${host}" has no matching entry ` +
          'in NON_PUBLIC_SUBDOMAINS (src/lib/non-public-hosts.ts), so that host is served ' +
          '`Allow: /` in robots.txt while being told noindex. Add it there or drop the rule.'
      );
    }
  }

  // ── Brief 153 (Track C): the legacy category map vs next.config ──────────
  // `/{city}/{category}` 301s are derived from LEGACY_CATEGORY_TARGETS; the bare
  // `/{category}` 301s live in next.config. They must send the same slug to the
  // same page or the city-scoped and top-level forms disagree.
  const configRedirectBySource = new Map(cfg.redirects.map((r) => [r.source, r.destination]));
  for (const [slug, target] of Object.entries(LEGACY_CATEGORY_TARGETS)) {
    const topLevel = configRedirectBySource.get(`/${slug}`);
    if (!topLevel) {
      fail(
        `LEGACY_CATEGORY_TARGETS lists "${slug}" but next.config.mjs has no \`/${slug}\` redirect. ` +
          `The city-scoped form /{city}/${slug} 301s to ${target} while the bare /${slug} 404s.`
      );
    } else if (topLevel !== target) {
      fail(
        `LEGACY_CATEGORY_TARGETS sends "${slug}" to ${target}, but next.config.mjs sends ` +
          `/${slug} to ${topLevel}. Same slug, two destinations.`
      );
    }
  }

  // ── Brief 153 (Track D): the -2/-3 strip rule must not shadow a real slug ──
  const digitSuffixed = [
    ...[...CITY_SLUGS].map((s) => ({ kind: 'city slug', slug: s })),
    ...[...CITY_SERVICE_SLUGS].map((s) => ({ kind: 'city-service slug', slug: s })),
    ...SUB_SERVICE_ROUTES.map((s) => ({ kind: 'sub-service route', slug: s })),
  ].filter((x) => /-(?:2|3)$/.test(x.slug));
  for (const x of digitSuffixed) {
    fail(
      `${x.kind} "${x.slug}" ends in -2/-3, which the WordPress duplicate-slug rule in ` +
        'src/lib/redirects/city-scoped.ts strips. That rule would redirect a real page away. ' +
        'Rename the slug or narrow WP_DUPLICATE_SUFFIX.'
    );
  }

  // ── Redirect sources, from all the places they can live ──────────────────
  const configSources = new Set(cfg.redirects.map((r) => r.source));
  const mapSources = new Set(allRedirectSources());
  const isRedirectSource = (p: string) =>
    configSources.has(p) ||
    mapSources.has(p) ||
    configSources.has(`${p}/`) ||
    // Brief 153: the city-scoped rule is a shape, not a Map entry, so it has to
    // be asked directly. Without this the validator could not prove that none of
    // the 11,160 /{city}/{service} URLs the sitemap now lists is also redirected.
    lookupCityScopedRedirect(p) !== null;

  // ── Brief 153 (Track B): the sitemap index and its children ──────────────
  // Every child must itself be served by a route — an index advertising a child
  // that 404s is the /hoa-line-piping defect one level up.
  for (const child of SITEMAP_CHILDREN) {
    const routeFile = path.join(APP_DIR, child.path.replace(/^\//, ''), 'route.ts');
    if (!existsSync(routeFile)) {
      fail(
        `SITEMAP INDEX: child "${child.path}" has no route — expected ` +
          `src/app${child.path}/route.ts. The index would advertise a 404.`
      );
    }
  }

  // Shard ranges must be contiguous and total, so every city slug — including
  // one starting with a digit or a 'z' — lands in exactly one child.
  const shards = [...CITY_SERVICE_SHARDS].sort((a, b) => a.id - b.id);
  if (shards.length === 0 || shards[0].from !== '' || shards[shards.length - 1].to !== '') {
    fail(
      'CITY_SERVICE_SHARDS must start with an unbounded `from` and end with an unbounded `to`, ' +
        'or some city slugs fall outside every shard and vanish from the sitemap.'
    );
  }
  for (let i = 1; i < shards.length; i++) {
    if (shards[i].from !== shards[i - 1].to) {
      fail(
        `CITY_SERVICE_SHARDS: shard ${shards[i - 1].id} ends at "${shards[i - 1].to}" but shard ` +
          `${shards[i].id} starts at "${shards[i].from}" — the ranges leave a gap or overlap.`
      );
    }
  }
  const shardRouteDirs = dirsIn(APP_DIR).filter((d) => /^sitemap-city-services-\d+\.xml$/.test(d));
  const declaredShardDirs = new Set(shards.map((s) => `sitemap-city-services-${s.id}.xml`));
  for (const d of declaredShardDirs) {
    if (!shardRouteDirs.includes(d)) {
      fail(`CITY_SERVICE_SHARDS declares "${d}" but src/app/${d}/ does not exist. Add the route.`);
    }
  }
  for (const d of shardRouteDirs) {
    if (!declaredShardDirs.has(d)) {
      fail(
        `src/app/${d}/ exists but no shard in CITY_SERVICE_SHARDS claims it — the route would ` +
          'throw at module scope and the index never advertises it. Remove it or declare the shard.'
      );
    }
  }
  const seenCityInShard = new Map<string, number>();
  for (const shard of shards) {
    const cities = citySlugsForShard(shard);
    const urls = cities.length * CITY_SERVICE_SLUGS.size;
    if (urls > SHARD_URL_CEILING) {
      fail(
        `Shard ${shard.id} ("${shard.from || '*'}"–"${shard.to || '*'}") would emit ${urls} URLs, ` +
          `over the ${SHARD_URL_CEILING} ceiling. Split its range and add a shard.`
      );
    }
    for (const c of cities) {
      const prev = seenCityInShard.get(c);
      if (prev !== undefined) fail(`City "${c}" falls in both shard ${prev} and shard ${shard.id}.`);
      seenCityInShard.set(c, shard.id);
    }
  }
  /*
   * Columbus Integration Brief 02 (Track C) — shard coverage is asserted over the
   * ELIGIBLE cities, not the whole registry.
   *
   * A city held `noindex` by the city-service indexation policy has no
   * `/{city}/{service}` URLs in the sitemap, by design; demanding shard
   * membership for it would fail the build on the policy working. The two loops
   * below assert the set split exactly:
   *   • every eligible city IS in a shard (nothing indexable goes missing), and
   *   • every held city is in NO shard (nothing noindex gets advertised).
   * The second is guaranteed by `citySlugsForShard` filtering, which is precisely
   * why it is worth proving rather than trusting — it is the invariant that keeps
   * ~6,200 noindex Ohio URLs out of the sitemap.
   */
  const eligibleCities = new Set(cityServiceEligibleSlugs());
  for (const c of eligibleCities) {
    if (!seenCityInShard.has(c)) {
      fail(`City "${c}" falls in NO city-service shard — its ${CITY_SERVICE_SLUGS.size} service URLs would be missing.`);
    }
  }
  for (const c of CITY_SLUGS) {
    if (eligibleCities.has(c)) continue;
    if (seenCityInShard.has(c)) {
      fail(
        `City "${c}" is held \`noindex, follow\` by the city-service indexation policy ` +
          `(src/lib/city-service-indexation.ts) but shard ${seenCityInShard.get(c)} lists its ` +
          `${CITY_SERVICE_SLUGS.size} service URLs. A noindex URL must not be in the sitemap.`
      );
    }
  }

  // ── Every path the sitemap can emit, with its provenance ─────────────────
  const sitemapPaths: Array<{ path: string; from: string }> = [
    ...SITEMAP_STATIC_PAGES.map((p) => ({ path: p.path || '/', from: 'SITEMAP_STATIC_PAGES' })),
    ...SERVICE_CATEGORY_SLUGS.map((s) => ({ path: `/services/${s}`, from: 'SERVICE_CATEGORY_SLUGS' })),
    ...SUB_SERVICE_ROUTES.map((s) => ({ path: `/${s}`, from: 'SUB_SERVICE_ROUTES' })),
    ...CITY_REGISTRY.map((c) => ({ path: `/${c.slug}`, from: 'CITY_REGISTRY' })),
    // Brief 153: the /{city}/{service} layer — 11,160 URLs, the whole point of
    // this brief. Enumerated from the manifest, i.e. the same function the routes
    // call, so "listed" and "checked" cannot drift.
    ...shards.flatMap((shard) =>
      SITEMAP_CHILDREN.find((c) => c.shard?.id === shard.id)!
        .paths()!
        .map((p) => ({ path: p, from: `sitemap-city-services-${shard.id}.xml` }))
    ),
    // Articles are DB-driven; only the route shape can be checked statically.
    { path: '/knowledge-hub/__article__', from: 'cms_articles (route shape only)' },
  ];

  const seen = new Map<string, string>();
  for (const { path: p, from } of sitemapPaths) {
    // ── 1. Form ────────────────────────────────────────────────────────────
    if (!p.startsWith('/')) fail(`${from}: "${p}" does not start with "/".`);
    if (p !== '/' && p.endsWith('/')) fail(`${from}: "${p}" has a trailing slash — sitemap URLs are slash-free.`);
    if (p.includes('//')) fail(`${from}: "${p}" contains a doubled slash.`);
    if (/[?#]/.test(p)) fail(`${from}: "${p}" contains a query or fragment.`);
    if (p !== p.toLowerCase()) fail(`${from}: "${p}" is not lowercase — canonicals are lowercase.`);

    const dup = seen.get(p);
    if (dup) fail(`Duplicate sitemap URL "${p}" — emitted by both ${dup} and ${from}.`);
    seen.set(p, from);

    // ── 3. Not a redirect source ───────────────────────────────────────────
    if (isRedirectSource(p)) {
      fail(
        `${from}: "${p}" is a REDIRECT SOURCE. The sitemap must list the destination, ` +
          'not the source. Remove it, or remove the redirect.'
      );
    }

    // ── 2. Served + 4. not noindex ─────────────────────────────────────────
    if (p.includes('__article__')) {
      if (!resolveAppRoute('/knowledge-hub/some-slug')) {
        fail('cms_articles: no route under src/app serves /knowledge-hub/{slug}.');
      }
      continue;
    }

    // `beforeFiles` rewrites are consulted FIRST because that is the order Next
    // resolves them in — and because a single-segment path like /hoa-pipe-lining
    // would otherwise be swallowed by the `[city]` dynamic route.
    const staticFile = resolveRewrittenStatic(p, cfg);
    if (staticFile) continue;

    const route = resolveAppRoute(p);
    if (!route) {
      fail(
        `${from}: nothing serves "${p}" — no page.tsx under src/app matches it and no ` +
          '`beforeFiles` rewrite in next.config.mjs points it at a file in public/. ' +
          'This is the /hoa-line-piping defect: a sitemap entry whose page no longer exists.'
      );
      continue;
    }
    if (route.dynamic) {
      const provable = PROVABLE_DYNAMIC_ROUTES[route.id];
      if (!provable) {
        fail(
          `${from}: "${p}" only matches the DYNAMIC route ${route.id}, whose parameter list ` +
            'this validator cannot vouch for. Either the page was deleted (a literal route ' +
            'directory used to serve it) or this dynamic route needs an entry in ' +
            'PROVABLE_DYNAMIC_ROUTES. A dynamic match is not proof a URL serves.'
        );
        continue;
      }
      if (!provable(p)) {
        fail(
          `${from}: "${p}" matches ${route.id}, but its slug is not in that route's parameter ` +
            'list, so the page renders a 404. (src/app/[city] sets `dynamicParams = false`.)'
        );
        continue;
      }
    }
    if (route.file.endsWith('.tsx') && declaresNoindex(route.file)) {
      fail(
        `${from}: "${p}" resolves to ${path.relative(REPO, route.file)}, which declares ` +
          '`index: false`. A noindex page must not be in the sitemap.'
      );
    }
    /*
     * Columbus Integration Brief 02 (Track C) — the conditional-noindex check
     * `declaresNoindex()` structurally cannot do. It reads the route file's
     * source, and `[city]/[service]` decides per city at runtime. So ask the same
     * module the route asks, per URL.
     */
    if (route.id === '[city]/[service]/page.tsx') {
      const city = p.split('/').filter(Boolean)[0];
      if (!isCityServiceIndexable(city)) {
        fail(
          `${from}: "${p}" is listed in the sitemap but its city is held ` +
            '`noindex, follow` by src/lib/city-service-indexation.ts. Clear the city for ' +
            'indexing (CITY_SERVICE_INDEXED_OHIO_CITIES) or remove it from the shard.'
        );
      }
    }
  }

  // ── 5. No redirect chains ────────────────────────────────────────────────
  let chains = 0;
  for (const { from, to } of allRedirectPairs()) {
    if (/^https?:\/\//.test(to)) continue; // absolute targets are out of our routing
    if (to !== '/' && to.endsWith('/')) {
      fail(
        `Redirect ${from} → ${to} targets a TRAILING-SLASH URL. The middleware normalizer ` +
          'would strip it and redirect again — a two-hop chain. Strip the slash.'
      );
    }
    if (isRedirectSource(to) || mapSources.has(to)) {
      chains++;
      fail(`Redirect CHAIN: ${from} → ${to}, but ${to} is itself a redirect source.`);
    }
  }
  for (const r of cfg.redirects) {
    if (r.source.startsWith('/admin')) continue; // internal CMS convenience rule
    if (r.destination.includes(':')) continue; // parameterised — target shape, not a path
    if (isRedirectSource(r.destination)) {
      chains++;
      fail(`Redirect CHAIN in next.config.mjs: ${r.source} → ${r.destination}, which also redirects.`);
    }
    if (r.statusCode !== 301 && r.permanent !== true) {
      fail(
        `next.config.mjs redirect ${r.source} → ${r.destination} is not permanent ` +
          '(needs statusCode: 301 or permanent: true). A 302/307 does not consolidate indexing.'
      );
    }
  }

  // ── 6. Alias sanity ──────────────────────────────────────────────────────
  const generated = new Map(
    (legacyRedirectMap as Array<{ from: string; to: string }>).map((r) => [r.from, r.to])
  );
  for (const [alias, target] of Object.entries(ALIAS_REDIRECTS)) {
    const gen = generated.get(alias);
    if (gen && gen !== target) {
      fail(
        `Alias "${alias}" → "${target}" CONTRADICTS the generated legacy map, which sends it ` +
          `to "${gen}". One of the two is wrong; the alias map wins at runtime.`
      );
    }
    if (resolveAppRoute(alias)) {
      // A literal route directory would be shadowed by the redirect and never render.
      const segs = alias.split('/').filter(Boolean);
      const literal = existsSync(path.join(APP_DIR, ...segs));
      if (literal) {
        fail(
          `Alias "${alias}" → "${target}" shadows a real route directory (src/app${alias}). ` +
            'The page can never render. Remove the alias or the route.'
        );
      }
    }
  }
  // ── Brief 153: the city-scoped redirect rule's targets ───────────────────
  // Same three rules as any other redirect: the target must be served, must not
  // itself redirect, and must not carry a trailing slash. Checked once per
  // DISTINCT target (there are ~17, not ~4,200) with the sources counted for the
  // summary line.
  const cityScopedPairs = allCityScopedRedirectPairs();
  const cityScopedTargets = new Map<string, string>();
  for (const { from, to } of cityScopedPairs) if (!cityScopedTargets.has(to)) cityScopedTargets.set(to, from);
  for (const [to, example] of cityScopedTargets) {
    if (to !== '/' && to.endsWith('/')) {
      fail(`City-scoped redirect ${example} → ${to} targets a TRAILING-SLASH URL — a two-hop chain.`);
    }
    if (isRedirectSource(to)) {
      chains++;
      fail(`Redirect CHAIN: city-scoped ${example} → ${to}, but ${to} is itself a redirect source.`);
    }
    if (!resolveRewrittenStatic(to, cfg) && !resolveAppRoute(to)) {
      fail(
        `City-scoped redirect ${example} → ${to}, but nothing under src/app serves ${to}. ` +
          'A redirect must land on a 200.'
      );
    }
  }
  // A sitemap URL must never also be a city-scoped redirect source. The rule is
  // written so it cannot happen (it returns null whenever getCityService()
  // resolves), but that is exactly the kind of invariant worth proving rather
  // than trusting — the sitemap now advertises 11,160 URLs of that shape.
  for (const { from } of cityScopedPairs) {
    if (seen.has(from)) {
      fail(
        `"${from}" is BOTH a sitemap URL (${seen.get(from)}) and a city-scoped redirect source. ` +
          'The sitemap would advertise a 301.'
      );
    }
  }

  notes.push(
    `${Object.keys(MANUAL_ALIAS_REDIRECTS).length} manual alias(es), ` +
      `${Object.keys(ALIAS_REDIRECTS).length} total alias 301s, ` +
      `${mapSources.size} exact-path redirect sources, ` +
      `${cityScopedPairs.length} derived city-scoped 301s over ${cityScopedTargets.size} distinct targets, ` +
      `${chains} chain(s).`
  );
  notes.push(
    `sitemap index: ${SITEMAP_CHILDREN.length} children ` +
      `(${shards.length} city-service shard(s), largest ${Math.max(
        ...shards.map((s) => citySlugsForShard(s).length * CITY_SERVICE_SLUGS.size)
      )} URLs, ceiling ${SHARD_URL_CEILING}).`
  );

  // ── Verdict ──────────────────────────────────────────────────────────────
  console.log(`[validate-sitemap] checked ${seen.size} sitemap URL patterns and ${mapSources.size} redirect sources.`);
  for (const n of notes) console.log(`[validate-sitemap] ${n}`);

  if (errors.length > 0) {
    console.error(
      `\n${'!'.repeat(72)}\n[validate-sitemap] BUILD FAILED — ${errors.length} violation(s):\n`
    );
    for (const e of errors) console.error(`  ✗ ${e}`);
    console.error(
      `\nEvery rule above is documented in src/lib/sitemap-pages.ts and\n` +
        `src/lib/redirects/alias-redirects.ts. Fix the data, not the validator.\n${'!'.repeat(72)}\n`
    );
    process.exit(1);
  }
  console.log('[validate-sitemap] OK — sitemap is clean, no chains, config invariants hold.');
};

main();
