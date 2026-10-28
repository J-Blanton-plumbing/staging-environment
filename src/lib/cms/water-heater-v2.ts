/**
 * Brief 222 — the read path for the 6 water heater pages (`/services/water-heater` + 5 service pages).
 * The Brief 204 render gate, per page:
 *   - a water heater v2 preview draft under the editor's preview cookie → that draft (banner on);
 *   - no row                      → the code module (200). That is how the 3 pages that have no row in
 *                                   production yet (repair / installation / maintenance) serve until the
 *                                   deploy seed creates theirs;
 *   - a row that is NOT published → 404 (null here; the route calls notFound());
 *   - a published row without `v2_content` → the code module ("new code, seed not run yet"). The row's
 *                                   meta columns are read ONLY with `v2_content` (the legacy rows still
 *                                   hold the pre-v2 titles);
 *   - a published row with `v2_content` → the row, conformed (sanitised + layout-checked) and merged key by
 *                                   key over the code module. A row whose STRUCTURE no longer fits the
 *                                   code falls back to the code module entirely (logged);
 *   - the database unreachable    → the code module.
 * The water-heater-shared sections come from the hub row's `v2_content.shared` the same way, for all 6.
 */
import { cache } from 'react';
import pool from '@/lib/db';
import { getWaterHeaterV2Preview } from '@/lib/cms/preview';
import type { PreviewMeta } from '@/lib/cms/preview';
import { SEWER_V2_SANITIZERS } from '@/lib/cms/sewer-v2-sanitize';
import { pageTitle } from '@/lib/seo';
import type { WhPage, WhSharedContent, WhStored } from '@/lib/content/water-heater-v2/types';
import {
  isWhSlug,
  mergeOver,
  storedToPage,
  whPathFor,
  WH_V2_HUB_SLUG,
  WH_V2_MARKER,
  WH_V2_SERVICE_SLUGS,
  type WhServiceSlug,
  type WhV2DraftContent,
} from '@/lib/water-heater-v2-cms/model';
import { conformWhHub, conformWhPage } from '@/lib/water-heater-v2-cms/conform';
import { codeWhHubMeta, codeWhHubStored, codeWhServiceMeta, codeWhServiceStored } from '@/lib/water-heater-v2-cms/code-defaults';
import type { WhHubStored } from '@/lib/content/water-heater-v2/types';

export type WhV2Source = 'row' | 'code' | 'preview';

interface RowState {
  status: string;
  version: number;
  v2: unknown;
  metaTitle: string | null;
  metaDescription: string | null;
}

async function readRow(table: 'sub_service_pages' | 'service_category_pages', slug: string): Promise<RowState | null | 'error'> {
  try {
    const res = await pool.query(`SELECT status, version, v2_content, meta_title, meta_description FROM ${table} WHERE slug = $1`, [slug]);
    const r = res.rows[0];
    if (!r) return null;
    return { status: r.status, version: r.version ?? 0, v2: r.v2_content ?? null, metaTitle: r.meta_title, metaDescription: r.meta_description };
  } catch (err) {
    console.error(`[water-heater-v2] ${table}/${slug} read failed — rendering the code module`, err instanceof Error ? err.message : err);
    return 'error';
  }
}

const memo = new Map<string, unknown>();
function memoised<T>(key: string, build: () => T): T {
  if (memo.has(key)) return memo.get(key) as T;
  const v = build();
  if (memo.size > 64) memo.clear();
  memo.set(key, v);
  return v;
}

const structureBroken = (errors: { kind: string }[]) => errors.some((e) => e.kind === 'structure');

function serviceFromStored(slug: WhServiceSlug, raw: unknown, where: string): WhStored | null {
  const code = codeWhServiceStored(slug);
  const { value, errors } = conformWhPage(raw, code, SEWER_V2_SANITIZERS);
  if (structureBroken(errors)) {
    console.error(`[water-heater-v2] ${where}: stored layout no longer matches the code module — rendering the code module`, errors.slice(0, 3));
    return null;
  }
  return mergeOver(value, code);
}

