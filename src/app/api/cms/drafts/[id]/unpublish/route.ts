import { NextRequest, NextResponse } from 'next/server';
import { unpublishDraft } from '@/lib/cms/drafts';
import { getSession } from '@/lib/auth/session';
import { errorCode } from '@/lib/cms/errors';

/**
 * Brief 159 (Track B / Track E) — move the currently-live version back to Draft.
 *
 * With no other version Published, that leaves the page with no Published
 * version, which is what "unpublished" means under this model: the public route
 * 404s and the URL leaves both sitemaps. It is the ONLY way a page goes dark —
 * no route sets a content row's `status` directly, and there is no page-level
 * status switch competing with the sidebar's Status row (E4).
 *
 * Every guardrail is enforced in `unpublishDraft`, server-side, before anything
 * is written: not-the-live-version → 409, home page / top-level service category
 * → 409, redirect target → 409 naming the redirect. The confirmation modal in
 * the editor mirrors these, but the modal is not the enforcement point.
 *
 * Auth: inherits the `/api/cms/` default-deny that Brief 148 (Track A) locked in
 * middleware, and re-checks the session here as every sibling route does.
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
    const { path } = await unpublishDraft(id, session.userId);
    return NextResponse.json({ ok: true, path });
  } catch (err) {
    const code = errorCode(err);
    if (code === '404') return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    if (code === '409') {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Unpublish blocked' },
        { status: 409 }
      );
    }
    console.error(`[drafts/${id}/unpublish POST]`, err);
    return NextResponse.json({ error: 'Failed to unpublish' }, { status: 500 });
  }
}
