/**
 * `/sitemap-cities.xml` — the `/{city}` landing pages (Brief 153, Track B).
 *
 * Listed in `/sitemap.xml`; see `src/lib/sitemap/manifest.ts`.
 */
import { renderCitiesSitemap, xmlResponse, SITEMAP_TTL } from '@/lib/sitemap/render';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  return xmlResponse(await renderCitiesSitemap(), SITEMAP_TTL.fresh);
}
