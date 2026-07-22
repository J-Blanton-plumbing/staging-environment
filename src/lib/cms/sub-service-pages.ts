import pool from '@/lib/db';
import type { ServiceContent } from '@/types/service';
import { ConflictError } from '@/lib/cms/errors';
import { sanitizeCmsHtml } from '@/lib/cms/sanitize';
import type { SubServiceFields } from '@/lib/cms/sub-service-fields';
import type { SubServiceBlockInstance } from '@/lib/cms/sub-service-blocks';
import {
  SUB_SERVICE_BLOCK_ORDER,
  FALLBACK_HERO,
  FALLBACK_CTA_IMAGE,
  NDC_DEFAULT_BODY,
  assembleBlocks,
  blocksToFields,
  normalizeBlocks,
  sanitizeBlockInstances,
} from '@/lib/cms/sub-service-blocks';

/**
 * Public reader for individual sub-service pages (kitchen-sink-drain,
 * basement-flooding, …). These live in the `sub_service_pages` table and are
 * authored in `/admin/sub-service/[slug]`. The published row is mapped onto the
 * shared `ServiceContent` shape so the same `ServicePageTemplate` that renders
 * `/sewer-rodding` renders every DB-backed sub-service.
 *
 * Brief 90 (Track B): the `blocks` JSONB column is fully authoritative for both
 * content AND order — an array of `{ id, type, data }` INSTANCE records, so the
 * same block type may appear more than once. The 13 named columns are kept
 * populated as a rollback snapshot of each page's PRIMARY (first) instance only
 * — they can no longer represent duplicate instances.
 */

// Brief 89/90 (Track B): the unified block structure + render fallbacks live in a
// pure, client-safe module so the admin editor / registry can import them without
// pulling this DB-bound module into the client bundle. Re-exported for importers.
export type { SubServiceBlockType, SubServiceBlock, SubServiceBlockInstance } from '@/lib/cms/sub-service-blocks';
export {
  SUB_SERVICE_BLOCK_ORDER,
  normalizeBlockOrder,
  normalizeBlocks,
  assembleBlocks,
  blocksToFields,
  sanitizeBlockInstances,
  newBlockId,
} from '@/lib/cms/sub-service-blocks';
export type { SubServiceFields } from '@/lib/cms/sub-service-fields';

/** Map a normalized sub-service field set onto the shared ServiceContent shape. */
export function subServiceToServiceContent(f: SubServiceFields): ServiceContent {
  // Brief 86 (item 3): intro_body is now a single RichTextField-authored HTML
  // blob (sanitized on write), not delimiter-joined plain text — so it is no
  // longer split into multiple paragraphs here. `ServiceIntro` renders this one
  // entry through `renderCmsInline`, which handles both legacy plain text and
  // real HTML safely.
  const introParagraphs = f.introBody ? [f.introBody] : [];

  return {
    slug: f.slug,
    seo: {
      title: f.metaTitle || f.title || f.heroHeading || f.slug,
      description: f.metaDescription || f.heroIntro || '',
    },
    hero: {
      heading: f.heroHeading || f.title || '',
      intro: f.heroIntro || '',
      image: f.heroImage || FALLBACK_HERO,
    },
    expertSection: {
      heading: f.introHeading || '',
      image1: f.fImage || '',
      image2: '',
      paragraphs: introParagraphs,
    },
    problemsSection: {
      heading: f.problemsHeading || '',
      problems: f.problemsItems ?? [],
    },
    relatedServicesSection: { heading: '', cards: [] },
    secondarySection: { heading: '', paragraphs: [] },
    noDropClubSection: {
      title: f.ndcTitle || undefined, // undefined → <NoDripClubSimple> default label
      body: f.ndcBody || NDC_DEFAULT_BODY,
    },
    preventiveSection: { heading: '', image: '', paragraphs: [] },
    closingCTA: {
      heading: f.ctaHeading || '',
      body: f.ctaBody || '',
      image: f.f3Image || FALLBACK_CTA_IMAGE,
    },
  };
}

interface SubServiceRow {
  slug: string;
  title: string | null;
  hero_heading: string | null;
  hero_intro: string | null;
  hero_image: string | null;
  intro_heading: string | null;
  intro_body: string | null;
  f_image: string | null;
  problems_heading: string | null;
  problems_items: string[] | null;
  cta_heading: string | null;
  cta_body: string | null;
  f3_image: string | null;
  ndc_title: string | null;
  ndc_body: string | null;
  meta_title: string | null;
  meta_description: string | null;
  blocks: SubServiceBlockInstance[] | null;
}

