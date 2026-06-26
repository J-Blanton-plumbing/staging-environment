import { NextRequest, NextResponse } from 'next/server';
import { getServiceCmsContent, updateServiceCmsContent } from '@/lib/cms/service-pages';
import { getSession } from '@/lib/auth/session';
import pool from '@/lib/db';
import { writeChangelog } from '@/lib/cms/changelog';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const data = await getServiceCmsContent(params.slug);
    if (!data) {
      return NextResponse.json({ error: 'No content found for slug' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error(`[cms/${params.slug} GET]`, err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  // Accept session cookie auth (primary) or Bearer token (legacy fallback)
  const session = await getSession(req);
  const authHeader = req.headers.get('authorization');
  const legacyAuth = authHeader === `Bearer ${process.env.CMS_ADMIN_PASSWORD}`;

  if (!session && !legacyAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    if (body._ping) return NextResponse.json({ ok: true });

    // Reject payloads missing required string fields or with wrong types for required fields
    const requiredStrings = ['hero_heading', 'hero_intro', 'intro_heading', 'intro_body',
      'problems_heading', 'subcategories_heading', 'preventative_heading', 'preventative_body',
      'final_pitch_tagline', 'final_pitch_body'];
    for (const field of requiredStrings) {
      if (typeof body[field] !== 'string') {
        return NextResponse.json({ error: `Invalid or missing field: ${field}` }, { status: 400 });
      }
    }
    if (!Array.isArray(body.subcategories)) {
      return NextResponse.json({ error: 'subcategories must be an array' }, { status: 400 });
    }
    for (const sub of body.subcategories) {
      if (typeof sub.label !== 'string') {
        return NextResponse.json({ error: 'Each subcategory must have a string label' }, { status: 400 });
      }
    }

    const updatedBy = session?.userId ?? null;
    await updateServiceCmsContent(params.slug, body, updatedBy);

    if (updatedBy) {
      const client = await pool.connect();
      try {
        await writeChangelog(client, 'service', params.slug, updatedBy, body);
      } finally {
        client.release();
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[cms/${params.slug} PUT]`, err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
