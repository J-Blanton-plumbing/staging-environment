/**
 * Brief 212 (Track B) — the read path for City Service V2 pages (`/{city}/{service}`).
 *
 * Dispatch, per page (the Brief 204 model):
 *   1. a V2 version of THIS page under the editor's preview cookie → that draft (banner on);
 *   2. the row exists and is unpublished → 404 (Brief 159) — the route's own gate, unchanged;
 *   3. the published row has `v2_content` that fits the page's layout → V2 from the row;
 *   4. the page has a code module (the 5 Batch 1 cities) and the row has no usable `v2_content`, or
 *      there is no row / the DB is down → V2 from the code module (logged when non-conforming);
 *   5. no code module and no usable `v2_content` → the legacy CityServicePageTemplate, unchanged.
 * The row's `meta_title` / `meta_description` are read ONLY with `v2_content` (rows 1 and 3).
 * Conformed rows are memoised per (page, version), so sanitising runs once per publish.
 */
import { cache } from 'react';
import pool from '@/lib/db';
import { getCity } from '@/lib/content/cities';
import { isOhioCity, SERVICE_SERVER_CHECKS } from '@/lib/cms/v2-server-checks';
import type { CityServiceV2Page } from '@/lib/content/city-services-v2/types';
import { getCityServiceV2Preview, type PreviewMeta } from '@/lib/cms/preview';
import { storedToPage, stripTitleTail, type CityServiceStored } from '@/lib/city-service-v2-cms/model';
import { conformService, structureBroken } from '@/lib/city-service-v2-cms/conform';
import { codeServiceMeta, codeServiceStored, isV2ServiceSlug, pageLayout } from '@/lib/city-service-v2-cms/code-defaults';

export { SERVICE_SERVER_CHECKS };

export type ServiceSource = 'row' | 'code' | 'preview';

interface ServiceRow {
  status: string;
  version: number;
  v2: unknown;
  metaTitle: string | null;
  metaDescription: string | null;
}

async function readServiceRow(city: string, service: string): Promise<ServiceRow | null | 'error'> {
  try {
    const res = await pool.query(
      `SELECT status, version, v2_content, meta_title, meta_description
         FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`,
      [city, service]
    );
    const r = res.rows[0];
    if (!r) return null;
    return { status: r.status, version: r.version ?? 0, v2: r.v2_content ?? null, metaTitle: r.meta_title, metaDescription: r.meta_description };
  } catch (err) {
    console.error(`[city-service-v2] ${city}/${service} read failed — treating as no row`, err instanceof Error ? err.message : err);
    return 'error';
  }
}

const memo = new Map<string, unknown>();
function memoised<T>(key: string, build: () => T): T {
  if (memo.has(key)) return memo.get(key) as T;
  const v = build();
  if (memo.size > 512) memo.clear();
  memo.set(key, v);
  return v;
}

/**
 * Conformed stored content, or null when it no longer fits the page's layout. `published` = the row's
 * live `v2_content`: the layout the page is locked to (Brief 216 — `pageLayout`). For the live row
 * itself that is its own structure; for a preview draft it is the live page's.
 */
export function serviceFromStored(city: string, service: string, raw: unknown, where: string, published?: unknown): CityServiceStored | null {
  const layout = pageLayout(city, service, { published, draft: raw });
  if (!layout) return null;
  const { value, errors } = conformService(raw, layout, city, SERVICE_SERVER_CHECKS);
  if (structureBroken(errors)) {
    console.error(`[city-service-v2] ${where}: stored V2 content no longer fits the page layout — not rendering it`, errors.slice(0, 3));
    return null;
  }
  return value;
}

/** The Central Ohio phone applies to Ohio cities' V2 pages (Brief 192), derived from the registry. */
export function serviceUsesCentralOhioPhone(city: string): boolean {
  return isOhioCity(city);
}

const metaFrom = (title: string | null | undefined, description: string | null | undefined, fallback?: { title: string; description: string }) => ({
  title: title && title.trim() ? stripTitleTail(title) : fallback?.title ?? '',
  description: description && description.trim() ? description : fallback?.description ?? '',
});

export type CityServiceV2Dispatch =
  | { kind: 'v2'; page: CityServiceV2Page; preview: PreviewMeta | null; source: ServiceSource }
  | { kind: 'not-found' }
  | { kind: 'legacy' };

/**
 * Resolve one `/{city}/{service}` request. `checkStatus` = apply the Brief 159 gate here (the route
 * does, after the preview branch, exactly as before).
 */