function rowToFields(r: SubServiceRow): SubServiceFields {
  return {
    slug: r.slug,
    title: r.title,
    heroHeading: r.hero_heading,
    heroIntro: r.hero_intro,
    heroImage: r.hero_image,
    introHeading: r.intro_heading,
    introBody: r.intro_body,
    fImage: r.f_image,
    problemsHeading: r.problems_heading,
    problemsItems: Array.isArray(r.problems_items) ? r.problems_items : [],
    ctaHeading: r.cta_heading,
    ctaBody: r.cta_body,
    f3Image: r.f3_image,
    ndcTitle: r.ndc_title,
    ndcBody: r.ndc_body,
    metaTitle: r.meta_title,
    metaDescription: r.meta_description,
  };
}

/**
 * Published sub-service content mapped to ServiceContent, or null when there is
 * no published row for the slug. Drafts/unpublished rows are not returned here
 * — preview is handled separately via getSubServicePreview().
 */
export async function getSubServiceCmsContent(slug: string): Promise<ServiceContent | null> {
  const client = await pool.connect();
  try {
    const res = await client.query<SubServiceRow>(
      `SELECT slug, title, hero_heading, hero_intro, hero_image,
              intro_heading, intro_body, f_image, problems_heading, problems_items,
              cta_heading, cta_body, f3_image, ndc_title, ndc_body,
              meta_title, meta_description, blocks
         FROM sub_service_pages
        WHERE slug = $1 AND status = 'published'`,
      [slug]
    );
    const row = res.rows[0];
    if (!row) return null;
    // Brief 90 (Track B): `blocks` is the source of truth for order + content, as
    // an array of `{ id, type, data }` INSTANCE records (duplicates allowed).
    const instances = normalizeBlocks(row.blocks);
    if (instances.length > 0) {
      // Primary snapshot (first instance of each type) drives SEO/hero + the
      // ServiceContent shape used for static-parity; per-instance `blocks` drives
      // the actual ordered render (supporting duplicate instances).
      const { fields, order } = blocksToFields(instances);
      // Title + meta live in the excluded Settings/SEO box, not in `blocks`, so
      // they are still sourced from the named columns (Brief 89 keeps them populated).
      const content = subServiceToServiceContent({
        ...fields,
        slug: row.slug,
        title: row.title,
        metaTitle: row.meta_title,
        metaDescription: row.meta_description,
      });
      content.blockOrder = order;
      content.blocks = instances;
      return content;
    }
    // Fallback: a row migrated before `blocks` existed — synthesise one instance
    // per type from the named columns, in the canonical order.
    const content = subServiceToServiceContent(rowToFields(row));
    content.blockOrder = SUB_SERVICE_BLOCK_ORDER;
    content.blocks = assembleBlocks(rowToFields(row), SUB_SERVICE_BLOCK_ORDER);
    return content;
  } finally {
    client.release();
  }
}

/** SEO metadata for a published sub-service, or null when not published. */
export async function getSubServiceMeta(
  slug: string
): Promise<{ title: string; description: string } | null> {
  const content = await getSubServiceCmsContent(slug);
  return content ? content.seo : null;
}

/**
 * Brief 75 (CQ-1) — publish-path writer for individual sub-service pages.
 *
 * Sub-service drafts previously carried page_type 'service', so publishDraft
 * routed them to `updateServiceCmsContent` (the `service_category_pages` writer)
 * — the real `sub_service_pages` row was never touched and orphan rows landed in
 * `service_subcategories`. This writer targets the correct table and is wired to
 * the new 'sub-service' page_type in the publishDraft dispatch map.
 *
 * The draft content is the admin editor's camelCase shape, where `problemsItems`
 * may arrive as a newline-joined string; it is normalized before writing.
 * Publishing a draft makes the content live, so `status` is set to 'published'.
 */
