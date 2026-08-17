import { headers } from 'next/headers';
import { CANONICAL_BASE } from '@/lib/seo';

/**
 * Brief 127 (Track D): environment-aware robots.txt. Revised 2026-08-11.
 *
 * This is an explicit Route Handler rather than the app/robots.ts metadata
 * convention because Next 14.2.5 builds the metadata version as a static route
 * — `export const dynamic` is ignored there, which would bake the decision in at
 * build time. As a plain handler it is evaluated per request, so a change takes
 * effect on restart without a rebuild.
 *
 * WHY THE DEFAULT FLIPPED. The gate used to be `SITE_ENV === 'production'`, with
 * everything else serving `Disallow: /`. The reasoning was that forgetting the
 * flag on production only costs crawl time, while an indexed staging host diluting
 * the live domain is worse.
 *
 * That trade broke badly. On 2026-08-11 the compromised live site was replaced by
 * the staging environment in an emergency; that box has no SITE_ENV, so
 * jblantonplumbing.com served `User-agent: * / Disallow: /` — the live site
 * actively telling every crawler to drop it, silently, for as long as nobody
 * checked. "Costs some crawl time" understated it: sustained, it de-indexes the
 * business.
 *
 * So the decision is now driven by the REQUEST HOST, which cannot drift out of
 * sync with reality the way an env var on a box can:
 *   - any host on the brand domain
 *     (jblantonplumbing.com, www., staging.) → crawlable
 *   - localhost, an IP literal, anything
 *     off-domain                            → Disallow: /
 *   - SITE_ENV=production                    → crawlable regardless of host
 *   - ROBOTS_DISALLOW=1                      → Disallow regardless of host
 *
 * NOTE ON PRECEDENCE. A non-production SITE_ENV deliberately does NOT force
 * Disallow any more. The box now serving the live site is the former staging box
 * and may well still carry SITE_ENV=staging; honouring that would keep the live
 * site de-indexed for exactly as long as nobody thought to look at an env var —
 * the failure this rewrite exists to end. Opting a host out is therefore an
 * explicit ROBOTS_DISALLOW=1, which cannot be set by accident or left over.
 *
 * WHY THE WHOLE DOMAIN AND NOT JUST THE APEX. During the 2026-08-11 incident the
 * apex is nginx-proxied to the very same app instance that serves
 * staging.jblantonplumbing.com — one deployment, two hostnames, and visitors may
 * see either in the address bar. Matching only the apex would have served
 * `Disallow: /` to anyone arriving on the staging hostname: the same de-indexing
 * failure this rewrite exists to prevent, just narrower.
 *
 * ⚠️ CONSEQUENCE: a future staging host under this domain would be crawlable by
 * default. It must set SITE_ENV to something other than 'production' to opt out —
 * the same explicit-opt-out shape as NEXT_PUBLIC_TRACKING_DISABLED in
 * src/lib/analytics.ts. Defaulting the LIVE site to crawlable is the safer error
 * now that the two roles are served by one box.
 *
 * Host-based logic is safe here in a way it would NOT be for tracking IDs (see
 * the rule in src/lib/analytics.ts): the worst case for a spoofed Host header is
 * that someone receives a crawlable robots.txt they could have written by hand.
 * No data leaves, and no third-party account is touched.
 */
export const dynamic = 'force-dynamic';

/** Hostname of the canonical production origin, e.g. `jblantonplumbing.com`. */
function canonicalHost(): string {
  try {
    return new URL(CANONICAL_BASE).host.toLowerCase();
  } catch {
    return '';
  }
}

export function GET() {
  const siteEnv = (process.env.SITE_ENV ?? '').trim().toLowerCase();
  const forceDisallow = (process.env.ROBOTS_DISALLOW ?? '').trim() === '1';

  // `host` is the requested hostname; strip any port before comparing.
  const requestHost = (headers().get('host') ?? '').toLowerCase().split(':')[0];
  const domain = canonicalHost().split(':')[0].replace(/^www\./, '');
  // The apex and any subdomain of it (www., staging.) are all public surfaces of
  // the same deployment during the incident. localhost and IP literals are not,
  // and fall through to Disallow.
  const onBrandDomain =
    Boolean(domain) && (requestHost === domain || requestHost.endsWith(`.${domain}`));

  const crawlable = forceDisallow ? false : siteEnv === 'production' || onBrandDomain;

  // Brief 152 (Fix 4): NO `Disallow` lines. `Disallow: /admin` + `Disallow: /api`
  // were removed on purpose — see the block comment above the `X-Robots-Tag`
  // headers() rules in next.config.mjs. Blocking the crawl left 25 of those URLs
  // permanently stuck in Google's index (indexed from links, un-fetchable, so the
  // noindex could never be read). Those two prefixes now answer
  // `X-Robots-Tag: noindex, nofollow` instead, which is the instruction that
  // actually removes a page.
  //
  // ⚠️ DO NOT "tidy up" by re-adding a Disallow for /admin or /api. It would
  // re-block the crawl and make the noindex header unreadable, restoring the
  // exact defect this replaced. Access control is unrelated to and unaffected by
  // this file.
  const body = crawlable
    ? [
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${CANONICAL_BASE}/sitemap.xml`,
        '',
      ].join('\n')
    : ['User-agent: *', 'Disallow: /', ''].join('\n');

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain' },
  });
}
