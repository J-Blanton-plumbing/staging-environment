import { NextRequest, NextResponse } from 'next/server';
import { requireCmsSession } from '@/lib/auth/api-guard';
import pool from '@/lib/db';
import { writeChangelog } from '@/lib/cms/changelog';
import { clearSitemapCache } from '@/lib/sitemap/render';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Brief 187 — PUT /api/cms/kh-terms/{id}: edit one term's display fields.
 *
 * Editable: name, intro_html, meta_title, meta_description, indexable ("Show in
 * Google"). NOT editable here, on purpose:
 *   • slug       — a slug change needs redirects; deferred to Phase 2.
 *   • type / parent / registry link — locations mirror CITY_REGISTRY.
 *   • there is no DELETE — topics can't be deleted in Phase 1 and locations are
 *     registry-managed.
 *
 * `intro_html` is stored as typed and sanitised on RENDER with sanitizeCmsHtml
 * (the brief's rule, and the codebase's: the sanitiser is a gate, never a
 * transform on a stored body — it strips inline styles).
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  let body: {
    name?: unknown;
    introHtml?: unknown;
    metaTitle?: unknown;
    metaDescription?: unknown;
    indexable?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
  if (name.length > 120) return NextResponse.json({ error: 'Name must be 120 characters or fewer.' }, { status: 400 });
  const introHtml = typeof body.introHtml === 'string' ? body.introHtml : '';
  const opt = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const metaTitle = opt(body.metaTitle);
  const metaDescription = opt(body.metaDescription);
  if (typeof body.indexable !== 'boolean') {
    return NextResponse.json({ error: '"Show in Google" must be on or off.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query<{ type: string; slug: string }>(
      `UPDATE kh_terms
          SET name = $1, intro_html = $2, meta_title = $3, meta_description = $4,
              indexable = $5, updated_at = NOW()
        WHERE id = $6
        RETURNING type, slug`,
      [name, introHtml, metaTitle, metaDescription, body.indexable, id]
    );
    if (!res.rows[0]) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { type, slug } = res.rows[0];
    await writeChangelog(client, `kh-${type}`, slug, auth.session.userId, {
      source: 'kh-terms-put',
      name,
      introHtml,
      metaTitle,
      metaDescription,
      indexable: body.indexable,
    });
    await client.query('COMMIT');
    // The switch decides sitemap membership; don't make Google wait 15 minutes.
    clearSitemapCache();
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[cms/kh-terms PUT]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}
