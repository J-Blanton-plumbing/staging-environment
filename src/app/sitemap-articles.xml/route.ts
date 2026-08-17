/**
 * `/sitemap-articles.xml` — published Knowledge Hub articles (Brief 153, Track B).
 *
 * Listed in `/sitemap.xml`; see `src/lib/sitemap/manifest.ts`.
 */
import { renderArticlesSitemap, xmlResponse, SITEMAP_TTL } from '@/lib/sitemap/render';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return xmlResponse(await renderArticlesSitemap(), SITEMAP_TTL.fresh);
}
