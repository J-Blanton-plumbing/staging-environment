/**
 * Brief 212 (Track A = Brief 206 Tracks B–E) — the read path for City Hub pages.
 *
 * Dispatch, per `/{city}` (Brief 206 §A6, rows 1–6; row 0 — not in the registry — is the route's own):
 *   1. a City Hub version of this city under the editor's preview cookie → that draft (banner on).
 *      A version of the SHARED record under the cookie → the hub as it would otherwise render, with
 *      the draft's shared sections (banner on). Invisible to the public (session-gated).
 *   2. the row exists and is unpublished → 404 (Brief 159), whenever the page would be a hub;
 *   3. `template_type = 'city-hub'` and `hub_content` conforms → the hub from the row;
 *   4. the city has a code module (the 5 Batch 1 hubs) and `hub_content` is NULL, or non-conforming
 *      while on City Hub, or there is no row / the DB is down → the hub from the code module (logged
 *      when non-conforming). This covers the deploy window (new code, seed not run yet) and keeps the
 *      D3 restore clean;
 *   5. `template_type = 'city-hub'`, no usable `hub_content`, no code module (a city switched to City
 *      Hub before its first publish) → its PREVIOUS template (`pre_hub_template`, default
 *      coverage-area) from its legacy columns, as before the switch. Logged. Never a 500;
 *   6. everything else → the legacy dispatch, unchanged.
 *
 * The row's `meta_title` / `meta_description` are read ONLY on row 3 (the Brief 157/158 trap: a
 * switched row's meta columns still hold pre-hub values until the first hub publish).
 * The shared record comes from `main_pages` row `city-hubs` when it is published and conforms,
 * otherwise from the code default. Conformed values are memoised per (slug, version).
 */
import { cache } from 'react';
import pool from '@/lib/db';
import { getCity } from '@/lib/content/cities';
import { HUB_SERVER_CHECKS, isOhioCity } from '@/lib/cms/v2-server-checks';
import { getCityHubPreview, getCityHubSharedPreview, type PreviewMeta } from '@/lib/cms/preview';
import {
  CITY_HUB_SHARED_SLUG,
  CITY_HUB_TEMPLATE,
  toRender,
  type CityHubRender,
  type CityHubShared,
  type CityHubStored,
} from '@/lib/city-hub-cms/model';
import { conformHub, conformShared, structureBroken } from '@/lib/city-hub-cms/conform';
import { codeHubMeta, codeHubStored, codeSharedDefault, lockedCrop } from '@/lib/city-hub-cms/code-defaults';

export { HUB_SERVER_CHECKS };

export type HubSource = 'row' | 'code' | 'preview';

interface HubRow {
  status: string;
  version: number;
  templateType: string | null;
  preHubTemplate: string | null;
  hub: unknown;
  metaTitle: string | null;
  metaDescription: string | null;
}

/** One row, or null (no row), or 'error' (DB unreachable / query failed → treated as no row). */
async function readHubRow(slug: string): Promise<HubRow | null | 'error'> {
  try {
    const res = await pool.query(
      `SELECT status, version, template_type, pre_hub_template, hub_content, meta_title, meta_description
         FROM city_pages WHERE city_slug = $1`,
      [slug]
    );
    const r = res.rows[0];
    if (!r) return null;
    return {
      status: r.status,
      version: r.version ?? 0,
      templateType: r.template_type ?? null,
      preHubTemplate: r.pre_hub_template ?? null,
      hub: r.hub_content ?? null,
      metaTitle: r.meta_title,
      metaDescription: r.meta_description,
    };
  } catch (err) {
    console.error(`[city-hub] city_pages/${slug} read failed — treating as no row`, err instanceof Error ? err.message : err);
    return 'error';
  }
}

const memo = new Map<string, unknown>();
function memoised<T>(key: string, build: () => T): T {
  if (memo.has(key)) return memo.get(key) as T;
  const v = build();
  if (memo.size > 128) memo.clear();
  memo.set(key, v);
  return v;
}

/** Conformed hub content, or null when its STRUCTURE doesn't fit (→ caller falls back). */
export function hubFromStored(slug: string, raw: unknown, where: string): CityHubStored | null {
  const { value, errors } = conformHub(raw, slug, lockedCrop(slug), HUB_SERVER_CHECKS);
  if (structureBroken(errors)) {
    console.error(`[city-hub] ${where}: stored hub content no longer fits the City Hub layout — not rendering it`, errors.slice(0, 3));
    return null;
  }
  return value;
}

