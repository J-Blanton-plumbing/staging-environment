/**
 * Indexation policy for `/{city}/{service}` pages — Columbus Integration
 * Brief 02, Track C. Decided by Marketing on 2026-09-01 ("Option B").
 *
 * ─── The policy ────────────────────────────────────────────────────────────
 *   Ohio AREA pages (`/{city}`)          → index, follow    + in the sitemap
 *   Ohio CITY-SERVICE pages              → noindex, follow   + NOT in the sitemap
 *   Illinois city-service pages          → UNCHANGED (index, in the sitemap)
 *
 * The rationale, for whoever reads this later: the Ohio area pages differ by city
 * in title, H1, schema and internal links, and answer a real query. 45
 * near-identical service templates across 138 areas is ~6,200 pages that say
 * nothing area-specific yet — that is the doorway pattern. Building them is fine.
 * Indexing them before they say anything is not.
 *
 * ─── Why Illinois is excluded, given the brief's table says "city-service" ──
 * Brief 02's Track C table lists "City-service pages" without qualifying the
 * state, and Track E asks to confirm "zero city-service paths in any sitemap".
 * Read literally that would `noindex` all 11,160 Illinois `/{city}/{service}`
 * URLs and strip them from the sitemap Brief 153 built specifically to advertise
 * them. Two things in the same brief forbid that, and they are not ambiguous:
 * "Do not modify any existing Illinois city, route, redirect or sitemap entry",
 * and "Chicago is out of scope for this entire project". A hard rule beats an
 * unqualified line in a table, so the policy is scoped to Ohio and the reading is
 * flagged in the Brief 02 report. If Marketing does want the Illinois layer
 * de-indexed, that is a deliberate, separately-reviewed change — not a side
 * effect of creating Ohio pages.
 *
 * ─── Flipping a batch live (the Brief 03+ workflow) ────────────────────────
 * Add the area's city slug to `CITY_SERVICE_INDEXED_OHIO_CITIES` below. That one
 * edit does all three things at once:
 *   • the page's `robots` meta becomes index,follow,
 *   • its 45 service URLs enter the correct sitemap shard, and
 *   • the build validator starts asserting they serve and self-canonicalize.
 * There is no second list to remember and no per-file edit — which is exactly
 * what the brief asked for ("so it can be flipped per-area from a single list,
 * not by editing 172 files").
 *
 * Do NOT add a slug here before its rewrite has landed: a slug in this list and
 * absent from the sitemap, or vice versa, is impossible by construction, but a
 * slug listed here whose pages are still name-swapped is the doorway page the
 * policy exists to prevent.
 */
import type { Metadata } from 'next';

import { getCity } from '@/lib/content/cities';
import { OHIO_STATE } from '@/lib/content/cities/ohio-areas';

/**
 * Ohio city slugs whose `/{city}/{service}` pages are cleared for indexing.
 *
 * EMPTY as of Brief 02 — no Ohio area has real per-area service copy yet. Brief
 * 03+ adds slugs here one batch at a time.
 */
export const CITY_SERVICE_INDEXED_OHIO_CITIES: readonly string[] = [];

const INDEXED_OHIO = new Set(CITY_SERVICE_INDEXED_OHIO_CITIES);

/**
 * Is this city's `/{city}/{service}` layer allowed in the index and the sitemap?
 *
 * True for every non-Ohio city — including a slug that is not in the registry at
 * all, which is the safe answer because such a URL 404s before robots meta or a
 * sitemap entry could matter. False for an Ohio city until it is listed above.
 */
export function isCityServiceIndexable(citySlug: string): boolean {
  if (getCity(citySlug)?.state !== OHIO_STATE) return true;
  return INDEXED_OHIO.has(citySlug);
}

/**
 * The `robots` value for a city-service page's metadata.
 *
 * Returns `undefined` for an indexable city so the emitted metadata is
 * byte-identical to what it was before this module existed — no Illinois page
 * gains a robots directive. `noindex, follow` (never `nofollow`) for a held city:
 * the page links to its parent service hub and its city page, and there is no
 * reason to strand that equity.
 */
export function cityServiceRobots(citySlug: string): Metadata['robots'] | undefined {
  return isCityServiceIndexable(citySlug) ? undefined : { index: false, follow: true };
}
