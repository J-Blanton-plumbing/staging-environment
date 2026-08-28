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
    // Brief 147 (Track B): hand the live row's NEW version back to the editor.
    // Publishing bumps it, and the editor is holding the optimistic-lock token it
    // read at page load — without this, every save after a publish 409'd with
    // "changed by someone else" until a full browser reload.
    // Brief 159 (Track B): `publishedDraftId` comes back too, so the client can
    // repaint every version row's Draft/Published badge in one pass — exactly one
    // row is Published and the response says which — with no refetch flicker.
    const { liveVersion, publishedDraftId } = await publishDraft(id, session.userId);
    return NextResponse.json({ ok: true, liveVersion, publishedDraftId });
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
