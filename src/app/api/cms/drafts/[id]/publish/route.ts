import { NextRequest, NextResponse } from 'next/server';
import { publishDraft } from '@/lib/cms/drafts';
import { getSession } from '@/lib/auth/session';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    await publishDraft(id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[drafts/${id}/publish POST]`, err);
    const msg = err instanceof Error ? err.message : 'Failed to publish draft';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
