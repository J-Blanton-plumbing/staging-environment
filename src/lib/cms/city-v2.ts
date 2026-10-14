/**
 * City V2 CMS — the read path for the 145 City Service Pages V2 (`/{city}/{service}`) and the 5 City
 * Hubs V2 (`/{city}`), Brief 209 CMS wiring. The same render gate as Brief 204's sewer pages
 * (src/lib/cms/sewer-v2.ts), per page:
 *   - a v2 preview draft under the editor's preview cookie → that draft (status ignored, banner on);
 *   - no row                    → the code module (200) — Columbus and Tinley Park have no
 *                                 city_service_pages rows until the deploy seed creates them;
 *   - a row that is NOT published → 404 (`null` here; the route calls notFound());
 *   - a published row without `v2_content` → the code module ("new code, seed not run yet"), and
 *                                 the row's meta columns are read ONLY together with `v2_content`;
 *   - a published row with `v2_content` → the row, conformed (sanitised + layout-checked) and merged
 *                                 key by key over the code module; a row whose STRUCTURE no longer
 *                                 fits falls back to the code module entirely (logged);
 *   - the database unreachable  → the code module.
 * A city's shared service-page parts come from its hub row's `v2_content.shared` the same way.
 * Conformed rows are memoised per (row, version): sanitising runs once per publish, not per request.
 */
import { cache } from 'react';
import pool from '@/lib/db';
import { getCityV2Preview, type PreviewMeta } from '@/lib/cms/preview';
import { SEWER_V2_SANITIZERS } from '@/lib/cms/sewer-v2-sanitize';
import { pageTitle } from '@/lib/seo';
import { mergeOver } from '@/lib/sewer-v2-cms/model';
import { CITY_V2_TEMPLATE, isCityV2Target, type CityV2DraftContent } from '@/lib/city-v2-cms/model';
import { conformCityHub, conformCityService } from '@/lib/city-v2-cms/conform';
import { codeCityShared, codeHubMeta, codeHubStored, codeServiceMeta, codeServiceStored } from '@/lib/city-v2-cms/code-defaults';
import { CITY_V2_CITIES, CITY_V2_SERVICES, isCityV2City, isCityV2Service, type CityV2City } from '@/lib/content/city-services-v2/registry';
import type { CityServiceShared, CityServiceStored } from '@/lib/content/city-services-v2/types';
import type { CityHubStored } from '@/lib/content/city-hubs/stored';

export type CityV2Source = 'row' | 'code' | 'preview';

interface RowState {
  status: string;
  version: number;
  v2: unknown;
  metaTitle: string | null;
  metaDescription: string | null;
  updatedAt: Date | null;
}

const SELECT = 'status, version, v2_content, meta_title, meta_description, updated_at';
const toRow = (r: Record<string, unknown> | undefined): RowState | null =>
  r
    ? {
        status: r.status as string,
        version: (r.version as number) ?? 0,
        v2: r.v2_content ?? null,
        metaTitle: (r.meta_title as string | null) ?? null,
        metaDescription: (r.meta_description as string | null) ?? null,
        updatedAt: (r.updated_at as Date | null) ?? null,
      }
    : null;

/** One row, or null (no row), or 'error' (DB unreachable / query failed → code fallback). */
async function readServiceRow(city: string, service: string): Promise<RowState | null | 'error'> {
  try {
    const res = await pool.query(`SELECT ${SELECT} FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`, [city, service]);
    return toRow(res.rows[0]);
  } catch (err) {
    console.error(`[city-v2] city_service_pages/${city}/${service} read failed — rendering the code module`, err instanceof Error ? err.message : err);
    return 'error';
  }
}

async function readHubRow(city: string): Promise<RowState | null | 'error'> {
  try {
    const res = await pool.query(`SELECT ${SELECT} FROM city_pages WHERE city_slug = $1`, [city]);
    return toRow(res.rows[0]);
  } catch (err) {
    console.error(`[city-v2] city_pages/${city} read failed — rendering the code module`, err instanceof Error ? err.message : err);
    return 'error';
  }
}

const memo = new Map<string, unknown>();
function memoised<T>(key: string, build: () => T): T {
  if (memo.has(key)) return memo.get(key) as T;
  const v = build();
  if (memo.size > 400) memo.clear();
  memo.set(key, v);
  return v;
}

const structureBroken = (errors: { kind: string }[]) => errors.some((e) => e.kind === 'structure');

