/**
 * Brief 212 (Track B) — the write side of the City Service V2 CMS (the Brief 204 guards, for a third
 * template):
 *
 *   prepareCityServiceV2VersionContent — every version save: sanitise + lock-check V2 content against
 *                                        the page's layout and DERIVE its Service JSON-LD from the
 *                                        fields; refuse old-shaped content on a V2 row (422).
 *   assertCityServiceV2Publishable     — publishDraft, before any writer: placeholders / empty fields
 *                                        refuse a V2 version (422); an old-shaped version can never
 *                                        overwrite a V2 row (409).
 *   writeCityServiceV2Live             — writes ONLY `v2_content`, `meta_title`, `meta_description`,
 *                                        `version`, `updated_at`: never `status`, never the legacy
 *                                        columns (they stay what the archive version recorded).
 */
import pool from '@/lib/db';
import { getCity } from '@/lib/content/cities';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/cms/errors';
import { describeIssues, placeholderIssues } from '@/lib/cms-v2/shared';
import {
  CITY_SERVICE_V2_TEMPLATE,
  deriveServiceSchema,
  isCityServiceV2DraftContent,
  OLD_SERVICE_SHAPE_MESSAGE,
  requiredEmptyServiceFields,
  type CityServiceV2DraftContent,
} from '@/lib/city-service-v2-cms/model';
import { conformService, conformServiceMeta } from '@/lib/city-service-v2-cms/conform';
import { pageLayout } from '@/lib/city-service-v2-cms/code-defaults';
import { SERVICE_SERVER_CHECKS, stateAbbr } from '@/lib/cms/v2-server-checks';

function split(slug: string): [string, string] {
  const [city, service] = slug.split('/');
  return [city ?? '', service ?? ''];
}

/** The row's live `v2_content` (the layout a saved version is locked to — Brief 216 `pageLayout`). */
export async function publishedV2(slug: string): Promise<unknown> {
  const [city, service] = split(slug);
  const r = await pool.query<{ v: unknown }>('SELECT v2_content AS v FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2', [city, service]);
  return r.rows[0]?.v ?? undefined;
}

async function rowHasV2(city: string, service: string): Promise<boolean> {
  const r = await pool.query<{ v: boolean }>(
    'SELECT (v2_content IS NOT NULL) AS v FROM city_service_pages WHERE city_slug = $1 AND service_slug = $2',
    [city, service]
  );
  return !!r.rows[0]?.v;
}

/**
 * Sanitise + lock-check + derive. Throws ValidationError with the editor-facing reasons. `published` =
 * the row's live `v2_content` (`publishedV2`): once a page is live its own structure is the lock, so a
 * section can't be added, removed or reordered (Brief 216 decision 3). Without it (the importer, a page
 * before its first publish) the lock is the template — or, for a page with no code module, the
 * content's own well-formed structure.
 */
export function conformCityServiceV2Content(slug: string, content: CityServiceV2DraftContent, published?: unknown): CityServiceV2DraftContent {
  const [city, service] = split(slug);
  const entry = getCity(city);
  const layout = pageLayout(city, service, { published, draft: content?.page });
  if (!entry || !layout) throw new ValidationError(`"${slug}" has no City Service V2 layout.`);
  const body = conformService(content.page, layout, city, SERVICE_SERVER_CHECKS);
  const meta = conformServiceMeta(content, SERVICE_SERVER_CHECKS);
  const errors = [...meta.errors, ...body.errors];
  if (errors.length) throw new ValidationError(describeIssues(errors));
  const page = { ...body.value };
  page.serviceSchema = deriveServiceSchema(page, { city, service, cityName: entry.name, state: stateAbbr(city) }, meta.value.metaDescription);
  return { template: CITY_SERVICE_V2_TEMPLATE, page, metaTitle: meta.value.metaTitle, metaDescription: meta.value.metaDescription };
}

export async function prepareCityServiceV2VersionContent(pageType: string, slug: string, content: unknown): Promise<unknown> {
  if (isCityServiceV2DraftContent(content)) {
    if (pageType !== 'city-service') throw new ValidationError('City Service V2 content can only be saved on a city-service page.');
    return conformCityServiceV2Content(slug, content, await publishedV2(slug));
  }
  if (pageType === 'city-service') {
    const [city, service] = split(slug);
    if (await rowHasV2(city, service)) throw new ValidationError(OLD_SERVICE_SHAPE_MESSAGE);
  }
  return content;
}

export async function assertCityServiceV2Publishable(pageType: string, slug: string, content: unknown): Promise<void> {
  if (isCityServiceV2DraftContent(content)) {
    if (pageType !== 'city-service') throw new ConflictError('City Service V2 content can only be published on a city-service page.');
    const clean = conformCityServiceV2Content(slug, content, await publishedV2(slug));
    const empty = requiredEmptyServiceFields(clean.page, clean.metaTitle, clean.metaDescription);
    if (empty.length) {
      throw new ValidationError(`This page can’t go live until every field is filled in. Empty: ${empty.slice(0, 12).join(', ')}${empty.length > 12 ? ` (and ${empty.length - 12} more)` : ''}.`);
    }
    const ph = placeholderIssues(clean, '');
    if (ph.length) throw new ValidationError(describeIssues(ph));
    return;
  }
  if (pageType === 'city-service') {
    const [city, service] = split(slug);
    if (await rowHasV2(city, service)) throw new ConflictError(OLD_SERVICE_SHAPE_MESSAGE);
  }
}

export async function writeCityServiceV2Live(slug: string, content: unknown): Promise<number> {
  if (!isCityServiceV2DraftContent(content)) throw new ConflictError(OLD_SERVICE_SHAPE_MESSAGE);
  const clean = conformCityServiceV2Content(slug, content, await publishedV2(slug));
  const [city, service] = split(slug);
  const res = await pool.query<{ version: number }>(
    `UPDATE city_service_pages
        SET v2_content = $1::jsonb, meta_title = $2, meta_description = $3,
            version = version + 1, updated_at = NOW()
      WHERE city_slug = $4 AND service_slug = $5
      RETURNING version`,
    [JSON.stringify(clean.page), clean.metaTitle, clean.metaDescription, city, service]
  );
  if (res.rowCount === 0) throw new NotFoundError(`No city_service_pages row for "${slug}".`);
  return res.rows[0].version;
}

export async function assertCityServiceV2VersionWritable(pageType: string, slug: string, templateType: string | null): Promise<void> {
  if (pageType !== 'city-service' || templateType === CITY_SERVICE_V2_TEMPLATE) return;
  const [city, service] = split(slug);
  if (await rowHasV2(city, service)) throw new ValidationError(OLD_SERVICE_SHAPE_MESSAGE);
}
