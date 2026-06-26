import { NextRequest, NextResponse } from 'next/server';
import { getCityServiceCmsContent, updateCityServiceCmsContent } from '@/lib/cms/city-service-pages';
import { getSession } from '@/lib/auth/session';

export async function GET(
  _req: NextRequest,
  { params }: { params: { city: string; service: string } }
) {
  try {
    const data = await getCityServiceCmsContent(params.city, params.service);
    if (!data) {
      return NextResponse.json({ error: 'No content found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error(`[cms/city-service/${params.city}/${params.service} GET]`, err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { city: string; service: string } }
) {
  const session = await getSession(req);
  const authHeader = req.headers.get('authorization');
  const legacyAuth = authHeader === `Bearer ${process.env.CMS_ADMIN_PASSWORD}`;

  if (!session && !legacyAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    await updateCityServiceCmsContent(params.city, params.service, body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[cms/city-service/${params.city}/${params.service} PUT]`, err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
