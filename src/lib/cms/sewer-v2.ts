/**
 * Brief 204 — the read path for the 10 Sewer v2 pages (`/services/sewer` + 9 service pages).
 *
 * Render gate (Brief 159), per page:
 *   - a v2 preview draft under the editor's preview cookie → that draft (status ignored, banner on);
 *   - no row                    → the code module (200). That is how the 5 pages that never had a
 *                                 row serve until the deploy seed creates theirs;
 *   - a row that is NOT published → 404 (`null` here; the route calls notFound());
 *   - a published row without `v2_content` → the code module. That is the "new code, seed not run
 *                                 yet" state, and why the row's meta columns are read ONLY with
 *                                 `v2_content`: the legacy rows still hold the pre-v2 titles;
 *   - a published row with `v2_content` → the row, conformed (sanitised + layout-checked, see
 *                                 sewer-v2-cms/conform.ts) and merged key by key over the code
 *                                 module. A row whose STRUCTURE no longer fits the code falls back
 *                                 to the code module entirely (logged), never to a broken layout;
 *   - the database unreachable  → the code module. Today's pages never touch the DB, so they never
 *                                 fail on it; that stays true.
 *
 * The sewer-shared sections come from the hub row's `v2_content.shared` the same way, for all 10.
 * Conformed rows are memoised per (table, slug, version), so sanitising runs once per publish, not
 * once per request.
 */
import { cache } from 'react';
import pool from '@/lib/db';
import { getSewerV2Preview, type PreviewMeta } from '@/lib/cms/preview';
import { SEWER_V2_SANITIZERS } from '@/lib/cms/sewer-v2-sanitize';
import { pageTitle } from '@/lib/seo';
import type { SewerServicePage, SewerServiceStored, SewerSharedContent } from '@/lib/content/sewer-v2/types';
import type { SewerHubContent } from '@/lib/content/sewer-v2/hub';
import { SEWER_V2_SERVICE_SLUGS } from '@/lib/content/sewer-v2/routes';
import {
  isSewerV2Slug,
  mergeOver,
  SEWER_V2_HUB_SLUG,
  SEWER_V2_TEMPLATE,
  storedToPage,
  type SewerHubStored,
  type SewerServiceSlug,
  type SewerV2DraftContent,
} from '@/lib/sewer-v2-cms/model';
import { conformHub, conformService } from '@/lib/sewer-v2-cms/conform';
import { codeHubMeta, codeHubStored, codeServiceMeta, codeServiceStored } from '@/lib/sewer-v2-cms/code-defaults';

export type SewerV2Source = 'row' | 'code' | 'preview';

interface RowState {
  status: string;
  version: number;
  v2: unknown;
  metaTitle: string | null;
  metaDescription: string | null;
}

