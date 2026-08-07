import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { requireCmsSession } from '@/lib/auth/api-guard';
import { sanitizeMainPageContent } from '@/lib/cms/sanitize';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;

  const client = await pool.connect();
  try {
    const res = await client.query(
      'SELECT content, meta_title, meta_description, updated_by, updated_at, version FROM main_pages WHERE slug = $1',
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
      version: row.version ?? 0,
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
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const client = await pool.connect();
  try {
    const body = await req.json();
    // Brief 78 (Track A): `version` is the optimistic-lock counter the editor
    // last read — it must never be persisted into the content blob.
    const { meta_title, meta_description, version: _v, ...rawContent } = body;
    void _v;
    // Brief 77 (Feature A): sanitize rich-text fields through the shared Brief 73
    // allow-list before persisting, so widening HTML input can't store XSS.
    const content = sanitizeMainPageContent(params.slug, rawContent);
    const updatedBy = session?.userId?.toString() ?? null;
    // Brief 78 (Track A): optimistic concurrency — reject a stale direct edit (409).
    const expectedVersion = typeof body.version === 'number' ? body.version : null;

    // Brief 78 (Track B): bump `version` on every successful write so main-page
    // edits participate in optimistic locking, consistent with the other writers.
    const res = await client.query(
      `UPDATE main_pages SET
         content          = $1,
         meta_title       = $2,
         meta_description = $3,
         updated_by       = $4,
         version          = version + 1,
         updated_at       = NOW()
       WHERE slug = $5
         AND ($6::int IS NULL OR version = $6::int)
       RETURNING version`,
      [JSON.stringify(content), meta_title ?? null, meta_description ?? null, updatedBy, params.slug, expectedVersion]
    );

    if (res.rowCount === 0) {
      // Disambiguate a missing row from a version conflict.
      const exists = await client.query('SELECT 1 FROM main_pages WHERE slug = $1', [params.slug]);
      if ((exists.rowCount ?? 0) === 0) {
        return NextResponse.json({ error: 'Page not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'This page was changed by someone else since you loaded it. Reload before saving.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, version: res.rows[0].version });
  } catch (err) {
    console.error(`[cms/main/${params.slug} PATCH]`, err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  } finally {
    client.release();
  }
}
