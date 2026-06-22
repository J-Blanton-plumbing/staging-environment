import pool from '@/lib/db';
import type { SewerContent } from '@/lib/content/sewer';

interface DBSewerRow {
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
  hero_image: string;
  f_image: string;
  f3_image: string;
}

interface DBSubcategoryRow {
  label: string;
  href: string;
  description: string;
  sort_order: number;
}

interface DBGlobalRow {
  service_area_heading: string;
  service_area_body: string;
  tiktok_headline: string;
}

export interface CmsSewerPayload {
  page: DBSewerRow;
  subcategories: DBSubcategoryRow[];
  global: DBGlobalRow;
}

export async function getSewerCmsContent(): Promise<CmsSewerPayload | null> {
  const client = await pool.connect();
  try {
    const [pageRes, subRes, globalRes] = await Promise.all([
      client.query<DBSewerRow>('SELECT * FROM service_category_pages WHERE slug = $1', ['sewer']),
      client.query<DBSubcategoryRow>(
        'SELECT label, href, description, sort_order FROM service_subcategories WHERE page_slug = $1 ORDER BY sort_order',
        ['sewer']
      ),
      client.query<DBGlobalRow>('SELECT service_area_heading, service_area_body, tiktok_headline FROM global_content LIMIT 1'),
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

export async function updateSewerCmsContent(data: {
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
  hero_image: string;
  f_image: string;
  f3_image: string;
  service_area_heading: string;
  service_area_body: string;
  tiktok_headline: string;
  subcategories: Array<{ label: string; href: string; description: string; sort_order: number }>;
}): Promise<void> {
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
        updated_at = NOW()
       WHERE slug = 'sewer'`,
      [
        data.hero_heading, data.hero_intro, data.intro_heading, data.intro_body,
        data.problems_heading, JSON.stringify(data.problems_items), data.subcategories_heading,
        data.preventative_heading, data.preventative_body, data.final_pitch_tagline,
        data.final_pitch_body, JSON.stringify(data.articles_featured_slugs),
        data.hero_image, data.f_image, data.f3_image,
      ]
    );

    await client.query(
      `UPDATE global_content SET
        service_area_heading = $1, service_area_body = $2, tiktok_headline = $3, updated_at = NOW()`,
      [data.service_area_heading, data.service_area_body, data.tiktok_headline]
    );

    await client.query(`DELETE FROM service_subcategories WHERE page_slug = 'sewer'`);
    for (let i = 0; i < data.subcategories.length; i++) {
      const sub = data.subcategories[i];
      await client.query(
        `INSERT INTO service_subcategories (page_slug, label, href, description, sort_order)
         VALUES ('sewer', $1, $2, $3, $4)`,
        [sub.label, sub.href, sub.description, i]
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

export function mergeWithStaticImages(
  cms: CmsSewerPayload,
  staticData: SewerContent
): SewerContent {
  const { page, subcategories, global } = cms;
  return {
    hero: { heading: page.hero_heading, intro: page.hero_intro },
    intro: { heading: page.intro_heading, body: page.intro_body },
    problems: { heading: page.problems_heading, items: page.problems_items },
    subcategories: {
      heading: page.subcategories_heading,
      items: subcategories.map((sub, i) => ({
        label: sub.label,
        href: sub.href,
        description: sub.description,
        image: staticData.subcategories.items[i]?.image ?? '',
        desc: sub.description,
      })),
    },
    serviceArea: { heading: global.service_area_heading, body: global.service_area_body },
    tiktok: { headline: global.tiktok_headline },
    preventative: { heading: page.preventative_heading, body: page.preventative_body },
    finalPitch: { tagline: page.final_pitch_tagline, body: page.final_pitch_body },
    heroImage: page.hero_image || staticData.heroImage,
    fImage: page.f_image || staticData.fImage,
    f3Image: page.f3_image || staticData.f3Image,
    articles: { featuredSlugs: page.articles_featured_slugs },
  };
}
