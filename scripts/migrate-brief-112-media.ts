/**
 * Brief 112 (Track A) — Media catalog data model.
 *
 * Creates the `cms_media` table (the backbone of the new Media Library) and
 * backfills a catalog row for every file already sitting in
 * `public/uploads/cms/`. Those files predate the catalog (they were written by
 * the old upload endpoint, which recorded nothing — see Brief 71 / OPS-6), so
 * without this backfill they would be invisible in the new library even though
 * live pages still reference them by URL.
 *
 * SAFETY / IDEMPOTENCY:
 * - `CREATE TABLE IF NOT EXISTS` — a no-op once the table exists.
 * - Backfill inserts use `ON CONFLICT (url) DO NOTHING`, so re-running never
 *   duplicates a row and never clobbers metadata (alt text/caption) an editor
 *   may have added since the first run.
 * - Read-only against every OTHER table; touches only `cms_media` and reads the
 *   uploads directory from disk.
 *
 * REVERSIBILITY: `DROP TABLE cms_media;` fully reverses this migration. No other
 * table is modified, so the drop is self-contained.
 *
 * PRODUCTION: runs automatically on every deploy (see .github/workflows/deploy.yml),
 * or by hand:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-brief-112-media.ts
 */

import { readdir, stat } from 'fs/promises';
import path from 'path';
import pool from '../src/lib/db';
import { mediaTypeForMime, mimeForExtension } from '../src/lib/cms/media-types';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'cms');

// Strip the `Date.now()-` prefix the upload endpoint prepends, recovering the
// name the user's file originally had. Falls back to the stored filename.
function deriveOriginalName(filename: string): string {
  const m = filename.match(/^\d+-(.+)$/);
  return m ? m[1] : filename;
}

async function imageDimensions(filePath: string, mediaType: string): Promise<{ width: number | null; height: number | null }> {
  if (mediaType !== 'image') return { width: null, height: null };
  try {
    // sharp is already a dependency (next/image). Import lazily so a video-only
    // box that somehow lacks native bindings still backfills the rest.
    const sharp = (await import('sharp')).default;
    const meta = await sharp(filePath).metadata();
    return { width: meta.width ?? null, height: meta.height ?? null };
  } catch {
    return { width: null, height: null };
  }
}

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS cms_media (
        id                SERIAL PRIMARY KEY,
        filename          TEXT NOT NULL,
        original_filename TEXT NOT NULL DEFAULT '',
        url               TEXT NOT NULL UNIQUE,
        mime_type         TEXT NOT NULL DEFAULT '',
        media_type        TEXT NOT NULL DEFAULT 'image',
        file_size         BIGINT NOT NULL DEFAULT 0,
        width             INTEGER,
        height            INTEGER,
        alt_text          TEXT,
        caption           TEXT,
        uploaded_by       INTEGER,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS cms_media_media_type_idx ON cms_media (media_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS cms_media_created_at_idx ON cms_media (created_at DESC)`);
    console.log('cms_media table ensured.');

    // ── Backfill ──────────────────────────────────────────────────────────
    let files: string[] = [];
    try {
      files = await readdir(UPLOAD_DIR);
    } catch {
      console.log(`No uploads directory at ${UPLOAD_DIR} — nothing to backfill.`);
      return;
    }

    let inserted = 0;
    let skipped = 0;
    for (const filename of files) {
      const filePath = path.join(UPLOAD_DIR, filename);
      let stats;
      try {
        stats = await stat(filePath);
      } catch {
        continue;
      }
      if (!stats.isFile()) continue;
      // Brief 150 (Track D): never catalog dotfiles. `.gitkeep` is a git
      // placeholder, not media — this backfill had been re-inserting a
      // cms_media row for it on every deploy (the row Brief 150 deletes),
      // and the row's URL 404s whether it points at local disk or CloudFront.
      if (filename.startsWith('.')) continue;

      const ext = filename.split('.').pop()?.toLowerCase() ?? '';
      const mimeType = mimeForExtension(ext);
      // Unknown/unsupported extension → catalog conservatively as an image with
      // an empty mime rather than dropping it (the file is still referenced).
      const mediaType = mediaTypeForMime(mimeType);
      const { width, height } = await imageDimensions(filePath, mediaType);
      const url = `/uploads/cms/${filename}`;

      const res = await client.query(
        `INSERT INTO cms_media
           (filename, original_filename, url, mime_type, media_type, file_size, width, height)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (url) DO NOTHING
         RETURNING id`,
        [filename, deriveOriginalName(filename), url, mimeType, mediaType, stats.size, width, height]
      );
      if ((res.rowCount ?? 0) > 0) inserted++;
      else skipped++;
    }

    console.log(`Backfill complete: ${inserted} inserted, ${skipped} already catalogued (${files.length} entries scanned).`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