function hubFromStored(raw: unknown, where: string): WhHubStored | null {
  const code = codeWhHubStored();
  const { value, errors } = conformWhHub(raw, code, SEWER_V2_SANITIZERS);
  if (structureBroken(errors)) {
    console.error(`[water-heater-v2] ${where}: stored layout no longer matches the code module — rendering the code module`, errors.slice(0, 3));
    return null;
  }
  return mergeOver(value, code);
}

const metaOver = (title: string | null | undefined, description: string | null | undefined, code: { title: string; description: string }) => ({
  title: title && title.trim() ? title : code.title,
  description: description && description.trim() ? description : code.description,
});

/** The live water-heater-shared sections (hub row → code). */
export const loadWhShared = cache(async (): Promise<WhSharedContent> => {
  const row = await readRow('service_category_pages', WH_V2_HUB_SLUG);
  if (row && row !== 'error' && row.status === 'published' && row.v2) {
    const hub = memoised(`hub:${row.version}`, () => hubFromStored(row.v2, 'service_category_pages/water-heater'));
    if (hub) return hub.shared;
  }
  return codeWhHubStored().shared;
});

export interface WhLoad {
  page: WhPage;
  shared: WhSharedContent;
  preview: PreviewMeta | null;
  source: WhV2Source;
}

/** A service page, or null when its row exists and is not published (→ 404). */
export const loadWhServicePage = cache(async (slug: WhServiceSlug): Promise<WhLoad | null> => {
  const shared = await loadWhShared();
  const preview = await getWaterHeaterV2Preview('sub-service', slug).catch(() => null);
  if (preview) {
    const stored = serviceFromStored(slug, preview.content.whV2, `preview draft ${preview.meta.id}`);
    if (stored) {
      const meta = metaOver(preview.content.metaTitle, preview.content.metaDescription, codeWhServiceMeta(slug));
      return { page: storedToPage(slug, stored, meta), shared, preview: preview.meta, source: 'preview' };
    }
  }
  const code = (): WhLoad => ({ page: storedToPage(slug, codeWhServiceStored(slug), codeWhServiceMeta(slug)), shared, preview: null, source: 'code' });
  const row = await readRow('sub_service_pages', slug);
  if (row === 'error' || row === null) return code();
  if (row.status !== 'published') return null;
  if (!row.v2) return code();
  const stored = memoised(`svc:${slug}:${row.version}`, () => serviceFromStored(slug, row.v2, `sub_service_pages/${slug}`));
  if (!stored) return code();
  return { page: storedToPage(slug, stored, metaOver(row.metaTitle, row.metaDescription, codeWhServiceMeta(slug))), shared, preview: null, source: 'row' };
});

/** The hub (+ shared), or null when its row exists and is not published (→ 404). */
export const loadWhHub = cache(async (): Promise<WhLoad | null> => {
  const preview = await getWaterHeaterV2Preview('service', WH_V2_HUB_SLUG).catch(() => null);
  if (preview) {
    const stored = hubFromStored(preview.content.whV2, `preview draft ${preview.meta.id}`);
    if (stored) {
      const meta = metaOver(preview.content.metaTitle, preview.content.metaDescription, codeWhHubMeta());
      return { page: storedToPage(WH_V2_HUB_SLUG, stored, meta), shared: stored.shared, preview: preview.meta, source: 'preview' };
    }
  }
  const code = (): WhLoad => {
    const c = codeWhHubStored();
    return { page: storedToPage(WH_V2_HUB_SLUG, c, codeWhHubMeta()), shared: c.shared, preview: null, source: 'code' };
  };
  const row = await readRow('service_category_pages', WH_V2_HUB_SLUG);
  if (row === 'error' || row === null) return code();
  if (row.status !== 'published') return null;
  if (!row.v2) return code();
  const stored = memoised(`hub:${row.version}`, () => hubFromStored(row.v2, 'service_category_pages/water-heater'));
  if (!stored) return code();
  return { page: storedToPage(WH_V2_HUB_SLUG, stored, metaOver(row.metaTitle, row.metaDescription, codeWhHubMeta())), shared: stored.shared, preview: null, source: 'row' };
});