export async function updateSubServiceCmsContent(
  slug: string,
  data: Record<string, unknown>,
  updatedBy: number | null = null,
  // Brief 75 (DP-1): optional optimistic-concurrency guard, see updateCityCmsContent.
  expectedVersion?: number | null
): Promise<number> {
  const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
  const nn = (v: string | null | undefined): string | null => (v == null ? null : v);
  // Brief 86 (items 3 & 5): intro_body/ndc_body are RichTextField-backed —
  // sanitize through the shared Brief 73 allow-list before persisting.
  const strHtml = (v: unknown): string | null => (typeof v === 'string' ? sanitizeCmsHtml(v) : null);

  // Brief 90 (Track B): the editor now sends the full per-instance `blocks` array
  // as the authoritative source of content + order. Sanitize every instance's
  // rich-text keys (intro/ndc body — a page may carry more than one), then derive
  // the PRIMARY (first-instance) snapshot to keep the 13 named columns populated
  // as a rollback snapshot. Older/partial callers that send flat fields +
  // `blockOrder` (Brief 89) still work via the legacy branch.
  let blocks: SubServiceBlockInstance[];
  let primary: SubServiceFields;
  if (Array.isArray(data.blocks)) {
    blocks = sanitizeBlockInstances(normalizeBlocks(data.blocks), sanitizeCmsHtml);
    primary = blocksToFields(blocks).fields;
  } else {
    const rawProblems = data.problemsItems;
    const problemsItems = Array.isArray(rawProblems)
      ? (rawProblems as string[])
      : typeof rawProblems === 'string'
        ? rawProblems.split('\n').map((s) => s.trim()).filter(Boolean)
        : [];
    primary = {
      slug,
      heroHeading: str(data.heroHeading),
      heroIntro: str(data.heroIntro),
      heroImage: str(data.heroImage),
      introHeading: str(data.introHeading),
      introBody: strHtml(data.introBody), // sanitized rich text at the nested path
      fImage: str(data.fImage),
      problemsHeading: str(data.problemsHeading),
      problemsItems,
      ctaHeading: str(data.ctaHeading),
      ctaBody: str(data.ctaBody),
      f3Image: str(data.f3Image),
      ndcTitle: str(data.ndcTitle),
      ndcBody: strHtml(data.ndcBody), // sanitized rich text at the nested path
    };
    blocks = assembleBlocks(primary, data.blockOrder);
  }
  // Named-column snapshot values, drawn from the primary instance. An absent type
  // (e.g. a removed block) leaves its columns untouched via COALESCE.
  const problemsSnapshot =
    primary.problemsItems !== undefined ? JSON.stringify(primary.problemsItems) : null;

  const client = await pool.connect();
  try {
    const res = await client.query(
      `UPDATE sub_service_pages SET
         title            = COALESCE($1, title),
         hero_heading     = COALESCE($2, hero_heading),
         hero_intro       = COALESCE($3, hero_intro),
         hero_image       = COALESCE($4, hero_image),
         intro_heading    = COALESCE($5, intro_heading),
         intro_body       = COALESCE($6, intro_body),
         f_image          = COALESCE($7, f_image),
         problems_heading = COALESCE($8, problems_heading),
         problems_items   = COALESCE($9, problems_items),
         cta_heading      = COALESCE($10, cta_heading),
         cta_body         = COALESCE($11, cta_body),
         f3_image         = COALESCE($12, f3_image),
         ndc_title        = COALESCE($13, ndc_title),
         ndc_body         = COALESCE($14, ndc_body),
         meta_title       = COALESCE($15, meta_title),
         meta_description = COALESCE($16, meta_description),
         blocks           = $20::jsonb,
         status           = 'published',
         updated_by       = COALESCE($18, updated_by),
         version          = version + 1,
         updated_at       = NOW()
       WHERE slug = $17
         AND ($19::int IS NULL OR version = $19::int)
       RETURNING version`,
      [
        str(data.title),
        nn(primary.heroHeading),
        nn(primary.heroIntro),
        nn(primary.heroImage),
        nn(primary.introHeading),
        nn(primary.introBody), // already sanitized (blocks path + legacy path)
        nn(primary.fImage),
        nn(primary.problemsHeading),
        problemsSnapshot,
        nn(primary.ctaHeading),
        nn(primary.ctaBody),
        nn(primary.f3Image),
        nn(primary.ndcTitle),
        nn(primary.ndcBody), // already sanitized
        str(data.metaTitle),
        str(data.metaDescription),
        slug,
        updatedBy,
        expectedVersion ?? null,
        JSON.stringify(blocks),
      ]
    );
    if (res.rowCount === 0) {
      const exists = await client.query('SELECT version FROM sub_service_pages WHERE slug = $1', [slug]);
      if (exists.rowCount === 0) {
        throw new Error(`No sub_service_pages row found for slug "${slug}".`);
      }
      throw new ConflictError(
        'This sub-service page was changed by someone else since you loaded it. Reload before saving.'
      );
    }
    return res.rows[0].version as number;
  } finally {
    client.release();
  }
}

/** All published sub-service slugs (used for static-param generation). */
export async function getPublishedSubServiceSlugs(): Promise<string[]> {
  const client = await pool.connect();
  try {
    const res = await client.query<{ slug: string }>(
      `SELECT slug FROM sub_service_pages WHERE status = 'published' ORDER BY slug`
    );
    return res.rows.map((r) => r.slug);
  } finally {
    client.release();
  }
}
