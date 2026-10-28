/**
 * Brief 222 — the write side of the water heater CMS (the Brief 204 sewer contract, for the 6 pages):
 *
 *   prepareWhVersionContent — every version save: sanitise + layout-check water heater content, refuse
 *                             old-shaped content on these pages, refuse water heater content anywhere else;
 *   assertWhPublishable     — publishDraft, BEFORE any writer runs: an old-shaped version (the "Pre-v2
 *                             archive (2026-10)", a legacy draft) can never be published onto these pages;
 *   writeWhLive             — the publish writer. Writes ONLY `v2_content`, `meta_title`, `meta_description`,
 *                             `version`, `updated_at`, `updated_by` — never `status` (publishDraft's own
 *                             writer), never the legacy columns (the archive keeps them), never Global
 *                             Settings;
 *   assertWhVersionWritable — updateDraftContent: only a version stamped with a water heater template can
 *                             be written on these pages (old-shaped versions are read-only).
 */
import pool from '@/lib/db';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/cms/errors';
import { SEWER_V2_SANITIZERS } from '@/lib/cms/sewer-v2-sanitize';
import {
  isWhServiceSlug,
  isWhSlug,
  isWhTarget,
  isWhV2DraftContent,
  whPageType,
  WH_OLD_SHAPE_MESSAGE,
  WH_TEMPLATES,
  WH_V2_HUB_SLUG,
  WH_V2_MARKER,
  type WhV2DraftContent,
} from '@/lib/water-heater-v2-cms/model';
import { conformWhHub, conformWhMeta, conformWhPage, describeIssues } from '@/lib/water-heater-v2-cms/conform';
import { codeWhHubMeta, codeWhHubStored, codeWhServiceMeta, codeWhServiceStored } from '@/lib/water-heater-v2-cms/code-defaults';

/** Validate + sanitise a water heater version's content. Throws ValidationError (422) with the reasons. */
export function conformWhContent(pageType: string, slug: string, content: WhV2DraftContent): WhV2DraftContent {
  if (pageType !== whPageType(slug)) throw new ValidationError(`Water heater content for "${slug}" must be saved as a ${whPageType(slug)} version.`);
  const hub = slug === WH_V2_HUB_SLUG;
  const body = hub
    ? conformWhHub(content.whV2, codeWhHubStored(), SEWER_V2_SANITIZERS)
    : isWhServiceSlug(slug)
      ? conformWhPage(content.whV2, codeWhServiceStored(slug), SEWER_V2_SANITIZERS)
      : null;
  if (!body) throw new ValidationError(`"${slug}" is not a water heater page.`);
  const meta = conformWhMeta(content, hub ? codeWhHubMeta() : codeWhServiceMeta(slug as Parameters<typeof codeWhServiceMeta>[0]), SEWER_V2_SANITIZERS);
  const errors = [...meta.errors, ...body.errors];
  if (errors.length) throw new ValidationError(describeIssues(errors));
  return { template: WH_V2_MARKER, whV2: body.value, metaTitle: meta.value.metaTitle, metaDescription: meta.value.metaDescription };
}

export function prepareWhVersionContent(pageType: string, slug: string, content: unknown): unknown {
  const wh = isWhV2DraftContent(content);
  if (!isWhTarget(pageType, slug)) {
    if (wh) throw new ValidationError('Water heater content can only be saved on the 6 water heater pages.');
    return content;
  }
  if (!wh) throw new ValidationError(WH_OLD_SHAPE_MESSAGE);
  return conformWhContent(pageType, slug, content);
}

export function assertWhPublishable(pageType: string, slug: string, content: unknown): void {
  const wh = isWhV2DraftContent(content);
  if (isWhTarget(pageType, slug) && !wh) throw new ConflictError(WH_OLD_SHAPE_MESSAGE);
  if (!isWhTarget(pageType, slug) && wh) throw new ConflictError('Water heater content can only be published on the 6 water heater pages.');
}

export async function writeWhLive(pageType: string, slug: string, content: unknown, by: number): Promise<number> {
  if (!isWhSlug(slug) || !isWhV2DraftContent(content)) throw new ConflictError(WH_OLD_SHAPE_MESSAGE);
  // Re-checked at publish: a version saved before a code change to the template must still fit it.
  const clean = conformWhContent(pageType, slug, content);
  const table = whPageType(slug) === 'service' ? 'service_category_pages' : 'sub_service_pages';
  const res = await pool.query<{ version: number }>(
    `UPDATE ${table}
        SET v2_content = $1::jsonb, meta_title = $2, meta_description = $3,
            version = version + 1, updated_at = NOW(), updated_by = $4
      WHERE slug = $5
      RETURNING version`,
    [JSON.stringify(clean.whV2), clean.metaTitle, clean.metaDescription, by, slug]
  );
  if (res.rowCount === 0) throw new NotFoundError(`No ${table} row for "${slug}" — the deploy seed creates it.`);
  return res.rows[0].version;
}

export function assertWhVersionWritable(pageType: string, slug: string, templateType: string | null): void {
  if (isWhTarget(pageType, slug) && !(WH_TEMPLATES as readonly (string | null)[]).includes(templateType)) throw new ValidationError(WH_OLD_SHAPE_MESSAGE);
}
