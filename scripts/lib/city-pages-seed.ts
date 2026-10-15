/**
 * Brief 212 — the one write path every City Hub / City Service V2 loader shares: the Batch 1 seeds
 * (seed-city-hubs-content.ts, seed-city-services-v2-content.ts) and the MD importer
 * (import-city-batch.ts --apply / --publish). Written once so the three can never disagree.
 *
 * Per page, in order (each step is skipped when already done, so a re-run after a crash resumes and
 * a second run writes NOTHING — the Brief 202 duplicate trap):
 *   1. the row must exist. A missing `city_service_pages` row is REPORTED and skipped unless the
 *      caller passed `createMissing` (then it is created, loudly, with `status` left to the column
 *      default and the Brief 64 parent hub copied from the same service in another city);
 *   2. the row already holds new-template content → "already loaded, no change" (a Marketing edit is
 *      never overwritten — this runs on every deploy);
 *   3. the pre-template ARCHIVE version (every column verbatim, unpublished) — src/lib/cms/restore-archive.ts;
 *   4. hubs only: the template switch to City Hub, through the picker's own path (switchTemplate),
 *      which records `pre_hub_template` from the row's own current value — read, never assumed;
 *   5. the new version ("Version 1 — City Hub" / "Version 1 — City Service V2") through createDraft,
 *      i.e. sanitised and layout-checked exactly like an editor's save. An existing version with that
 *      label and template is REUSED, never duplicated;
 *   6. `publish`: publishDraft (status set by its one writer, setLiveStatusInTx), then asserted.
 */
import pool from '../../src/lib/db';
import { createDraft, publishDraft } from '../../src/lib/cms/drafts';
import { switchTemplate } from '../../src/lib/cms/template-switching';
import { createPreTemplateArchive } from '../../src/lib/cms/restore-archive';
import { CITY_HUB_TEMPLATE, CITY_PAGE_TYPES, type CityHubDraftContent } from '../../src/lib/city-hub-cms/model';
import { CITY_SERVICE_V2_TEMPLATE, type CityServiceV2DraftContent } from '../../src/lib/city-service-v2-cms/model';

export type Outcome = 'already' | 'loaded' | 'staged' | 'would-load' | 'missing' | 'unpublished' | 'failed';
export interface PageResult {
  path: string;
  outcome: Outcome;
  detail: string;
  versionId?: number;
}

export interface LoadOptions {
  by: number;
  /** false = report what would happen, write nothing. */
  apply: boolean;
  /** Publish the version (else it is left as an unpublished Draft for review). */
  publish: boolean;
  label: string;
  createMissing?: boolean;
}

/**
 * A write this run attempted that was refused (422 content / 409 conflict) is reported as FAILED for
 * that page and the run continues; a crash (DB down, code fault) still propagates.
 */
async function guarded(path: string, run: () => Promise<PageResult>): Promise<PageResult> {
  try {
    return await run();
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === '422' || code === '409' || code === '404') return { path, outcome: 'failed', detail: `refused (${code}): ${(e as Error).message}` };
    throw e;
  }
}

async function findVersion(pageTypes: string[], slug: string, label: string, template: string): Promise<{ id: number; is_published: boolean } | null> {
  const r = await pool.query<{ id: number; is_published: boolean }>(
    `SELECT id, is_published FROM page_drafts WHERE page_type = ANY($1) AND page_slug = $2 AND label = $3 AND template_type = $4 ORDER BY id LIMIT 1`,
    [pageTypes, slug, label, template]
  );
  return r.rows[0] ?? null;
}

async function archive(kind: 'hub' | 'service', slug: string, by: number, createdThisRun = false): Promise<{ created: boolean; draftId: number }> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await createPreTemplateArchive(client, kind, slug, by, 212, createdThisRun);
    await client.query('COMMIT');
    return r;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** One City Hub: archive → switch → version → (publish). */
export async function loadHub(slug: string, draft: CityHubDraftContent, o: LoadOptions): Promise<PageResult> {
  return guarded(`/${slug}`, () => loadHubInner(slug, draft, o));
}