function sharedFromStored(raw: unknown, where: string): CityHubShared | null {
  const { value, errors } = conformShared(raw, HUB_SERVER_CHECKS);
  if (structureBroken(errors)) {
    console.error(`[city-hub] ${where}: stored shared record no longer fits — rendering the code default`, errors.slice(0, 3));
    return null;
  }
  return value;
}

/** The published shared record (or the code default), never a preview. */
export async function loadCityHubSharedLive(): Promise<{ shared: CityHubShared; source: 'row' | 'code'; version: number | null }> {
  try {
    const res = await pool.query(`SELECT status, version, content FROM main_pages WHERE slug = $1`, [CITY_HUB_SHARED_SLUG]);
    const r = res.rows[0];
    if (r && r.status === 'published' && r.content && typeof r.content === 'object' && Object.keys(r.content).length > 0) {
      const shared = memoised(`shared:${r.version}`, () => sharedFromStored(r.content, 'main_pages/city-hubs'));
      if (shared) return { shared, source: 'row', version: r.version ?? 0 };
    }
  } catch (err) {
    console.error('[city-hub] main_pages/city-hubs read failed — rendering the code default', err instanceof Error ? err.message : err);
  }
  return { shared: codeSharedDefault(), source: 'code', version: null };
}

/** Phone region from the registry (Brief 206 §2.2): an Ohio city's body uses the Central Ohio phone. */
export function hubPhoneRegion(slug: string): 'main' | 'central-ohio' {
  return isOhioCity(slug) ? 'central-ohio' : 'main';
}

const metaOver = (title: string | null | undefined, description: string | null | undefined, code: { title: string; description: string }) => ({
  title: title && title.trim() ? title : code.title,
  description: description && description.trim() ? description : code.description,
});

export type CityHubDispatch =
  | {
      kind: 'hub';
      hub: CityHubRender;
      shared: CityHubShared;
      meta: { title: string; description: string };
      /** The version shown under the preview cookie (hub or shared), else null. */
      preview: (PreviewMeta & { scope: 'hub' | 'shared' }) | null;
      source: HubSource;
    }
  | { kind: 'not-found' }
  /** Not a hub: the legacy dispatch renders it. `templateOverride` = row 5's previous template. */
  | { kind: 'legacy'; templateOverride: string | null };

/** Resolve one `/{city}` request (see the table at the top of this file). */
export const resolveCityHub = cache(async (slug: string, opts: { preview?: boolean } = { preview: true }): Promise<CityHubDispatch> => {
  const entry = getCity(slug);
  if (!entry) return { kind: 'legacy', templateOverride: null };
  const name = entry.name;
  const usePreview = opts.preview !== false;

  // Row 1: a City Hub version of this city under the preview cookie.
  if (usePreview) {
    const pv = await getCityHubPreview(slug).catch(() => null);
    if (pv) {
      const hub = hubFromStored(slug, pv.content.hub, `preview draft ${pv.meta.id}`);
      if (hub) {
        const { shared } = await loadCityHubSharedLive();
        return {
          kind: 'hub',
          hub: toRender(hub, slug, name),
          shared,
          meta: { title: pv.content.metaTitle || (codeHubMeta(slug)?.title ?? name), description: pv.content.metaDescription || (codeHubMeta(slug)?.description ?? '') },
          preview: { ...pv.meta, scope: 'hub' },
          source: 'preview',
        };
      }
    }
  }

  const row = await readHubRow(slug);
  const code = codeHubStored(slug);
  const codeMeta = codeHubMeta(slug);
  let base: { hub: CityHubStored; meta: { title: string; description: string }; source: 'row' | 'code' } | null = null;

  if (row && row !== 'error') {
    const onHub = row.templateType === CITY_HUB_TEMPLATE;
    const stored = onHub && row.hub ? memoised(`hub:${slug}:${row.version}`, () => hubFromStored(slug, row.hub, `city_pages/${slug}`)) : null;
    if (stored) {
      // Row 3.
      base = { hub: stored, meta: metaOver(row.metaTitle, row.metaDescription, codeMeta ?? { title: name, description: '' }), source: 'row' };
    } else if (code && codeMeta && (!row.hub || onHub)) {
      // Row 4 (hub_content NULL, or non-conforming while on City Hub).
      base = { hub: code, meta: codeMeta, source: 'code' };
    } else if (onHub) {
      // Row 5.
      console.warn(`[city-hub] "${slug}" is on the City Hub template with no usable hub content and no code module — rendering its previous template "${row.preHubTemplate ?? 'coverage-area'}".`);
      return { kind: 'legacy', templateOverride: row.preHubTemplate ?? 'coverage-area' };
    } else {
      return { kind: 'legacy', templateOverride: null };
    }
    // Row 2 (checked here so the preview cookie above still wins, as on every other template).
    if (row.status !== 'published') {
      const spv = usePreview ? await getCityHubSharedPreview().catch(() => null) : null;
      if (!spv) return { kind: 'not-found' };
    }
  } else if (code && codeMeta) {
    // Row 4 (no row / DB down).
    base = { hub: code, meta: codeMeta, source: 'code' };
  } else {
    return { kind: 'legacy', templateOverride: null };
  }

  // A version of the shared record under the preview cookie, shown on any hub.
  if (usePreview) {
    const spv = await getCityHubSharedPreview().catch(() => null);
    if (spv) {
      const shared = sharedFromStored(spv.content.shared, `shared preview draft ${spv.meta.id}`);
      if (shared) return { kind: 'hub', hub: toRender(base.hub, slug, name), shared, meta: base.meta, preview: { ...spv.meta, scope: 'shared' }, source: base.source };
    }
  }
  const { shared } = await loadCityHubSharedLive();
  return { kind: 'hub', hub: toRender(base.hub, slug, name), shared, meta: base.meta, preview: null, source: base.source };
});

