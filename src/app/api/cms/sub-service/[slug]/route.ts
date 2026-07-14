import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import pool from '@/lib/db';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { slug } = await params;
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT s.slug, s.title, s.hero_heading, s.hero_intro, s.hero_image,
              s.intro_heading, s.intro_body, s.f_image,
              s.problems_heading, s.problems_items, s.cta_heading, s.cta_body, s.f3_image,
              s.ndc_title, s.ndc_body,
              s.status, s.meta_title, s.meta_description, s.created_at, s.updated_at,
              s.parent_slug, s.version,
              cu.name AS created_by_name, uu.name AS updated_by_name
         FROM sub_service_pages s
         LEFT JOIN cms_users cu ON cu.id = s.created_by
         LEFT JOIN cms_users uu ON uu.id = s.updated_by
        WHERE s.slug = $1`,
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

  // Validate parent_slug if provided
  const rawParent = 'parentSlug' in body ? body.parentSlug : undefined;
  if (rawParent !== undefined && rawParent !== null) {
    const parentCheck = await pool.connect();
    try {
      const exists = await parentCheck.query(
        `SELECT 1 FROM service_category_pages WHERE slug = $1`,
        [rawParent]
      );
      if (exists.rowCount === 0) {
        return NextResponse.json({ error: 'Invalid parent_slug: not found in service_category_pages' }, { status: 400 });
      }
    } finally {
      parentCheck.release();
    }
  }

  // Brief 75 (DP-1): optional optimistic-concurrency guard — when the editor sends
  // the version it loaded, reject a stale direct edit (409) instead of clobbering.
  const expectedVersion = typeof body.version === 'number' ? body.version : null;

  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE sub_service_pages SET
         title            = COALESCE($1, title),
         hero_heading     = COALESCE($2, hero_heading),
         hero_intro       = COALESCE($3, hero_intro),
         hero_image       = COALESCE($4, hero_image),
         intro_heading    = COALESCE($5, intro_heading),
         intro_body       = COALESCE($6, intro_body),
         problems_heading = COALESCE($7, problems_heading),
         problems_items   = COALESCE($8, problems_items),
         cta_heading      = COALESCE($9, cta_heading),
         cta_body         = COALESCE($10, cta_body),
         status           = COALESCE($11, status),
         meta_title       = $12,
         meta_description = $13,
         parent_slug      = $14,
         f_image          = COALESCE($17, f_image),
         f3_image         = COALESCE($18, f3_image),
         ndc_title        = COALESCE($19, ndc_title),
         ndc_body         = COALESCE($20, ndc_body),
         updated_by       = $15,
         version          = version + 1,
         updated_at       = NOW()
       WHERE slug = $16
         AND ($21::int IS NULL OR version = $21::int)
       RETURNING id, version`,
      [
        (body.title as string) ?? null,
        (body.heroHeading as string) ?? null,
        (body.heroIntro as string) ?? null,
        (body.heroImage as string) ?? null,
        (body.introHeading as string) ?? null,
        (body.introBody as string) ?? null,
        (body.problemsHeading as string) ?? null,
        body.problemsItems ? JSON.stringify(body.problemsItems) : null,
        (body.ctaHeading as string) ?? null,
        (body.ctaBody as string) ?? null,
        (body.status as string) ?? null,
        (body.metaTitle as string) ?? null,
        (body.metaDescription as string) ?? null,
        rawParent !== undefined ? (rawParent as string | null) : null,
        session.userId,
        slug,
        (body.fImage as string) ?? null,
        (body.f3Image as string) ?? null,
        (body.ndcTitle as string) ?? null,
        (body.ndcBody as string) ?? null,
        expectedVersion,
      ]
    );
    if ((res.rowCount ?? 0) === 0) {
      // Disambiguate a missing row from a version conflict.
      const exists = await client.query('SELECT 1 FROM sub_service_pages WHERE slug = $1', [slug]);
      if ((exists.rowCount ?? 0) === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      return NextResponse.json(
        { error: 'This sub-service page was changed by someone else since you loaded it. Reload before saving.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: true, version: res.rows[0].version });
  } catch (err) {
    console.error('[cms/sub-service PUT]', err);
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
      `UPDATE sub_service_pages
          SET status = $1, updated_by = $2, version = version + 1, updated_at = NOW()
        WHERE slug = $3
        RETURNING status`,
      [newStatus, session.userId, slug]
    );
    if ((res.rowCount ?? 0) === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, status: res.rows[0].status });
  } catch (err) {
    console.error('[cms/sub-service PATCH]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}
