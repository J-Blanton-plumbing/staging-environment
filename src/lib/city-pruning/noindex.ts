/**
 * Brief 230 — City Pruning Pilot correction (plan "Changed Nov 19"): the pilot areas' Tier 4 town pages and
 * every town service page stay LIVE with `noindex, follow` and out of every sitemap, instead of 301ing to
 * the hub — so Google Ads (PMax page feeds, explicit final URLs) keeps every page it uses. Only pages that
 * MOVE keep a 301 (`phase1-redirects.json`, 111 rows).
 *
 *   townPages     17 Tier 4 towns whose `/{town}` page is noindexed
 *   serviceTowns  24 towns (those 17 + the 7 Tier 3 towns) whose `/{town}/{service}` layer is noindexed —
 *                 the WHOLE layer, so a live service URL the CSV doesn't list is covered too
 *   paths         the 1,073 CSV sources (QA and the build validator read them)
 *
 * Generated from the package CSV's `group` column by `node scripts/city-pruning/build-phase1-data.mjs` —
 * never hand-edit. Plain data, no imports: safe for the Edge middleware, server components and scripts.
 *
 * Do NOT "clean these up" into redirects: staying live is the point (PPC). Noindex is the robots meta
 * (`noindex, follow`), never a robots.txt Disallow (gotcha 15), and the pages keep a SELF canonical.
 */
import NOINDEX from './phase1-noindex.json';

const TOWN_PAGES: ReadonlySet<string> = new Set(NOINDEX.townPages);
const SERVICE_TOWNS: ReadonlySet<string> = new Set(NOINDEX.serviceTowns);

/** The 1,073 package rows that stay live with noindex (sorted). */
export const PILOT_NOINDEX_PATHS: readonly string[] = Object.freeze([...NOINDEX.paths]);
export const PILOT_NOINDEX_TOWN_PAGES: readonly string[] = Object.freeze([...NOINDEX.townPages]);
export const PILOT_NOINDEX_SERVICE_TOWNS: readonly string[] = Object.freeze([...NOINDEX.serviceTowns]);

/** `/{slug}` is a pilot Tier 4 town page: live, `noindex, follow`, not in the cities sitemap. */
export function isPilotNoindexTownPage(slug: string): boolean {
  return TOWN_PAGES.has(slug);
}

/** `/{slug}/{service}` pages are live, `noindex, follow`, and in no city-service shard. */
export function isPilotNoindexServiceTown(slug: string): boolean {
  return SERVICE_TOWNS.has(slug);
}

/**
 * The `robots` metadata for a `/{slug}` city page: `noindex, follow` for a pilot Tier 4 town, `undefined`
 * for every other page (so its metadata gains no robots key). A function, not a literal in the route file:
 * scripts/validate-sitemap.ts reads an `index: false` literal in a route file as "the whole route is
 * noindex" (the same reason `cityServiceRobots` exists).
 */
export function pilotTownPageRobots(slug: string): { index: boolean; follow: boolean } | undefined {
  return TOWN_PAGES.has(slug) ? { index: false, follow: true } : undefined;
}

/** A path (no query/hash, no trailing slash) that the pilot keeps live with noindex. */
export function isPilotNoindexPath(path: string): boolean {
  const seg = path.split('/').filter(Boolean);
  if (seg.length === 1) return TOWN_PAGES.has(seg[0]);
  if (seg.length === 2) return SERVICE_TOWNS.has(seg[0]);
  return false;
}
