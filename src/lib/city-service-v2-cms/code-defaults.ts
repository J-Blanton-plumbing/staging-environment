/**
 * Brief 212 (Track B) — the City Service V2 code modules (src/lib/content/city-services-v2/data/*.json)
 * as stored-shape objects, and the LAYOUT TEMPLATE every V2 service page is locked to.
 *
 *   - `codeServiceStored(city, service)` — the 5 Batch 1 cities' pages: the fallback when a row is
 *     missing, unreadable or has no usable `v2_content`, and the Batch 1 seed's source.
 *   - `serviceLayout(city, service)` — the block layout a page must keep: its own code module when it
 *     has one, otherwise Northbrook's page for the same service with the city slug swapped into the
 *     section ids (the Brief 209 id rule: `northbrook-drains` → `geneva-drains`). Every Batch 2 MD
 *     matches Northbrook's block sequence (measured, Brief 212 C4), so Northbrook is the template for
 *     any city without code JSON.
 *
 * Server-only (the JSON is ~1.9 MB): never import from a client component or middleware.
 */
import { CITY_SERVICES_V2, getCityServiceV2 } from '@/lib/content/city-services-v2';
import type { CityServiceV2Page, CsBlock } from '@/lib/content/city-services-v2/types';
import { clone } from '@/lib/cms-v2/shared';
import { pageToStored, stripTitleTail, type CityServiceStored } from './model';

export const LAYOUT_CITY = 'northbrook';

/** The 29 V2 service slugs (Northbrook's set — the same in every Batch 1 city). */
export const CITY_SERVICE_V2_SLUGS: readonly string[] = Object.keys(CITY_SERVICES_V2[LAYOUT_CITY]);

export function isV2ServiceSlug(service: string): boolean {
  return CITY_SERVICE_V2_SLUGS.includes(service);
}

export function hasCodeService(city: string, service: string): boolean {
  return !!getCityServiceV2(city, service);
}

export function codeServiceStored(city: string, service: string): CityServiceStored | undefined {
  const p = getCityServiceV2(city, service);
  return p ? pageToStored(p) : undefined;
}

/** The code module's meta, title tail stripped (what the row stores). */
export function codeServiceMeta(city: string, service: string): { title: string; description: string } | undefined {
  const p = getCityServiceV2(city, service);
  return p ? { title: stripTitleTail(p.meta.title), description: p.meta.description } : undefined;
}

/** A Batch 1 id with the layout city's slug swapped for `city` (no-op when the page is its own template). */
export function rewriteId(id: string, from: string, to: string): string {
  return from === to ? id : id.split(from).join(to);
}

/** The block layout `city`/`service` must keep, or undefined when `service` has no V2 template. */
export function serviceLayout(city: string, service: string): CsBlock[] | undefined {
  const own = getCityServiceV2(city, service);
  if (own) return clone(own.blocks);
  const tpl = getCityServiceV2(LAYOUT_CITY, service);
  if (!tpl) return undefined;
  return clone(tpl.blocks).map((b) => ({ ...b, id: rewriteId(b.id, LAYOUT_CITY, city) }));
}

/** The layout city's whole page for a service (images, alts, ids the importer copies by position). */
export function layoutPage(service: string): CityServiceV2Page | undefined {
  const p = getCityServiceV2(LAYOUT_CITY, service);
  return p ? clone(p) : undefined;
}

/** The V2 hero image + alt of `service` (the rule service cards and new hub cards use, Brief 209 / 212 A-3). */
export function heroImageFor(service: string): { src: string; alt: string } | undefined {
  const p = getCityServiceV2(LAYOUT_CITY, service);
  return p ? { ...p.hero.img } : undefined;
}
