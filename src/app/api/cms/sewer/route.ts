import { NextRequest, NextResponse } from 'next/server';
import { getSewerCmsContent, updateSewerCmsContent } from '@/lib/cms/sewer';

export async function GET() {
  try {
    const data = await getSewerCmsContent();
    if (!data) {
      return NextResponse.json({ error: 'No sewer content found in database' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[cms/sewer GET]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expected = `Bearer ${process.env.CMS_ADMIN_PASSWORD}`;
  if (!authHeader || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    // Auth ping — just verify the password, don't write anything
    if (body._ping) return NextResponse.json({ ok: true });
    await updateSewerCmsContent(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[cms/sewer PUT]', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
