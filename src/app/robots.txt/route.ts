import { CANONICAL_BASE } from '@/lib/seo';

/**
 * Brief 127 (Track D): environment-aware robots.txt.
 *
 * This is an explicit Route Handler rather than the app/robots.ts metadata
 * convention because Next 14.2.5 builds the metadata version as a static route
 * — `export const dynamic` is ignored there, which would bake the SITE_ENV
 * check in at build time. As a plain handler it is evaluated per request, so
 * flipping the env var (pm2 --update-env) takes effect without a rebuild.
 *
 * Only production (SITE_ENV=production) serves a crawlable robots.txt. Every
 * other environment — staging, local dev, anything where the flag is unset —
 * serves `Disallow: /` so pre-launch hosts can never leak into Google.
 * Defaulting to DISALLOW is deliberate: forgetting the flag on production
 * costs some crawl time; the inverse mistake (staging indexed, diluting the
 * live domain) is far worse.
 *
 * LAUNCH CHECKLIST: production must run with SITE_ENV=production or the live
 * site will block all crawlers.
 *
 * Note: staging's nginx may additionally serve its own robots.txt ahead of the
 * app — that override is compatible (both say Disallow) and untouched here.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  const isProductionSite = process.env.SITE_ENV === 'production';

  const body = isProductionSite
    ? [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /api',
        '',
        `Sitemap: ${CANONICAL_BASE}/sitemap.xml`,
        '',
      ].join('\n')
    : ['User-agent: *', 'Disallow: /', ''].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
