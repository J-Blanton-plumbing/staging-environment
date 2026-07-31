/**
 * SEO helpers — canonical URL construction (Brief 127, Track A).
 *
 * HARD RULE (brief-127): canonical tags and sitemap <loc> entries ALWAYS use the
 * production hostname, even when the code runs on staging. The base URL comes
 * from environment config with a hardcoded production default — it must never
 * be derived from the incoming request's Host header, or staging would emit
 * `staging.` canonicals and de-value the production domain.
 *
 * Normalized URL form everywhere: https + non-www + no trailing slash +
 * lowercase path. The homepage is the bare origin with no trailing slash,
 * matching the existing sitemap convention.
 */

const RAW_BASE = process.env.CANONICAL_BASE_URL || 'https://jblantonplumbing.com';

/** Production origin for canonicals/sitemap — never a trailing slash. */
export const CANONICAL_BASE = RAW_BASE.replace(/\/+$/, '');

/**
 * Normalize a request pathname to canonical form: leading slash, no query or
 * hash, collapsed duplicate slashes, no trailing slash, lowercase. Root
 * normalizes to '/'.
 */
export function normalizePath(pathname: string): string {
  let p = pathname.split('?')[0].split('#')[0];
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/{2,}/g, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p.toLowerCase() || '/';
}

/** Absolute canonical URL for a page path. Root → bare origin (no slash). */
export function canonicalUrlFor(pathname: string): string {
  const p = normalizePath(pathname);
  return p === '/' ? CANONICAL_BASE : `${CANONICAL_BASE}${p}`;
}