export const resolveCityServiceV2 = cache(async (city: string, service: string, usePreview: boolean = true): Promise<CityServiceV2Dispatch> => {
  if (!getCity(city) || !isV2ServiceSlug(service)) return { kind: 'legacy' };
  if (usePreview) {
    const pv = await getCityServiceV2Preview(city, service).catch(() => null);
    if (pv) {
      const live = await readServiceRow(city, service);
      const stored = serviceFromStored(city, service, pv.content.page, `preview draft ${pv.meta.id}`, live && live !== 'error' ? live.v2 ?? undefined : undefined);
      if (stored) {
        return {
          kind: 'v2',
          page: storedToPage(city, service, stored, metaFrom(pv.content.metaTitle, pv.content.metaDescription, codeServiceMeta(city, service))),
          preview: pv.meta,
          source: 'preview',
        };
      }
    }
  }
  const code = codeServiceStored(city, service);
  const codeMeta = codeServiceMeta(city, service);
  const fromCode = (): CityServiceV2Dispatch =>
    code && codeMeta ? { kind: 'v2', page: storedToPage(city, service, code, codeMeta), preview: null, source: 'code' } : { kind: 'legacy' };
  const row = await readServiceRow(city, service);
  if (row === 'error' || row === null) return fromCode();
  if (row.status !== 'published') return code || row.v2 ? { kind: 'not-found' } : { kind: 'legacy' };
  if (!row.v2) return fromCode();
  const stored = memoised(`svc:${city}/${service}:${row.version}`, () => serviceFromStored(city, service, row.v2, `city_service_pages/${city}/${service}`, row.v2));
  if (!stored) return fromCode();
  return { kind: 'v2', page: storedToPage(city, service, stored, metaFrom(row.metaTitle, row.metaDescription, codeMeta)), preview: null, source: 'row' };
});

/** Where each page's content comes from (no preview) — `/api/city-services-v2/source`. */
export async function cityServiceV2Sources(
  cities: readonly string[],
  services: readonly string[]
): Promise<Record<string, { source: ServiceSource | 'not-found' | 'legacy'; row: 'none' | 'v2' | 'no-v2' }>> {
  const out: Record<string, { source: ServiceSource | 'not-found' | 'legacy'; row: 'none' | 'v2' | 'no-v2' }> = {};
  const rows = new Map<string, boolean>();
  try {
    const r = await pool.query<{ p: string; v: boolean }>(
      "SELECT city_slug || '/' || service_slug AS p, (v2_content IS NOT NULL) AS v FROM city_service_pages WHERE city_slug = ANY($1)",
      [[...cities]]
    );
    for (const x of r.rows) rows.set(x.p, x.v);
  } catch {
    /* DB down: every page reports row "none" */
  }
  for (const c of cities) {
    for (const s of services) {
      const d = await resolveCityServiceV2(c, s, false);
      const k = `${c}/${s}`;
      const row = rows.has(k) ? (rows.get(k) ? 'v2' : 'no-v2') : 'none';
      out[`/${k}`] = { source: d.kind === 'v2' ? d.source : d.kind, row };
    }
  }
  return out;
}

export interface CityServiceV2EditorLoad {
  exists: boolean;
  status: string | null;
  version: number;
  updatedAt: string | null;
  cityName: string;
  /** The page's V2 content (row over code), or null when it has none yet (a legacy page). */
  page: CityServiceStored | null;
  metaTitle: string;
  metaDescription: string;
  source: 'row' | 'code' | 'none';
  /** The ids of the layout's fold sections (the 301 contract — read-only in the editor). */
  foldIds: string[];
}

export async function loadCityServiceV2ForEditor(city: string, service: string): Promise<CityServiceV2EditorLoad | null> {
  const entry = getCity(city);
  if (!entry || !isV2ServiceSlug(service)) return null;
  const res = await pool.query(
    `SELECT status, version, updated_at, v2_content, meta_title, meta_description
       FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`,
    [city, service]
  );
  const r = res.rows[0];
  const layout = pageLayout(city, service, { published: r?.v2_content ?? undefined }) ?? [];
  let page: CityServiceStored | null = r?.v2_content ? serviceFromStored(city, service, r.v2_content, `city_service_pages/${city}/${service}`, r.v2_content) : null;
  let source: CityServiceV2EditorLoad['source'] = page ? 'row' : 'none';
  let meta = page ? metaFrom(r?.meta_title, r?.meta_description, codeServiceMeta(city, service)) : { title: '', description: '' };
  if (!page) {
    const code = codeServiceStored(city, service);
    const codeMeta = codeServiceMeta(city, service);
    if (code && codeMeta) {
      page = code;
      meta = codeMeta;
      source = 'code';
    }
  }
  return {
    exists: !!r,
    status: r?.status ?? null,
    version: r?.version ?? 0,
    updatedAt: r?.updated_at ? new Date(r.updated_at).toISOString() : null,
    cityName: entry.name,
    page,
    metaTitle: meta.title,
    metaDescription: meta.description,
    source,
    foldIds: layout.filter((b) => b.type === 'fold').map((b) => b.id),
  };
}
