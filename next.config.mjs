/** @type {import('next').NextConfig} */
const nextConfig = {
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
  async redirects() {
    return [
      // Existing redirects
      { source: '/why-us',              destination: '/why-j-blanton',       permanent: true },
      { source: '/jb-articles/:slug',   destination: '/knowledge-hub/:slug', permanent: true },

      // Track C — service category slug aliases (live → build paths)
      { source: '/plumbing',            destination: '/services/plumbing',     permanent: true },
      { source: '/sewer',               destination: '/services/sewer',        permanent: true },
      { source: '/drain',               destination: '/services/drain',        permanent: true },
      { source: '/water-heater',        destination: '/services/water-heater', permanent: true },
      { source: '/water-quality',       destination: '/services/water-quality',permanent: true },
      { source: '/commercial',          destination: '/services/commercial',   permanent: true },

      // Emergency slug alias
      { source: '/emergency',           destination: '/emergency-plumbing',    permanent: true },

      // Brief 76 (DM-1) — sub-services that had duplicate /services/* rows.
      // Canonical page is the dedicated top-level route; 301 the /services/*
      // variant so link equity consolidates instead of splitting indexing.
      { source: '/services/hydro-jetting', destination: '/hydro-jetting', permanent: true },
      { source: '/services/sewer-rodding', destination: '/sewer-rodding', permanent: true },

      // Gas lines slug alias (live canonical = /gas-lines; DB was incorrectly stored as gas-lines-chicago)
      { source: '/gas-lines-chicago',   destination: '/gas-lines',             permanent: true },

      // Stub pages
      { source: '/booking',             destination: '/contact',               permanent: true },

      // Brief 83 — "Service Category" + "Service" sidebar sections merged into
      // one "Service Pages" landing; the old standalone sub-service list route
      // now redirects there so no admin bookmarks/links 404.
      { source: '/admin/sub-services',  destination: '/admin/service-pages',   permanent: true },
    ];
  },
};

export default nextConfig;
