/**
 * Brief 222 — the Water Heater v2 CMS content model (the Brief 204 sewer model, for the 6 water heater
 * pages). Pure and client-safe (the admin editor imports it too).
 *
 * Storage:
 *   - `sub_service_pages.v2_content`      → `WhStored` (the 5 service pages)
 *   - `service_category_pages.v2_content` → `WhHubStored` (the hub + the water-heater-shared sections)
 *   - meta title/description              → each row's `meta_title` / `meta_description`
 * A version (`page_drafts.content`) carries `WhV2DraftContent`, marked `template: 'water-heater-v2'`
 * and stamped `template_type` 'wh-hub' / 'wh-standard' / 'wh-index' (the template version it uses). A
 * version without the marker is "old-shaped" (the "Pre-v2 archive (2026-10)", a legacy draft): it can
 * be opened read-only but never published onto these pages.
 */
import type { WhHubStored, WhPage, WhStored, WhTemplate } from '@/lib/content/water-heater-v2/types';

export const WH_V2_MARKER = 'water-heater-v2';
export const WH_V2_HUB_SLUG = 'water-heater';
export const WH_V2_HUB_PATH = '/services/water-heater';
export const WH_V2_SERVICE_SLUGS = [
  'water-heater-repair',
  'water-heater-installation',
  'water-heater-maintenance',
  'tankless-water-heater',
  'commercial-water-heater',
] as const;
export type WhServiceSlug = (typeof WH_V2_SERVICE_SLUGS)[number];

/** The template versions (`page_drafts.template_type` of a water heater version). */
export const WH_TEMPLATES: readonly WhTemplate[] = ['wh-hub', 'wh-standard', 'wh-index'];
export const WH_TEMPLATE_LABEL: Record<WhTemplate, string> = {
  'wh-hub': 'WH Hub',
  'wh-standard': 'WH Service Page (Standard)',
  'wh-index': 'WH Service Page (Index)',
};

export const WH_PRE_V2_ARCHIVE_LABEL = 'Pre-v2 archive (2026-10)';
export const WH_OLD_SHAPE_MESSAGE = "This version uses the old pre-v2 layout and can't be edited or published here.";

export function isWhServiceSlug(slug: string): slug is WhServiceSlug {
  return (WH_V2_SERVICE_SLUGS as readonly string[]).includes(slug);
}
export function isWhSlug(slug: string): boolean {
  return slug === WH_V2_HUB_SLUG || isWhServiceSlug(slug);
}
/** The page type every version of a water heater page carries. */
export function whPageType(slug: string): 'service' | 'sub-service' {
  return slug === WH_V2_HUB_SLUG ? 'service' : 'sub-service';
}
/** A version of one of the 6 pages (either page type, so a cross-typed legacy draft is caught too). */
export function isWhTarget(pageType: string, slug: string): boolean {
  return (pageType === 'sub-service' || pageType === 'service') && isWhSlug(slug);
}
export function whPathFor(slug: string): string {
  return slug === WH_V2_HUB_SLUG ? WH_V2_HUB_PATH : `/${slug}`;
}

export interface WhV2DraftContent {
  template: typeof WH_V2_MARKER;
  whV2: WhStored | WhHubStored;
  metaTitle: string;
  metaDescription: string;
}

export function isWhV2DraftContent(content: unknown): content is WhV2DraftContent {
  return (
    !!content &&
    typeof content === 'object' &&
    !Array.isArray(content) &&
    (content as Record<string, unknown>).template === WH_V2_MARKER &&
    !!(content as Record<string, unknown>).whV2 &&
    typeof (content as Record<string, unknown>).whV2 === 'object'
  );
}

/** The template version a water heater version is stamped with. */
export function whTemplateOf(content: WhV2DraftContent): WhTemplate {
  const t = (content.whV2 as WhStored).template;
  return (WH_TEMPLATES as readonly string[]).includes(t) ? t : 'wh-standard';
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** A code module → the object the seed stores. */
export function pageToStored(page: WhPage): WhStored {
  return { schema: 1, template: page.template, hero: clone(page.hero), sections: clone(page.sections), rail: clone(page.rail), service: clone(page.service) };
}

/** A stored page (+ the row's meta) → what the views render. */
export function storedToPage(slug: string, stored: WhStored, meta: { title: string; description: string }): WhPage {
  return { slug, template: stored.template, meta, hero: stored.hero, sections: stored.sections, rail: stored.rail, service: stored.service };
}

export { mergeOver } from '@/lib/cms-v2/shared';
