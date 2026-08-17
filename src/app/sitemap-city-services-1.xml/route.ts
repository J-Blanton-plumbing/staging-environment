/**
 * `/sitemap-city-services-1.xml` — shard 1 of the `/{city}/{service}` layer
 * (Brief 153, Track B).
 *
 * One explicit route directory per shard, on purpose: a dynamic segment here
 * would either collide with `src/app/[city]` or need a rewrite that leaves a
 * second, shadow URL serving the same XML. The shard's city-slug range and the
 * URL set live in `src/lib/sitemap/manifest.ts`;
 * `scripts/validate-sitemap.ts` fails the build if a declared shard has no
 * route file, if a route file has no declared shard, or if the ranges leave a
 * gap.
 */
import { CITY_SERVICE_SHARDS } from '@/lib/sitemap/manifest';
import { renderCityServiceShard, xmlResponse, SITEMAP_TTL } from '@/lib/sitemap/render';

export const dynamic = 'force-dynamic';

const SHARD = CITY_SERVICE_SHARDS.find((s) => s.id === 1)!;

export async function GET(): Promise<Response> {
  return xmlResponse(await renderCityServiceShard(SHARD), SITEMAP_TTL.cityService);
}
