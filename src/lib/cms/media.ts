/**
 * Brief 112 — `cms_media` data access.
 *
 * Thin, typed helpers over the media catalog so the upload endpoint, the media
 * list/detail API, and the standalone library page all share one query surface
 * (and one row→object normalizer). Keeps the route handlers thin and guarantees
 * the JSON shape the client consumes stays consistent everywhere.
 */

import type { PoolClient } from 'pg';
import pool from '@/lib/db';
import { mediaTypeForMime, type MediaType } from '@/lib/cms/media-types';

export interface CmsMedia {
  id: number;
  filename: string;
  originalFilename: string;
  url: string;
  mimeType: string;
  mediaType: MediaType;
  fileSize: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  uploadedBy: number | null;
  uploadedByName: string | null;
  createdAt: string | null;
}

interface MediaRow {
  id: number;
  filename: string;
  original_filename: string;
  url: string;
  mime_type: string;
  media_type: string;
  file_size: string | number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  caption: string | null;
  uploaded_by: number | null;
  uploaded_by_name?: string | null;
  created_at: string | null;
}

export function rowToMedia(r: MediaRow): CmsMedia {
  return {
    id: r.id,
    filename: r.filename,
    originalFilename: r.original_filename,
    url: r.url,
    mimeType: r.mime_type,
    mediaType: r.media_type === 'video' ? 'video' : 'image',
    // file_size is BIGINT → pg returns it as a string; coerce to number.
    fileSize: typeof r.file_size === 'string' ? parseInt(r.file_size, 10) || 0 : r.file_size,
    width: r.width,
    height: r.height,
    altText: r.alt_text,
    caption: r.caption,
    uploadedBy: r.uploaded_by,
    uploadedByName: r.uploaded_by_name ?? null,
    createdAt: r.created_at,
  };
}

const SELECT_COLS = `
  m.id, m.filename, m.original_filename, m.url, m.mime_type, m.media_type,
  m.file_size, m.width, m.height, m.alt_text, m.caption, m.uploaded_by,
  m.created_at, u.name AS uploaded_by_name
`;

/** Insert a catalog row for a freshly-written upload. */
export async function insertMedia(
  client: PoolClient,
  input: {
    filename: string;
    originalFilename: string;
    url: string;
    mimeType: string;
    fileSize: number;
    width: number | null;
    height: number | null;
    uploadedBy: number | null;
  }
): Promise<CmsMedia> {
  const res = await client.query(
    `INSERT INTO cms_media
       (filename, original_filename, url, mime_type, media_type, file_size, width, height, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (url) DO UPDATE SET url = EXCLUDED.url
     RETURNING id, filename, original_filename, url, mime_type, media_type,
               file_size, width, height, alt_text, caption, uploaded_by, created_at`,
    [
      input.filename,
      input.originalFilename,
      input.url,
      input.mimeType,
      mediaTypeForMime(input.mimeType),
      input.fileSize,
      input.width,
      input.height,
      input.uploadedBy,
    ]
  );
  return rowToMedia(res.rows[0]);
}

export interface ListMediaParams {
  type?: MediaType | 'all';
  search?: string;
  page?: number;
  limit?: number;
}

export interface ListMediaResult {
  items: CmsMedia[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export async function listMedia(params: ListMediaParams): Promise<ListMediaResult> {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(200, Math.max(1, params.limit ?? 60));
  const offset = (page - 1) * limit;

  const where: string[] = [];
  const args: unknown[] = [];
  if (params.type === 'image' || params.type === 'video') {
    args.push(params.type);
    where.push(`m.media_type = $${args.length}`);
  }
  if (params.search && params.search.trim()) {
    args.push(`%${params.search.trim()}%`);
    const i = args.length;
    where.push(`(m.original_filename ILIKE $${i} OR m.alt_text ILIKE $${i} OR m.filename ILIKE $${i})`);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const client = await pool.connect();
  try {
    const countRes = await client.query(`SELECT COUNT(*)::int AS n FROM cms_media m ${whereSql}`, args);
    const total = countRes.rows[0]?.n ?? 0;

    const listRes = await client.query(
      `SELECT ${SELECT_COLS}
         FROM cms_media m
         LEFT JOIN cms_users u ON u.id = m.uploaded_by
         ${whereSql}
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT ${limit} OFFSET ${offset}`,
      args
    );

    return {
      items: listRes.rows.map(rowToMedia),
      total,
      page,
      limit,
      hasMore: offset + listRes.rows.length < total,
    };
  } finally {
    client.release();
  }
}

export async function getMediaById(id: number): Promise<CmsMedia | null> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT ${SELECT_COLS}
         FROM cms_media m
         LEFT JOIN cms_users u ON u.id = m.uploaded_by
        WHERE m.id = $1`,
      [id]
    );
    return res.rows[0] ? rowToMedia(res.rows[0]) : null;
  } finally {
    client.release();
  }
}

export async function updateMediaMeta(
  id: number,
  fields: { altText?: string | null; caption?: string | null; originalFilename?: string | null }
): Promise<CmsMedia | null> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE cms_media SET
         alt_text          = COALESCE($1, alt_text),
         caption           = COALESCE($2, caption),
         original_filename = COALESCE($3, original_filename)
       WHERE id = $4
       RETURNING id, filename, original_filename, url, mime_type, media_type,
                 file_size, width, height, alt_text, caption, uploaded_by, created_at`,
      [
        fields.altText ?? null,
        fields.caption ?? null,
        fields.originalFilename ?? null,
        id,
      ]
    );
    return res.rows[0] ? rowToMedia(res.rows[0]) : null;
  } finally {
    client.release();
  }
}

/**
 * Delete-safety usage scan (Brief 112 hard rule).
 *
 * Returns the list of content tables where the given media URL appears anywhere
 * in a row — including inside JSONB `blocks`/`content` columns — by casting each
 * row to text and doing an exact substring match (`strpos`, no wildcards, so a
 * filename containing `_` or `%` can't broaden the match).
 *
 * Scans live content tables AND page_drafts, so an image used only in an unsaved
 * draft still blocks deletion. Historical tables (archives, changelog) are
 * intentionally excluded — a URL surviving only in an archive should not pin a
 * file forever; see the report.
 */
const USAGE_TABLES = [
  'city_pages',
  'city_service_pages',
  'cms_articles',
  'emergency_plumbing_page',
  'main_pages',
  'service_category_pages',
  'sub_service_pages',
  'page_drafts',
];

export async function findMediaUsage(url: string): Promise<string[]> {
  if (!url) return [];
  const client = await pool.connect();
  const used: string[] = [];
  try {
    for (const table of USAGE_TABLES) {
      try {
        // `t::text` serializes the whole composite row (all columns incl. JSONB).
        const res = await client.query(
          `SELECT 1 FROM ${table} t WHERE strpos(t::text, $1) > 0 LIMIT 1`,
          [url]
        );
        if ((res.rowCount ?? 0) > 0) used.push(table);
      } catch {
        // Table may not exist in this environment — skip it.
      }
    }
  } finally {
    client.release();
  }
  return used;
}

export async function deleteMedia(id: number): Promise<CmsMedia | null> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `DELETE FROM cms_media WHERE id = $1
       RETURNING id, filename, original_filename, url, mime_type, media_type,
                 file_size, width, height, alt_text, caption, uploaded_by, created_at`,
      [id]
    );
    return res.rows[0] ? rowToMedia(res.rows[0]) : null;
  } finally {
    client.release();
  }
}
