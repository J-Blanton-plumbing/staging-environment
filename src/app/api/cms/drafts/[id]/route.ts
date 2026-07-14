import { NextRequest, NextResponse } from 'next/server';
import { getDraft, deleteDraft, updateDraftContent } from '@/lib/cms/drafts';
import { getSession } from '@/lib/auth/session';
import { errorCode } from '@/lib/cms/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const draft = await getDraft(id);
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    return NextResponse.json(draft);
  } catch (err) {
    console.error(`[drafts/${id} GET]`, err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const body = await req.json();
    if (body.content === undefined) {
      return NextResponse.json({ error: 'content is required' }, { status: 400 });
    }
    // Brief 75 (DP-1): the client must send the version it last read so the writer
    // can detect a concurrent save. Missing/invalid version is a client bug → 400.
    if (typeof body.version !== 'number') {
      return NextResponse.json({ error: 'version (number) is required' }, { status: 400 });
    }
    const version = await updateDraftContent(id, body.content, body.version);
    return NextResponse.json({ ok: true, version });
  } catch (err) {
    const code = errorCode(err);
    if (code === '404') {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    if (code === '409') {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Conflict' },
        { status: 409 }
      );
    }
    console.error(`[drafts/${id} PUT]`, err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    await deleteDraft(id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === '403') {
      return NextResponse.json({ error: 'You can only delete your own drafts' }, { status: 403 });
    }
    console.error(`[drafts/${id} DELETE]`, err);
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 });
  }
}
