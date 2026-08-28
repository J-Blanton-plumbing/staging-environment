import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { requireCmsSession } from '@/lib/auth/api-guard';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import pool from '@/lib/db';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;

  const { slug } = await params;
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT a.slug, a.title, a.excerpt, a.body->>'html' AS body, a.image, a.status,
              a.meta_title, a.meta_description, a.created_at, a.updated_at,
              COALESCE(a.category, '{}') AS categories,
              cu.name AS created_by_name, uu.name AS updated_by_name
         FROM cms_articles a
         LEFT JOIN cms_users cu ON cu.id = a.created_by
         LEFT JOIN cms_users uu ON uu.id = a.updated_by
        WHERE a.slug = $1`,
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

/**
 * Brief 159 (Track A2 / E4) — closed, for the same reason as the sub-service
 * PATCH: `cms_articles.status` is now the DERIVED render gate, written only by
 * the publish/unpublish transaction. It used to be settable here (and from the
 * articles LIST page, one row at a time), which is a page-level status switch
 * competing with the sidebar's Status row.
 */
export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return NextResponse.json(
    {
      error:
        'An article\'s status is no longer set directly. It is derived from which version is ' +
        'published — open the article and set the Status row in the editor sidebar.',
    },
    { status: 409 }
  );
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
    metaTitle?: string | null;
    metaDescription?: string | null;
    categories?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    // Brief 159 (Track A2): `status` is gone from this statement. It is the
    // DERIVED render gate now, written ONLY by the publish/unpublish transaction
    // in src/lib/cms/drafts.ts — a content save must not be able to decide
    // whether the article is live.
    const res = await client.query(
      `UPDATE cms_articles SET
         title            = COALESCE($1, title),
         excerpt          = COALESCE($2, excerpt),
         body             = COALESCE($3, body),
         image            = COALESCE($4, image),
         meta_title       = $5,
         meta_description = $6,
         category         = COALESCE($7, category),
         updated_by       = $8,
         updated_at       = NOW()
       WHERE slug = $9
       RETURNING id`,
      [
        body.title ?? null,
        body.excerpt ?? null,
        body.body != null ? JSON.stringify({ html: sanitizeCmsHtml(body.body) }) : null,
        body.image ?? null,
        body.metaTitle ?? null,
        body.metaDescription ?? null,
        body.categories ?? null,
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
