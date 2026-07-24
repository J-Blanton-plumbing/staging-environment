import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getGlobalSettings, updateGlobalSettings } from '@/lib/cms/global-settings';
import { getSession } from '@/lib/auth/session';

// Brief 107 follow-up — this GET took no `NextRequest`/`cookies()`/`headers()`,
// so `next build` treats it as a static Route Handler and caches its response
// once, at build/first-request time, on a real production deploy (this repo's
// staging environment runs `next build && pm2 restart`, not `next dev`, which
// never applies this optimization — that's why the bug didn't reproduce
// locally). Every page in the app already opts out of the equivalent Full
// Route Cache behavior with `dynamic = 'force-dynamic'`; this route needs the
// same opt-out so the admin editor (and anything else hitting this endpoint)
// always reads the live DB row instead of a stale build-time snapshot.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getGlobalSettings();
    if (!settings) {
      return NextResponse.json({ error: 'Global settings not found. Run the migration script.' }, { status: 404 });
    }
    return NextResponse.json(settings);
  } catch (err) {
    console.error('GET /api/cms/global-settings error:', err);
    return NextResponse.json({ error: 'Failed to fetch global settings' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    await updateGlobalSettings({
      phoneDisplay: body.phoneDisplay ?? undefined,
      phoneHref: body.phoneHref ?? undefined,
      headerPhone: body.headerPhone ?? undefined,
      ctaPrimaryLabel: body.ctaPrimaryLabel ?? undefined,
      taglineTurning: body.taglineTurning ?? undefined,
      hoursLabel: body.hoursLabel ?? undefined,
      ndcPrice: body.ndcPrice ?? undefined,
      serviceDesc: body.serviceDesc ?? undefined,
      offices: body.offices ?? undefined,
    });
    // Brief 107 — settings are read by the shared root layout (Navbar, Footer,
    // LocalBusinessSchema) on every force-dynamic page, so revalidating the
    // root layout covers every route in one call. Combined with the
    // `staleTimes.dynamic: 0` config (next.config.mjs), this ensures both
    // fresh server renders and immediate client-side (soft-nav) pickup.
    revalidatePath('/', 'layout');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/cms/global-settings error:', err);
    return NextResponse.json({ error: 'Failed to save global settings' }, { status: 500 });
  }
}
