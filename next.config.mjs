/** @type {import('next').NextConfig} */
const nextConfig = {
  // sanitize-html pulls in ESM-only htmlparser2, which Next's webpack pass
  // cannot bundle (Brief 73). It only ever runs server-side (API routes +
  // server components), so leave it external and require it at runtime.
  experimental: {
    serverComponentsExternalPackages: ['sanitize-html'],
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
    ];
  },
};

export default nextConfig;
