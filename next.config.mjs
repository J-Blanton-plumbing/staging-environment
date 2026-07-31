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
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'd1rplazj5a80fb.cloudfront.net' },
    ],
  },
  async rewrites() {
    return {
      // beforeFiles so the standalone HOA landing page (a static file in
      // public/, Brief 124) wins over the [city] dynamic route, which would
      // otherwise 404 the clean URL (dynamicParams = false).
      beforeFiles: [
        { source: '/hoa-line-piping', destination: '/hoa-line-piping/index.html' },
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
