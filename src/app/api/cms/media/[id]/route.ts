import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { getSession } from '@/lib/auth/session';
import { getMediaById, updateMediaMeta, deleteMedia, findMediaUsage } from '@/lib/cms/media';

type RouteContext = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// GET /api/cms/media/[id] — single record (details panel can refetch).
export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const mediaId = parseId(id);
  if (!mediaId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const media = await getMediaById(mediaId);
    if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(media);
  } catch (err) {
    console.error('[cms/media GET id]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

// PATCH /api/cms/media/[id] — update alt text / caption / display name (metadata
// only; the file on disk is never renamed).
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const mediaId = parseId(id);
  if (!mediaId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let body: { altText?: string | null; caption?: string | null; originalFilename?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Reject a rename that blanks the display name.
  if (body.originalFilename !== undefined && body.originalFilename !== null && !String(body.originalFilename).trim()) {
    return NextResponse.json({ error: 'Display name cannot be empty.' }, { status: 400 });
  }

  try {
    const updated = await updateMediaMeta(mediaId, {
      altText: body.altText ?? null,
      caption: body.caption ?? null,
      originalFilename: body.originalFilename != null ? String(body.originalFilename).trim() : null,
    });
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[cms/media PATCH]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

// DELETE /api/cms/media/[id]
// Delete-safety (Brief 112 hard rule): before removing, scan page/block content
// for the file URL. If referenced, block unless `?force=1` is passed (the client
// asks for explicit confirmation first). On confirmed delete, remove BOTH the
// catalog row and the file on disk.
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const mediaId = parseId(id);
  if (!mediaId) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const force = req.nextUrl.searchParams.get('force') === '1';

  try {
    const media = await getMediaById(mediaId);
    if (!media) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const usage = await findMediaUsage(media.url);
    if (usage.length > 0 && !force) {
      // 409 Conflict — the client shows the warning and re-requests with force=1.
      return NextResponse.json(
        {
          error: 'This media is still used by one or more pages.',
          inUse: true,
          usage,
          count: usage.length,
        },
        { status: 409 }
      );
    }

    // Remove the file from disk first (best-effort), then the catalog row.
    // A missing file (already deleted, or S3-migrated later) must not block
    // clearing the row.
    try {
      const rel = media.url.replace(/^\/+/, ''); // "uploads/cms/…"
      const filePath = path.join(process.cwd(), 'public', rel);
      await unlink(filePath);
    } catch (err) {
      console.warn(`[cms/media DELETE] file not removed for ${media.url}:`, (err as Error)?.message);
    }

    await deleteMedia(mediaId);
    return NextResponse.json({ success: true, deleted: mediaId, forced: force && usage.length > 0 });
  } catch (err) {
    console.error('[cms/media DELETE]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
