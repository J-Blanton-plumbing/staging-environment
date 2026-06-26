import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import pool from '@/lib/db';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT slug, title, excerpt, body->>'html' AS body, image, status,
              meta_title, meta_description, created_at, updated_at
         FROM cms_articles WHERE slug = $1`,
      [slug]
    );
    if (!res.rows[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(res.rows[0]);
  } catch (err) {
    console.error('[cms/article GET]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession(_req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  const client = await pool.connect();
  try {
    const res = await client.query(
      `DELETE FROM cms_articles WHERE slug = $1 RETURNING id`,
      [slug]
    );
    if ((res.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[cms/article DELETE]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const newStatus = body.status;
  if (newStatus !== 'published' && newStatus !== 'draft') {
    return NextResponse.json({ error: 'status must be "published" or "draft"' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE cms_articles
          SET status = $1, updated_by = $2, updated_at = NOW()
        WHERE slug = $3
        RETURNING status`,
      [newStatus, session.userId, slug]
    );
    if ((res.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, status: res.rows[0].status });
  } catch (err) {
    console.error('[cms/article PATCH]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  let body: {
    title?: string;
    excerpt?: string;
    body?: string;
    image?: string;
    status?: string;
    metaTitle?: string | null;
    metaDescription?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE cms_articles SET
         title            = COALESCE($1, title),
         excerpt          = COALESCE($2, excerpt),
         body             = COALESCE($3, body),
         image            = COALESCE($4, image),
         status           = COALESCE($5, status),
         meta_title       = $6,
         meta_description = $7,
         updated_by       = $8,
         updated_at       = NOW()
       WHERE slug = $9
       RETURNING id`,
      [
        body.title ?? null,
        body.excerpt ?? null,
        body.body != null ? JSON.stringify({ html: body.body }) : null,
        body.image ?? null,
        body.status ?? null,
        body.metaTitle ?? null,
        body.metaDescription ?? null,
        session.userId,
        slug,
      ]
    );
    if ((res.rowCount ?? 0) === 0) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[cms/article PUT]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}
