import pool from '@/lib/db';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import { ConflictError } from '@/lib/cms/errors';

/** Brief 67 — V2 "Most Requested Services" item. */
export interface MostRequestedService {
  title: string;
  body: string;
}

/** Brief 67 — V2 "Why … Call Us First" point. */
export interface WhyPoint {
  heading: string;
  body: string;
}

/** Brief 67 — V2 review card. */
export interface CityReview {
  name: string;
  text: string;
  gbp_url: string;
}

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
  // ── Brief 67 — Local Office V2 fields (all optional/fall back to empty) ──
  trustBarStars: string;
  trustBarReviewCount: string;
  servicesIntro: string;
  mostRequestedServices: MostRequestedService[];
  midCtaText: string;
  videoHeading: string;
  videoIntro: string;
  videoScript: string;
  reviews: CityReview[];
  ndcIntro: string;
  finalCtaHeading: string;
  finalCtaBody: string;
  whyPoints: WhyPoint[];
  version: number;
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
  // ── Brief 67 — Local Office V2 fields ──
  trustBarStars?: string;
  trustBarReviewCount?: string;
  servicesIntro?: string;
  mostRequestedServices?: MostRequestedService[];
  midCtaText?: string;
  videoHeading?: string;
  videoIntro?: string;
  videoScript?: string;
  reviews?: CityReview[];
  ndcIntro?: string;
  finalCtaHeading?: string;
  finalCtaBody?: string;
  whyPoints?: WhyPoint[];
  metaTitle?: string | null;
  metaDescription?: string | null;
}

/** Coerce a JSONB column that may be null/string/array into a typed array. */
function asArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === 'string' && v.trim()) {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
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
      faqs: asArray<{ question: string; answer: string }>(r.faqs),
      // ── Brief 67 — V2 fields (graceful empty fallbacks) ──
      trustBarStars: r.trust_bar_stars ?? '',
      trustBarReviewCount: r.trust_bar_review_count ?? '',
      servicesIntro: r.services_intro ?? '',
      mostRequestedServices: asArray<MostRequestedService>(r.most_requested_services),
      midCtaText: r.mid_cta_text ?? '',
      videoHeading: r.video_heading ?? '',
      videoIntro: r.video_intro ?? '',
      videoScript: r.video_script ?? '',
      reviews: asArray<CityReview>(r.reviews),
      ndcIntro: r.ndc_intro ?? '',
      finalCtaHeading: r.final_cta_heading ?? '',
      finalCtaBody: r.final_cta_body ?? '',
      whyPoints: asArray<WhyPoint>(r.why_points),
      version: r.version ?? 0,
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
  updatedBy: number | null = null,
  // Brief 75 (DP-1): when provided, the write is rejected with a ConflictError
  // unless the stored row is still at this version (optimistic concurrency). The
  // draft-publish path omits it — publishDraft runs its own DP-2 staleness check.
  expectedVersion?: number | null
): Promise<number> {
  // SEC-2 (Brief 73): contentBody (→ coveredBody) and f2Body (→ manplumberBody)
  // are rich-text HTML rendered via dangerouslySetInnerHTML. Sanitize here in
  // the writer so BOTH entry points — the API route and the draft-publish path
  // (publishDraft → updateCityCmsContent) — store clean HTML. Idempotent, so a
  // route that already sanitized is unaffected.
  if (typeof data.contentBody === 'string') data.contentBody = sanitizeCmsHtml(data.contentBody);
  if (typeof data.f2Body === 'string') data.f2Body = sanitizeCmsHtml(data.f2Body);

  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE city_pages SET
        hero_image             = COALESCE($1, hero_image),
        hero_heading_line1     = COALESCE($2, hero_heading_line1),
        hero_heading_line2     = CASE WHEN $3::text IS NOT NULL THEN $3::text ELSE hero_heading_line2 END,
        hero_callout           = COALESCE($4, hero_callout),
        hero_description       = COALESCE($5, hero_description),
        content_heading        = COALESCE($6, content_heading),
        content_body           = COALESCE($7, content_body),
        f2_heading             = COALESCE($8, f2_heading),
        f2_body                = COALESCE($9, f2_body),
        faqs                   = COALESCE($10, faqs),
        updated_by             = COALESCE($12, updated_by),
        meta_title             = COALESCE($13, meta_title),
        meta_description       = COALESCE($14, meta_description),
        -- Brief 67 — V2 fields
        trust_bar_stars        = COALESCE($15, trust_bar_stars),
        trust_bar_review_count = COALESCE($16, trust_bar_review_count),
        services_intro         = COALESCE($17, services_intro),
        most_requested_services = COALESCE($18::jsonb, most_requested_services),
        mid_cta_text           = COALESCE($19, mid_cta_text),
        video_heading          = COALESCE($20, video_heading),
        video_intro            = COALESCE($21, video_intro),
        video_script           = COALESCE($22, video_script),
        reviews                = COALESCE($23::jsonb, reviews),
        ndc_intro              = COALESCE($24, ndc_intro),
        final_cta_heading      = COALESCE($25, final_cta_heading),
        final_cta_body         = COALESCE($26, final_cta_body),
        why_points             = COALESCE($27::jsonb, why_points),
        version                = version + 1,
        updated_at             = NOW()
       WHERE city_slug = $11
         AND ($28::int IS NULL OR version = $28::int)
       RETURNING id, version`,
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
        data.trustBarStars ?? null,
        data.trustBarReviewCount ?? null,
        data.servicesIntro ?? null,
        data.mostRequestedServices ? JSON.stringify(data.mostRequestedServices) : null,
        data.midCtaText ?? null,
        data.videoHeading ?? null,
        data.videoIntro ?? null,
        data.videoScript ?? null,
        data.reviews ? JSON.stringify(data.reviews) : null,
        data.ndcIntro ?? null,
        data.finalCtaHeading ?? null,
        data.finalCtaBody ?? null,
        data.whyPoints ? JSON.stringify(data.whyPoints) : null,
        expectedVersion ?? null,
      ]
    );
    if (res.rowCount === 0) {
      // Disambiguate a missing row from a version conflict.
      const exists = await client.query('SELECT version FROM city_pages WHERE city_slug = $1', [slug]);
      if (exists.rowCount === 0) {
        throw new Error(`No city_pages row found for slug "${slug}". Use the seed script to create rows.`);
      }
      throw new ConflictError(
        'This city page was changed by someone else since you loaded it. Reload to get the latest version before saving.'
      );
    }
    return res.rows[0].version as number;
  } finally {
    client.release();
  }
}
