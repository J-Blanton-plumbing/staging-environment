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
import { SUB_SERVICE_ROUTES } from '@/lib/content/service-taxonomy';
import { SITEMAP_STATIC_PAGES } from '@/lib/sitemap-pages';
import { allRedirectPairs, allRedirectSources } from '@/lib/redirects/lookup';
import { ALIAS_REDIRECTS, MANUAL_ALIAS_REDIRECTS } from '@/lib/redirects/alias-redirects';
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
  headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
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

function dirsIn(dir: string): string[] {
  try {
    return readdirSync(dir).filter((n) => statSync(path.join(dir, n)).isDirectory());
  } catch {
    return [];
  }
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
const PROVABLE_DYNAMIC_ROUTES: Record<string, (urlPath: string) => boolean> = {
  // `dynamicParams = false` — only registered slugs render.
  '[city]/page.tsx': (p) => CITY_SLUGS.has(p.replace(/^\//, '')),
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

/** Does the resolved route file declare itself noindex? */
function declaresNoindex(file: string): boolean {
  const src = readFileSync(file, 'utf8');
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

  // ── Redirect sources, from all three places they can live ────────────────
  const configSources = new Set(cfg.redirects.map((r) => r.source));
  const mapSources = new Set(allRedirectSources());
  const isRedirectSource = (p: string) =>
    configSources.has(p) || mapSources.has(p) || configSources.has(`${p}/`);

  // ── Every path the sitemap can emit, with its provenance ─────────────────
  const sitemapPaths: Array<{ path: string; from: string }> = [
    ...SITEMAP_STATIC_PAGES.map((p) => ({ path: p.path || '/', from: 'SITEMAP_STATIC_PAGES' })),
    ...SERVICE_CATEGORY_SLUGS.map((s) => ({ path: `/services/${s}`, from: 'SERVICE_CATEGORY_SLUGS' })),
    ...SUB_SERVICE_ROUTES.map((s) => ({ path: `/${s}`, from: 'SUB_SERVICE_ROUTES' })),
    ...CITY_REGISTRY.map((c) => ({ path: `/${c.slug}`, from: 'CITY_REGISTRY' })),
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
  notes.push(
    `${Object.keys(MANUAL_ALIAS_REDIRECTS).length} manual alias(es), ` +
      `${Object.keys(ALIAS_REDIRECTS).length} total alias 301s, ` +
      `${mapSources.size} redirect sources overall, ${chains} chain(s).`
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
