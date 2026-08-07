import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { requireCmsSession } from '@/lib/auth/api-guard';
import pool from '@/lib/db';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import type { SubServiceBlockInstance } from '@/lib/cms/sub-service-blocks';
import type { SubServiceFields } from '@/lib/cms/sub-service-fields';
import {
  assembleBlocks,
  normalizeBlocks,
  sanitizeBlockInstances,
  blocksToFields,
} from '@/lib/cms/sub-service-blocks';

const nn = (v: string | null | undefined): string | null => (v == null ? null : v);

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;

  const { slug } = await params;
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT s.slug, s.title, s.hero_heading, s.hero_intro, s.hero_image,
              s.intro_heading, s.intro_body, s.f_image,
              s.problems_heading, s.problems_items, s.cta_heading, s.cta_body, s.f3_image,
              s.ndc_title, s.ndc_body, s.blocks,
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

  // Brief 86 (items 3 & 5): intro_body/ndc_body are now RichTextField-backed —
  // sanitize through the shared Brief 73 allow-list before persisting.
  const introBody = typeof body.introBody === 'string' ? sanitizeCmsHtml(body.introBody) : null;
  const ndcBody = typeof body.ndcBody === 'string' ? sanitizeCmsHtml(body.ndcBody) : null;

  // Brief 86 fix: meta_title/meta_description/parent_slug were assigned directly
  // (not COALESCE'd like every other field), so a caller that omits one of these
  // keys — any partial PUT, not just the full-form admin editor — silently wiped
  // it to NULL instead of leaving it untouched. Track "was this key present in
  // the request body" per field so an omitted key preserves the existing value,
  // while an explicit value (including an intentional `null` to clear it, as the
  // admin editor sends when a field is emptied) still applies.
  const metaTitleProvided = 'metaTitle' in body;
  const metaDescriptionProvided = 'metaDescription' in body;
  const parentProvided = rawParent !== undefined;

  // Brief 90 (Track B): the editor sends the full per-instance `blocks` array as
  // the authoritative source of content + order. Sanitize every instance's
  // rich-text keys, then derive the PRIMARY (first-instance) snapshot so the 13
  // named columns stay populated as a rollback snapshot. A partial PUT that sends
  // neither `blocks` nor `blockOrder` leaves the existing blocks untouched; a
  // Brief 89-style caller sending flat fields + `blockOrder` still works.
  const blocksProvided = Array.isArray(body.blocks);
  const blockOrderProvided = Array.isArray(body.blockOrder);
  let blocks: SubServiceBlockInstance[] | null = null;
  let primary: SubServiceFields | null = null;
  if (blocksProvided) {
    blocks = sanitizeBlockInstances(normalizeBlocks(body.blocks), sanitizeCmsHtml);
    primary = blocksToFields(blocks).fields;
  } else if (blockOrderProvided) {
    blocks = assembleBlocks(
      {
        slug,
        heroHeading: (body.heroHeading as string) ?? null,
        heroIntro: (body.heroIntro as string) ?? null,
        heroImage: (body.heroImage as string) ?? null,
        introHeading: (body.introHeading as string) ?? null,
        introBody, // already sanitized above
        fImage: (body.fImage as string) ?? null,
        problemsHeading: (body.problemsHeading as string) ?? null,
        problemsItems: Array.isArray(body.problemsItems) ? (body.problemsItems as string[]) : [],
        ctaHeading: (body.ctaHeading as string) ?? null,
        ctaBody: (body.ctaBody as string) ?? null,
        f3Image: (body.f3Image as string) ?? null,
        ndcTitle: (body.ndcTitle as string) ?? null,
        ndcBody, // already sanitized above
      },
      body.blockOrder
    );
  }

  // Effective named-column values: from the primary instance when `blocks` is
  // authoritative, else from the request's flat fields (Brief 89 / partial PUT).
  const heroHeadingV = blocksProvided ? nn(primary!.heroHeading) : ((body.heroHeading as string) ?? null);
  const heroIntroV   = blocksProvided ? nn(primary!.heroIntro)   : ((body.heroIntro as string) ?? null);
  const heroImageV   = blocksProvided ? nn(primary!.heroImage)   : ((body.heroImage as string) ?? null);
  const introHeadingV = blocksProvided ? nn(primary!.introHeading) : ((body.introHeading as string) ?? null);
  const introBodyV   = blocksProvided ? nn(primary!.introBody)   : introBody;
  const fImageV      = blocksProvided ? nn(primary!.fImage)      : ((body.fImage as string) ?? null);
  const problemsHeadingV = blocksProvided ? nn(primary!.problemsHeading) : ((body.problemsHeading as string) ?? null);
  const problemsItemsV = blocksProvided
    ? (primary!.problemsItems !== undefined ? JSON.stringify(primary!.problemsItems) : null)
    : (body.problemsItems ? JSON.stringify(body.problemsItems) : null);
  const ctaHeadingV  = blocksProvided ? nn(primary!.ctaHeading)  : ((body.ctaHeading as string) ?? null);
  const ctaBodyV     = blocksProvided ? nn(primary!.ctaBody)     : ((body.ctaBody as string) ?? null);
  const f3ImageV     = blocksProvided ? nn(primary!.f3Image)     : ((body.f3Image as string) ?? null);
  const ndcTitleV    = blocksProvided ? nn(primary!.ndcTitle)    : ((body.ndcTitle as string) ?? null);
  const ndcBodyV     = blocksProvided ? nn(primary!.ndcBody)     : ndcBody;

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
         meta_title       = CASE WHEN $22 THEN $12 ELSE meta_title END,
         meta_description = CASE WHEN $23 THEN $13 ELSE meta_description END,
         parent_slug      = CASE WHEN $24 THEN $14 ELSE parent_slug END,
         f_image          = COALESCE($17, f_image),
         f3_image         = COALESCE($18, f3_image),
         ndc_title        = COALESCE($19, ndc_title),
         ndc_body         = COALESCE($20, ndc_body),
         blocks           = CASE WHEN $25 THEN $26::jsonb ELSE blocks END,
         updated_by       = $15,
         version          = version + 1,
         updated_at       = NOW()
       WHERE slug = $16
         AND ($21::int IS NULL OR version = $21::int)
       RETURNING id, version`,
      [
        (body.title as string) ?? null,
        heroHeadingV,
        heroIntroV,
        heroImageV,
        introHeadingV,
        introBodyV,
        problemsHeadingV,
        problemsItemsV,
        ctaHeadingV,
        ctaBodyV,
        (body.status as string) ?? null,
        (body.metaTitle as string) ?? null,
        (body.metaDescription as string) ?? null,
        rawParent !== undefined ? (rawParent as string | null) : null,
        session.userId,
        slug,
        fImageV,
        f3ImageV,
        ndcTitleV,
        ndcBodyV,
        expectedVersion,
        metaTitleProvided,
        metaDescriptionProvided,
        parentProvided,
        blocks !== null,
        blocks ? JSON.stringify(blocks) : null,
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
        RETURNING status, version`,
      [newStatus, session.userId, slug]
    );
    if ((res.rowCount ?? 0) === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Brief 147 (Track B): return the new version. This PATCH bumps it, and the
    // editor was guessing `version + 1` client-side — a guess that silently
    // desynced the optimistic-lock token whenever anything else had moved the row,
    // turning the next save into a false "changed by someone else" conflict.
    return NextResponse.json({ success: true, status: res.rows[0].status, version: res.rows[0].version });
  } catch (err) {
    console.error('[cms/sub-service PATCH]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}
