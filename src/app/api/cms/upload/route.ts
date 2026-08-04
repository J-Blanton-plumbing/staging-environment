import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import { getSession } from '@/lib/auth/session';
import pool from '@/lib/db';
import { insertMedia } from '@/lib/cms/media';
import {
  isAllowedType,
  maxBytesForMime,
  mediaTypeForMime,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
} from '@/lib/cms/media-types';
import { getS3Config, missingS3EnvVars, putObject } from '@/lib/storage/s3';

// Human-readable size cap for error messages.
const MB = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!isAllowedType(file.type)) {
      return NextResponse.json(
        { error: 'Unsupported file type. Allowed: JPEG, PNG, WebP, MP4, MOV, WebM.' },
        { status: 400 }
      );
    }
    const maxBytes = maxBytesForMime(file.type);
    if (file.size > maxBytes) {
      const kind = mediaTypeForMime(file.type);
      return NextResponse.json(
        { error: `${kind === 'video' ? 'Video' : 'Image'} must be under ${MB(maxBytes)} (max ${MB(kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES)}).` },
        { status: 400 }
      );
    }

    const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filename = `${safeName}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── Brief 134: store the bytes ────────────────────────────────────────
    // S3 when the environment is provisioned; local disk otherwise, so an
    // un-provisioned environment (local dev, or staging before ops creates the
    // bucket) keeps working exactly as it did instead of failing every upload.
    // Seeing the warning below in production means the env vars were never set
    // and uploads are landing on ephemeral disk — see the Brief 134 ops note.
    const s3 = getS3Config();
    let url: string;
    let storage: 's3' | 'local';

    if (s3) {
      const put = await putObject(filename, buffer, file.type, s3);
      url = put.url;
      storage = 's3';
    } else {
      console.warn(
        `[cms/upload] S3 is not configured (missing ${missingS3EnvVars().join(', ')}) — writing "${filename}" to local disk. On cloud hosting this file is LOST on the next redeploy.`
      );
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'cms');
      await writeFile(path.join(uploadDir, filename), buffer);
      url = `/uploads/cms/${filename}`;
      storage = 'local';
    }

    // Derive dimensions for images (sharp is already a dep via next/image). Video
    // dimensions are intentionally skipped (Brief 112 — no probing/transcoding).
    // Probed from the in-memory buffer, so it is unaffected by where the bytes
    // were stored.
    let width: number | null = null;
    let height: number | null = null;
    if (mediaTypeForMime(file.type) === 'image') {
      try {
        const sharp = (await import('sharp')).default;
        const meta = await sharp(buffer).metadata();
        width = meta.width ?? null;
        height = meta.height ?? null;
      } catch {
        // Non-fatal: dimensions stay null, the file is still catalogued.
      }
    }

    // Catalog the upload. A failure here must not lose the file the user just
    // uploaded, so we still return the URL (backward-compatible) even if the
    // insert fails — but log it loudly so the orphan is visible.
    let record = null;
    try {
      const client = await pool.connect();
      try {
        record = await insertMedia(client, {
          filename,
          originalFilename: file.name,
          url,
          mimeType: file.type,
          fileSize: file.size,
          width,
          height,
          uploadedBy: session.userId,
        });
      } finally {
        client.release();
      }
    } catch (err) {
      console.error(`[cms/upload] file stored (${storage}: ${url}) but catalog insert failed:`, err);
    }

    // Backward-compatible: existing callers read `url`. New callers (the rebuilt
    // uploader / media library) get the full record too.
    return NextResponse.json({ url, media: record });
  } catch (err) {
    console.error('[cms/upload POST]', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
