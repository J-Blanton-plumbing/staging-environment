/**
 * Legacy redirect lookup (Brief 131, Track E).
 *
 * `legacy-redirect-map.json` is GENERATED — never hand-edit it. Regenerate with:
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/build-legacy-redirect-map.ts --require-db
 *
 * Why a Map in middleware rather than `next.config.mjs` `redirects()`: the map is
 * 6,000+ entries, and `redirects()` compiles every rule into an ordered
 * path-to-regexp chain the router walks per request — that bloats the build and
 * turns routing into a linear scan. A `Map` built once at module scope gives an
 * O(1) exact-path lookup instead. The ~18 hand-written rules stay in
 * `next.config.mjs`: they run before middleware, they're few, and several are
 * parameterised (`/jb-articles/:slug`) so they can't be exact-match entries.
 *
 * Module scope means the Map is built once per middleware instance, not per
 * request. Everything here is plain data — no Node built-ins — so it is safe in
 * the Edge runtime middleware executes in.
 */
import legacyRedirectMap from './legacy-redirect-map.json';
import { ALIAS_REDIRECTS } from './alias-redirects';
import { lookupCityScopedRedirect } from './city-scoped';

/**
 * 410 is supported for forward-compatibility: if a bucket is ever retired
 * outright (Brief 130 §7 discusses this for `/sewer-service/`), it becomes a
 * status change in the generator rather than a middleware change. No entry uses
 * it today — the generator emits 301 for everything.
 */
export type LegacyRedirectStatus = 301 | 410;

export interface LegacyRedirect {
  to: string;
  status: LegacyRedirectStatus;
}

/** One row of the generated map. `bucket` is provenance only; routing ignores it. */
interface LegacyRedirectRow {
  from: string;
  to: string;
  status: number;
  bucket: string;
}

/**
 * Brief 152: the generated WordPress map is the BASE and the hand-maintained
 * alias map (src/lib/redirects/alias-redirects.ts) is overlaid on top, so a
 * post-migration slug decision always wins over whatever the export happened to
 * contain. Both are exact-path Maps built once at module scope.
 */
const REDIRECTS: ReadonlyMap<string, LegacyRedirect> = new Map<string, LegacyRedirect>([
  ...(legacyRedirectMap as LegacyRedirectRow[]).map(
    (row) => [row.from, { to: row.to, status: row.status === 410 ? 410 : 301 }] as const
  ),
  ...Object.entries(ALIAS_REDIRECTS).map(
    ([from, to]) => [from, { to, status: 301 }] as const
  ),
]);

/** Entry count — exposed for diagnostics/tests, not used by routing. */
export const LEGACY_REDIRECT_COUNT = REDIRECTS.size;

/**
 * Every path that redirects, for the build-time sitemap validator: a URL the
 * sitemap advertises must never also be a redirect source, and a redirect target
 * must never be one either (that is a chain).
 */
export function allRedirectSources(): string[] {
  return Array.from(REDIRECTS.keys());
}

/** Every (from → to) pair, for the same validator's chain check. */
export function allRedirectPairs(): Array<{ from: string; to: string; status: number }> {
  return Array.from(REDIRECTS.entries(), ([from, r]) => ({ from, to: r.to, status: r.status }));
}

/**
 * Look up a legacy path. `pathname` must already be `normalizePath()`-normalized
 * (lowercase, leading slash, no trailing slash, no query) — every `from` in the
 * map is stored in that form, so an un-normalized caller silently misses.
 *
 * Brief 153: after the exact-path Maps miss, the city-scoped RULE gets a look
 * (`/{city}/{category}` → `/services/{category}`, and the other ~4,200 pairs it
 * derives). It is consulted last on purpose — an explicit entry in the
 * generated map or the alias map always wins — and it only ever fires on a path
 * that 404s today, so it cannot redirect a working page away.
 */
export function lookupRedirect(pathname: string): LegacyRedirect | undefined {
  const exact = REDIRECTS.get(pathname);
  if (exact) return exact;
  const cityScoped = lookupCityScopedRedirect(pathname);
  return cityScoped ? { to: cityScoped, status: 301 } : undefined;
}
