/**
 * City V2 CMS — the write side for the 145 city service pages and 5 city hubs (Brief 209 CMS wiring).
 * The same contract as Brief 204's src/lib/cms/sewer-v2-write.ts:
 *
 *   prepareCityV2VersionContent  — every version save: sanitise + lock-check v2 content, refuse
 *                                  old-shaped content on these pages, refuse v2 content elsewhere.
 *   assertCityV2Publishable      — publishDraft, BEFORE any writer runs.
 *   writeCityV2Live              — the publish writer for v2 versions. It writes ONLY `v2_content`,
 *                                  `meta_title`, `meta_description`, `version`, `updated_at`,
 *                                  `updated_by`: never `status` (publishDraft's setLiveStatusInTx
 *                                  is its one writer, Brief 159) and never the legacy columns (they
 *                                  stay what the "Pre-v2 archive (2026-10)" version recorded).
 *   assertCityV2VersionWritable  — updateDraftContent: an old-shaped version is read-only here.
 */
import pool from '@/lib/db';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/cms/errors';
import { SEWER_V2_SANITIZERS } from '@/lib/cms/sewer-v2-sanitize';
import { CITY_V2_TEMPLATE, isCityV2DraftContent, isCityV2Target, OLD_SHAPE_MESSAGE, type CityV2DraftContent } from '@/lib/city-v2-cms/model';
import { conformCityHub, conformCityService, conformMeta, describeIssues } from '@/lib/city-v2-cms/conform';
import { codeHubMeta, codeHubStored, codeServiceMeta, codeServiceStored } from '@/lib/city-v2-cms/code-defaults';

/** Validate + sanitise a v2 version's content. Throws ValidationError with the editor-facing reasons. */
export function conformCityV2Content(pageType: string, slug: string, content: CityV2DraftContent): CityV2DraftContent {
  if (!isCityV2Target(pageType, slug)) throw new ValidationError(`"${slug}" is not a City v2 page.`);
  let body;
  let codeMeta;
  if (pageType === 'city') {
    body = conformCityHub(content.cityV2, codeHubStored(slug)!, SEWER_V2_SANITIZERS);
    codeMeta = codeHubMeta(slug)!;
  } else {
    const [city, service] = slug.split('/');
    body = conformCityService(content.cityV2, codeServiceStored(city, service)!, SEWER_V2_SANITIZERS);
    codeMeta = codeServiceMeta(city, service)!;
  }
  const meta = conformMeta(content, codeMeta, SEWER_V2_SANITIZERS);
  const errors = [...meta.errors, ...body.errors];
  if (errors.length) throw new ValidationError(describeIssues(errors));
  return { template: CITY_V2_TEMPLATE, cityV2: body.value, metaTitle: meta.value.metaTitle, metaDescription: meta.value.metaDescription };
}

/** Called on every version save, for every page type. Returns the content to store. */
export function prepareCityV2VersionContent(pageType: string, slug: string, content: unknown): unknown {
  const v2 = isCityV2DraftContent(content);
  if (!isCityV2Target(pageType, slug)) {
    if (v2) throw new ValidationError('City v2 content can only be saved on the City v2 pages.');
    return content;
  }
  if (!v2) throw new ValidationError(OLD_SHAPE_MESSAGE);
  return conformCityV2Content(pageType, slug, content);
}

/** publishDraft's guard, run before any writer. */
export function assertCityV2Publishable(pageType: string, slug: string, content: unknown): void {
  const v2 = isCityV2DraftContent(content);
  if (isCityV2Target(pageType, slug) && !v2) throw new ConflictError(OLD_SHAPE_MESSAGE);
  if (!isCityV2Target(pageType, slug) && v2) throw new ConflictError('City v2 content can only be published on the City v2 pages.');
}

/** The publish writer for a v2 version. */
export async function writeCityV2Live(pageType: string, slug: string, content: unknown, by: number): Promise<number> {
  if (!isCityV2Target(pageType, slug) || !isCityV2DraftContent(content)) throw new ConflictError(OLD_SHAPE_MESSAGE);
  // Re-checked at publish: a version saved before a code change to the template must still fit it.
  const clean = conformCityV2Content(pageType, slug, content);
  const params: unknown[] = [JSON.stringify(clean.cityV2), clean.metaTitle, clean.metaDescription, by];
  const res =
    pageType === 'city'
      ? await pool.query<{ version: number }>(
          `UPDATE city_pages
              SET v2_content = $1::jsonb, meta_title = $2, meta_description = $3,
                  version = version + 1, updated_at = NOW(), updated_by = $4
            WHERE city_slug = $5
            RETURNING version`,
          [...params, slug]
        )
      : await pool.query<{ version: number }>(
          `UPDATE city_service_pages
              SET v2_content = $1::jsonb, meta_title = $2, meta_description = $3,
                  version = version + 1, updated_at = NOW(), updated_by = $4
            WHERE city_slug = $5 AND service_slug = $6
            RETURNING version`,
          [...params, ...slug.split('/')]
        );
  if (res.rowCount === 0) throw new NotFoundError(`No ${pageType === 'city' ? 'city_pages' : 'city_service_pages'} row for "${slug}" — the deploy seed creates it.`);
  return res.rows[0].version;
}

/** updateDraftContent's guard: only a version saved by the v2 editor (template_type 'city-v2') can be edited on these pages. */
export function assertCityV2VersionWritable(pageType: string, slug: string, templateType: string | null): void {
  if (isCityV2Target(pageType, slug) && templateType !== CITY_V2_TEMPLATE) throw new ValidationError(OLD_SHAPE_MESSAGE);
}
