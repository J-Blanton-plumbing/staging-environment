/**
 * Brief 212 (Track A = Brief 206 Tracks B–E) — the write side of the City Hub CMS: what a version of a
 * City Hub (or of the shared record) may contain, and how a published version reaches the live row.
 *
 *   prepareCityHubVersionContent — every version save (createDraft / updateDraftContent): sanitise and
 *                                  lock-check hub / shared content, refuse old-shaped content on a City
 *                                  Hub row, refuse hub content anywhere but a city page.
 *   assertCityHubPublishable     — publishDraft, BEFORE any writer runs: placeholders and empty required
 *                                  fields refuse a hub version (422, Brief 206 decision 4 + Brief 212
 *                                  hard rule 7); an old-shaped version (the "Pre-hub archive (2026-10)",
 *                                  a pre-hub snapshot, a legacy draft) can never overwrite a City Hub row
 *                                  (409, the Brief 204 guard).
 *   writeCityHubLive             — the publish writer for hub versions. It writes ONLY `hub_content`,
 *                                  `meta_title`, `meta_description`, the template marker, `version`,
 *                                  `updated_at`, `updated_by`: never `status` (setLiveStatusInTx is its
 *                                  one writer, Brief 159) and never the legacy columns (they stay what
 *                                  the archive version recorded). A row not on City Hub yet (e.g. after a
 *                                  D3 restore) is switched in the same UPDATE, remembering its template
 *                                  in `pre_hub_template` — that is what makes "re-apply = publish the
 *                                  City Hub version again" one step.
 *   writeCityHubSharedLive       — the shared record's writer (`main_pages` row `city-hubs`).
 */
import pool from '@/lib/db';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/cms/errors';
import { describeIssues, placeholderIssues } from '@/lib/cms-v2/shared';
import {
  CITY_HUB_SHARED_PAGE_TYPE,
  CITY_HUB_SHARED_SLUG,
  CITY_HUB_SHARED_TEMPLATE,
  CITY_HUB_TEMPLATE,
  isCityHubDraftContent,
  isCityHubSharedDraftContent,
  isCityPageType,
  OLD_HUB_SHAPE_MESSAGE,
  requiredEmptyFields,
  type CityHubDraftContent,
  type CityHubSharedDraftContent,
} from '@/lib/city-hub-cms/model';
import { conformHub, conformHubMeta, conformShared } from '@/lib/city-hub-cms/conform';
import { lockedCrop } from '@/lib/city-hub-cms/code-defaults';
import { HUB_SERVER_CHECKS } from '@/lib/cms/v2-server-checks';

async function rowTemplate(slug: string): Promise<string | null> {
  const r = await pool.query<{ template_type: string | null }>('SELECT template_type FROM city_pages WHERE city_slug = $1', [slug]);
  return r.rows[0]?.template_type ?? null;
}

/** Sanitise + lock-check a hub version's content. Throws ValidationError with the editor-facing reasons. */
export function conformCityHubContent(slug: string, content: CityHubDraftContent): CityHubDraftContent {
  const body = conformHub(content.hub, slug, lockedCrop(slug), HUB_SERVER_CHECKS);
  const meta = conformHubMeta(content, HUB_SERVER_CHECKS);
  const errors = [...meta.errors, ...body.errors];
  if (errors.length) throw new ValidationError(describeIssues(errors));
  return { template: CITY_HUB_TEMPLATE, hub: body.value, metaTitle: meta.value.metaTitle, metaDescription: meta.value.metaDescription };
}

export function conformCityHubSharedContent(content: CityHubSharedDraftContent): CityHubSharedDraftContent {
  const body = conformShared(content.shared, HUB_SERVER_CHECKS);
  if (body.errors.length) throw new ValidationError(describeIssues(body.errors));
  return { template: CITY_HUB_SHARED_TEMPLATE, shared: body.value };
}

const isSharedTarget = (pageType: string) => pageType === CITY_HUB_SHARED_PAGE_TYPE;

/**
 * Called on every version save, for every page type. Returns the content to store.
 *   - hub content on a city page → conformed (sanitised, lock-checked) or 422;
 *   - shared content on the shared record → conformed or 422;
 *   - hub / shared content anywhere else, or anything else on the shared record → 422;
 *   - old-shaped content on a City Hub row → 422 (old versions are read-only there);
 *   - anything else → unchanged.
 */
export async function prepareCityHubVersionContent(pageType: string, slug: string, content: unknown): Promise<unknown> {
  if (isCityHubSharedDraftContent(content)) {
    if (!(pageType === CITY_HUB_SHARED_PAGE_TYPE && slug === CITY_HUB_SHARED_SLUG)) {
      throw new ValidationError('Shared City Hub sections can only be saved on the shared record (/admin/city-hubs).');
    }
    return conformCityHubSharedContent(content);
  }
  if (isSharedTarget(pageType)) throw new ValidationError('The shared City Hub record only accepts its own content.');
  if (isCityHubDraftContent(content)) {
    if (!isCityPageType(pageType)) throw new ValidationError('City Hub content can only be saved on a city page.');
    return conformCityHubContent(slug, content);
  }
  if (isCityPageType(pageType) && (await rowTemplate(slug)) === CITY_HUB_TEMPLATE) throw new ValidationError(OLD_HUB_SHAPE_MESSAGE);
  return content;
}