/** One row, or null (no row), or 'error' (DB unreachable / query failed → code fallback). */
async function readRow(table: 'sub_service_pages' | 'service_category_pages', slug: string): Promise<RowState | null | 'error'> {
  try {
    const res = await pool.query(
      `SELECT status, version, v2_content, meta_title, meta_description FROM ${table} WHERE slug = $1`,
      [slug]
    );
    const r = res.rows[0];
    if (!r) return null;
    return { status: r.status, version: r.version ?? 0, v2: r.v2_content ?? null, metaTitle: r.meta_title, metaDescription: r.meta_description };
  } catch (err) {
    console.error(`[sewer-v2] ${table}/${slug} read failed — rendering the code module`, err instanceof Error ? err.message : err);
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

function serviceFromStored(slug: SewerServiceSlug, raw: unknown, where: string): SewerServiceStored | null {
  const code = codeServiceStored(slug);
  const { value, errors } = conformService(raw, code, SEWER_V2_SANITIZERS);
  if (structureBroken(errors)) {
    console.error(`[sewer-v2] ${where}: stored layout no longer matches the code module — rendering the code module`, errors.slice(0, 3));
    return null;
  }
  return mergeOver(value, code);
}

function hubFromStored(raw: unknown, where: string): SewerHubStored | null {
  const code = codeHubStored();
  const { value, errors } = conformHub(raw, code, SEWER_V2_SANITIZERS);
  if (structureBroken(errors)) {
    console.error(`[sewer-v2] ${where}: stored layout no longer matches the code module — rendering the code module`, errors.slice(0, 3));
    return null;
  }
  return mergeOver(value, code);
}

const metaOver = (title: string | null | undefined, description: string | null | undefined, code: { title: string; description: string }) => ({
  title: title && title.trim() ? title : code.title,
  description: description && description.trim() ? description : code.description,
});

/** The live sewer-shared sections (hub row → code). */
export const loadSewerShared = cache(async (): Promise<{ shared: SewerSharedContent; source: SewerV2Source }> => {
  const row = await readRow('service_category_pages', SEWER_V2_HUB_SLUG);
  if (row && row !== 'error' && row.status === 'published' && row.v2) {
    const hub = memoised(`hub:${row.version}`, () => hubFromStored(row.v2, 'service_category_pages/sewer'));
    if (hub) return { shared: hub.shared, source: 'row' };
  }
  return { shared: codeHubStored().shared, source: 'code' };
});

export interface SewerServiceLoad {
  page: SewerServicePage;
  shared: SewerSharedContent;
  preview: PreviewMeta | null;
  source: SewerV2Source;
}

/** A service page, or null when its row exists and is not published (→ 404). */
export const loadSewerServicePage = cache(async (slug: SewerServiceSlug): Promise<SewerServiceLoad | null> => {
  const { shared } = await loadSewerShared();
  const preview = await getSewerV2Preview('sub-service', slug).catch(() => null);
  if (preview) {
    const stored = serviceFromStored(slug, preview.content.sewerV2, `preview draft ${preview.meta.id}`);
    if (stored) {
      const meta = metaOver(preview.content.metaTitle, preview.content.metaDescription, codeServiceMeta(slug));
      return { page: storedToPage(slug, stored, meta), shared, preview: preview.meta, source: 'preview' };
    }
  }
  const code = (): SewerServiceLoad => ({ page: storedToPage(slug, codeServiceStored(slug), codeServiceMeta(slug)), shared, preview: null, source: 'code' });
  const row = await readRow('sub_service_pages', slug);
  if (row === 'error' || row === null) return code();
  if (row.status !== 'published') return null;
  if (!row.v2) return code();
  const stored = memoised(`svc:${slug}:${row.version}`, () => serviceFromStored(slug, row.v2, `sub_service_pages/${slug}`));
  if (!stored) return code();
  return { page: storedToPage(slug, stored, metaOver(row.metaTitle, row.metaDescription, codeServiceMeta(slug))), shared, preview: null, source: 'row' };
});

export interface SewerHubLoad {
  hub: SewerHubContent;
  shared: SewerSharedContent;
  meta: { title: string; description: string };
  preview: PreviewMeta | null;
  source: SewerV2Source;
}

/** The hub (+ shared), or null when its row exists and is not published (→ 404). */
export const loadSewerHub = cache(async (): Promise<SewerHubLoad | null> => {
  const preview = await getSewerV2Preview('service', SEWER_V2_HUB_SLUG).catch(() => null);
  if (preview) {
    const stored = hubFromStored(preview.content.sewerV2, `preview draft ${preview.meta.id}`);
    if (stored) {
      return { hub: stored.hub, shared: stored.shared, meta: metaOver(preview.content.metaTitle, preview.content.metaDescription, codeHubMeta()), preview: preview.meta, source: 'preview' };
    }
  }
  const code = (): SewerHubLoad => {
    const c = codeHubStored();
    return { hub: c.hub, shared: c.shared, meta: codeHubMeta(), preview: null, source: 'code' };
  };
  const row = await readRow('service_category_pages', SEWER_V2_HUB_SLUG);
  if (row === 'error' || row === null) return code();
  if (row.status !== 'published') return null;
  if (!row.v2) return code();
  const stored = memoised(`hub:${row.version}`, () => hubFromStored(row.v2, 'service_category_pages/sewer'));
  if (!stored) return code();
  return { hub: stored.hub, shared: stored.shared, meta: metaOver(row.metaTitle, row.metaDescription, codeHubMeta()), preview: null, source: 'row' };
});

/** `<title>` / description for a service page (suffix-free; the root layout appends the brand once). */
export async function sewerServiceMetaFor(slug: SewerServiceSlug): Promise<{ title: string; description: string } | null> {
  const load = await loadSewerServicePage(slug);
  return load ? { title: pageTitle(load.page.meta.title), description: load.page.meta.description } : null;
}

export async function sewerHubMetaFor(): Promise<{ title: string; description: string } | null> {
  const load = await loadSewerHub();
  return load ? { title: pageTitle(load.meta.title), description: load.meta.description } : null;
}

/**
 * Brief 204 (Track D2) — where each of the 10 pages' content comes from right now, through the SAME
 * reader the pages use (no preview: this is a public, cookie-free read). The post-deploy check reads
 * it to prove the pages serve their rows, not the code fallback.
 */
export async function sewerV2Sources(): Promise<Record<string, { source: SewerV2Source | 'not-found' }>> {
  const out: Record<string, { source: SewerV2Source | 'not-found' }> = {};
  const hub = await loadHubNoPreview();
  out[`/services/${SEWER_V2_HUB_SLUG}`] = { source: hub };
  for (const slug of SEWER_V2_SERVICE_SLUGS) {
    const row = await readRow('sub_service_pages', slug);
    let source: SewerV2Source | 'not-found' = 'code';
    if (row && row !== 'error') {
      if (row.status !== 'published') source = 'not-found';
      else if (row.v2 && memoised(`svc:${slug}:${row.version}`, () => serviceFromStored(slug, row.v2, `sub_service_pages/${slug}`))) source = 'row';
    }
    out[`/${slug}`] = { source };
  }
  return out;
}

async function loadHubNoPreview(): Promise<SewerV2Source | 'not-found'> {
  const row = await readRow('service_category_pages', SEWER_V2_HUB_SLUG);
  if (!row || row === 'error') return 'code';
  if (row.status !== 'published') return 'not-found';
  return row.v2 && memoised(`hub:${row.version}`, () => hubFromStored(row.v2, 'service_category_pages/sewer')) ? 'row' : 'code';
}

export interface SewerV2EditorLoad {
  exists: boolean;
  status: string | null;
  version: number;
  updatedAt: string | null;
  /** What the public page shows right now, as a version's content (row over code). */
  content: SewerV2DraftContent;
  source: 'row' | 'code';
}

/** The v2 editor's initial state for one of the 10 pages (no preview overlay). */
export async function loadSewerV2ForEditor(slug: string): Promise<SewerV2EditorLoad | null> {
  if (!isSewerV2Slug(slug)) return null;
  const hub = slug === SEWER_V2_HUB_SLUG;
  const table = hub ? 'service_category_pages' : 'sub_service_pages';
  const res = await pool.query(
    `SELECT status, version, updated_at, v2_content, meta_title, meta_description FROM ${table} WHERE slug = $1`,
    [slug]
  );
  const r = res.rows[0];
  const v2 = r?.v2_content ?? null;
  let body: SewerServiceStored | SewerHubStored | null = null;
  if (v2) body = hub ? hubFromStored(v2, `${table}/${slug}`) : serviceFromStored(slug as SewerServiceSlug, v2, `${table}/${slug}`);
  const source: 'row' | 'code' = body ? 'row' : 'code';
  if (!body) body = hub ? codeHubStored() : codeServiceStored(slug as SewerServiceSlug);
  const codeMeta = hub ? codeHubMeta() : codeServiceMeta(slug as SewerServiceSlug);
  const meta = source === 'row' ? metaOver(r?.meta_title, r?.meta_description, codeMeta) : codeMeta;
  return {
    exists: !!r,
    status: r?.status ?? null,
    version: r?.version ?? 0,
    updatedAt: r?.updated_at ? new Date(r.updated_at).toISOString() : null,
    content: { template: SEWER_V2_TEMPLATE, sewerV2: body, metaTitle: meta.title, metaDescription: meta.description },
    source,
  };
}
