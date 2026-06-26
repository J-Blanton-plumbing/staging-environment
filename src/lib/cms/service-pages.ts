import pool from '@/lib/db';

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
  const client = await pool.connect();
  try {
    const [pageRes, subRes, globalRes] = await Promise.all([
      client.query<ServicePageRow>('SELECT * FROM service_category_pages WHERE slug = $1', [slug]),
      client.query<ServiceSubcategoryRow>(
        'SELECT label, href, description, sort_order FROM service_subcategories WHERE page_slug = $1 ORDER BY sort_order',
        [slug]
      ),
      client.query<ServiceGlobalRow>(
        'SELECT service_area_heading, service_area_body, tiktok_headline FROM global_content LIMIT 1'
      ),
    ]);
    if (!pageRes.rows[0]) return null;
    return {
      page: pageRes.rows[0],
      subcategories: subRes.rows,
      global: globalRes.rows[0],
    };
  } finally {
    client.release();
  }
}

export async function updateServiceCmsContent(
  slug: string,
  data: ServiceCmsUpdatePayload,
  updatedBy: number | null = null
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE service_category_pages SET
        hero_heading = $1, hero_intro = $2, intro_heading = $3, intro_body = $4,
        problems_heading = $5, problems_items = $6, subcategories_heading = $7,
        preventative_heading = $8, preventative_body = $9, final_pitch_tagline = $10,
        final_pitch_body = $11, articles_featured_slugs = $12,
        hero_image = $13, f_image = $14, f3_image = $15,
        updated_by = COALESCE($17, updated_by),
        meta_title = COALESCE($18, meta_title),
        meta_description = COALESCE($19, meta_description),
        updated_at = NOW()
       WHERE slug = $16`,
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
      ]
    );

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
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
