import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import pool from '@/lib/db';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT slug, title, hero_heading, hero_intro, intro_heading, intro_body,
              problems_heading, problems_items, cta_heading, cta_body,
              status, meta_title, meta_description, created_at, updated_at
         FROM sub_service_pages WHERE slug = $1`,
      [slug]
    );
    if (!res.rows[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(res.rows[0]);
  } catch (err) {
    console.error('[cms/sub-service GET]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { slug } = await params;
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE sub_service_pages SET
         title            = COALESCE($1, title),
         hero_heading     = COALESCE($2, hero_heading),
         hero_intro       = COALESCE($3, hero_intro),
         intro_heading    = COALESCE($4, intro_heading),
         intro_body       = COALESCE($5, intro_body),
         problems_heading = COALESCE($6, problems_heading),
         problems_items   = COALESCE($7, problems_items),
         cta_heading      = COALESCE($8, cta_heading),
         cta_body         = COALESCE($9, cta_body),
         status           = COALESCE($10, status),
         meta_title       = $11,
         meta_description = $12,
         updated_by       = $13,
         updated_at       = NOW()
       WHERE slug = $14
       RETURNING id`,
      [
        (body.title as string) ?? null,
        (body.heroHeading as string) ?? null,
        (body.heroIntro as string) ?? null,
        (body.introHeading as string) ?? null,
        (body.introBody as string) ?? null,
        (body.problemsHeading as string) ?? null,
        body.problemsItems ? JSON.stringify(body.problemsItems) : null,
        (body.ctaHeading as string) ?? null,
        (body.ctaBody as string) ?? null,
        (body.status as string) ?? null,
        (body.metaTitle as string) ?? null,
        (body.metaDescription as string) ?? null,
        session.userId,
        slug,
      ]
    );
    if ((res.rowCount ?? 0) === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[cms/sub-service PUT]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}
