/**
 * Brief 134 — the CloudFront host that fronts the CMS uploads bucket is
 * configured per environment via `S3_UPLOAD_PUBLIC_BASE_URL`, so its hostname
 * has to be added to `images.remotePatterns` or every uploaded image throws
 * `hostname is not configured under images` in next/image.
 *
 * NOTE: like every build-time config value, this is baked into the build. After
 * changing `S3_UPLOAD_PUBLIC_BASE_URL` the app must be REBUILT — a pm2 restart
 * alone will not pick it up. The deploy workflow builds on the box, so setting
 * the var in the box's env file before deploying is sufficient.
 */
const uploadsCdn = (() => {
  const raw = process.env.S3_UPLOAD_PUBLIC_BASE_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    // Protocol comes from the URL rather than being hardcoded https, so a
    // non-TLS base (a local S3-compatible stub used for testing the upload
    // path) is matched too. Production is https either way.
    return { protocol: u.protocol.replace(':', ''), hostname: u.hostname };
  } catch {
    console.warn(`[next.config] S3_UPLOAD_PUBLIC_BASE_URL is not a valid URL: "${raw}" — ignoring.`);
    return null;
  }
})();

const imageRemotePatterns = [
  { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
  // Existing WordPress-era asset CDN — still referenced by migrated content.
  { protocol: 'https', hostname: 'd1rplazj5a80fb.cloudfront.net' },
];

if (uploadsCdn && !imageRemotePatterns.some(p => p.hostname === uploadsCdn.hostname)) {
  imageRemotePatterns.push(uploadsCdn);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Zero-downtime deploys: deploy.yml builds into a side directory
  // (`NEXT_DIST_DIR=.next-build npm run build`) while the running `next start`
  // keeps serving the untouched live `.next`, then swaps the finished build in.
  // The env var is set ONLY for the build step — at runtime it is unset, so
  // `next start` always serves plain `.next`. Local dev/builds are unaffected.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // sanitize-html pulls in ESM-only htmlparser2, which Next's webpack pass
  // cannot bundle (Brief 73). It only ever runs server-side (API routes +
  // server components), so leave it external and require it at runtime.
  experimental: {
    serverComponentsExternalPackages: ['sanitize-html'],
    // Brief 135 — enables src/instrumentation.ts, whose `register()` Next runs
    // once per server process before the first request. That is the hook the
    // production env guard (src/lib/env-guards.ts) needs: it must be able to
    // abort startup, which nothing per-request or per-render can do.
    // REMOVING THIS FLAG SILENTLY DISABLES THAT GUARD.
    instrumentationHook: true,
    // Brief 107 — Next 14.2's client Router Cache defaults to holding dynamic
    // segments for 30s after a soft (Link/router.push) navigation, even though
    // every page here is `force-dynamic` and reads live CMS data on every
    // request. That mismatch is why CMS edits (e.g. Office Addresses) didn't
    // show up after Save: a hard reload always saw the fresh DB row (proven in
    // this brief's diagnosis), but clicking between pages served the RSC
    // payload cached from before the edit. Setting `dynamic: 0` makes every
    // soft navigation refetch dynamic segments, matching the site's
    // force-dynamic rendering model everywhere else.
    staleTimes: {
      dynamic: 0,
    },
  },
  images: {
    remotePatterns: imageRemotePatterns,
  },
  // Brief 152 (Fix 1) — hand the trailing-slash redirect to src/middleware.ts.
  //
  // Next's built-in rule is unshifted onto the front of `redirects()`, so it runs
  // before middleware and ALWAYS wins. That turned every slashed alias into a
  // two-hop chain on production: `/bathroom-plumbing/` → 308
  // `/bathroom-plumbing` → 301 `/bathroom-plumbing-chicago`. Since every legacy
  // WordPress URL ended in a slash, that is the shape Google holds for
  // effectively the whole site. `normalizeTrailingSlash()` in middleware does the
  // strip AND the alias lookup in one pass, so the crawler gets a single 301 to
  // the final 200.
  //
  // ⚠️ REMOVING THIS FLAG silently restores Next's 308 and re-creates every
  // chain — the middleware branch becomes dead code because it never runs.
  skipTrailingSlashRedirect: true,
  /**
   * Brief 152 (Fix 4) — search-visibility headers.
   *
   * `robots.txt` used to `Disallow: /admin` and `Disallow: /api`, which blocks
   * CRAWLING but not INDEXING: Google indexed 25 of those URLs anyway (from
   * links) and then could not fetch them to discover a `noindex`, so they were
   * stuck in the index permanently. The fix is counterintuitive — allow the
   * crawl (see src/app/robots.txt/route.ts) and answer with a `noindex` header
   * so Google can read it and drop the page.
   *
   * This is a SEARCH-VISIBILITY change only. Access control on /admin and /api
   * is unchanged (session gate in src/middleware.ts + getSession). A response
   * header alters no status code, no body and no CORS behaviour, so the live
   * `POST /api/leads` endpoint is untouched.
   *
   * Both the bare and the `/:path*` form are listed because path-to-regexp does
   * not reliably match the zero-segment case across versions, and `/admin`
   * itself (which 307s to /admin/login) must carry the header too.
   *
   * next.config `headers()` resolve BEFORE middleware and are applied to the
   * final response by the router, so they land on middleware-generated responses
   * (the /admin → /admin/login redirect, the /api/cms 401 JSON) as well as on
   * rendered ones.
   *
   * /robots.txt and /sitemap.xml are deliberately NOT matched — they must stay
   * fetchable AND indexable-neutral.
   */
  async headers() {
    const noindex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }];
    /**
     * Brief 153 (Fix E) — the non-public clone hosts.
     *
     * `dev.jblantonplumbing.com` and `prod.jblantonplumbing.com` both resolve
     * publicly and serve a copy of the site. They now answer `Disallow: /`
     * (src/app/robots.txt/route.ts) AND `X-Robots-Tag: noindex` on every
     * response — deliberately both. Brief 152's Fix 4 established why: a
     * `Disallow` alone cannot remove an already-indexed URL, because a blocked
     * crawl can never fetch the page to read the noindex. The Disallow stops new
     * discovery; the header removes what is already in.
     *
     * Unlike the /admin and /api rules above, this one covers EVERY path
     * including /robots.txt and /sitemap.xml — the goal here is to de-index a
     * whole host, not to exempt part of it.
     *
     * ⚠️ Keep the host list in sync with `NON_PUBLIC_SUBDOMAINS` in
     * src/lib/non-public-hosts.ts. This file is ESM JavaScript and cannot import
     * that module, so `scripts/validate-sitemap.ts` cross-checks the two and
     * fails the build if they drift.
     */
    const nonPublicHosts = ['dev.jblantonplumbing.com', 'prod.jblantonplumbing.com'];
    const hostNoindex = nonPublicHosts.flatMap((value) =>
      // Both forms: path-to-regexp does not reliably match the zero-segment case
      // with `/:path*`, and the bare `/` of these hosts must carry the header too.
      ['/', '/:path*'].map((source) => ({
        source,
        has: [{ type: 'host', value }],
        headers: noindex,
      }))
    );
    return [
      { source: '/admin', headers: noindex },
      { source: '/admin/:path*', headers: noindex },
      { source: '/api', headers: noindex },
      { source: '/api/:path*', headers: noindex },
      ...hostNoindex,
    ];
  },
  async rewrites() {
    return {
      // beforeFiles so the standalone HOA pipe-lining cluster (static files in
      // public/, Brief 125 — supersedes Brief 124's /hoa-line-piping) wins over
      // the [city] dynamic route, which would otherwise 404 the clean URLs
      // (dynamicParams = false).
      beforeFiles: [
        { source: '/hoa-pipe-lining',                 destination: '/hoa-pipe-lining/index.html' },
        { source: '/hoa-pipe-lining/team',            destination: '/hoa-pipe-lining/team/index.html' },
        { source: '/hoa-pipe-lining/reserve-studies', destination: '/hoa-pipe-lining/reserve-studies/index.html' },
      ],
    };
  },
  async redirects() {
    // Brief 127 (Track B): every public-facing redirect uses statusCode 301 —
    // the classic permanent redirect search engines consolidate on — instead of
    // `permanent: true`, which Next emits as 308. Same permanence, but the SEO
    // audit (and most crawler tooling) expects an explicit 301.
    return [
      // Existing redirects
      { source: '/why-us',              destination: '/why-j-blanton',       statusCode: 301 },
      { source: '/jb-articles/:slug',   destination: '/knowledge-hub/:slug', statusCode: 301 },

      // Track C — service category slug aliases (live → build paths)
      { source: '/plumbing',            destination: '/services/plumbing',     statusCode: 301 },
      { source: '/sewer',               destination: '/services/sewer',        statusCode: 301 },
      { source: '/drain',               destination: '/services/drain',        statusCode: 301 },
      { source: '/water-heater',        destination: '/services/water-heater', statusCode: 301 },
      { source: '/water-quality',       destination: '/services/water-quality',statusCode: 301 },
      { source: '/commercial',          destination: '/services/commercial',   statusCode: 301 },

      // Emergency slug alias
      { source: '/emergency',           destination: '/emergency-plumbing',    statusCode: 301 },

      // Brief 76 (DM-1) — sub-services that had duplicate /services/* rows.
      // Canonical page is the dedicated top-level route; 301 the /services/*
      // variant so link equity consolidates instead of splitting indexing.
      { source: '/services/hydro-jetting', destination: '/hydro-jetting', statusCode: 301 },
      { source: '/services/sewer-rodding', destination: '/sewer-rodding', statusCode: 301 },

      // Brief 127 (Track B) — dead slugs the stale sitemap still advertised.
      { source: '/services/emergency-plumbing', destination: '/emergency-plumbing', statusCode: 301 },
      { source: '/reviews',             destination: '/customer-stories',      statusCode: 301 },

      // Gas lines slug alias (live canonical = /gas-lines; DB was incorrectly stored as gas-lines-chicago)
      { source: '/gas-lines-chicago',   destination: '/gas-lines',             statusCode: 301 },

      // Live contact slug. The live site's ONLY contact page is
      // https://jblantonplumbing.com/contact-us (verified against the WordPress
      // export: one published page, post_name `contact-us`; there is no
      // `/contact` on live). The build renamed it to `/contact`, so without this
      // the live indexed URL 404s at cutover — flagged in Brief 128's report as
      // an unmet dependency alongside /thank-you. Same live-slug → build-slug
      // direction as /why-us above.
      { source: '/contact-us',          destination: '/contact',               statusCode: 301 },

      // Stub pages
      { source: '/booking',             destination: '/contact',               statusCode: 301 },

      // Brief 83 — "Service Category" + "Service" sidebar sections merged into
      // one "Service Pages" landing; the old standalone sub-service list route
      // now redirects there so no admin bookmarks/links 404.
      { source: '/admin/sub-services',  destination: '/admin/service-pages',   permanent: true },
    ];
  },
};

export default nextConfig;