function serviceFromStored(city: string, service: string, raw: unknown, where: string): CityServiceStored | null {
  const code = codeServiceStored(city, service);
  if (!code) return null;
  const { value, errors } = conformCityService(raw, code, SEWER_V2_SANITIZERS);
  if (structureBroken(errors)) {
    console.error(`[city-v2] ${where}: stored layout no longer matches the code module — rendering the code module`, errors.slice(0, 3));
    return null;
  }
  return mergeOver(value, code);
}

function hubFromStored(city: string, raw: unknown, where: string): CityHubStored | null {
  const code = codeHubStored(city);
  if (!code) return null;
  const { value, errors } = conformCityHub(raw, code, SEWER_V2_SANITIZERS);
  if (structureBroken(errors)) {
    console.error(`[city-v2] ${where}: stored layout no longer matches the code module — rendering the code module`, errors.slice(0, 3));
    return null;
  }
  return mergeOver(value, code);
}

const metaOver = (title: string | null | undefined, description: string | null | undefined, code: { title: string; description: string }) => ({
  title: title && title.trim() ? title : code.title,
  description: description && description.trim() ? description : code.description,
});

/** A city's live shared service-page parts (hub row → code). */
export const loadCityShared = cache(async (city: CityV2City): Promise<{ shared: CityServiceShared; source: CityV2Source }> => {
  const row = await readHubRow(city);
  if (row && row !== 'error' && row.status === 'published' && row.v2) {
    const hub = memoised(`hub:${city}:${row.version}`, () => hubFromStored(city, row.v2, `city_pages/${city}`));
    if (hub) return { shared: hub.shared, source: 'row' };
  }
  return { shared: codeCityShared(city), source: 'code' };
});

export interface CityServiceLoad {
  stored: CityServiceStored;
  shared: CityServiceShared;
  /** Title WITHOUT the brand suffix (the layout template adds it). */
  meta: { title: string; description: string };
  preview: PreviewMeta | null;
  source: CityV2Source;
}

/** A V2 service page, or null when its row exists and is not published (→ 404). */
export const loadCityServicePage = cache(async (city: string, service: string): Promise<CityServiceLoad | null> => {
  if (!isCityV2Service(city, service)) return null;
  const { shared } = await loadCityShared(city as CityV2City);
  const slug = `${city}/${service}`;
  const codeMeta = codeServiceMeta(city, service)!;
  const preview = await getCityV2Preview('city-service', slug).catch(() => null);
  if (preview) {
    const stored = serviceFromStored(city, service, preview.content.cityV2, `preview draft ${preview.meta.id}`);
    if (stored) return { stored, shared, meta: metaOver(preview.content.metaTitle, preview.content.metaDescription, codeMeta), preview: preview.meta, source: 'preview' };
  }
  const code = (): CityServiceLoad => ({ stored: codeServiceStored(city, service)!, shared, meta: codeMeta, preview: null, source: 'code' });
  const row = await readServiceRow(city, service);
  if (row === 'error' || row === null) return code();
  if (row.status !== 'published') return null;
  if (!row.v2) return code();
  const stored = memoised(`svc:${slug}:${row.version}`, () => serviceFromStored(city, service, row.v2, `city_service_pages/${slug}`));
  if (!stored) return code();
  return { stored, shared, meta: metaOver(row.metaTitle, row.metaDescription, codeMeta), preview: null, source: 'row' };
});

export interface CityHubLoad {
  stored: CityHubStored;
  meta: { title: string; description: string };
  preview: PreviewMeta | null;
  source: CityV2Source;
}

/** A V2 hub, or null when its row exists and is not published (→ 404). */
export const loadCityHub = cache(async (city: string): Promise<CityHubLoad | null> => {
  if (!isCityV2City(city)) return null;
  const codeMeta = codeHubMeta(city)!;
  const preview = await getCityV2Preview('city', city).catch(() => null);
  if (preview) {
    const stored = hubFromStored(city, preview.content.cityV2, `preview draft ${preview.meta.id}`);
    if (stored) return { stored, meta: metaOver(preview.content.metaTitle, preview.content.metaDescription, codeMeta), preview: preview.meta, source: 'preview' };
  }
  const code = (): CityHubLoad => ({ stored: codeHubStored(city)!, meta: codeMeta, preview: null, source: 'code' });
  const row = await readHubRow(city);
  if (row === 'error' || row === null) return code();
  if (row.status !== 'published') return null;
  if (!row.v2) return code();
  const stored = memoised(`hub:${city}:${row.version}`, () => hubFromStored(city, row.v2, `city_pages/${city}`));
  if (!stored) return code();
  return { stored, meta: metaOver(row.metaTitle, row.metaDescription, codeMeta), preview: null, source: 'row' };
});

