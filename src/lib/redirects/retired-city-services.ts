/**
 * City-service slugs RETIRED site-wide (Brief 211, Track A — Marketing 2026-10-15).
 *
 * `/{city}/plumbing-services` was a thin, generic page for every registered city — the same
 * "[city] plumber / plumbing [city]" intent as the city hub at `/{city}`, competing with it
 * (GSC, 16 months: 34 clicks over ~96K impressions, avg. position ~35) and carrying unfilled
 * `{city}` placeholders, "XYZ Plumbing" and wrong-region copy. Every one now 301s to its hub.
 *
 * A slug listed here is:
 *   - 301'd for EVERY registered city, `/{city}/{slug}` → `/{city}`
 *     (`DERIVED_RETIRED_CITY_SERVICE_REDIRECTS` in ./alias-redirects.ts, merged into
 *     `ALIAS_REDIRECTS`, so the middleware lookup — including the trailing-slash pass —
 *     resolves it in one hop);
 *   - dropped from the city-service sitemap shards, in BOTH `src/lib/sitemap/manifest.ts` and
 *     `src/lib/sitemap/render.ts` (the renderer builds its own list — a sitemap URL must never
 *     be a redirect source; `scripts/validate-sitemap.ts` fails the build if one is).
 *
 * The content module (`src/lib/content/city-services/plumbing-services.ts`) and its DB rows
 * are deliberately KEPT, unreachable, for rollback: removing a slug from this list restores
 * every page and its sitemap entry in one edit.
 *
 * Plain data, no imports: this module is pulled into the Edge middleware bundle.
 */
export const RETIRED_CITY_SERVICE_SLUGS: readonly string[] = ['plumbing-services'];

const RETIRED: ReadonlySet<string> = new Set(RETIRED_CITY_SERVICE_SLUGS);

/** True when `/{city}/{serviceSlug}` is retired (301s to the city hub, never in the sitemap). */
export function isRetiredCityService(serviceSlug: string): boolean {
  return RETIRED.has(serviceSlug);
}
