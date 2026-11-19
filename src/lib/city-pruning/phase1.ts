/**
 * Brief 229 — City Pruning, Phase 1 Pilot (Marketing + Antonio, 2026-11-18).
 *
 * Three hub areas move to state-suffixed URLs (301), and their thin town pages leave the index:
 *
 *   /mokena, /tinley-park, /skokie            → /mokena-il, /tinley-park-il, /skokie-il  (Tier 1 hubs v7)
 *   /{hub}/{service} (33 per hub)             → /{hub}-il/{service}                       (content unchanged)
 *   7 Tier 3 towns /{town}                    → /{town}-il                                (new town pages)
 *   17 Tier 4 towns /{town}                   → stay LIVE, noindex, out of the sitemap    (Brief 230)
 *   /{town}/{service} for the 24 towns        → stay LIVE, noindex, out of the sitemap    (Brief 230, 1,056 rows)
 *   /locations/chicagoland, /central-ohio     → /locations/illinois, /locations/ohio
 *
 * Plain data + pure functions, no Node or DB imports: this module is bundled into the Edge middleware
 * (through src/lib/redirects/lookup.ts) as well as server components.
 *
 * ─── How the redirects are applied (src/lib/redirects/lookup.ts) ──────────────────────────────────
 *   1. The 111 rows of `phase1-redirects.json` (Brief 230: only pages that MOVE; the other 1,073 package rows
 *      stay live with noindex — `phase1-noindex.json`, src/lib/city-pruning/noindex.ts) (generated from the package CSV — never hand-edit;
 *      `node scripts/city-pruning/build-phase1-data.mjs`) are exact-path 301s that WIN over every other
 *      map (no source is in any other map today — verified in Track 0).
 *   2. Every OTHER redirect's target is passed through `pruneFinal()`, so a legacy rule that used to
 *      land on a pilot source (`/service-area-morton-grove` → `/morton-grove`, the Brief 209 folds
 *      `/mokena/clogged-drains` → `/mokena/drain-cleaning`, Brief 211's `/mokena/plumbing-services` →
 *      `/mokena`, the city-scoped `-2` duplicates …) now lands on the FINAL page in one hop.
 *   3. `PILOT_DERIVED_REDIRECTS`: the new hubs inherit their legacy hub's 11 Brief 209 folds
 *      (`/mokena-il/clogged-drains` → `/mokena-il/drain-cleaning`), so the new URL space has no thin
 *      fold page the old one didn't have. These URLs never existed before, so nothing is lost.
 *
 * Rollback = drop this module from lookup.ts (+ the registry entries and the sitemap exclusions): the
 * legacy rows, versions and code modules are untouched (new rows were created next to them).
 */
import REDIRECTS from './phase1-redirects.json';
import { CITY_SERVICE_FOLD_REDIRECTS } from '@/lib/redirects/city-service-folds';
import { PILOT_HUBS } from './pilot-pages';

export { PILOT_HUBS, PILOT_TOWNS, pilotOfficeSlug, pilotPageOfOffice, officePagePath, type PilotTown } from './pilot-pages';

/** The 111 package redirects for pages that move, exactly as supplied (Brief 230; Track 0: no row needed retargeting). */
export const PRUNING_PHASE1_REDIRECTS: Readonly<Record<string, string>> = Object.freeze(REDIRECTS as Record<string, string>);

/** The new hubs' copies of their legacy hub's Brief 209 folds (see the header, point 3). */
export const PILOT_DERIVED_REDIRECTS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    Object.entries(PILOT_HUBS).flatMap(([hub, legacy]) =>
      Object.entries(CITY_SERVICE_FOLD_REDIRECTS)
        .filter(([from]) => from.startsWith(`/${legacy}/`))
        .map(([from, to]) => [`/${hub}${from.slice(legacy.length + 1)}`, `/${hub}${to.slice(legacy.length + 1)}`])
    )
  )
);

/**
 * Brief 229 — a pilot hub's service link: `/{hub}/{service}`, or — for one of its 11 Brief 209 fold
 * slugs, which 301 — the page that fold lives on, so a pilot page never links to a redirect. For any
 * other city the plain path (no entry in `PILOT_DERIVED_REDIRECTS`).
 */
export function pilotServiceHref(hubSlug: string, service: string): string {
  const p = `/${hubSlug}/${service}`;
  return (PILOT_DERIVED_REDIRECTS as Record<string, string>)[p] ?? p;
}

/**
 * Brief 229 — any internal href with this release's redirects applied: a pilot hub's fold slug → the
 * page it lives on (`PILOT_DERIVED_REDIRECTS`), a pilot redirect source → its target (`pruneHref`), else
 * the same string. For link lists built from the registry (the legacy city / service menus).
 */
export function pilotFinalHref(href: string): string {
  return (PILOT_DERIVED_REDIRECTS as Record<string, string>)[href] ?? pruneHref(href);
}

/** A normalized path's final destination under this release (itself when it is not a pilot source). */
export function pruneFinal(path: string): string {
  const to = (PRUNING_PHASE1_REDIRECTS as Record<string, string>)[path];
  return to ?? path;
}

const SITE_RE = /^https?:\/\/(?:www\.)?jblantonplumbing\.com(?=\/|$)/i;

/**
 * Brief 229 (Track F) — an internal href with a pilot source swapped for its final target. Keeps any
 * query string and #fragment, accepts the absolute `https://jblantonplumbing.com/…` form (and keeps
 * it absolute) and a trailing slash. Anything that is not an internal link to a pilot source comes
 * back unchanged (the same string), so callers can apply it everywhere without changing other links.
 */
export function pruneHref(href: string): string {
  if (!href || href[0] === '#') return href;
  let origin = '';
  let rest = href;
  const m = href.match(SITE_RE);
  if (m) {
    origin = m[0];
    rest = href.slice(origin.length) || '/';
  }
  if (rest[0] !== '/' || rest.startsWith('//')) return href;
  const cut = rest.search(/[?#]/);
  const pathPart = cut < 0 ? rest : rest.slice(0, cut);
  const tail = cut < 0 ? '' : rest.slice(cut);
  const norm = pathPart.length > 1 ? pathPart.replace(/\/+$/, '').toLowerCase() : pathPart;
  const to = (PRUNING_PHASE1_REDIRECTS as Record<string, string>)[norm];
  return to ? `${origin}${to}${tail}` : href;
}

/** Every legacy registry slug whose `/{slug}` now 301s (3 hubs + 7 Tier 3 towns; Brief 230: Tier 4 towns stay live). */
export const PRUNED_LEGACY_CITY_SLUGS: ReadonlySet<string> = new Set(
  Object.keys(PRUNING_PHASE1_REDIRECTS)
    .map((p) => p.split('/').filter(Boolean))
    .filter((segs) => segs.length === 1)
    .map((segs) => segs[0])
);

/** `/{slug}` is a pilot redirect source (a legacy hub or town page). */
export function isPrunedLegacyCity(slug: string): boolean {
  return PRUNED_LEGACY_CITY_SLUGS.has(slug);
}
