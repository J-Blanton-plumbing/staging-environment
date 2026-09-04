/**
 * The "WE ALSO SERVE" internal link graph for the Ohio area pages —
 * Columbus Integration Brief 02, Track B.
 *
 * ─── Why this exists ───────────────────────────────────────────────────────
 * Track B's most valuable free differentiator: a block of 3–5 links that is
 * genuinely different on every one of the 137 Ohio pages. It does two things no
 * name-swap can — it makes the page's below-the-H1 markup unique, and it builds a
 * real internal link graph so the deeper areas are reachable in one hop from a
 * sibling instead of only from a 138-row grid.
 *
 * ─── How the neighbours are chosen ─────────────────────────────────────────
 * By COUNTY, then by a deterministic ring — NOT by distance. There is no
 * lat/lng in this codebase and no routing lookup, so "nearest" in the literal
 * sense is not computable here; asserting it would be an unsourced claim of
 * exactly the kind Brief 02 forbids. County co-membership is a true, sourced
 * statement of proximity, and it is what Brief 03 groups `/locations/central-ohio`
 * by, so the two agree.
 *
 * Within a county the areas are ordered by slug and each one links to the NEXT
 * five, wrapping around. A ring rather than "the first five in the county"
 * matters: the naive form makes every page in Franklin County link to the same
 * five areas and leaves the rest of the county receiving nothing, which is the
 * 172-identical-pages problem restated as a link graph. The ring gives every area
 * both outbound and inbound links.
 *
 * Counties with fewer than six areas cannot fill five slots from inside the
 * county, so the remainder is padded from the full Ohio list — also as a ring,
 * offset by the area's own position, so the padding is spread rather than piling
 * onto whatever sorts first.
 *
 * ─── Why every list also carries its global successor ──────────────────────
 * County rings alone guarantee OUTBOUND links but not INBOUND ones: an area that
 * is the only one in its county (Rockbridge in Hocking, Thornville in Perry) is
 * reachable only if some other area happens to pad onto it, and the large
 * counties never pad because they fill from inside. Built that way, two areas
 * received no inbound link at all — orphans in the exact graph this block exists
 * to build.
 *
 * So each list is guaranteed to contain the area's successor in the full A→Z Ohio
 * ring. That single rule makes the graph a Hamiltonian cycle over all 138 areas,
 * so every area has at least one inbound link no matter how its county is shaped,
 * and the remaining four slots still come from its own county.
 *
 * ─── Illinois is untouched ─────────────────────────────────────────────────
 * `nearbyOhioAreas()` returns an EMPTY array for any slug that is not an Ohio
 * area, and the template renders nothing for an empty array. No Illinois page
 * gains, loses or reorders a single link.
 */
import { OHIO_AREAS, type OhioArea } from './ohio-areas';

/** How many sibling links a page shows. Brief 02 Track B says 3–5. */
const NEARBY_COUNT = 5;

export interface NearbyArea {
  slug: string;
  name: string;
  county: string;
}

/** Areas grouped by county, each group ordered by slug. */
const BY_COUNTY: ReadonlyMap<string, readonly OhioArea[]> = (() => {
  const m = new Map<string, OhioArea[]>();
  for (const a of OHIO_AREAS) {
    const list = m.get(a.county);
    if (list) list.push(a);
    else m.set(a.county, [a]);
  }
  // `forEach`, not `for…of m.values()` — the app's tsconfig target does not allow
  // iterating a Map iterator without `downlevelIteration`.
  m.forEach((list: OhioArea[]) => list.sort((x, y) => x.slug.localeCompare(y.slug)));
  return m;
})();

/** Position of each slug in the full A→Z Ohio list — the padding ring's offset. */
const GLOBAL_INDEX: ReadonlyMap<string, number> = new Map(
  OHIO_AREAS.map((a, i) => [a.slug, i])
);

const toNearby = (a: OhioArea): NearbyArea => ({ slug: a.slug, name: a.name, county: a.county });

/**
 * Precomputed once at module scope. This is called on every Ohio page render and
 * the input is a frozen compile-time list, so there is nothing to recompute
 * per request.
 */
const NEARBY: ReadonlyMap<string, readonly NearbyArea[]> = (() => {
  const out = new Map<string, NearbyArea[]>();

  for (const area of OHIO_AREAS) {
    const county = BY_COUNTY.get(area.county)!;
    const offset = GLOBAL_INDEX.get(area.slug)!;
    /** This area's successor in the full A→Z ring — the inbound-coverage guarantee. */
    const successor = OHIO_AREAS[(offset + 1) % OHIO_AREAS.length];

    const picked: NearbyArea[] = [];
    const taken = new Set<string>([area.slug]);

    // 1. Ring walk within the county, starting just after this area. One slot is
    //    held back for the successor unless the county ring already contains it.
    const start = county.findIndex((c) => c.slug === area.slug);
    const countyBudget = NEARBY_COUNT - (successor.county === area.county ? 0 : 1);
    for (let step = 1; step < county.length && picked.length < countyBudget; step++) {
      const candidate = county[(start + step) % county.length];
      if (taken.has(candidate.slug)) continue;
      taken.add(candidate.slug);
      picked.push(toNearby(candidate));
    }

    // 2. The successor, if the county walk did not already pick it up.
    if (!taken.has(successor.slug)) {
      taken.add(successor.slug);
      picked.push(toNearby(successor));
    }

    // 3. Pad from the full Ohio ring, offset by this area's own global position,
    //    for counties too small to fill the remaining slots.
    for (let step = 1; step < OHIO_AREAS.length && picked.length < NEARBY_COUNT; step++) {
      const candidate = OHIO_AREAS[(offset + step) % OHIO_AREAS.length];
      if (taken.has(candidate.slug)) continue;
      taken.add(candidate.slug);
      picked.push(toNearby(candidate));
    }

    // Same-county siblings first, then the rest — the reader sees the relevant
    // ones at the front. Stable within each group, so the output is deterministic.
    picked.sort((a, b) => {
      const rank = (n: NearbyArea) => (n.county === area.county ? 0 : 1);
      return rank(a) - rank(b);
    });

    out.set(area.slug, picked);
  }

  return out;
})();

/**
 * The 3–5 sibling areas to link from `slug`'s page. Empty for any non-Ohio slug —
 * which is every Illinois city, so their pages render no such block.
 */
export function nearbyOhioAreas(slug: string): readonly NearbyArea[] {
  return NEARBY.get(slug) ?? [];
}
