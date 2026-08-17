/**
 * Hosts on the brand domain that are NOT the public site (Brief 153, Track E).
 *
 * `dev.jblantonplumbing.com` and `prod.jblantonplumbing.com` both resolve
 * publicly and serve a copy of the site. Because they sit on the brand domain,
 * the host gate in `src/app/robots.txt/route.ts` hands them `Allow: /` — two
 * extra hosts inviting Google to index the same content, which works directly
 * against consolidating indexing on the apex. (Both currently have broken TLS —
 * an expired certificate and a hostname mismatch — which is why it has not bitten
 * yet. That is luck, not a control.)
 *
 * ─── Why a hardcoded list and not just ROBOTS_DISALLOW=1 ───────────────────
 * `ROBOTS_DISALLOW=1` is the documented opt-out (CLAUDE.md gotcha #12) and it
 * should still be set on both boxes — see the report's Track E handoff. But an
 * env var on a box is exactly the control that has already failed twice here:
 * the 2026-08-11 incident turned on a missing `SITE_ENV`, and gotcha #12 exists
 * because tracking and robots now fail OPEN. A list in the repo ships to every
 * box on every deploy and cannot be left unset on a machine nobody remembers.
 * Both together; neither alone.
 *
 * `staging.` is deliberately NOT here. Since the emergency promotion the apex is
 * nginx-proxied to the same app instance that answers
 * staging.jblantonplumbing.com, and which hostname is public is an open
 * clone-box decision that belongs to Marketing, not to this file.
 *
 * ⚠️ Keep in sync with the `has: [{ type: 'host' }]` rules in `next.config.mjs`
 * that add `X-Robots-Tag: noindex, nofollow` to every response from these hosts.
 * `next.config.mjs` is ESM JavaScript and cannot import this module;
 * `scripts/validate-sitemap.ts` asserts the two lists match and fails the build
 * if they drift.
 */

/** Subdomain labels of the brand domain that must never be crawled or indexed. */
export const NON_PUBLIC_SUBDOMAINS: readonly string[] = ['dev', 'prod'];

/**
 * True when `host` (no port) is one of the non-public clone hosts under
 * `domain` — e.g. `dev.jblantonplumbing.com` for domain `jblantonplumbing.com`.
 */
export function isNonPublicHost(host: string, domain: string): boolean {
  if (!host || !domain) return false;
  const h = host.toLowerCase().split(':')[0];
  return NON_PUBLIC_SUBDOMAINS.some((sub) => h === `${sub}.${domain}`);
}
