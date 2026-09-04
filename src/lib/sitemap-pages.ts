/**
 * The sitemap's HAND-MAINTAINED page list (Brief 152, Fix 3).
 *
 * Split out of `src/app/sitemap.ts` so `scripts/validate-sitemap.ts` can import
 * it at BUILD time without dragging in `@/lib/db` (and therefore `pg`) — the
 * whole point of the validator is that it runs before anything is deployed and
 * needs no database and no network.
 *
 * Everything else in the sitemap is derived from a registry or from the CMS
 * (city slugs, sub-service routes, category slugs, articles) and so cannot go
 * stale independently. This list can, and did: `/hoa-line-piping` was renamed to
 * `/hoa-pipe-lining` by Brief 125 and sat here advertising a hard 404 to Google
 * for weeks. That is the defect `scripts/validate-sitemap.ts` now makes
 * impossible — it asserts, for every path below, that the build actually serves
 * it, that it is not a redirect source, and that it is not `noindex`.
 *
 * RULES for entries:
 *  - Canonical form only: lowercase, leading slash, NO trailing slash. The
 *    homepage is the empty string (rendered as the bare origin).
 *  - The page must return 200 and declare a SELF-referencing canonical. A page
 *    that canonicalises elsewhere belongs in alias-redirects.ts as a 301, not
 *    here.
 *  - Never list a redirect source (/why-us, /reviews, /booking, /plumbing, …) or
 *    a `noindex` page (/thank-you).
 */

export interface SitemapStaticPage {
  /** Path with no trailing slash; '' is the homepage. */
  path: string;
  /** `main_pages.slug` this page's <lastmod> comes from, when it has a CMS row. */
  mainSlug?: string;
  changeFrequency: 'weekly' | 'monthly' | 'yearly';
  priority: number;
}

/**
 * Static top-level pages that always return 200.
 *
 * Brief 152: `/hoa-line-piping` REMOVED (404 — Brief 125 renamed the cluster) and
 * replaced by the three pages that actually serve. Brief 127 (HOA cluster
 * app-routes migration) moved those three off static HTML + `beforeFiles`
 * rewrites and onto real routes under `src/app/hoa-pipe-lining/` so they
 * render inside `SiteShell` and pick up the shared, CMS-backed `<Footer>`;
 * their self-referencing canonical now comes from the root layout's
 * `generateMetadata` (via the `x-pathname` header) like every other route,
 * same as before.
 */
export const SITEMAP_STATIC_PAGES: readonly SitemapStaticPage[] = [
  { path: '',                    mainSlug: 'home',             changeFrequency: 'weekly',  priority: 1 },
  { path: '/services',                                         changeFrequency: 'monthly', priority: 0.9 },
  { path: '/emergency-plumbing',                               changeFrequency: 'monthly', priority: 0.9 },
  { path: '/contact',                                          changeFrequency: 'monthly', priority: 0.8 },
  { path: '/no-drip-club',       mainSlug: 'no-drip-club',     changeFrequency: 'monthly', priority: 0.8 },
  { path: '/customer-stories',   mainSlug: 'customer-stories', changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/why-j-blanton',      mainSlug: 'why-j-blanton',    changeFrequency: 'monthly', priority: 0.7 },
  { path: '/locations',          mainSlug: 'locations',        changeFrequency: 'monthly', priority: 0.7 },
  /*
   * Columbus Integration Brief 03, Track D — the two region pages.
   *
   * `/locations` STAYS listed above. It ranks, it is still a real 200 with a
   * self-referencing canonical, and it is not redirected anywhere; these two are
   * additions beneath it, not a replacement for it.
   *
   * No `mainSlug`: neither has a `main_pages` row yet, so their <lastmod> falls
   * back to the build's default rather than a CMS timestamp (see the TODO in
   * each page file).
   */
  { path: '/locations/chicagoland',                            changeFrequency: 'monthly', priority: 0.6 },
  { path: '/locations/central-ohio',                           changeFrequency: 'monthly', priority: 0.6 },
  { path: '/knowledge-hub',      mainSlug: 'knowledge-hub',    changeFrequency: 'weekly',  priority: 0.7 },
  { path: '/financing',          mainSlug: 'financing',        changeFrequency: 'monthly', priority: 0.6 },
  { path: '/help-and-support',   mainSlug: 'help-and-support', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/hoa-pipe-lining',                                  changeFrequency: 'monthly', priority: 0.6 },
  { path: '/hoa-pipe-lining/team',                             changeFrequency: 'yearly',  priority: 0.4 },
  { path: '/hoa-pipe-lining/reserve-studies',                  changeFrequency: 'yearly',  priority: 0.4 },
  { path: '/j-blanton-is-hiring',                              changeFrequency: 'monthly', priority: 0.4 },
  { path: '/privacy-policy',                                   changeFrequency: 'yearly',  priority: 0.3 },
];
