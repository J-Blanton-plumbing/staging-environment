import pool from '@/lib/db';
import { updateCityCmsContent } from '@/lib/cms/city-pages';
import { updateServiceCmsContent } from '@/lib/cms/service-pages';
import { updateEpCmsContent } from '@/lib/cms/emergency-plumbing';
import { updateCityServiceCmsContent } from '@/lib/cms/city-service-pages';
import { updateSubServiceCmsContent } from '@/lib/cms/sub-service-pages';
import { updateMainPage } from '@/lib/cms/main-pages';
import { writeChangelog } from '@/lib/cms/changelog';
import { ConflictError, NotFoundError } from '@/lib/cms/errors';

export interface DraftRow {
  id: number;
  page_type: string;
  page_slug: string;
  label: string;
  content: unknown;
  /**
   * Brief 67 (Track A) — the template the draft was authored for. Lets the
   * preview always render that template even if the live page has since switched
   * (e.g. a V2 draft on a still-V1 live page). Null for older drafts / page types
   * without a template concept.
   */
  template_type: string | null;
  /**
   * Brief 75 (DP-1) — optimistic-concurrency version of the draft row itself.
   * Every save must send the version it last read; updateDraftContent rejects on
   * mismatch (409) and increments on success.
   */
  version: number;
  /**
   * Brief 75 (DP-2) — the live content row's `version` captured when this draft
   * was created. publishDraft blocks if the live row has moved past it. Null when
   * the page had no live row at creation, or for the page type has no version.
   */
  base_version: number | null;
  created_by: number;
  creator_name: string;
  created_at: string;
  published_at: string | null;
}

/**
 * Brief 75 — read the live content row's version + template for a draft's target,
 * so createDraft can snapshot a baseline (DP-2) and publishDraft can detect that
 * the live page moved on (DP-2) or switched templates (DP-4). Returns null for
 * page types without a mapped live table (checks are then skipped).
 */
async function getLivePageState(
  pageType: string,
  pageSlug: string
): Promise<{ version: number; templateType: string | null } | null> {
  let res;
  switch (pageType) {
    case 'city':
    case 'city-coverage':
    case 'city-local':
    case 'local-office-v2':
      res = await pool.query('SELECT version, template_type FROM city_pages WHERE city_slug = $1', [pageSlug]);
      break;
    case 'service':
      res = await pool.query('SELECT version, NULL::text AS template_type FROM service_category_pages WHERE slug = $1', [pageSlug]);
      break;
    case 'sub-service':
      res = await pool.query('SELECT version, NULL::text AS template_type FROM sub_service_pages WHERE slug = $1', [pageSlug]);
      break;
    case 'emergency-plumbing':
      res = await pool.query('SELECT version, NULL::text AS template_type FROM emergency_plumbing_page LIMIT 1');
      break;
    case 'city-service': {
      const [citySlug, serviceSlug] = pageSlug.split('/');
      res = await pool.query(
        'SELECT version, NULL::text AS template_type FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2',
        [citySlug, serviceSlug]
      );
      break;
    }
    case 'financing':
    case 'customer-stories':
    case 'help-and-support':
    case 'locations':
      res = await pool.query('SELECT version, NULL::text AS template_type FROM main_pages WHERE slug = $1', [pageSlug]);
      break;
    default:
      return null;
  }
  if (!res.rows[0]) return null;
  return { version: res.rows[0].version ?? 0, templateType: res.rows[0].template_type ?? null };
}

