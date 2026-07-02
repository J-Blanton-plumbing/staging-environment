import pool from '@/lib/db';
import type { ServiceContent } from '@/types/service';

/**
 * Public reader for individual sub-service pages (kitchen-sink-drain,
 * basement-flooding, …). These live in the `sub_service_pages` table and are
 * authored in `/admin/sub-service/[slug]`. The published row is mapped onto the
 * shared `ServiceContent` shape so the same `ServicePageTemplate` that renders
 * `/sewer-rodding` renders every DB-backed sub-service.
 *
 * The table only covers a subset of the rich `ServiceContent` (hero, expert
 * intro, problems, closing CTA). Sections with no DB column (related cards,
 * secondary, preventive) are left empty — `ServicePageTemplate` skips a section
 * when it has no content, so DB-only pages render clean.
 */

const FALLBACK_HERO = '/images/hero_image.webp';

// Generic closing-CTA photo (live `.f3` uses manplumber.webp on most slugs).
const FALLBACK_CTA_IMAGE =
  'https://d1rplazj5a80fb.cloudfront.net/images/manplumber.webp';

// Generic No Drip Club body, matching the tone of the hand-built service pages.
const NDC_DEFAULT_BODY =
  'Our No Drip Club offers premium plumbing protection and added peace of mind for homeowners. Members enjoy priority scheduling and routine inspections to catch small issues before they become costly repairs.';

/** Normalized field set shared by published rows and preview drafts. */
export interface SubServiceFields {
  slug: string;
  title?: string | null;
  heroHeading?: string | null;
  heroIntro?: string | null;
  heroImage?: string | null;
  introHeading?: string | null;
  introBody?: string | null;
  fImage?: string | null; // intro/expert section photo (expertSection.image1)
  problemsHeading?: string | null;
  problemsItems?: string[];
  ctaHeading?: string | null;
  ctaBody?: string | null;
  f3Image?: string | null; // closing-CTA photo (closingCTA.image)
  ndcTitle?: string | null; // No Drip Club selling point (noDropClubSection.title)
  ndcBody?: string | null; // No Drip Club body copy (noDropClubSection.body)
  metaTitle?: string | null;
  metaDescription?: string | null;
}

/** Map a normalized sub-service field set onto the shared ServiceContent shape. */
export function subServiceToServiceContent(f: SubServiceFields): ServiceContent {
  const introParagraphs = (f.introBody ?? '')
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

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
              meta_title, meta_description
         FROM sub_service_pages
        WHERE slug = $1 AND status = 'published'`,
      [slug]
    );
    if (!res.rows[0]) return null;
    return subServiceToServiceContent(rowToFields(res.rows[0]));
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
