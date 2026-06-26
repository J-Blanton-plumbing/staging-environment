import pool from '@/lib/db';

export interface EpCmsContent {
  id: number;
  heroHeading: string;
  heroDescription: string;
  heroImage: string;
  fHeading: string;
  fBody: string;
  fImage: string;
  cardHeading: string;
  cardItems: string[];
  mapHeading: string;
  mapBody: string;
  f2Heading: string;
  f2Body: string;
  f2Image: string;
  f3Heading: string;
  f3Body: string;
  f3Image: string;
  updatedAt: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export interface EpCmsUpdatePayload {
  heroHeading?: string;
  heroDescription?: string;
  heroImage?: string;
  fHeading?: string;
  fBody?: string;
  fImage?: string;
  cardHeading?: string;
  cardItems?: string[];
  mapHeading?: string;
  mapBody?: string;
  f2Heading?: string;
  f2Body?: string;
  f2Image?: string;
  f3Heading?: string;
  f3Body?: string;
  f3Image?: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
}

export async function getEpCmsContent(): Promise<EpCmsContent | null> {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT * FROM emergency_plumbing_page LIMIT 1`);
    if (!res.rows[0]) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      heroHeading: r.hero_heading,
      heroDescription: r.hero_description,
      heroImage: r.hero_image ?? '',
      fHeading: r.f_heading,
      fBody: r.f_body,
      fImage: r.f_image ?? '',
      cardHeading: r.card_heading,
      cardItems: r.card_items,
      mapHeading: r.map_heading,
      mapBody: r.map_body,
      f2Heading: r.f2_heading,
      f2Body: r.f2_body,
      f2Image: r.f2_image ?? '',
      f3Heading: r.f3_heading,
      f3Body: r.f3_body,
      f3Image: r.f3_image ?? '',
      updatedAt: r.updated_at,
      metaTitle: r.meta_title ?? null,
      metaDescription: r.meta_description ?? null,
    };
  } finally {
    client.release();
  }
}

export async function updateEpCmsContent(
  data: EpCmsUpdatePayload,
  updatedBy: number | null = null
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE emergency_plumbing_page SET
        hero_heading    = COALESCE($1, hero_heading),
        hero_description= COALESCE($2, hero_description),
        hero_image      = COALESCE($3, hero_image),
        f_heading       = COALESCE($4, f_heading),
        f_body          = COALESCE($5, f_body),
        f_image         = COALESCE($6, f_image),
        card_heading    = COALESCE($7, card_heading),
        card_items      = COALESCE($8, card_items),
        map_heading     = COALESCE($9, map_heading),
        map_body        = COALESCE($10, map_body),
        f2_heading      = COALESCE($11, f2_heading),
        f2_body         = COALESCE($12, f2_body),
        f2_image        = COALESCE($13, f2_image),
        f3_heading      = COALESCE($14, f3_heading),
        f3_body         = COALESCE($15, f3_body),
        f3_image         = COALESCE($16, f3_image),
        updated_by       = COALESCE($17, updated_by),
        meta_title       = COALESCE($18, meta_title),
        meta_description = COALESCE($19, meta_description),
        updated_at       = NOW()`,
      [
        data.heroHeading ?? null,
        data.heroDescription ?? null,
        data.heroImage ?? null,
        data.fHeading ?? null,
        data.fBody ?? null,
        data.fImage ?? null,
        data.cardHeading ?? null,
        data.cardItems ? JSON.stringify(data.cardItems) : null,
        data.mapHeading ?? null,
        data.mapBody ?? null,
        data.f2Heading ?? null,
        data.f2Body ?? null,
        data.f2Image ?? null,
        data.f3Heading ?? null,
        data.f3Body ?? null,
        data.f3Image ?? null,
        updatedBy,
        data.metaTitle ?? null,
        data.metaDescription ?? null,
      ]
    );
  } finally {
    client.release();
  }
}