export async function createDraft({
  pageType,
  pageSlug,
  label,
  content,
  createdBy,
  templateType,
}: {
  pageType: string;
  pageSlug: string;
  label: string;
  content: unknown;
  createdBy: number;
  templateType?: string | null;
}): Promise<DraftRow> {
  // Brief 75 (DP-2): snapshot the live row's current version so publishDraft can
  // later detect that the live page changed after this draft was captured.
  const live = await getLivePageState(pageType, pageSlug);
  const baseVersion = live?.version ?? null;

  const client = await pool.connect();
  try {
    const res = await client.query<{ id: number; page_type: string; page_slug: string; label: string; content: unknown; template_type: string | null; version: number; base_version: number | null; created_by: number; created_at: string; published_at: string | null }>(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, template_type, base_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, page_type, page_slug, label, content, template_type, version, base_version, created_by, created_at, published_at`,
      [pageType, pageSlug, label, JSON.stringify(content), createdBy, templateType ?? null, baseVersion]
    );
    return { ...res.rows[0], creator_name: '' };
  } finally {
    client.release();
  }
}

export async function getDraftsForPage({
  pageType,
  pageSlug,
}: {
  pageType: string;
  pageSlug: string;
}): Promise<DraftRow[]> {
  const client = await pool.connect();
  try {
    const res = await client.query<DraftRow>(
      `SELECT d.id, d.page_type, d.page_slug, d.label, d.content, d.template_type,
              d.version, d.base_version,
              d.created_by, u.name AS creator_name, d.created_at, d.published_at
         FROM page_drafts d
         JOIN cms_users u ON u.id = d.created_by
        WHERE d.page_type = $1 AND d.page_slug = $2
        ORDER BY d.created_at DESC`,
      [pageType, pageSlug]
    );
    return res.rows;
  } finally {
    client.release();
  }
}

export async function getDraft(id: number): Promise<DraftRow | null> {
  const client = await pool.connect();
  try {
    const res = await client.query<DraftRow>(
      `SELECT d.id, d.page_type, d.page_slug, d.label, d.content, d.template_type,
              d.version, d.base_version,
              d.created_by, u.name AS creator_name, d.created_at, d.published_at
         FROM page_drafts d
         JOIN cms_users u ON u.id = d.created_by
        WHERE d.id = $1`,
      [id]
    );
    return res.rows[0] ?? null;
  } finally {
    client.release();
  }
}

export async function publishDraft(id: number, publishedBy: number): Promise<void> {
  const draft = await getDraft(id);
  if (!draft) throw new Error(`Draft ${id} not found`);

  // Standalone pages managed via the main_pages table all share one writer.
  const mainPageWriter = (slug: string, content: unknown, by: number) =>
    updateMainPage(slug, content, by);

  // Writers return the new content-row version; publishDraft ignores it, so the
  // map value is typed loosely (Promise<unknown>) to accept every writer shape.
  const writers: Record<string, (slug: string, content: unknown, by: number) => Promise<unknown>> = {
    city: (slug, content, by) =>
      updateCityCmsContent(slug, content as Parameters<typeof updateCityCmsContent>[1], by),
    // city-coverage and city-local both use the same city writer
    'city-coverage': (slug, content, by) =>
      updateCityCmsContent(slug, content as Parameters<typeof updateCityCmsContent>[1], by),
    'city-local': (slug, content, by) =>
      updateCityCmsContent(slug, content as Parameters<typeof updateCityCmsContent>[1], by),
    // Brief 67 — V2 cities write to the same city_pages table as city-local.
    'local-office-v2': (slug, content, by) =>
      updateCityCmsContent(slug, content as Parameters<typeof updateCityCmsContent>[1], by),
    'emergency-plumbing': (_slug, content, by) =>
      updateEpCmsContent(content as Parameters<typeof updateEpCmsContent>[0], by),
    service: (slug, content, by) =>
      updateServiceCmsContent(slug, content as Parameters<typeof updateServiceCmsContent>[1], by),
    // Brief 75 (CQ-1) — sub-service pages get their own page_type + writer so they
    // publish to sub_service_pages instead of being mis-dispatched to `service`.
    'sub-service': (slug, content, by) =>
      updateSubServiceCmsContent(slug, content as Record<string, unknown>, by),
    'city-service': (slug, content, _by) => {
      const [citySlug, serviceSlug] = slug.split('/');
      return updateCityServiceCmsContent(
        citySlug,
        serviceSlug,
        content as Parameters<typeof updateCityServiceCmsContent>[2]
      );
    },
    // Standalone pages — write to the main_pages table (Brief 66, Track D).
    financing:          mainPageWriter,
    'customer-stories': mainPageWriter,
    'help-and-support': mainPageWriter,
    locations:          mainPageWriter,
  };

  const writer = writers[draft.page_type];
  if (!writer) throw new Error(`No writer for page_type "${draft.page_type}"`);

  // Brief 75 — staleness guards before we overwrite the live row.
  const live = await getLivePageState(draft.page_type, draft.page_slug);

  // DP-4: a draft authored for one template must not publish onto a live page that
  // has since switched — its empty template-specific fields would blank live
  // sections. Block and require reconciliation.
  if (
    draft.template_type &&
    live?.templateType &&
    draft.template_type !== live.templateType
  ) {
    throw new ConflictError(
      `This draft was authored for the "${draft.template_type}" template, but the live page now uses "${live.templateType}". Switch the draft's template (or the live page's) to match before publishing.`
    );
  }

  // DP-2: a draft must not overwrite live edits made after it was captured.
  if (draft.base_version != null && live && live.version !== draft.base_version) {
    throw new ConflictError(
      'The live page has changed since this draft was created. Review the differences before publishing so you do not overwrite newer edits.'
    );
  }

  await writer(draft.page_slug, draft.content, publishedBy);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE page_drafts SET published_at = NOW() WHERE id = $1`,
      [id]
    );
    await writeChangelog(client, draft.page_type, draft.page_slug, publishedBy, {
      source: 'draft-publish',
      draft_id: id,
      draft_label: draft.label,
      content: draft.content,
    });
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Brief 75 (DP-1) — optimistic-concurrency draft save.
 *
 * When `expectedVersion` is provided the update only lands if the stored row is
 * still at that version; otherwise it throws a ConflictError (→ 409) so the
 * losing editor is told their copy is stale instead of silently clobbering (or
 * being clobbered by) a concurrent save. Returns the new version on success.
 */
export async function updateDraftContent(
  id: number,
  content: unknown,
  expectedVersion?: number | null
): Promise<number> {
  const client = await pool.connect();
  try {
    const res = await client.query<{ version: number }>(
      `UPDATE page_drafts
          SET content = $1, version = version + 1
        WHERE id = $2 AND ($3::int IS NULL OR version = $3::int)
        RETURNING version`,
      [JSON.stringify(content), id, expectedVersion ?? null]
    );
    if (res.rowCount === 0) {
      const exists = await client.query('SELECT version FROM page_drafts WHERE id = $1', [id]);
      if (exists.rowCount === 0) throw new NotFoundError(`Draft ${id} not found`);
      throw new ConflictError(
        'This draft was changed elsewhere since you loaded it. Reload to see the latest version before saving.'
      );
    }
    return res.rows[0].version;
  } finally {
    client.release();
  }
}

export async function deleteDraft(id: number, requestingUserId: number): Promise<void> {
  const draft = await getDraft(id);
  if (!draft) throw new Error(`Draft ${id} not found`);
  if (draft.created_by !== requestingUserId) {
    const err = new Error('Forbidden: you can only delete your own drafts');
    (err as NodeJS.ErrnoException).code = '403';
    throw err;
  }
  const client = await pool.connect();
  try {
    await client.query(`DELETE FROM page_drafts WHERE id = $1`, [id]);
  } finally {
    client.release();
  }
}
