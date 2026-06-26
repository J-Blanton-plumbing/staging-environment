import { NextRequest, NextResponse } from 'next/server';
import { getCityCmsContent, updateCityCmsContent } from '@/lib/cms/city-pages';
import { getSession } from '@/lib/auth/session';
import pool from '@/lib/db';
import { writeChangelog } from '@/lib/cms/changelog';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const data = await getCityCmsContent(params.slug);
    if (!data) {
      return NextResponse.json({ error: `No CMS content found for city "${params.slug}"` }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error(`[cms/city/${params.slug} GET]`, err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getSession(req);
  const authHeader = req.headers.get('authorization');
  const legacyAuth = authHeader === `Bearer ${process.env.CMS_ADMIN_PASSWORD}`;

  if (!session && !legacyAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (body._ping) return NextResponse.json({ ok: true });

    const updatedBy = session?.userId ?? null;
    await updateCityCmsContent(params.slug, body, updatedBy);

    if (updatedBy) {
      const client = await pool.connect();
      try {
        await writeChangelog(client, 'city', params.slug, updatedBy, body);
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[cms/city/${params.slug} PUT]`, err);
    const msg = err instanceof Error ? err.message : 'Failed to save';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
