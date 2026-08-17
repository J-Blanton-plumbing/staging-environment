/**
 * `/sitemap-pages.xml` — static top-level pages, the six `/services/*` category
 * hubs, and the published top-level sub-service routes (Brief 153, Track B).
 *
 * Listed in `/sitemap.xml`; see `src/lib/sitemap/manifest.ts`.
 */
import { renderPagesSitemap, xmlResponse, SITEMAP_TTL } from '@/lib/sitemap/render';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return xmlResponse(await renderPagesSitemap(), SITEMAP_TTL.fresh);
}
