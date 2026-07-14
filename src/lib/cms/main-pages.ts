import pool from '@/lib/db';
import { ConflictError } from '@/lib/cms/errors';
import { sanitizeMainPageContent } from '@/lib/cms/sanitize';

/**
 * Write a standalone `main_pages` row (financing, customer-stories, help-and-support,
 * locations, home, why-j-blanton, no-drip-club, knowledge-hub).
 *
 * Mirrors the PATCH handler in `api/cms/main/[slug]/route.ts`: `meta_title` and
 * `meta_description` are stored in their own columns and everything else in the
 * payload is stored as the `content` JSONB blob. This is the writer that
 * `publishDraft` routes the four standalone page types to (Brief 66, Track D).
 */
export async function updateMainPage(
  slug: string,
  data: unknown,
  updatedBy: number | null = null,
  // Brief 75 (DP-1): optional optimistic-concurrency guard, see updateCityCmsContent.
  expectedVersion?: number | null
): Promise<number> {
  const { meta_title, meta_description, version: _v, ...rawContent } =
    (data ?? {}) as Record<string, unknown>;
  void _v; // `version` never belongs in the content blob.

  // Brief 77 (Feature A): sanitize rich-text fields through the shared Brief 73
  // allow-list. This covers the draft→publish path (publishDraft routes here), so
  // an unsanitized draft can't reach the live table.
  const content = sanitizeMainPageContent(slug, rawContent);

  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE main_pages SET
         content          = $1,
         meta_title       = $2,
         meta_description = $3,
         updated_by       = $4,
         version          = version + 1,
         updated_at       = NOW()
       WHERE slug = $5
         AND ($6::int IS NULL OR version = $6::int)
       RETURNING version`,
      [
        JSON.stringify(content),
        (meta_title as string) ?? null,
        (meta_description as string) ?? null,
        updatedBy,
        slug,
        expectedVersion ?? null,
      ]
    );
    if (res.rowCount === 0) {
      const exists = await client.query('SELECT version FROM main_pages WHERE slug = $1', [slug]);
      if (exists.rowCount === 0) {
        throw new Error(`updateMainPage: no main_pages row for slug "${slug}"`);
      }
      throw new ConflictError(
        'This page was changed by someone else since you loaded it. Reload before saving.'
      );
    }
    return res.rows[0].version as number;
  } finally {
    client.release();
  }
}

export async function getMainPageContent(slug: string): Promise<Record<string, string> | null> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      'SELECT content, meta_title, meta_description FROM main_pages WHERE slug = $1',
      [slug]
    );
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      ...(row.content as Record<string, string>),
      meta_title: row.meta_title ?? '',
      meta_description: row.meta_description ?? '',
    };
  } finally {
    client.release();
  }
}