async function loadHubInner(slug: string, draft: CityHubDraftContent, o: LoadOptions): Promise<PageResult> {
  const path = `/${slug}`;
  const row = (
    await pool.query<{ template_type: string | null; has_hub: boolean; status: string }>(
      `SELECT template_type, (hub_content IS NOT NULL) AS has_hub, status FROM city_pages WHERE city_slug = $1`,
      [slug]
    )
  ).rows[0];
  if (!row) return { path, outcome: 'missing', detail: 'no city_pages row — reported, not created' };
  if (row.has_hub) {
    return row.status === 'published'
      ? { path, outcome: 'already', detail: 'already loaded, no change' }
      : { path, outcome: 'unpublished', detail: `already loaded, no change — row is '${row.status}' (editor state, left alone)` };
  }
  const existing = await findVersion([...CITY_PAGE_TYPES], slug, o.label, CITY_HUB_TEMPLATE);
  const steps = [
    `archive "${row.template_type ?? 'coverage-area'}" row`,
    row.template_type === CITY_HUB_TEMPLATE ? 'already on City Hub' : `switch ${row.template_type ?? 'coverage-area'} → City Hub`,
    existing ? `reuse "${o.label}" #${existing.id}` : `create "${o.label}"`,
    o.publish ? 'publish' : 'leave unpublished',
  ].join('; ');
  if (!o.apply) return { path, outcome: 'would-load', detail: `would ${steps}` };

  await archive('hub', slug, o.by);
  if (row.template_type !== CITY_HUB_TEMPLATE) {
    await switchTemplate({ pageType: 'city', pageSlug: slug, toTemplate: CITY_HUB_TEMPLATE, switchedBy: o.by });
  }
  const id = existing?.id ?? (await createDraft({ pageType: 'city', pageSlug: slug, label: o.label, content: draft, createdBy: o.by, templateType: CITY_HUB_TEMPLATE })).id;
  if (!o.publish) return { path, outcome: 'staged', detail: `${steps} → version #${id} (Draft)`, versionId: id };
  await publishDraft(id, o.by);
  const after = (
    await pool.query<{ status: string; has_hub: boolean; template_type: string; live: number | null }>(
      `SELECT status, (hub_content IS NOT NULL) AS has_hub, template_type,
              (SELECT id FROM page_drafts d WHERE d.page_type = ANY($2) AND d.page_slug = $1 AND d.is_published) AS live
         FROM city_pages WHERE city_slug = $1`,
      [slug, [...CITY_PAGE_TYPES]]
    )
  ).rows[0];
  if (!after || after.status !== 'published' || !after.has_hub || after.template_type !== CITY_HUB_TEMPLATE || after.live !== id) {
    return { path, outcome: 'failed', detail: `wrote but did not land: ${JSON.stringify(after)} (expected published City Hub, live version ${id})` };
  }
  return { path, outcome: 'loaded', detail: `${steps} → live version #${id}`, versionId: id };
}

/** Make sure a city_service_pages row exists (created only with `createMissing`). */
/*
 * Marketing 2026-10-15 (Brief 212 decision on missing rows): a created row must never be visible as
 * unpublished, so a row is created ONLY by a run that also publishes the page (`--publish` / the seeds),
 * and the insert relies on the column default `status = 'published'` (ensure-schema) — checked right
 * after the insert; a row that did not come out published is removed again before anything else
 * touches it. The page renders exactly as before (code module / legacy template) until its V2 version
 * is published moments later in the same run. Every created row is printed as CREATED.
 */
async function serviceRow(city: string, service: string, createMissing: boolean, apply: boolean): Promise<'exists' | 'created' | 'would-create' | 'missing'> {
  const r = await pool.query(`SELECT 1 FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`, [city, service]);
  if (r.rowCount) return 'exists';
  if (!createMissing) return 'missing';
  if (!apply) return 'would-create';
  const ins = await insertServiceRow(city, service);
  if (ins !== 'published') {
    await pool.query(`DELETE FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2 AND created_by = 'brief-212-seed' AND v2_content IS NULL`, [city, service]);
    throw Object.assign(new Error(`a created row came out '${ins}', not 'published' — removed again; check the status column default`), { code: '409' });
  }
  return 'created';
}

async function insertServiceRow(city: string, service: string): Promise<string> {
  const parent =
    (
      await pool.query<{ parent_slug: string | null }>(
        `SELECT parent_slug FROM city_service_pages WHERE service_slug = $1 AND parent_slug IS NOT NULL GROUP BY parent_slug ORDER BY count(*) DESC LIMIT 1`,
        [service]
      )
    ).rows[0]?.parent_slug ?? service;
  const res = await pool.query<{ status: string }>(
    `INSERT INTO city_service_pages (city_slug, service_slug, parent_slug, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, 'brief-212-seed', NOW(), NOW()) RETURNING status`,
    [city, service, parent]
  );
  return res.rows[0]?.status ?? '(none)';
}

/** One City Service V2 page: (row) → archive → version → (publish). */
export async function loadService(city: string, service: string, draft: CityServiceV2DraftContent, o: LoadOptions): Promise<PageResult> {
  return guarded(`/${city}/${service}`, () => loadServiceInner(city, service, draft, o));
}

