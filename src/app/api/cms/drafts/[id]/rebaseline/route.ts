import { NextRequest, NextResponse } from 'next/server';
import { rebaselineDraft } from '@/lib/cms/drafts';
import { getSession } from '@/lib/auth/session';
import { errorCode } from '@/lib/cms/errors';

/**
 * Brief 147 (Track B) — move a draft's DP-2 staleness baseline onto the live
 * row's current version.
 *
 * Called by the shared editor hook (useDraftVersions.syncAfterLiveSave) right
 * after a DIRECT save of the live row succeeded. That save is itself guarded by
 * the optimistic lock, so it can only have landed while the live row was still
 * at the version this editor loaded — meaning the only live change since the
 * draft's old baseline came from this same editor. Without this call, the
 * author's own "Save Page" made their own draft unpublishable ("The live page
 * has changed since this draft was created").
 *
 * The live version is read server-side in `rebaselineDraft`; the client cannot
 * supply it. Only the draft's creator may re-baseline it.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const { baseVersion } = await rebaselineDraft(id, session.userId);
    return NextResponse.json({ ok: true, baseVersion });
  } catch (err) {
    const code = errorCode(err);
    if (code === '404') return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    if (code === '403') {
      return NextResponse.json({ error: 'You can only re-baseline your own drafts' }, { status: 403 });
    }
    console.error(`[drafts/${id}/rebaseline POST]`, err);
    return NextResponse.json({ error: 'Failed to re-baseline draft' }, { status: 500 });
  }
}