/** `<title>` (suffix-free; the root layout appends the brand once) and description. */
export async function whMetaFor(slug: string): Promise<{ title: string; description: string; image: string } | null> {
  const load = slug === WH_V2_HUB_SLUG ? await loadWhHub() : await loadWhServicePage(slug as WhServiceSlug);
  return load ? { title: pageTitle(load.page.meta.title), description: load.page.meta.description, image: load.page.hero.image.src } : null;
}

/** Where each page's content comes from right now (public, cookie-free) — for the post-deploy check. */
export async function waterHeaterV2Sources(): Promise<Record<string, { source: WhV2Source | 'not-found' }>> {
  const out: Record<string, { source: WhV2Source | 'not-found' }> = {};
  const hubRow = await readRow('service_category_pages', WH_V2_HUB_SLUG);
  let hub: WhV2Source | 'not-found' = 'code';
  if (hubRow && hubRow !== 'error') {
    if (hubRow.status !== 'published') hub = 'not-found';
    else if (hubRow.v2 && memoised(`hub:${hubRow.version}`, () => hubFromStored(hubRow.v2, 'service_category_pages/water-heater'))) hub = 'row';
  }
  out[whPathFor(WH_V2_HUB_SLUG)] = { source: hub };
  for (const slug of WH_V2_SERVICE_SLUGS) {
    const row = await readRow('sub_service_pages', slug);
    let source: WhV2Source | 'not-found' = 'code';
    if (row && row !== 'error') {
      if (row.status !== 'published') source = 'not-found';
      else if (row.v2 && memoised(`svc:${slug}:${row.version}`, () => serviceFromStored(slug, row.v2, `sub_service_pages/${slug}`))) source = 'row';
    }
    out[whPathFor(slug)] = { source };
  }
  return out;
}

export interface WhEditorLoad {
  exists: boolean;
  status: string | null;
  version: number;
  updatedAt: string | null;
  content: WhV2DraftContent;
  source: 'row' | 'code';
}

/** The editor's initial state for one of the 6 pages (no preview overlay). */
export async function loadWhForEditor(slug: string): Promise<WhEditorLoad | null> {
  if (!isWhSlug(slug)) return null;
  const hub = slug === WH_V2_HUB_SLUG;
  const table = hub ? 'service_category_pages' : 'sub_service_pages';
  const res = await pool.query(`SELECT status, version, updated_at, v2_content, meta_title, meta_description FROM ${table} WHERE slug = $1`, [slug]);
  const r = res.rows[0];
  const v2 = r?.v2_content ?? null;
  let body: WhStored | WhHubStored | null = null;
  if (v2) body = hub ? hubFromStored(v2, `${table}/${slug}`) : serviceFromStored(slug as WhServiceSlug, v2, `${table}/${slug}`);
  const source: 'row' | 'code' = body ? 'row' : 'code';
  if (!body) body = hub ? codeWhHubStored() : codeWhServiceStored(slug as WhServiceSlug);
  const codeMeta = hub ? codeWhHubMeta() : codeWhServiceMeta(slug as WhServiceSlug);
  const meta = source === 'row' ? metaOver(r?.meta_title, r?.meta_description, codeMeta) : codeMeta;
  return {
    exists: !!r,
    status: r?.status ?? null,
    version: r?.version ?? 0,
    updatedAt: r?.updated_at ? new Date(r.updated_at).toISOString() : null,
    content: { template: WH_V2_MARKER, whV2: body, metaTitle: meta.title, metaDescription: meta.description },
    source,
  };
}
