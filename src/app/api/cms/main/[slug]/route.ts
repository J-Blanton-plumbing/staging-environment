import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      'SELECT content, meta_title, meta_description, updated_by, updated_at FROM main_pages WHERE slug = $1',
      [params.slug]
    );
    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const row = res.rows[0];
    return NextResponse.json({
      ...(row.content as Record<string, unknown>),
      meta_title: row.meta_title ?? null,
      meta_description: row.meta_description ?? null,
      updated_by: row.updated_by ?? null,
      updated_at: row.updated_at ?? null,
    });
  } catch (err) {
    console.error(`[cms/main/${params.slug} GET]`, err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await getSession(req);
  const authHeader = req.headers.get('authorization');
  const legacyAuth = authHeader === `Bearer ${process.env.CMS_ADMIN_PASSWORD}`;

  if (!session && !legacyAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const body = await req.json();
    const { meta_title, meta_description, ...content } = body;
    const updatedBy = session?.userId?.toString() ?? null;

    const res = await client.query(
      `UPDATE main_pages SET
         content          = $1,
         meta_title       = $2,
         meta_description = $3,
         updated_by       = $4,
         updated_at       = NOW()
       WHERE slug = $5
       RETURNING id`,
      [JSON.stringify(content), meta_title ?? null, meta_description ?? null, updatedBy, params.slug]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(`[cms/main/${params.slug} PATCH]`, err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  } finally {
    client.release();
  }
}
