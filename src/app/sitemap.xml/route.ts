/**
 * `/sitemap.xml` — the `<sitemapindex>` (Brief 153, Track B).
 *
 * This is the ONLY sitemap URL robots.txt advertises and the only one to submit
 * to Search Console; the children are discovered from here.
 *
 * It replaces `src/app/sitemap.ts`, the Next `MetadataRoute.Sitemap` export,
 * which could only emit a flat `<urlset>` — and was emitting 1,104 URLs while
 * the site served ~12,300. The whole `/{city}/{service}` layer (11,160 live,
 * self-canonical pages) was invisible to it. A Route Handler is the layer that
 * can emit an index; see `src/lib/sitemap/manifest.ts` for the child list.
 *
 * Cheap by construction: no database, no child rendering — just the manifest.
 */
import { renderSitemapIndex, xmlResponse, SITEMAP_TTL } from '@/lib/sitemap/render';

export const dynamic = 'force-dynamic';

export function GET(): Response {
  return xmlResponse(renderSitemapIndex(), SITEMAP_TTL.fresh);
}
