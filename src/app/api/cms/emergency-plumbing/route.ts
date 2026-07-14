import { NextRequest, NextResponse } from 'next/server';
import { getEpCmsContent, updateEpCmsContent } from '@/lib/cms/emergency-plumbing';
import { getSession } from '@/lib/auth/session';
import pool from '@/lib/db';
import { writeChangelog } from '@/lib/cms/changelog';

export async function GET() {
  try {
    const data = await getEpCmsContent();
    if (!data) {
      return NextResponse.json({ error: 'No emergency plumbing content found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error('[cms/emergency-plumbing GET]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (body._ping) return NextResponse.json({ ok: true });

    const updatedBy = session?.userId ?? null;
    await updateEpCmsContent(body, updatedBy);

    if (updatedBy) {
      const client = await pool.connect();
      try {
        await writeChangelog(client, 'emergency-plumbing', 'emergency-plumbing', updatedBy, body);
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[cms/emergency-plumbing PUT]', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
