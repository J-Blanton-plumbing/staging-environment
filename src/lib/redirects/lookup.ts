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

const REDIRECTS: ReadonlyMap<string, LegacyRedirect> = new Map(
  (legacyRedirectMap as LegacyRedirectRow[]).map((row) => [
    row.from,
    { to: row.to, status: row.status === 410 ? 410 : 301 },
  ])
);

/** Entry count — exposed for diagnostics/tests, not used by routing. */
export const LEGACY_REDIRECT_COUNT = REDIRECTS.size;

/**
 * Look up a legacy path. `pathname` must already be `normalizePath()`-normalized
 * (lowercase, leading slash, no trailing slash, no query) — every `from` in the
 * map is stored in that form, so an un-normalized caller silently misses.
 */
export function lookupRedirect(pathname: string): LegacyRedirect | undefined {
  return REDIRECTS.get(pathname);
}
