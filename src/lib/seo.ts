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

// ── Page titles (Brief 146 follow-up) ────────────────────────────────────────
/**
 * The root layout appends the brand to every page title via Next's
 * `metadata.title.template`. Titles that ALREADY end in the brand therefore
 * rendered it twice — e.g. `/kitchen-plumbing` shipped
 * `"Kitchen Plumbing in Chicagoland | J. Blanton Plumbing | J. Blanton Plumbing"`.
 * Brief 145 spotted this on `/gas-lines`; the audit that followed found it on 11
 * `sub_service_pages` rows, the 45 city-service content files (≈9,700 URLs), the
 * five category routes, five main pages and all 812 articles.
 *
 * The fix is normalization at the RENDER boundary rather than a one-time data
 * sweep: `pageTitle()` strips a trailing brand suffix from whatever a page's
 * title source produces, so the template composes it exactly once. That holds
 * for CMS values an editor types tomorrow — a data sweep would not.
 *
 * Titles hardcoded in route files were fixed at the literal instead; there is
 * nothing to normalize when we own the string.
 */
export const BRAND_SUFFIX = 'J. Blanton Plumbing';

/** The ONE place the brand suffix is composed onto a page title. */
export const TITLE_TEMPLATE = `%s | ${BRAND_SUFFIX}`;

/**
 * Trailing " | J. Blanton Plumbing" / " - J. Blanton Plumbing" and friends.
 * Tolerant of: pipe, hyphen, en/em dash; missing space before the separator
 * (`sub_service_pages` id 11 stores `"…in Chicago| J. Blanton Plumbing"`); a
 * missing period after the J; and any trailing whitespace.
 */
const BRAND_TAIL = /\s*[|–—-]\s*J\.?\s*Blanton\s*Plumbing\s*$/i;

/**
 * A page title with the brand suffix removed, ready for the layout's title
 * template to append it once.
 *
 * Applied repeatedly, so a value carrying the suffix twice is still reduced to
 * one. A title that IS the brand (`"J. Blanton Plumbing"`) is returned intact —
 * stripping it would leave an empty `<title>`.
 */
export function pageTitle(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim();
  let out = trimmed;
  while (BRAND_TAIL.test(out)) {
    const next = out.replace(BRAND_TAIL, '').trim();
    if (!next) break; // the title is the brand itself — leave it alone
    out = next;
  }
  return out || trimmed;
}
