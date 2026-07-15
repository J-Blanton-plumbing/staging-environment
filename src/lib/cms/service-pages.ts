import pool from '@/lib/db';
import { ConflictError } from '@/lib/cms/errors';

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
  // Optimistic-lock counter. Present on rows read from the DB (SELECT *); omitted
  // when a ServicePageRow is synthesized from a draft payload (see preview.ts).
  version?: number;
  meta_title: string | null;
  meta_description: string | null;
}

export interface ServiceSubcategoryRow {
  label: string;
  href: string;
  description: string;
  sort_order: number;
}

export interface ServiceGlobalRow {
  service_area_heading: string;
  service_area_body: string;
  tiktok_headline: string;
}

export interface ServiceCmsContent {
  page: ServicePageRow;
  subcategories: ServiceSubcategoryRow[];
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
  subcategories: Array<{ label: string; href: string; description: string; sort_order: number }>;
  meta_title?: string | null;
  meta_description?: string | null;
}

export async function getServiceCmsContent(slug: string): Promise<ServiceCmsContent | null> {
  // Each query goes through pool.query() so it gets its own pooled client and
  // they can run concurrently. Sharing a single client across a Promise.all
  // violates node-postgres' one-query-per-client rule and throws under the
  // parallel rendering that `next dev`/`next build` do (surfaces as the opaque
  // "Jest worker encountered N child process exceptions" error).
  const [pageRes, subRes, globalRes] = await Promise.all([
    pool.query<ServicePageRow>('SELECT * FROM service_category_pages WHERE slug = $1', [slug]),
    pool.query<ServiceSubcategoryRow>(
      'SELECT label, href, description, sort_order FROM service_subcategories WHERE page_slug = $1 ORDER BY sort_order',
      [slug]
    ),
    pool.query<ServiceGlobalRow>(
      'SELECT service_area_heading, service_area_body, tiktok_headline FROM global_content LIMIT 1'
    ),
  ]);
  if (!pageRes.rows[0]) return null;
  return {
    page: pageRes.rows[0],
    subcategories: subRes.rows,
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

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
        version = version + 1,
        updated_at = NOW()
       WHERE slug = $16
         AND ($20::int IS NULL OR version = $20::int)
       RETURNING version`,
      [
        data.hero_heading, data.hero_intro, data.intro_heading, data.intro_body,
        data.problems_heading, JSON.stringify(data.problems_items), data.subcategories_heading,
        data.preventative_heading, data.preventative_body, data.final_pitch_tagline,
        data.final_pitch_body, JSON.stringify(data.articles_featured_slugs),
        data.hero_image ?? null, data.f_image ?? null, data.f3_image ?? null,
        slug,
        updatedBy,
        data.meta_title ?? null,
        data.meta_description ?? null,
        expectedVersion ?? null,
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

    await client.query(`DELETE FROM service_subcategories WHERE page_slug = $1`, [slug]);
    for (let i = 0; i < data.subcategories.length; i++) {
      const sub = data.subcategories[i];
      await client.query(
        `INSERT INTO service_subcategories (page_slug, label, href, description, sort_order)
         VALUES ($1, $2, $3, $4, $5)`,
        [slug, sub.label, sub.href, sub.description, i]
      );
    }

    await client.query('COMMIT');
    return pageRes.rows[0].version as number;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
