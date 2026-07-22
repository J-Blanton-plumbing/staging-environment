import pool from '@/lib/db';
import { ConflictError } from '@/lib/cms/errors';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import {
  getSubcategoriesBlockData,
  buildSubcategoriesBlocks,
  type ServiceSubcategoriesBlockData,
} from '@/lib/cms/service-category-blocks';

export interface ServicePageRow {
  hero_heading: string;
  hero_intro: string;
  intro_heading: string;
  intro_body: string;
  problems_heading: string;
  problems_items: string[];
  subcategories_heading: string;
  preventative_heading: string;
  preventative_body: string;
  final_pitch_tagline: string;
  final_pitch_body: string;
  articles_featured_slugs: string[];
  hero_image: string | null;
  f_image: string | null;
  f3_image: string | null;
  // Brief 98: the `serviceSubcategories` block instance array — see
  // `service-category-blocks.ts`. Present on rows read from the DB (SELECT *);
  // omitted when a ServicePageRow is synthesized from a draft payload.
  blocks?: unknown;
  // Optimistic-lock counter. Present on rows read from the DB (SELECT *); omitted
  // when a ServicePageRow is synthesized from a draft payload (see preview.ts).
  version?: number;
  meta_title: string | null;
  meta_description: string | null;
}

export interface ServiceGlobalRow {
  service_area_heading: string;
  service_area_body: string;
  tiktok_headline: string;
}

export interface ServiceCmsContent {
  page: ServicePageRow;
  // Brief 98: derived from `page.blocks` (the `serviceSubcategories` instance),
  // not a separate `service_subcategories` table read. Null when the page has
  // no subcategories block — callers must fall back to rendering nothing.
  subcategoriesBlock: ServiceSubcategoriesBlockData | null;
  global: ServiceGlobalRow;
}

export interface ServiceCmsUpdatePayload {
  hero_heading: string;
  hero_intro: string;
  intro_heading: string;
  intro_body: string;
  problems_heading: string;
  problems_items: string[];
  subcategories_heading: string;
  preventative_heading: string;
  preventative_body: string;
  final_pitch_tagline: string;
  final_pitch_body: string;
  articles_featured_slugs: string[];
  hero_image?: string;
  f_image?: string;
  f3_image?: string;
  service_area_heading: string;
  service_area_body: string;
  tiktok_headline: string;
  // Brief 98: `sort_order` is no longer persisted anywhere — array position IS
  // the order (kept optional on the wire type only so any still-in-flight
  // client payload carrying it doesn't fail to type-check).
  subcategories: Array<{ label: string; href: string; description: string; image?: string; sort_order?: number }>;
  meta_title?: string | null;
  meta_description?: string | null;
}

export async function getServiceCmsContent(slug: string): Promise<ServiceCmsContent | null> {
  // Each query goes through pool.query() so it gets its own pooled client and
  // they can run concurrently. Sharing a single client across a Promise.all
  // violates node-postgres' one-query-per-client rule and throws under the
  // parallel rendering that `next dev`/`next build` do (surfaces as the opaque
  // "Jest worker encountered N child process exceptions" error).
  // Brief 98: the subcategories read is now folded into `blocks` (SELECT *
  // already includes it) — `service_subcategories` is no longer queried here.
  const [pageRes, globalRes] = await Promise.all([
    pool.query<ServicePageRow>('SELECT * FROM service_category_pages WHERE slug = $1', [slug]),
    pool.query<ServiceGlobalRow>(
      'SELECT service_area_heading, service_area_body, tiktok_headline FROM global_content LIMIT 1'
    ),
  ]);
  if (!pageRes.rows[0]) return null;
  return {
    page: pageRes.rows[0],
    subcategoriesBlock: getSubcategoriesBlockData(pageRes.rows[0].blocks),
    global: globalRes.rows[0],
  };
}

