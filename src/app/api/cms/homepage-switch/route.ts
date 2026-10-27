import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth/session';
import { errorCode } from '@/lib/cms/errors';
import { getHomepageSwitchState, switchHomepage } from '@/lib/cms/homepage-switch';
import { clearSitemapCache } from '@/lib/sitemap/render';

/**
 * Brief 220 — the Live homepage switch (/admin/home). GET: what is live, since when and by whom, and
 * whether each record has a published version. POST `{ to: 'classic' | 'home-2026' }`: make that
 * record the homepage. Session-gated (and default-denied for /api/cms by middleware, Brief 148).
 *
 * `/` is force-dynamic and reads the switch per request, so a flip shows on the next request; the
 * revalidatePath + sitemap memo drop make sure no cached copy of either outlives it.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json(await getHomepageSwitchState());
  } catch (err) {
    console.error('[homepage-switch GET]', err);
    return NextResponse.json({ error: 'Could not read the homepage switch.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { to?: unknown };
  try {
    const result = await switchHomepage(body.to, session.userId);
    if (result.changed) {
      revalidatePath('/');
      clearSitemapCache();
    }
    return NextResponse.json({ ok: true, ...result, state: await getHomepageSwitchState() });
  } catch (err) {
    const code = errorCode(err);
    if (code === '409' || code === '422') {
      return NextResponse.json({ error: err instanceof Error ? err.message : 'Refused' }, { status: Number(code) });
    }
    console.error('[homepage-switch POST]', err);
    return NextResponse.json({ error: 'Could not switch the homepage.' }, { status: 500 });
  }
}
