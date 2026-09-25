import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { requireCmsSession } from '@/lib/auth/api-guard';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import pool from '@/lib/db';
import { getArticleTermSelection, getRelatedSelection } from '@/lib/cms/kh-taxonomy';
import { EMPTY_TERM_SELECTION } from '@/lib/cms/kh-taxonomy-types';
import { normalizeArticleTemplate, normalizeArticleV2 } from '@/lib/cms/article-v2';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;

  const { slug } = await params;
  const client = await pool.connect();
  try {
    const res = await client.query(
      // Brief 187: `cms_articles.category` is no longer read (or written) — the
      // editor's tags are the Topic/Location terms returned as `terms` below.
      `SELECT a.id, a.slug, a.title, a.excerpt, a.body->>'html' AS body, a.image, a.status,
              a.meta_title, a.meta_description, a.created_at, a.updated_at,
              -- Brief 190: read through to_jsonb so a database the migration has
              -- not reached yet opens the editor on V1 instead of failing.
              to_jsonb(a) -> 'template' AS template, to_jsonb(a) -> 'v2' AS v2,
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
    const { id, template, v2, ...row } = res.rows[0];
    // The LIVE tags (what the public site shows). A database the Brief 187
    // migration has not reached yet has no taxonomy tables — the editor then
    // opens with no tags instead of failing to load the article.
    let terms = EMPTY_TERM_SELECTION;
    try {
      terms = await getArticleTermSelection(id);
    } catch (err) {
      console.error('[cms/article GET] terms unavailable:', (err as Error).message);
    }
    // Brief 188 (Track B2): the LIVE hand-picked related articles, same guard.
    let related: string[] = [];
    try {
      related = await getRelatedSelection(id);
    } catch (err) {
      console.error('[cms/article GET] related unavailable:', (err as Error).message);
    }
    // Brief 190: the LIVE template + V2 fields, normalized (unknown → V1).
    return NextResponse.json({
      ...row,
      terms,
      related,
      template: normalizeArticleTemplate(template),
      v2: normalizeArticleV2(v2),
    });
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
    //
    // Brief 187: this statement also no longer writes `category` (the legacy
    // text[] stays in the schema, untouched), and it deliberately does NOT write
    // Topic/Location tags even if a client sends them. Tags travel ONLY in a
    // version's content and reach `cms_article_terms` through the publish writer
    // (updateArticleCmsContent), so no path can change them without Publish.
    //
    // Brief 190 (hard rule 5): the same rule for the template and every Article
    // V2 field. `template` / `v2` are ignored here even if a client sends them —
    // they travel only in a version's content and reach the live row on Publish,
    // so this button can never flip an article's template live.
    const res = await client.query(
      `UPDATE cms_articles SET
         title            = COALESCE($1, title),
         excerpt          = COALESCE($2, excerpt),
         body             = COALESCE($3, body),
         image            = COALESCE($4, image),
         meta_title       = $5,
         meta_description = $6,
         updated_by       = $7,
         updated_at       = NOW()
       WHERE slug = $8
       RETURNING id`,
      [
        body.title ?? null,
        body.excerpt ?? null,
        body.body != null ? JSON.stringify({ html: sanitizeCmsHtml(body.body) }) : null,
        body.image ?? null,
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
