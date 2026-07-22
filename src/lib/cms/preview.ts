/**
 * Preview helpers for server components.
 * Reads the __preview_draft cookie and returns the draft's content when present.
 */

import { cookies } from 'next/headers';
import { getDraft } from '@/lib/cms/drafts';
import { getSession } from '@/lib/auth/session';
import type { ServiceCmsContent, ServiceCmsUpdatePayload } from '@/lib/cms/service-pages';
import type { CityCmsContent } from '@/lib/cms/city-pages';
import type { EpCmsContent } from '@/lib/cms/emergency-plumbing';
import type { CityServiceCmsContent } from '@/lib/cms/city-service-pages';
import { subServiceToServiceContent, normalizeBlockOrder, normalizeBlocks, blocksToFields } from '@/lib/cms/sub-service-pages';
import type { ServiceContent } from '@/types/service';

const PREVIEW_COOKIE = '__preview_draft';

/**
 * DP-7 — the `__preview_draft` cookie is a plain sequential integer, so on its
 * own it lets anyone enumerate and read every unpublished draft. Preview is an
 * editor-only feature, so every getter must confirm a real signed CMS session
 * before honoring the cookie. Returns the requested draft id ONLY when a valid
 * session is present; otherwise null (→ getters fall back to published content).
 */
async function authorizedPreviewId(): Promise<number | null> {
  const session = await getSession();
  if (!session) return null;

  const cookieStore = await cookies();
  const rawId = cookieStore.get(PREVIEW_COOKIE)?.value;
  if (!rawId) return null;

  const id = parseInt(rawId, 10);
  return isNaN(id) ? null : id;
}

export interface PreviewMeta {
  id: number;
  label: string;
  creator_name: string;
}

export async function getServicePreview(slug: string): Promise<{
  cms: ServiceCmsContent;
  meta: PreviewMeta;
} | null> {
  const id = await authorizedPreviewId();
  if (id === null) return null;

  const draft = await getDraft(id).catch(() => null);
  if (!draft || draft.page_type !== 'service' || draft.page_slug !== slug) return null;

  const payload = draft.content as ServiceCmsUpdatePayload;

  const cms: ServiceCmsContent = {
    page: {
      hero_heading: payload.hero_heading,
      hero_intro: payload.hero_intro,
      intro_heading: payload.intro_heading,
      intro_body: payload.intro_body,
      problems_heading: payload.problems_heading,
      problems_items: payload.problems_items,
      subcategories_heading: payload.subcategories_heading,
      preventative_heading: payload.preventative_heading,
      preventative_body: payload.preventative_body,
      final_pitch_tagline: payload.final_pitch_tagline,
      final_pitch_body: payload.final_pitch_body,
      articles_featured_slugs: payload.articles_featured_slugs,
      hero_image: payload.hero_image ?? null,
      f_image: payload.f_image ?? null,
      f3_image: payload.f3_image ?? null,
      meta_title: payload.meta_title ?? null,
      meta_description: payload.meta_description ?? null,
    },
    // Brief 98: preview synthesizes the same `subcategoriesBlock` shape the DB
    // read path derives from `blocks` — built directly from the draft's
    // subcategories array (array position is order, matching the write path).
    subcategoriesBlock: {
      heading: payload.subcategories_heading || null,
      items: (payload.subcategories ?? []).map((s) => ({
        label: s.label,
        href: s.href,
        desc: s.description,
        image: s.image ?? '',
      })),
    },
    global: {
      service_area_heading: payload.service_area_heading,
      service_area_body: payload.service_area_body,
      tiktok_headline: payload.tiktok_headline,
    },
  };

  return { cms, meta: { id, label: draft.label, creator_name: draft.creator_name } };
}

/**
 * Preview for an individual sub-service page (kitchen-sink-drain, …). Drafts are
 * saved by `/admin/sub-service/[slug]` with page_type 'sub-service' (Brief 75,
 * CQ-1 — previously 'service', which collided with the service-category pages).
 * The draft content is the admin's camelCase shape — `problems_items` arrives as
 * a newline-joined string — so it is normalized before mapping onto ServiceContent.
 */
