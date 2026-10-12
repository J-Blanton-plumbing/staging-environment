/**
 * Brief 204 — the write side of the Sewer v2 CMS: what a version of one of the 10 sewer pages may
 * contain, and how a published version reaches the live row.
 *
 *   prepareSewerV2VersionContent  — every version save (createDraft / updateDraftContent): sanitise
 *                                   and lock-check v2 content, refuse old-shaped content on these
 *                                   pages, refuse v2 content anywhere else.
 *   assertSewerV2Publishable      — publishDraft, BEFORE any writer runs: an old-shaped version (the
 *                                   "Pre-v2 archive (2026-10)", a pre-v2 live snapshot, a legacy
 *                                   draft) can never overwrite a live v2 page.
 *   writeSewerV2Live              — the publish writer for v2 versions. It writes ONLY `v2_content`,
 *                                   `meta_title`, `meta_description`, `version`, `updated_at`,
 *                                   `updated_by`: never `status` (publishDraft's setLiveStatusInTx is
 *                                   its one writer, Brief 159), never the legacy columns (they stay
 *                                   what the archive version recorded), and never Global Settings
 *                                   (the category writer `updateServiceCmsContent` also writes the
 *                                   site-wide `global_content`, so it is deliberately not used).
 */
import pool from '@/lib/db';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/cms/errors';
import { SEWER_V2_SANITIZERS } from '@/lib/cms/sewer-v2-sanitize';
import {
  isSewerV2DraftContent,
  isSewerV2ServiceSlug,
  isSewerV2Slug,
  isSewerV2Target,
  OLD_SHAPE_MESSAGE,
  SEWER_V2_HUB_SLUG,
  SEWER_V2_TEMPLATE,
  type SewerV2DraftContent,
} from '@/lib/sewer-v2-cms/model';
import { conformHub, conformMeta, conformService, describeIssues } from '@/lib/sewer-v2-cms/conform';
import { codeHubMeta, codeHubStored, codeServiceMeta, codeServiceStored } from '@/lib/sewer-v2-cms/code-defaults';

/** The page type each of the 10 pages' versions must carry. */
function expectedPageType(slug: string): 'service' | 'sub-service' {
  return slug === SEWER_V2_HUB_SLUG ? 'service' : 'sub-service';
}

/** Validate + sanitise a v2 version's content. Throws ValidationError with the editor-facing reasons. */
export function conformSewerV2Content(pageType: string, slug: string, content: SewerV2DraftContent): SewerV2DraftContent {
  if (pageType !== expectedPageType(slug)) {
    throw new ValidationError(`Sewer v2 content for "${slug}" must be saved as a ${expectedPageType(slug)} version.`);
  }
  const hub = slug === SEWER_V2_HUB_SLUG;
  const body = hub
    ? conformHub(content.sewerV2, codeHubStored(), SEWER_V2_SANITIZERS)
    : isSewerV2ServiceSlug(slug)
      ? conformService(content.sewerV2, codeServiceStored(slug), SEWER_V2_SANITIZERS)
      : null;
  if (!body) throw new ValidationError(`"${slug}" is not a Sewer v2 page.`);
  const meta = conformMeta(content, hub ? codeHubMeta() : codeServiceMeta(slug as Parameters<typeof codeServiceMeta>[0]), SEWER_V2_SANITIZERS);
  const errors = [...meta.errors, ...body.errors];
  if (errors.length) throw new ValidationError(describeIssues(errors));
  return { template: SEWER_V2_TEMPLATE, sewerV2: body.value, metaTitle: meta.value.metaTitle, metaDescription: meta.value.metaDescription };
}

/**
 * Called on every version save, for every page type. Returns the content to store.
 *   - v2 content on one of the 10 pages → conformed (sanitised, lock-checked) or 422;
 *   - v2 content anywhere else          → 422 (no template may reinterpret another's content);
 *   - old-shaped content on the 10      → 422 (old versions are read-only on these pages);
 *   - anything else                     → unchanged.
 */
export function prepareSewerV2VersionContent(pageType: string, slug: string, content: unknown): unknown {
  const v2 = isSewerV2DraftContent(content);
  if (!isSewerV2Target(pageType, slug)) {
    if (v2) throw new ValidationError('Sewer v2 content can only be saved on the 10 sewer pages.');
    return content;
  }
  if (!v2) throw new ValidationError(OLD_SHAPE_MESSAGE);
  return conformSewerV2Content(pageType, slug, content);
}

/** publishDraft's guard, run before any writer. */
export function assertSewerV2Publishable(pageType: string, slug: string, content: unknown): void {
  const v2 = isSewerV2DraftContent(content);
  if (isSewerV2Target(pageType, slug) && !v2) throw new ConflictError(OLD_SHAPE_MESSAGE);
  if (!isSewerV2Target(pageType, slug) && v2) throw new ConflictError('Sewer v2 content can only be published on the 10 sewer pages.');
}

/** The publish writer for a v2 version. */
export async function writeSewerV2Live(pageType: string, slug: string, content: unknown, by: number): Promise<number> {
  if (!isSewerV2Slug(slug) || !isSewerV2DraftContent(content)) throw new ConflictError(OLD_SHAPE_MESSAGE);
  // Re-checked at publish: a version saved before a code change to the template must still fit it.
  const clean = conformSewerV2Content(pageType, slug, content);
  const table = expectedPageType(slug) === 'service' ? 'service_category_pages' : 'sub_service_pages';
  const res = await pool.query<{ version: number }>(
    `UPDATE ${table}
        SET v2_content = $1::jsonb, meta_title = $2, meta_description = $3,
            version = version + 1, updated_at = NOW(), updated_by = $4
      WHERE slug = $5
      RETURNING version`,
    [JSON.stringify(clean.sewerV2), clean.metaTitle, clean.metaDescription, by, slug]
  );
  if (res.rowCount === 0) throw new NotFoundError(`No ${table} row for "${slug}" — the deploy seed creates it.`);
  return res.rows[0].version;
}

/** updateDraftContent's guard: only a version saved by the v2 editor (template_type 'sewer-v2') can be edited on these pages. */
export function assertSewerV2VersionWritable(pageType: string, slug: string, templateType: string | null): void {
  if (isSewerV2Target(pageType, slug) && templateType !== SEWER_V2_TEMPLATE) throw new ValidationError(OLD_SHAPE_MESSAGE);
}
