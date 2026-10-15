/**
 * Brief 204 — the Sewer v2 CMS content model: how a code module (src/lib/content/sewer-v2) maps onto
 * what the database stores, and back. Pure and client-safe (the admin editor imports it too).
 *
 * Storage (approved by Marketing 2026-10-12):
 *   - `sub_service_pages.v2_content`      → `SewerServiceStored` (one per service page)
 *   - `service_category_pages.v2_content` → `SewerHubStored` (the hub + the sewer-shared sections)
 *   - meta title/description              → each row's existing `meta_title` / `meta_description`
 * A version (`page_drafts.content`) carries the same object as `SewerV2DraftContent`, marked with
 * `template: 'sewer-v2'`. A version WITHOUT that marker is "old-shaped" (the pre-v2 layout): it can be
 * opened read-only but never published onto these pages (see `assertSewerV2Publishable`).
 *
 * The layout is locked in code: these objects carry the tree's tags, classes and inline styles so the
 * renderer reproduces the approved markup, but `conform.ts` refuses any change to them.
 */
import type {
  SewerNode,
  SewerSection,
  SewerServicePage,
  SewerServiceStored,
  SewerSharedContent,
  SewerVideoSchemaFields,
} from '@/lib/content/sewer-v2/types';
import type { SewerHubContent } from '@/lib/content/sewer-v2/hub';
import { SEWER_V2_CATEGORY_SLUG, SEWER_V2_SERVICE_SLUGS } from '@/lib/content/sewer-v2/routes';

export const SEWER_V2_TEMPLATE = 'sewer-v2';
export const SEWER_V2_HUB_SLUG = SEWER_V2_CATEGORY_SLUG;
export type SewerServiceSlug = (typeof SEWER_V2_SERVICE_SLUGS)[number];

/** The version name the seed gives each existing row's pre-v2 content (Marketing decision 2). */
export const PRE_V2_ARCHIVE_LABEL = 'Pre-v2 archive (2026-10)';
/** Shown wherever an old-shaped version meets the v2 editor or publish path. */
export const OLD_SHAPE_MESSAGE =
  "This version uses the old pre-v2 layout and can't be edited or published here.";

export function isSewerV2ServiceSlug(slug: string): slug is SewerServiceSlug {
  return (SEWER_V2_SERVICE_SLUGS as readonly string[]).includes(slug);
}

/** Any of the 10 pages: the 9 service slugs or the hub (`sewer`). */
export function isSewerV2Slug(slug: string): boolean {
  return slug === SEWER_V2_HUB_SLUG || isSewerV2ServiceSlug(slug);
}

/** The page types a version of one of the 10 pages can carry (incl. the legacy cross-typed drafts). */
export function isSewerV2Target(pageType: string, slug: string): boolean {
  return (pageType === 'sub-service' || pageType === 'service') && isSewerV2Slug(slug);
}

export interface SewerHubStored {
  schema: 1;
  hub: SewerHubContent;
  shared: SewerSharedContent;
}

/** A version's content for one of the 10 pages. */
export interface SewerV2DraftContent {
  template: typeof SEWER_V2_TEMPLATE;
  sewerV2: SewerServiceStored | SewerHubStored;
  metaTitle: string;
  metaDescription: string;
}

export function isSewerV2DraftContent(content: unknown): content is SewerV2DraftContent {
  return (
    !!content &&
    typeof content === 'object' &&
    !Array.isArray(content) &&
    (content as Record<string, unknown>).template === SEWER_V2_TEMPLATE &&
    !!(content as Record<string, unknown>).sewerV2 &&
    typeof (content as Record<string, unknown>).sewerV2 === 'object'
  );
}

// ── YouTube / VideoObject ─────────────────────────────────────────────────────────

const YT_WATCH = 'https://www.youtube.com/watch?v=';
const YT_EMBED = 'https://www.youtube.com/embed/';

/** The first YouTube video in the page's sections, in document order. */
export function firstYoutubeId(sections: readonly SewerSection[]): string | null {
  let found: string | null = null;
  const walk = (nodes: readonly SewerNode[] | undefined) => {
    for (const n of nodes ?? []) {
      if (found) return;
      if (typeof n !== 'object') continue;
      if ('video' in n) {
        if (n.video.kind === 'youtube') found = n.video.id;
        continue;
      }
      if ('tag' in n) walk(n.kids);
    }
  };
  for (const s of sections) if (s.kind === 'panel') walk(s.body);
  return found;
}

/**
 * schema.org VideoObject for a page, generated from its editable fields and its YouTube id. Key order
 * is the order the approved package (and therefore production) emits — JSON.stringify keeps it.
 */
export function videoObject(fields: SewerVideoSchemaFields, youtubeId: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: fields.name,
    description: fields.description,
    thumbnailUrl: fields.thumbnailUrl,
    uploadDate: fields.uploadDate,
    duration: fields.duration,
    contentUrl: `${YT_WATCH}${youtubeId}`,
    embedUrl: `${YT_EMBED}${youtubeId}`,
  };
}

// ── code module ⇄ stored ──────────────────────────────────────────────────────────

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** A code module → the object the seed stores (deep copy; nothing is shared with the module). */
export function pageToStored(page: SewerServicePage): SewerServiceStored {
  const out: SewerServiceStored = {
    schema: 1,
    hero: clone(page.hero),
    sections: clone(page.sections),
    rail: clone(page.rail),
  };
  if (page.videoSchema) {
    const v = page.videoSchema as Record<string, string>;
    out.video = {
      name: v.name,
      description: v.description,
      thumbnailUrl: v.thumbnailUrl,
      uploadDate: v.uploadDate,
      duration: v.duration,
    };
  }
  return out;
}

/** A stored page (+ the row's meta) → what `SewerServiceView` renders. */
export function storedToPage(
  slug: string,
  stored: SewerServiceStored,
  meta: { title: string; description: string }
): SewerServicePage {
  const page: SewerServicePage = {
    slug,
    meta,
    hero: stored.hero,
    sections: stored.sections,
    rail: stored.rail,
  };
  const id = firstYoutubeId(stored.sections);
  if (stored.video && id) page.videoSchema = videoObject(stored.video, id);
  return page;
}

// ── row over code, key by key (the Brief 157 / City V2 merge shape) ──────────────
// Brief 212: `mergeOver` moved, unchanged, to the shared V2 module (City Hub and City Service V2 use
// it too). Re-exported so every sewer import keeps working exactly as before.
export { mergeOver } from '@/lib/cms-v2/shared';
