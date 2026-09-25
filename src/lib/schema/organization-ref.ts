import { BRAND_SUFFIX, CANONICAL_BASE, canonicalUrlFor } from '@/lib/seo';

/**
 * Brief 188 (Track F3) — the ONE Organization identity for structured data.
 *
 * `ORG_ID` is the node id every schema block points at. Brief 167 §B (amended)
 * emits the sitewide `Organization` block with this SAME id from this SAME
 * module, so the per-article `publisher` embedded below and the sitewide node
 * join into one entity when 167 ships. Do not change the id.
 *
 * Every value comes from the codebase's single sources, never typed:
 *   • name — `BRAND_SUFFIX` (src/lib/seo.ts), the brand every <title> ends in
 *   • url  — `canonicalUrlFor('/')`, i.e. CANONICAL_BASE (production origin)
 *   • logo — the Primary Logo (asset-manifest.md: default logo; PNG, 599×335,
 *            served at /logos/PNG/Primary Logo.png — 200 on production). Built
 *            from CANONICAL_BASE and NOT via canonicalUrlFor, which lowercases
 *            paths: the file lives in a case-sensitive `PNG/` folder on Linux.
 */
export const ORG_ID = `${CANONICAL_BASE}/#organization`;

export const ORG_LOGO_URL = `${CANONICAL_BASE}${encodeURI('/logos/PNG/Primary Logo.png')}`;

export interface OrganizationNode {
  '@type': 'Organization';
  '@id': string;
  name: string;
  url: string;
  logo: { '@type': 'ImageObject'; url: string; width: number; height: number };
}

export function organizationNode(): OrganizationNode {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: BRAND_SUFFIX,
    url: canonicalUrlFor('/'),
    logo: { '@type': 'ImageObject', url: ORG_LOGO_URL, width: 599, height: 335 },
  };
}

/** A bare reference to the Organization, for `author` (no invented byline). */
export function organizationRef(): { '@id': string } {
  return { '@id': ORG_ID };
}
