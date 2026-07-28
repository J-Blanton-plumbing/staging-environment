import pool from '@/lib/db';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import { ConflictError } from '@/lib/cms/errors';
import type { CityV2BlockInstance } from '@/lib/cms/city-v2-blocks';
import {
  CITY_V2_BLOCK_ORDER,
  normalizeCityV2Blocks,
  assembleCityV2Blocks,
  cityV2BlocksToFields,
} from '@/lib/cms/city-v2-blocks';

// Brief 99: the V2 repeater item shapes now live in a pure types module so
// client-safe code can import them; re-exported here for existing importers.
export type { MostRequestedService, WhyPoint, CityReview } from '@/lib/cms/city-pages-types';
import type { MostRequestedService, WhyPoint, CityReview } from '@/lib/cms/city-pages-types';
export type { CityV2BlockType, CityV2BlockInstance } from '@/lib/cms/city-v2-blocks';
export { CITY_V2_BLOCK_ORDER, normalizeCityV2Blocks, newCityV2BlockId } from '@/lib/cms/city-v2-blocks';

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
  // Brief 99 (Track B): authoritative render order + content for
  // `template_type='local-office-v2'` pages, as an array of `{id,type,data}`
  // instances (Brief 90 shape). Undefined/empty for V1 templates — untouched.
  blocks?: CityV2BlockInstance[];
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
  // Brief 99 (Track B): when present, the full per-instance City V2 `blocks`
  // array is authoritative for order + content; the V2-scoped fields above
  // are then derived from it (first-instance-per-type) rather than read
  // directly. Absent for V1 template saves — unchanged legacy behavior.
  blocks?: unknown[];
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
    const templateType = r.template_type ?? r.city_type ?? 'coverage-area';
    const faqs = asArray<{ question: string; answer: string }>(r.faqs);
    const mostRequestedServices = asArray<MostRequestedService>(r.most_requested_services);
    const reviews = asArray<CityReview>(r.reviews);
    const whyPoints = asArray<WhyPoint>(r.why_points);

    // Brief 99 (Track B): `blocks` is the source of truth for order + content
    // on V2 pages only — mirrors the sub-service reader exactly. A row's
    // `blocks` wins when present; a row migrated/created before `blocks`
    // existed gets one instance synthesised per type from the named columns,
    // in canonical order (byte-identical to the pre-blocks fixed-JSX render).
    let blocks: CityV2BlockInstance[] | undefined;
    if (templateType === 'local-office-v2') {
      const stored = normalizeCityV2Blocks(r.blocks);
      blocks = stored.length > 0
        ? stored
        : assembleCityV2Blocks({
            heroImage: r.hero_image ?? null,
            heroHeadingLine1: r.hero_heading_line1 ?? null,
            heroDescription: r.hero_description ?? null,
            trustBarStars: r.trust_bar_stars ?? null,
            trustBarReviewCount: r.trust_bar_review_count ?? null,
            servicesIntro: r.services_intro ?? null,
            mostRequestedServices,
            midCtaText: r.mid_cta_text ?? null,
            whyPoints,
            videoHeading: r.video_heading ?? null,
            videoIntro: r.video_intro ?? null,
            videoScript: r.video_script ?? null,
            reviews,
            faqs,
            ndcIntro: r.ndc_intro ?? null,
            finalCtaHeading: r.final_cta_heading ?? null,
            finalCtaBody: r.final_cta_body ?? null,
          }, CITY_V2_BLOCK_ORDER);
    }

    return {
      id: r.id,
      citySlug: r.city_slug,
      cityType: r.city_type,
      templateType,
      heroImage: r.hero_image ?? '',
      heroHeadingLine1: r.hero_heading_line1,
      heroHeadingLine2: r.hero_heading_line2,
      heroCallout: r.hero_callout ?? '',
      heroDescription: r.hero_description,
      contentHeading: r.content_heading ?? '',
      contentBody: r.content_body ?? '',
      f2Heading: r.f2_heading ?? '',
      f2Body: r.f2_body ?? '',
      faqs,
      // ── Brief 67 — V2 fields (graceful empty fallbacks) — kept populated as
      // the Brief 99 rollback snapshot; the live V2 render uses `blocks` below. ──
      trustBarStars: r.trust_bar_stars ?? '',
      trustBarReviewCount: r.trust_bar_review_count ?? '',
      servicesIntro: r.services_intro ?? '',
      mostRequestedServices,
      midCtaText: r.mid_cta_text ?? '',
      videoHeading: r.video_heading ?? '',
      videoIntro: r.video_intro ?? '',
      videoScript: r.video_script ?? '',
      reviews,
      ndcIntro: r.ndc_intro ?? '',
      finalCtaHeading: r.final_cta_heading ?? '',
      finalCtaBody: r.final_cta_body ?? '',
      whyPoints,
      blocks,
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

  // Brief 99 (Track B): when the editor sends the full per-instance City V2
  // `blocks` array, it is authoritative for content + order. Derive the
  // PRIMARY (first-instance) snapshot to keep the named V2 columns (+ the
  // shared hero/faqs columns) populated as a rollback snapshot — exactly the
  // Brief 90 sub-service approach. No `blocks` sent (every V1 template save,
  // and any V2 save from a not-yet-updated caller) leaves this branch untaken
  // and behavior is byte-identical to before this brief.
  let blocksJson: string | null = null;
  let primary: ReturnType<typeof cityV2BlocksToFields> = {};
  if (Array.isArray(data.blocks)) {
    const normalized = normalizeCityV2Blocks(data.blocks);
    primary = cityV2BlocksToFields(normalized);
    blocksJson = JSON.stringify(normalized);
  }
  // Merge helper: the blocks-derived primary snapshot wins when present,
  // else fall back to whatever the caller sent directly (legacy path).
  function pick<K extends keyof CityCmsUpdatePayload>(key: K): CityCmsUpdatePayload[K] {
    const fromBlocks = (primary as unknown as Partial<CityCmsUpdatePayload>)[key];
    return fromBlocks !== undefined ? fromBlocks : data[key];
  }

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
        -- Brief 99 (Track B) — the authoritative City V2 blocks array
        blocks                 = COALESCE($29::jsonb, blocks),
        version                = version + 1,
        updated_at             = NOW()
       WHERE city_slug = $11
         AND ($28::int IS NULL OR version = $28::int)
       RETURNING id, version`,
      [
        pick('heroImage') ?? null,
        pick('heroHeadingLine1') ?? null,
        data.heroHeadingLine2 !== undefined ? (data.heroHeadingLine2 ?? null) : null,
        data.heroCallout ?? null,
        pick('heroDescription') ?? null,
        data.contentHeading ?? null,
        data.contentBody ?? null,
        data.f2Heading ?? null,
        data.f2Body ?? null,
        pick('faqs') ? JSON.stringify(pick('faqs')) : null,
        slug,
        updatedBy,
        data.metaTitle ?? null,
        data.metaDescription ?? null,
        pick('trustBarStars') ?? null,
        pick('trustBarReviewCount') ?? null,
        pick('servicesIntro') ?? null,
        pick('mostRequestedServices') ? JSON.stringify(pick('mostRequestedServices')) : null,
        pick('midCtaText') ?? null,
        pick('videoHeading') ?? null,
        pick('videoIntro') ?? null,
        pick('videoScript') ?? null,
        pick('reviews') ? JSON.stringify(pick('reviews')) : null,
        pick('ndcIntro') ?? null,
        pick('finalCtaHeading') ?? null,
        pick('finalCtaBody') ?? null,
        pick('whyPoints') ? JSON.stringify(pick('whyPoints')) : null,
        expectedVersion ?? null,
        blocksJson,
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