export async function getSubServicePreview(slug: string): Promise<{
  content: ServiceContent;
  meta: PreviewMeta;
} | null> {
  const id = await authorizedPreviewId();
  if (id === null) return null;

  const draft = await getDraft(id).catch(() => null);
  if (!draft || draft.page_type !== 'sub-service' || draft.page_slug !== slug) return null;

  const c = draft.content as Record<string, unknown>;

  // Brief 90 (Track B): the editor's draft carries the authoritative per-instance
  // `blocks` array. Reconstruct the primary (first-instance) snapshot for the
  // SEO/hero ServiceContent shape, and attach the instances for the ordered,
  // duplicate-aware render. Rich text is sanitized on the render path
  // (renderCmsInline), so drafts preview safely without pre-sanitizing here.
  const instances = normalizeBlocks(c.blocks);
  if (instances.length > 0) {
    const { fields, order } = blocksToFields(instances);
    const content = subServiceToServiceContent({
      ...fields,
      slug,
      title: (c.title as string) ?? null,
      metaTitle: (c.metaTitle as string) ?? null,
      metaDescription: (c.metaDescription as string) ?? null,
    });
    content.blockOrder = order;
    content.blocks = instances;
    return { content, meta: { id, label: draft.label, creator_name: draft.creator_name } };
  }

  // Legacy draft (flat fields + optional blockOrder).
  const rawProblems = c.problemsItems;
  const problemsItems = Array.isArray(rawProblems)
    ? (rawProblems as string[])
    : typeof rawProblems === 'string'
      ? rawProblems.split('\n').map((s) => s.trim()).filter(Boolean)
      : [];

  const content = subServiceToServiceContent({
    slug,
    title: (c.title as string) ?? null,
    heroHeading: (c.heroHeading as string) ?? null,
    heroIntro: (c.heroIntro as string) ?? null,
    heroImage: (c.heroImage as string) ?? null,
    introHeading: (c.introHeading as string) ?? null,
    introBody: (c.introBody as string) ?? null,
    fImage: (c.fImage as string) ?? null,
    problemsHeading: (c.problemsHeading as string) ?? null,
    problemsItems,
    ctaHeading: (c.ctaHeading as string) ?? null,
    ctaBody: (c.ctaBody as string) ?? null,
    f3Image: (c.f3Image as string) ?? null,
    ndcTitle: (c.ndcTitle as string) ?? null,
    ndcBody: (c.ndcBody as string) ?? null,
    metaTitle: (c.metaTitle as string) ?? null,
    metaDescription: (c.metaDescription as string) ?? null,
  });
  // Brief 89 (Track B): honor the draft's block order in preview too.
  content.blockOrder = normalizeBlockOrder(c.blockOrder);

  return { content, meta: { id, label: draft.label, creator_name: draft.creator_name } };
}

export async function getCityPreview(slug: string): Promise<{
  db: CityCmsContent;
  meta: PreviewMeta;
} | null> {
  const id = await authorizedPreviewId();
  if (id === null) return null;

  const draft = await getDraft(id).catch(() => null);
  if (!draft || draft.page_type !== 'city' || draft.page_slug !== slug) return null;

  // Brief 67 (Track A): the draft's own template_type wins so a V2 draft previewed
  // on a still-V1 live page renders V2 (and vice versa). Fall back to any
  // templateType embedded in the content, then to the content's existing value.
  const content = draft.content as CityCmsContent;
  const templateType =
    draft.template_type ??
    (content && typeof content === 'object' ? content.templateType : undefined);

  return {
    db: { ...content, templateType: templateType ?? content?.templateType },
    meta: { id, label: draft.label, creator_name: draft.creator_name },
  };
}

export async function getCityServicePreview(citySlug: string, serviceSlug: string): Promise<{
  db: CityServiceCmsContent;
  meta: PreviewMeta;
} | null> {
  const id = await authorizedPreviewId();
  if (id === null) return null;

  const draft = await getDraft(id).catch(() => null);
  if (
    !draft ||
    draft.page_type !== 'city-service' ||
    draft.page_slug !== `${citySlug}/${serviceSlug}`
  ) return null;

  return {
    db: draft.content as CityServiceCmsContent,
    meta: { id, label: draft.label, creator_name: draft.creator_name },
  };
}

export async function getMainPagePreview(slug: string): Promise<{
  content: Record<string, string>;
  meta: PreviewMeta;
} | null> {
  const id = await authorizedPreviewId();
  if (id === null) return null;

  const draft = await getDraft(id).catch(() => null);
  if (!draft || draft.page_type !== 'main' || draft.page_slug !== slug) return null;

  return {
    content: draft.content as Record<string, string>,
    meta: { id, label: draft.label, creator_name: draft.creator_name },
  };
}

export async function getEpPreview(): Promise<{
  db: EpCmsContent;
  meta: PreviewMeta;
} | null> {
  const id = await authorizedPreviewId();
  if (id === null) return null;

  const draft = await getDraft(id).catch(() => null);
  if (!draft || draft.page_type !== 'emergency-plumbing') return null;

  return {
    db: draft.content as EpCmsContent,
    meta: { id, label: draft.label, creator_name: draft.creator_name },
  };
}
