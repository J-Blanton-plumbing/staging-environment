import { NextRequest, NextResponse } from 'next/server';
import { getGlobalSettings, updateGlobalSettings } from '@/lib/cms/global-settings';
import { getSession } from '@/lib/auth/session';

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
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/cms/global-settings error:', err);
    return NextResponse.json({ error: 'Failed to save global settings' }, { status: 500 });
  }
}
