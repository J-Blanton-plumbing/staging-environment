import pool from '@/lib/db';
import { updateCityCmsContent } from '@/lib/cms/city-pages';
import { updateServiceCmsContent } from '@/lib/cms/service-pages';
import { updateEpCmsContent } from '@/lib/cms/emergency-plumbing';
import { updateCityServiceCmsContent } from '@/lib/cms/city-service-pages';
import { writeChangelog } from '@/lib/cms/changelog';

export interface DraftRow {
  id: number;
  page_type: string;
  page_slug: string;
  label: string;
  content: unknown;
  created_by: number;
  creator_name: string;
  created_at: string;
  published_at: string | null;
}

export async function createDraft({
  pageType,
  pageSlug,
  label,
  content,
  createdBy,
}: {
  pageType: string;
  pageSlug: string;
  label: string;
  content: unknown;
  createdBy: number;
}): Promise<DraftRow> {
  const client = await pool.connect();
  try {
    const res = await client.query<{ id: number; page_type: string; page_slug: string; label: string; content: unknown; created_by: number; created_at: string; published_at: string | null }>(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, page_type, page_slug, label, content, created_by, created_at, published_at`,
      [pageType, pageSlug, label, JSON.stringify(content), createdBy]
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
      `SELECT d.id, d.page_type, d.page_slug, d.label, d.content,
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
      `SELECT d.id, d.page_type, d.page_slug, d.label, d.content,
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

  const notYetImplemented = (type: string) => () =>
    Promise.reject(new Error(`publishDraft: page_type "${type}" has no CMS writer yet — implement when editor is built`));

  const writers: Record<string, (slug: string, content: unknown, by: number) => Promise<void>> = {
    city: (slug, content, by) =>
      updateCityCmsContent(slug, content as Parameters<typeof updateCityCmsContent>[1], by),
    // city-coverage and city-local both use the same city writer
    'city-coverage': (slug, content, by) =>
      updateCityCmsContent(slug, content as Parameters<typeof updateCityCmsContent>[1], by),
    'city-local': (slug, content, by) =>
      updateCityCmsContent(slug, content as Parameters<typeof updateCityCmsContent>[1], by),
    'emergency-plumbing': (_slug, content, by) =>
      updateEpCmsContent(content as Parameters<typeof updateEpCmsContent>[0], by),
    service: (slug, content, by) =>
      updateServiceCmsContent(slug, content as Parameters<typeof updateServiceCmsContent>[1], by),
    'city-service': (slug, content, _by) => {
      const [citySlug, serviceSlug] = slug.split('/');
      return updateCityServiceCmsContent(
        citySlug,
        serviceSlug,
        content as Parameters<typeof updateCityServiceCmsContent>[2]
      );
    },
    // Standalone pages — writers not yet built; throw a clear error if publish is attempted
    financing:          notYetImplemented('financing'),
    'customer-stories': notYetImplemented('customer-stories'),
    'help-and-support': notYetImplemented('help-and-support'),
    locations:          notYetImplemented('locations'),
  };

  const writer = writers[draft.page_type];
  if (!writer) throw new Error(`No writer for page_type "${draft.page_type}"`);

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

export async function updateDraftContent(id: number, content: unknown): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE page_drafts SET content = $1 WHERE id = $2`,
      [JSON.stringify(content), id]
    );
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