export async function updateServiceCmsContent(
  slug: string,
  data: ServiceCmsUpdatePayload,
  updatedBy: number | null = null,
  // Brief 75 (DP-1): optional optimistic-concurrency guard, see updateCityCmsContent.
  expectedVersion?: number | null
): Promise<number> {
  // Brief 89 (A1): the large body fields are now RichTextField (HTML). Sanitize
  // through the shared Brief 73 allow-list before persisting — same treatment the
  // main_pages and sub-service writers apply. Applies to both the direct PUT and
  // the draft-publish path, which both route here.
  const introBody = sanitizeCmsHtml(data.intro_body);
  const preventativeBody = sanitizeCmsHtml(data.preventative_body);
  const finalPitchBody = sanitizeCmsHtml(data.final_pitch_body);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Brief 98: read the current `blocks` (row-locked for the duration of this
    // transaction) so the rebuilt serviceSubcategories instance reuses its
    // existing stable id instead of churning a fresh one on every save.
    const currentRes = await client.query<{ blocks: unknown }>(
      'SELECT blocks FROM service_category_pages WHERE slug = $1 FOR UPDATE',
      [slug]
    );
    const nextBlocks = buildSubcategoriesBlocks(currentRes.rows[0]?.blocks, {
      heading: data.subcategories_heading || null,
      items: data.subcategories.map((sub) => ({
        label: sub.label,
        href: sub.href,
        desc: sub.description,
        image: sub.image ?? '',
      })),
    });

    // Brief 75 (CQ-1): this writer previously never checked rowCount, so a slug
    // that matched no row (e.g. a sub-service draft mis-dispatched here) committed
    // a silent no-op. Capture the row and fail loudly on zero matches.
    const pageRes = await client.query(
      `UPDATE service_category_pages SET
        hero_heading = $1, hero_intro = $2, intro_heading = $3, intro_body = $4,
        problems_heading = $5, problems_items = $6, subcategories_heading = $7,
        preventative_heading = $8, preventative_body = $9, final_pitch_tagline = $10,
        final_pitch_body = $11, articles_featured_slugs = $12,
        hero_image = $13, f_image = $14, f3_image = $15,
        updated_by = COALESCE($17, updated_by),
        meta_title = COALESCE($18, meta_title),
        meta_description = COALESCE($19, meta_description),
        blocks = $21::jsonb,
        version = version + 1,
        updated_at = NOW()
       WHERE slug = $16
         AND ($20::int IS NULL OR version = $20::int)
       RETURNING version`,
      [
        data.hero_heading, data.hero_intro, data.intro_heading, introBody,
        data.problems_heading, JSON.stringify(data.problems_items), data.subcategories_heading,
        data.preventative_heading, preventativeBody, data.final_pitch_tagline,
        finalPitchBody, JSON.stringify(data.articles_featured_slugs),
        data.hero_image ?? null, data.f_image ?? null, data.f3_image ?? null,
        slug,
        updatedBy,
        data.meta_title ?? null,
        data.meta_description ?? null,
        expectedVersion ?? null,
        JSON.stringify(nextBlocks),
      ]
    );
    if (pageRes.rowCount === 0) {
      const exists = await client.query('SELECT version FROM service_category_pages WHERE slug = $1', [slug]);
      if (exists.rowCount === 0) {
        throw new Error(`No service_category_pages row found for slug "${slug}".`);
      }
      throw new ConflictError(
        'This service page was changed by someone else since you loaded it. Reload before saving.'
      );
    }

    await client.query(
      `UPDATE global_content SET
        service_area_heading = $1, service_area_body = $2, tiktok_headline = $3, updated_at = NOW()`,
      [data.service_area_heading, data.service_area_body, data.tiktok_headline]
    );

    // Brief 98: `service_subcategories` is no longer written — it is kept only
    // as a read-only rollback snapshot from before the migration. The
    // authoritative subcategories data now lives in `blocks` above.

    await client.query('COMMIT');
    return pageRes.rows[0].version as number;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
