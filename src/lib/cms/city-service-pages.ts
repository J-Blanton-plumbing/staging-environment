import pool from '@/lib/db';

export interface CityServiceCmsContent {
  citySlug: string;
  serviceSlug: string;
  serviceIntroHeading: string;
  serviceIntroParagraphs: string[];
  serviceIntroImage: string;
  secondaryHeading: string;
  secondaryParagraphs: string[];
  secondaryImage: string;
  faqs: Array<{ question: string; answer: string }>;
  updatedAt: string;
  updatedBy?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  parentSlug?: string | null;
}

export interface CityServiceCmsUpdatePayload {
  serviceIntroHeading: string;
  serviceIntroParagraphs: string[];
  serviceIntroImage: string;
  secondaryHeading: string;
  secondaryParagraphs: string[];
  secondaryImage: string;
  faqs: Array<{ question: string; answer: string }>;
  metaTitle?: string | null;
  metaDescription?: string | null;
  parentSlug?: string | null;
}

export async function getCityServiceCmsContent(
  citySlug: string,
  serviceSlug: string
): Promise<CityServiceCmsContent | null> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT * FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2`,
      [citySlug, serviceSlug]
    );
    if (!res.rows[0]) return null;
    const r = res.rows[0];
    return {
      citySlug: r.city_slug,
      serviceSlug: r.service_slug,
      serviceIntroHeading: r.service_intro_heading,
      serviceIntroParagraphs: r.service_intro_paragraphs,
      serviceIntroImage: r.service_intro_image,
      secondaryHeading: r.secondary_heading,
      secondaryParagraphs: r.secondary_paragraphs,
      secondaryImage: r.secondary_image,
      faqs: r.faqs,
      updatedAt: r.updated_at,
      updatedBy: r.updated_by ?? null,
      createdBy: r.created_by ?? null,
      createdAt: r.created_at ?? null,
      metaTitle: r.meta_title ?? null,
      metaDescription: r.meta_description ?? null,
      parentSlug: r.parent_slug ?? null,
    };
  } finally {
    client.release();
  }
}

export async function updateCityServiceCmsContent(
  citySlug: string,
  serviceSlug: string,
  data: CityServiceCmsUpdatePayload
): Promise<void> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE city_service_pages SET
        service_intro_heading    = $1,
        service_intro_paragraphs = $2,
        service_intro_image      = $3,
        secondary_heading        = $4,
        secondary_paragraphs     = $5,
        secondary_image          = $6,
        faqs                     = $7,
        meta_title               = COALESCE($10, meta_title),
        meta_description         = COALESCE($11, meta_description),
        parent_slug              = $12,
        updated_at               = NOW()
       WHERE city_slug = $8 AND service_slug = $9
       RETURNING id`,
      [
        data.serviceIntroHeading,
        JSON.stringify(data.serviceIntroParagraphs),
        data.serviceIntroImage,
        data.secondaryHeading,
        JSON.stringify(data.secondaryParagraphs),
        data.secondaryImage,
        JSON.stringify(data.faqs),
        citySlug,
        serviceSlug,
        data.metaTitle ?? null,
        data.metaDescription ?? null,
        data.parentSlug ?? null,
      ]
    );
    if (res.rowCount === 0) {
      throw new Error(
        `No city_service_pages row found for "${citySlug}/${serviceSlug}". Use the seed script to create rows.`
      );
    }
  } finally {
    client.release();
  }
}