/** publishDraft's guard, run before any writer. */
export async function assertCityHubPublishable(pageType: string, slug: string, content: unknown): Promise<void> {
  if (isCityHubSharedDraftContent(content)) {
    if (!(pageType === CITY_HUB_SHARED_PAGE_TYPE && slug === CITY_HUB_SHARED_SLUG)) throw new ConflictError('Shared City Hub sections can only be published on the shared record.');
    conformCityHubSharedContent(content);
    const ph = placeholderIssues(content.shared, 'shared');
    if (ph.length) throw new ValidationError(describeIssues(ph));
    return;
  }
  if (pageType === CITY_HUB_SHARED_PAGE_TYPE) throw new ConflictError('Only a version of the shared City Hub sections can be published here.');
  if (isCityHubDraftContent(content)) {
    if (!isCityPageType(pageType)) throw new ConflictError('City Hub content can only be published on a city page.');
    const clean = conformCityHubContent(slug, content);
    const empty = requiredEmptyFields(clean.hub, clean.metaTitle, clean.metaDescription);
    if (empty.length) {
      throw new ValidationError(
        `This City Hub can’t go live until every field is filled in. Empty: ${empty.slice(0, 12).join(', ')}${empty.length > 12 ? ` (and ${empty.length - 12} more)` : ''}.`
      );
    }
    const ph = placeholderIssues(clean, '');
    if (ph.length) throw new ValidationError(describeIssues(ph));
    return;
  }
  if (isCityPageType(pageType) && (await rowTemplate(slug)) === CITY_HUB_TEMPLATE) throw new ConflictError(OLD_HUB_SHAPE_MESSAGE);
}

/** The publish writer for a hub version. Returns the row's new version. */
export async function writeCityHubLive(slug: string, content: unknown, by: number): Promise<number> {
  if (!isCityHubDraftContent(content)) throw new ConflictError(OLD_HUB_SHAPE_MESSAGE);
  // Re-checked at publish: a version saved before a code change must still fit.
  const clean = conformCityHubContent(slug, content);
  const res = await pool.query<{ version: number }>(
    `UPDATE city_pages
        SET hub_content = $1::jsonb, meta_title = $2, meta_description = $3,
            pre_hub_template = CASE WHEN template_type = $4 THEN pre_hub_template ELSE COALESCE(template_type, 'coverage-area') END,
            template_type = $4,
            version = version + 1, updated_at = NOW(), updated_by = $5
      WHERE city_slug = $6
      RETURNING version`,
    [JSON.stringify(clean.hub), clean.metaTitle, clean.metaDescription, CITY_HUB_TEMPLATE, by, slug]
  );
  if (res.rowCount === 0) throw new NotFoundError(`No city_pages row for "${slug}".`);
  return res.rows[0].version;
}

/** The publish writer for the shared record. */
export async function writeCityHubSharedLive(content: unknown, by: number): Promise<number> {
  if (!isCityHubSharedDraftContent(content)) throw new ConflictError('Only shared City Hub content can be published on the shared record.');
  const clean = conformCityHubSharedContent(content);
  const res = await pool.query<{ version: number }>(
    `UPDATE main_pages SET content = $1::jsonb, version = version + 1, updated_at = NOW(), updated_by = $2
      WHERE slug = $3 RETURNING version`,
    [JSON.stringify(clean.shared), String(by), CITY_HUB_SHARED_SLUG]
  );
  if (res.rowCount === 0) throw new NotFoundError('No shared City Hub record yet — the deploy seed creates it.');
  return res.rows[0].version;
}

/** updateDraftContent's guard: an old-shaped version of a City Hub row is read-only (save a new version instead). */
export async function assertCityHubVersionWritable(pageType: string, slug: string, templateType: string | null): Promise<void> {
  if (pageType === CITY_HUB_SHARED_PAGE_TYPE) {
    if (templateType !== CITY_HUB_SHARED_TEMPLATE) throw new ValidationError('This version can’t be edited here.');
    return;
  }
  if (isCityPageType(pageType) && templateType !== CITY_HUB_TEMPLATE && (await rowTemplate(slug)) === CITY_HUB_TEMPLATE) {
    throw new ValidationError(OLD_HUB_SHAPE_MESSAGE);
  }
}

/** The template stamp a version gets on save. */
export function cityHubTemplateFor(content: unknown): string | null {
  if (isCityHubDraftContent(content)) return CITY_HUB_TEMPLATE;
  if (isCityHubSharedDraftContent(content)) return CITY_HUB_SHARED_TEMPLATE;
  return null;
}
