import pool from '@/lib/db';

export interface CityCmsContent {
  id: number;
  citySlug: string;
  cityType: string;
  templateType: string;
  heroImage: string;
  heroHeadingLine1: string;
  heroHeadingLine2: string | null;
  heroCallout: string;
  heroDescription: string;
  contentHeading: string;
  contentBody: string;
  f2Heading: string;
  f2Body: string;
  faqs: Array<{ question: string; answer: string }>;
  updatedAt: string;
  updatedBy?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface CityCmsUpdatePayload {
  heroImage?: string;
  heroHeadingLine1?: string;
  heroHeadingLine2?: string | null;
  heroCallout?: string;
  heroDescription?: string;
  contentHeading?: string;
  contentBody?: string;
  f2Heading?: string;
  f2Body?: string;
  faqs?: Array<{ question: string; answer: string }>;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export async function getCityCmsContent(slug: string): Promise<CityCmsContent | null> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT * FROM city_pages WHERE city_slug = $1`,
      [slug]
    );
    if (!res.rows[0]) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      citySlug: r.city_slug,
      cityType: r.city_type,
      templateType: r.template_type ?? r.city_type ?? 'coverage-area',
      heroImage: r.hero_image ?? '',
      heroHeadingLine1: r.hero_heading_line1,
      heroHeadingLine2: r.hero_heading_line2,
      heroCallout: r.hero_callout ?? '',
      heroDescription: r.hero_description,
      contentHeading: r.content_heading ?? '',
      contentBody: r.content_body ?? '',
      f2Heading: r.f2_heading ?? '',
      f2Body: r.f2_body ?? '',
      faqs: r.faqs,
      updatedAt: r.updated_at,
      updatedBy: r.updated_by_email ?? null,
      createdBy: r.created_by ?? null,
      createdAt: r.created_at ?? null,
      metaTitle: r.meta_title ?? null,
      metaDescription: r.meta_description ?? null,
    };
  } finally {
    client.release();
  }
}

export async function updateCityCmsContent(
  slug: string,
  data: CityCmsUpdatePayload,
  updatedBy: number | null = null
): Promise<void> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE city_pages SET
        hero_image         = COALESCE($1, hero_image),
        hero_heading_line1 = COALESCE($2, hero_heading_line1),
        hero_heading_line2 = CASE WHEN $3::text IS NOT NULL THEN $3::text ELSE hero_heading_line2 END,
        hero_callout       = COALESCE($4, hero_callout),
        hero_description   = COALESCE($5, hero_description),
        content_heading    = COALESCE($6, content_heading),
        content_body       = COALESCE($7, content_body),
        f2_heading         = COALESCE($8, f2_heading),
        f2_body            = COALESCE($9, f2_body),
        faqs               = COALESCE($10, faqs),
        updated_by         = COALESCE($12, updated_by),
        meta_title         = COALESCE($13, meta_title),
        meta_description   = COALESCE($14, meta_description),
        updated_at         = NOW()
       WHERE city_slug = $11
       RETURNING id`,
      [
        data.heroImage ?? null,
        data.heroHeadingLine1 ?? null,
        data.heroHeadingLine2 !== undefined ? (data.heroHeadingLine2 ?? null) : null,
        data.heroCallout ?? null,
        data.heroDescription ?? null,
        data.contentHeading ?? null,
        data.contentBody ?? null,
        data.f2Heading ?? null,
        data.f2Body ?? null,
        data.faqs ? JSON.stringify(data.faqs) : null,
        slug,
        updatedBy,
        data.metaTitle ?? null,
        data.metaDescription ?? null,
      ]
    );
    if (res.rowCount === 0) {
      throw new Error(`No city_pages row found for slug "${slug}". Use the seed script to create rows.`);
    }
  } finally {
    client.release();
  }
}
