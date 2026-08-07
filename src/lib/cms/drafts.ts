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
      // Brief 145 (Track D): ORDER BY id for the same reason as the reader in
      // cms/emergency-plumbing.ts — this singleton table held 7 rows with
      // independent `version` counters, so an unordered LIMIT 1 could read the
      // optimistic-lock version off a different row than the one it guards.
      res = await pool.query('SELECT version, NULL::text AS template_type FROM emergency_plumbing_page ORDER BY id LIMIT 1');
      break;
    case 'city-service': {
      const [citySlug, serviceSlug] = pageSlug.split('/');
      res = await pool.query(
        'SELECT version, NULL::text AS template_type FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2',
        [citySlug, serviceSlug]
      );
      break;
    }
    // Brief 121 fix: 'main' is the page_type every main_pages editor actually
    // sends (the four named types below are legacy pre-unification values kept
    // for old draft rows). Without this case, main-page drafts were created
    // with base_version NULL — silently skipping the DP-2 staleness guard.
    case 'main':
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

/**
 * Brief 147 (Track B) — re-baseline a draft's DP-2 staleness marker onto the
 * live row's CURRENT version.
 *
 * WHY THIS EXISTS. `base_version` was snapshotted once, when the draft was
 * created, and never moved again. But the editor that owns the draft can also
 * write the live row directly (the "Save Page" button) — and that write bumps
 * `version`. From then on the author's OWN draft looked stale to publishDraft,
 * so Publish reported "The live page has changed since this draft was created"
 * about a change the author had just made themselves, in the same browser tab.
 * Reloading did not help: `base_version` is stored on the draft row, so the
 * false conflict survived until the draft was deleted and re-created.
 *
 * WHY THIS IS STILL SAFE. The live version is re-read HERE, server-side — the
 * caller cannot supply it. And the client only calls this after a direct save
 * that the optimistic lock already accepted, which is only possible when the
 * live row was still at the version this editor loaded. A foreign session's
 * edit therefore fails that save with a 409 BEFORE anything is re-baselined, so
 * the genuine "someone else changed the live page" warning is untouched.
 *
 * Only the draft's own creator may re-baseline it (the same rule deleteDraft
 * uses), so one editor can never quietly clear another editor's staleness flag.
 */
export async function rebaselineDraft(
  id: number,
  requestingUserId: number
): Promise<{ baseVersion: number | null }> {
  const draft = await getDraft(id);
  if (!draft) throw new NotFoundError(`Draft ${id} not found`);
  if (draft.created_by !== requestingUserId) {
    const err = new Error('Forbidden: you can only re-baseline your own drafts');
    (err as NodeJS.ErrnoException).code = '403';
    throw err;
  }
  const live = await getLivePageState(draft.page_type, draft.page_slug);
  // A page type with no live table (e.g. 'article') has no version to track —
  // base_version stays null and the DP-2 guard stays skipped, as before.
  if (!live) return { baseVersion: draft.base_version };

  const client = await pool.connect();
  try {
    await client.query('UPDATE page_drafts SET base_version = $1 WHERE id = $2', [live.version, id]);
    return { baseVersion: live.version };
  } finally {
    client.release();
  }
}

/**
 * Publishes a draft onto its live row and returns the live row's NEW version.
 *
 * Brief 147 (Track B): the new version is returned so the editor can refresh
 * the optimistic-lock token it is holding. Publishing bumps `version` (the
 * writers below all do `version = version + 1`), and until this returned it,
 * every direct save after a publish 409'd with "changed by someone else" until
 * the editor did a full browser reload.
 */
export async function publishDraft(
  id: number,
  publishedBy: number
): Promise<{ liveVersion: number | null }> {
  const draft = await getDraft(id);
  if (!draft) throw new Error(`Draft ${id} not found`);

  // Standalone pages managed via the main_pages table all share one writer.
  const mainPageWriter = (slug: string, content: unknown, by: number) =>
    updateMainPage(slug, content, by);

  // Writers return the new content-row version, but not all of them and not in one
  // shape — the map value stays loose (Promise<unknown>) to accept every writer.
  // Brief 147 re-reads the version from getLivePageState after the write instead of
  // trying to unify those return types.
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
    // Brief 121 fix: every main_pages editor saves drafts with page_type
    // 'main' (see useDraftVersions call sites), but only these four legacy
    // pre-unification keys were registered — so publishing ANY main-page
    // draft threw `No writer for page_type "main"`. The 'main' key routes to
    // the same shared writer; the four legacy keys stay for any old rows.
    main:               mainPageWriter,
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

  // Brief 147 (Track B): re-read the live version AFTER the write rather than
  // trusting each writer's return shape (they differ), so this is one authority
  // for every page type — including the ones whose writer returns nothing.
  const after = await getLivePageState(draft.page_type, draft.page_slug);
  const liveVersion = after?.version ?? null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Brief 147 (Track B): publishing bumps the live row's version, which used to
    // leave THIS draft instantly stale against its own publish — a second publish
    // of the same draft, or any later edit-and-publish cycle, false-positived the
    // DP-2 guard. Move its baseline forward to the state it just created.
    await client.query(
      `UPDATE page_drafts SET published_at = NOW(), base_version = COALESCE($2, base_version) WHERE id = $1`,
      [id, liveVersion]
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

  return { liveVersion };
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
  // Brief 116 (Track C): a plain save must never silently contradict the
  // template the draft was stamped with — that's how "Save says OK, Publish
  // says no" happened. If the payload carries a templateType (city editor),
  // it must match the draft's stamp; changing it is retemplateDraft's job.
  const contentTemplate =
    content && typeof content === 'object' && typeof (content as Record<string, unknown>).templateType === 'string'
      ? ((content as Record<string, unknown>).templateType as string)
      : null;

  const client = await pool.connect();
  try {
    const res = await client.query<{ version: number }>(
      `UPDATE page_drafts
          SET content = $1, version = version + 1
        WHERE id = $2 AND ($3::int IS NULL OR version = $3::int)
          AND ($4::text IS NULL OR template_type IS NULL OR template_type = $4::text)
        RETURNING version`,
      [JSON.stringify(content), id, expectedVersion ?? null, contentTemplate]
    );
    if (res.rowCount === 0) {
      const exists = await client.query<{ version: number; template_type: string | null }>(
        'SELECT version, template_type FROM page_drafts WHERE id = $1',
        [id]
      );
      if (exists.rowCount === 0) throw new NotFoundError(`Draft ${id} not found`);
      const row = exists.rows[0];
      if (expectedVersion != null && row.version !== expectedVersion) {
        throw new ConflictError(
          'This draft was changed elsewhere since you loaded it. Reload to see the latest version before saving.'
        );
      }
      throw new ConflictError(
        `This draft was authored for the "${row.template_type}" template, but you're saving "${contentTemplate}" content onto it. Use "Move draft" to re-template the draft first — a plain save can't change a draft's template.`
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
