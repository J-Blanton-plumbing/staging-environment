/**
 * Preview helpers for server components.
 * Reads the __preview_draft cookie and returns the draft's content when present.
 */

import { cookies } from 'next/headers';
import { getDraft } from '@/lib/cms/drafts';
import type { ServiceCmsContent, ServiceCmsUpdatePayload } from '@/lib/cms/service-pages';
import type { CityCmsContent } from '@/lib/cms/city-pages';
import type { EpCmsContent } from '@/lib/cms/emergency-plumbing';
import type { CityServiceCmsContent } from '@/lib/cms/city-service-pages';

const PREVIEW_COOKIE = '__preview_draft';

export interface PreviewMeta {
  id: number;
  label: string;
  creator_name: string;
}

export async function getServicePreview(slug: string): Promise<{
  cms: ServiceCmsContent;
  meta: PreviewMeta;
} | null> {
  const cookieStore = await cookies();
  const rawId = cookieStore.get(PREVIEW_COOKIE)?.value;
  if (!rawId) return null;

  const id = parseInt(rawId, 10);
  if (isNaN(id)) return null;

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
    subcategories: (payload.subcategories ?? []).map((s, i) => ({
      label: s.label,
      href: s.href,
      description: s.description,
      sort_order: s.sort_order ?? i,
    })),
    global: {
      service_area_heading: payload.service_area_heading,
      service_area_body: payload.service_area_body,
      tiktok_headline: payload.tiktok_headline,
    },
  };

  return { cms, meta: { id, label: draft.label, creator_name: draft.creator_name } };
}

export async function getCityPreview(slug: string): Promise<{
  db: CityCmsContent;
  meta: PreviewMeta;
} | null> {
  const cookieStore = await cookies();
  const rawId = cookieStore.get(PREVIEW_COOKIE)?.value;
  if (!rawId) return null;

  const id = parseInt(rawId, 10);
  if (isNaN(id)) return null;

  const draft = await getDraft(id).catch(() => null);
  if (!draft || draft.page_type !== 'city' || draft.page_slug !== slug) return null;

  return {
    db: draft.content as CityCmsContent,
    meta: { id, label: draft.label, creator_name: draft.creator_name },
  };
}

export async function getCityServicePreview(citySlug: string, serviceSlug: string): Promise<{
  db: CityServiceCmsContent;
  meta: PreviewMeta;
} | null> {
  const cookieStore = await cookies();
  const rawId = cookieStore.get(PREVIEW_COOKIE)?.value;
  if (!rawId) return null;

  const id = parseInt(rawId, 10);
  if (isNaN(id)) return null;

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
  const cookieStore = await cookies();
  const rawId = cookieStore.get(PREVIEW_COOKIE)?.value;
  if (!rawId) return null;

  const id = parseInt(rawId, 10);
  if (isNaN(id)) return null;

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
  const cookieStore = await cookies();
  const rawId = cookieStore.get(PREVIEW_COOKIE)?.value;
  if (!rawId) return null;

  const id = parseInt(rawId, 10);
  if (isNaN(id)) return null;

  const draft = await getDraft(id).catch(() => null);
  if (!draft || draft.page_type !== 'emergency-plumbing') return null;

  return {
    db: draft.content as EpCmsContent,
    meta: { id, label: draft.label, creator_name: draft.creator_name },
  };
}