/** `<title>` / description (suffix-free: the root layout appends "| J. Blanton Plumbing" once). */
export async function cityServiceMetaFor(city: string, service: string): Promise<{ title: string; description: string } | null> {
  const load = await loadCityServicePage(city, service);
  return load ? { title: brandless(load.meta.title), description: load.meta.description } : null;
}

export async function cityHubMetaFor(city: string): Promise<{ title: string; description: string } | null> {
  const load = await loadCityHub(city);
  return load ? { title: brandless(load.meta.title), description: load.meta.description } : null;
}

/**
 * Every title closes with the template's "| J. Blanton Plumbing" (Marketing 2026-10-14): strip any
 * brand tail a stored or approved title carries — the full name, "| J. Blanton" or "| JBP".
 */
function brandless(title: string): string {
  return pageTitle(title.replace(/\s*\|\s*(?:J\.?\s*Blanton|JBP)\s*$/i, ''));
}

/**
 * Where each of the 150 pages' content comes from right now, through the SAME readers the pages use
 * (no preview). The post-deploy check reads it to prove the pages serve their rows.
 */
export async function cityV2Sources(): Promise<Record<string, { source: CityV2Source | 'not-found' }>> {
  const out: Record<string, { source: CityV2Source | 'not-found' }> = {};
  for (const city of CITY_V2_CITIES) {
    const hub = await readHubRow(city);
    out[`/${city}`] = { source: sourceOf(hub, () => hubFromStored(city, (hub as RowState).v2, `city_pages/${city}`), `hub:${city}`) };
    for (const service of CITY_V2_SERVICES) {
      const row = await readServiceRow(city, service);
      const slug = `${city}/${service}`;
      out[`/${slug}`] = { source: sourceOf(row, () => serviceFromStored(city, service, (row as RowState).v2, `city_service_pages/${slug}`), `svc:${slug}`) };
    }
  }
  return out;
}

function sourceOf(row: RowState | null | 'error', build: () => unknown, key: string): CityV2Source | 'not-found' {
  if (!row || row === 'error') return 'code';
  if (row.status !== 'published') return 'not-found';
  return row.v2 && memoised(`${key}:${row.version}`, build) ? 'row' : 'code';
}

export interface CityV2EditorLoad {
  exists: boolean;
  status: string | null;
  version: number;
  updatedAt: string | null;
  /** What the public page shows right now, as a version's content (row over code). */
  content: CityV2DraftContent;
  source: 'row' | 'code';
}

/** The v2 editor's initial state for one of the 150 pages (no preview overlay). */
export async function loadCityV2ForEditor(pageType: string, slug: string): Promise<CityV2EditorLoad | null> {
  if (!isCityV2Target(pageType, slug)) return null;
  const hub = pageType === 'city';
  const [city, service] = slug.split('/');
  const res = hub
    ? await pool.query(`SELECT ${SELECT} FROM city_pages WHERE city_slug = $1`, [city])
    : await pool.query(`SELECT ${SELECT} FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`, [city, service]);
  const r = toRow(res.rows[0]);
  let body: CityServiceStored | CityHubStored | null = null;
  if (r?.v2) body = hub ? hubFromStored(city, r.v2, `city_pages/${city}`) : serviceFromStored(city, service, r.v2, `city_service_pages/${slug}`);
  const source: 'row' | 'code' = body ? 'row' : 'code';
  if (!body) body = hub ? codeHubStored(city) : codeServiceStored(city, service);
  const codeMeta = hub ? codeHubMeta(city)! : codeServiceMeta(city, service)!;
  const meta = source === 'row' ? metaOver(r?.metaTitle, r?.metaDescription, codeMeta) : codeMeta;
  return {
    exists: !!r,
    status: r?.status ?? null,
    version: r?.version ?? 0,
    updatedAt: r?.updatedAt ? new Date(r.updatedAt).toISOString() : null,
    content: { template: CITY_V2_TEMPLATE, cityV2: body, metaTitle: meta.title, metaDescription: meta.description },
    source,
  };
}
