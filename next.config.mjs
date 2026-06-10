/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'd1rplazj5a80fb.cloudfront.net' },
    ],
  },
  async redirects() {
    return [
      { source: '/why-us', destination: '/why-j-blanton', permanent: true },
      { source: '/jb-articles/:slug', destination: '/knowledge-hub/:slug', permanent: true },
    ];
  },
};

export default nextConfig;