async function loadServiceInner(city: string, service: string, draft: CityServiceV2DraftContent, o: LoadOptions): Promise<PageResult> {
  const path = `/${city}/${service}`;
  const slug = `${city}/${service}`;
  // A row is only ever created by a run that publishes (never left as an empty, unpublished page).
  const rowState = await serviceRow(city, service, !!o.createMissing && o.publish, o.apply);
  if (rowState === 'missing') return { path, outcome: 'missing', detail: 'no city_service_pages row — reported, not created (pass --create-missing to create it)' };
  if (rowState === 'would-create') {
    return { path, outcome: 'would-load', detail: `would CREATE the missing row; create "${o.label}"; ${o.publish ? 'publish' : 'leave unpublished'}` };
  }
  const row = (
    await pool.query<{ has_v2: boolean; status: string }>(
      `SELECT (v2_content IS NOT NULL) AS has_v2, status FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`,
      [city, service]
    )
  ).rows[0];
  if (row.has_v2) {
    return row.status === 'published'
      ? { path, outcome: 'already', detail: 'already loaded, no change' }
      : { path, outcome: 'unpublished', detail: `already loaded, no change — row is '${row.status}' (editor state, left alone)` };
  }
  const existing = await findVersion(['city-service'], slug, o.label, CITY_SERVICE_V2_TEMPLATE);
  const steps = [rowState === 'created' ? 'CREATED the missing row' : null, 'archive row', existing ? `reuse "${o.label}" #${existing.id}` : `create "${o.label}"`, o.publish ? 'publish' : 'leave unpublished']
    .filter(Boolean)
    .join('; ');
  if (!o.apply) return { path, outcome: 'would-load', detail: `would ${steps}` };
  await archive('service', slug, o.by, rowState === 'created');
  const id = existing?.id ?? (await createDraft({ pageType: 'city-service', pageSlug: slug, label: o.label, content: draft, createdBy: o.by, templateType: CITY_SERVICE_V2_TEMPLATE })).id;
  if (!o.publish) return { path, outcome: 'staged', detail: `${steps} → version #${id} (Draft)`, versionId: id };
  await publishDraft(id, o.by);
  const after = (
    await pool.query<{ status: string; has_v2: boolean; live: number | null }>(
      `SELECT status, (v2_content IS NOT NULL) AS has_v2,
              (SELECT id FROM page_drafts d WHERE d.page_type = 'city-service' AND d.page_slug = $3 AND d.is_published) AS live
         FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`,
      [city, service, slug]
    )
  ).rows[0];
  if (!after || after.status !== 'published' || !after.has_v2 || after.live !== id) {
    return { path, outcome: 'failed', detail: `wrote but did not land: ${JSON.stringify(after)} (expected published V2, live version ${id})` };
  }
  return { path, outcome: 'loaded', detail: `${steps} → live version #${id}`, versionId: id };
}

/** The shared City Hub record: create the main_pages row (once), then its first version. */
export async function loadHubShared(draftContent: unknown, o: LoadOptions): Promise<PageResult> {
  const path = '(shared City Hub record)';
  const row = (await pool.query<{ content: Record<string, unknown> | null }>(`SELECT content FROM main_pages WHERE slug = 'city-hubs'`)).rows[0];
  if (row && row.content && Object.keys(row.content).length > 0) return { path, outcome: 'already', detail: 'already loaded, no change' };
  const existing = await findVersion(['city-hub-shared'], 'city-hubs', o.label, 'city-hub-shared');
  const steps = [row ? null : 'create the main_pages row "city-hubs"', existing ? `reuse "${o.label}" #${existing.id}` : `create "${o.label}"`, o.publish ? 'publish' : 'leave unpublished']
    .filter(Boolean)
    .join('; ');
  if (!o.apply) return { path, outcome: 'would-load', detail: `would ${steps}` };
  if (!row) {
    await pool.query(
      `INSERT INTO main_pages (slug, page_type, content, updated_by, updated_at, created_at) VALUES ('city-hubs', 'city-hub-shared', '{}'::jsonb, $1, NOW(), NOW())`,
      [String(o.by)]
    );
  }
  const id = existing?.id ?? (await createDraft({ pageType: 'city-hub-shared', pageSlug: 'city-hubs', label: o.label, content: draftContent, createdBy: o.by, templateType: 'city-hub-shared' })).id;
  if (!o.publish) return { path, outcome: 'staged', detail: `${steps} → version #${id} (Draft)`, versionId: id };
  await publishDraft(id, o.by);
  return { path, outcome: 'loaded', detail: `${steps} → live version #${id}`, versionId: id };
}

export async function authorId(): Promise<number> {
  const id = (await pool.query<{ id: number }>(`SELECT id FROM cms_users ORDER BY id LIMIT 1`)).rows[0]?.id;
  if (!id) throw new Error('no cms_users row to author the versions');
  return id;
}
