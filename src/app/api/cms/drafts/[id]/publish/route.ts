import { NextRequest, NextResponse } from 'next/server';
import { publishDraft } from '@/lib/cms/drafts';
import { getSession } from '@/lib/auth/session';
import { errorCode } from '@/lib/cms/errors';

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
    // Brief 75 (DP-2/DP-4): a staleness/template conflict is a 409, not a 500, so
    // the editor gets a clear "review the conflict" message instead of a generic error.
    if (errorCode(err) === '409') {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Publish blocked by a conflict' },
        { status: 409 }
      );
    }
    console.error(`[drafts/${id}/publish POST]`, err);
    const msg = err instanceof Error ? err.message : 'Failed to publish draft';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
