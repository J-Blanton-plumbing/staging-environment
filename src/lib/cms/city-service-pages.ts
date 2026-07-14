import pool from '@/lib/db';
import { ConflictError } from '@/lib/cms/errors';

/**
 * Defensive normalisation for the `*_paragraphs` JSONB columns.
 *
 * These columns should hold a plain `string[]`, but the WordPress migration
 * (Brief 50) stored `{ "html": "…" }` objects, which silently broke the
 * frontend merge (Brief 65). Brief 65's normalisation migration converts the
 * live data, but this guard means a stale or malformed value can never again
 * cause a silent fallback: it always returns a clean `string[]`.
 */
function normaliseParagraphs(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === 'string');
  }
  if (raw && typeof raw === 'object' && 'html' in raw) {
    // Legacy { html: "…" } format.
    const html = String((raw as { html: unknown }).html ?? '');
    const pMatches = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi));
    const chunks =
      pMatches.length > 0
        ? pMatches.map((m) => m[1])
        : html.split(/(?:<br\s*\/?>\s*){2,}/i);
    const paragraphs = chunks.map(stripToText).filter(Boolean);
    if (paragraphs.length > 0) return paragraphs;
    const whole = stripToText(html);
    return whole ? [whole] : [];
  }
  return [];
}

function stripToText(fragment: string): string {
  return fragment
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  version: number;
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
      serviceIntroParagraphs: normaliseParagraphs(r.service_intro_paragraphs),
      serviceIntroImage: r.service_intro_image,
      secondaryHeading: r.secondary_heading,
      secondaryParagraphs: normaliseParagraphs(r.secondary_paragraphs),
      secondaryImage: r.secondary_image,
      faqs: r.faqs,
      version: r.version ?? 0,
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
  data: CityServiceCmsUpdatePayload,
  // Brief 75 (DP-1): optional optimistic-concurrency guard, see updateCityCmsContent.
  expectedVersion?: number | null
): Promise<number> {
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
        version                  = version + 1,
        updated_at               = NOW()
       WHERE city_slug = $8 AND service_slug = $9
         AND ($13::int IS NULL OR version = $13::int)
       RETURNING version`,
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
        expectedVersion ?? null,
      ]
    );
    if (res.rowCount === 0) {
      const exists = await client.query(
        'SELECT version FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2',
        [citySlug, serviceSlug]
      );
      if (exists.rowCount === 0) {
        throw new Error(
          `No city_service_pages row found for "${citySlug}/${serviceSlug}". Use the seed script to create rows.`
        );
      }
      throw new ConflictError(
        'This city-service page was changed by someone else since you loaded it. Reload before saving.'
      );
    }
    return res.rows[0].version as number;
  } finally {
    client.release();
  }
}
