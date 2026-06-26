import { NextRequest, NextResponse } from 'next/server';
import { getDraft, deleteDraft, updateDraftContent } from '@/lib/cms/drafts';
import { getSession } from '@/lib/auth/session';

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
    await updateDraftContent(id, body.content);
    return NextResponse.json({ ok: true });
  } catch (err) {
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