/**
 * Where each City Hub's content comes from right now (no preview: a public, cookie-free read). The
 * post-deploy check reads it through `/api/city-hubs/source` to prove the hubs serve their rows.
 */
export async function cityHubSources(
  slugs: readonly string[]
): Promise<Record<string, { source: HubSource | 'not-found' | 'legacy'; shared?: 'row' | 'code'; row: 'none' | 'hub' | 'no-hub' }>> {
  const out: Record<string, { source: HubSource | 'not-found' | 'legacy'; shared?: 'row' | 'code'; row: 'none' | 'hub' | 'no-hub' }> = {};
  const live = await loadCityHubSharedLive();
  const rows = new Map<string, boolean>();
  try {
    const r = await pool.query<{ s: string; h: boolean }>('SELECT city_slug AS s, (hub_content IS NOT NULL) AS h FROM city_pages WHERE city_slug = ANY($1)', [[...slugs]]);
    for (const x of r.rows) rows.set(x.s, x.h);
  } catch {
    /* DB down: every page reports row none and serves its fallback */
  }
  for (const slug of slugs) {
    const d = await resolveCityHub(slug, { preview: false });
    const row = rows.has(slug) ? (rows.get(slug) ? 'hub' : 'no-hub') : 'none';
    out[`/${slug}`] = d.kind === 'hub' ? { source: d.source, shared: live.source, row } : { source: d.kind, row };
  }
  return out;
}

export interface CityHubEditorLoad {
  exists: boolean;
  status: string | null;
  version: number;
  updatedAt: string | null;
  templateType: string | null;
  preHubTemplate: string | null;
  name: string;
  hasCodeModule: boolean;
  /** What the editor opens with: the live hub (row over code), or a blank-city skeleton. */
  hub: CityHubStored | null;
  metaTitle: string;
  metaDescription: string;
  source: 'row' | 'code' | 'none';
  phoneRegion: 'main' | 'central-ohio';
}

/** The City Hub editor's initial state for one city (no preview overlay). */
export async function loadCityHubForEditor(slug: string): Promise<CityHubEditorLoad | null> {
  const entry = getCity(slug);
  if (!entry) return null;
  const res = await pool.query(
    `SELECT status, version, updated_at, template_type, pre_hub_template, hub_content, meta_title, meta_description
       FROM city_pages WHERE city_slug = $1`,
    [slug]
  );
  const r = res.rows[0];
  const code = codeHubStored(slug);
  const codeMeta = codeHubMeta(slug);
  let hub: CityHubStored | null = r?.hub_content ? hubFromStored(slug, r.hub_content, `city_pages/${slug}`) : null;
  let source: CityHubEditorLoad['source'] = hub ? 'row' : 'none';
  let meta = hub ? metaOver(r?.meta_title, r?.meta_description, codeMeta ?? { title: '', description: '' }) : { title: '', description: '' };
  if (!hub && code && codeMeta) {
    hub = code;
    meta = codeMeta;
    source = 'code';
  }
  return {
    exists: !!r,
    status: r?.status ?? null,
    version: r?.version ?? 0,
    updatedAt: r?.updated_at ? new Date(r.updated_at).toISOString() : null,
    templateType: r?.template_type ?? null,
    preHubTemplate: r?.pre_hub_template ?? null,
    name: entry.name,
    hasCodeModule: !!code,
    hub,
    metaTitle: meta.title,
    metaDescription: meta.description,
    source,
    phoneRegion: hubPhoneRegion(slug),
  };
}
