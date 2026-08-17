/**
 * City-scoped 301 RULES — `/{city}/{something-that-is-not-a-city-service}`
 * (Brief 153, Tracks C and D).
 *
 * A rule rather than map entries. `src/lib/redirects/alias-redirects.ts` holds
 * one-off decisions and `legacy-redirect-map.json` holds the generated
 * WordPress URLs; both are exact-path Maps. This file covers a shape instead:
 * 248 cities × 17 non-servable second segments is ~4,200 pairs that are fully
 * derivable from registries the app already has, and materialising them into
 * the middleware Map would double it for no gain.
 *
 * ─── What it fixes ─────────────────────────────────────────────────────────
 * `src/app/[city]/[service]/page.tsx` renders exactly when `getCity(city)` AND
 * `getCityService(service)` both resolve, and 404s otherwise. Google holds
 * ~104 URLs of this shape that miss on the second half:
 *
 *   71  `/{city}/{CATEGORY}`  — `/keeneyville/drain`, `/mchenry/sewer`,
 *                               `/inverness/plumbing`, `/algonquin/emergency`, …
 *                               A service CATEGORY, not a sub-service. Nothing in
 *                               the current build emits these (verified — see the
 *                               Brief 153 report); they are a historical crawl
 *                               backlog, and the fix is to stop answering 404.
 *    1  `/{city}/{hub-only service}` — `/fort-sheridan/laundry-room-plumbing`.
 *                               Ten taxonomy slugs have a top-level hub page but
 *                               no per-city content file, so the city-scoped form
 *                               404s for EVERY city, not just this one.
 *
 * ─── The rule ──────────────────────────────────────────────────────────────
 * For a two-segment path whose first segment is a registered city:
 *   1. the second segment IS a city-service      → no redirect; the page serves
 *   2. it is a legacy category slug              → `LEGACY_CATEGORY_TARGETS`
 *                                                  (`/services/{cat}`, or
 *                                                  `/emergency-plumbing`)
 *   3. the taxonomy can resolve it globally      → `globalServiceHref()`, the
 *                                                  same Brief 138 rule the
 *                                                  services menu uses for links
 *   4. anything else                             → no redirect; a clean 404 is a
 *                                                  legitimate answer
 *
 * Rule 1 first is what makes this safe: the rule can only fire on a path that
 * 404s today, so it can never redirect a working page away, and it can never
 * shadow one of the 11,160 `/{city}/{service}` URLs the sitemap now lists.
 *
 * Also handled here: the WordPress duplicate-slug artifacts
 * (`/naperville/shower-repair-3`), stripped back to the page they duplicate.
 * Only the two-segment city form is derived — the four single-segment ones are
 * hand-written in `alias-redirects.ts`, because their bases either 404
 * (`/catch-basin`) or are themselves redirects (`/water-testing`), and a derived
 * rule that produced either would be a broken target or a chain.
 */
import { CITY_REGISTRY, getCity } from '@/lib/content/cities';
import { getCityService } from '@/lib/content/city-services';
import {
  LEGACY_CATEGORY_TARGETS,
  SERVICE_TO_CATEGORY,
  SUB_SERVICE_ROUTES,
  globalServiceHref,
} from '@/lib/content/service-taxonomy';

/**
 * WordPress appends `-2`/`-3` when a slug collides on create. Ten such URLs are
 * in Google's index. Restricted to `-2`/`-3` (not `-\d+`) so a real slug ending
 * in a year or a count can never be caught; `scripts/validate-sitemap.ts`
 * additionally asserts that no registered city or service slug ends this way.
 */
const WP_DUPLICATE_SUFFIX = /-(?:2|3)$/;

/** Resolve a non-servable second segment to the page it should reach, or null. */
function targetForSegment(segment: string): string | null {
  if (getCityService(segment)) return null; // the page serves — never redirect it
  const category = LEGACY_CATEGORY_TARGETS[segment];
  if (category) return category;
  return globalServiceHref(segment);
}

/**
 * The city-scoped 301 for `pathname`, or null. `pathname` must already be
 * `normalizePath()`-normalized (lowercase, leading slash, no trailing slash).
 */
export function lookupCityScopedRedirect(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length !== 2) return null;
  const [city, segment] = segments;
  if (!getCity(city)) return null;
  if (getCityService(segment)) return null; // serves — nothing to do

  // A duplicate-slug artifact resolves to whatever its base resolves to, which
  // is usually the city-service page itself.
  if (WP_DUPLICATE_SUFFIX.test(segment)) {
    const base = segment.replace(WP_DUPLICATE_SUFFIX, '');
    if (getCityService(base)) return `/${city}/${base}`;
    return targetForSegment(base);
  }

  return targetForSegment(segment);
}

/**
 * Every source this rule can fire on, materialised — for
 * `scripts/validate-sitemap.ts` only, never at runtime. The validator needs a
 * concrete list to prove three things: that no sitemap URL is also a source
 * here, that no target is itself a redirect source (a chain), and that no
 * target 404s.
 *
 * The `-2`/`-3` shapes are deliberately NOT enumerated: they are an unbounded
 * family over a suffix, and every one of them resolves through the same
 * `targetForSegment` the enumerated entries do, so enumerating the base slugs
 * proves the targets.
 */
export function allCityScopedRedirectPairs(): Array<{ from: string; to: string }> {
  // `Array.from(new Set(...))`, not `for…of` over the Set: the app tsconfig
  // targets ES5 and iterating a Set directly needs --downlevelIteration.
  const segments = Array.from(
    new Set<string>([
      ...Object.keys(LEGACY_CATEGORY_TARGETS),
      ...Object.keys(SERVICE_TO_CATEGORY),
      ...SUB_SERVICE_ROUTES,
    ])
  );

  const pairs: Array<{ from: string; to: string }> = [];
  for (const city of CITY_REGISTRY) {
    for (const segment of segments) {
      const to = targetForSegment(segment);
      if (to) pairs.push({ from: `/${city.slug}/${segment}`, to });
    }
  }
  return pairs;
}
