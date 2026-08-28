import pool from '@/lib/db';
import type { PoolClient } from 'pg';
import { ConflictError, NotFoundError } from '@/lib/cms/errors';
import {
  type CityV2BlockInstance,
  type CityV2LegacyFields,
  normalizeCityV2Blocks,
  assembleCityV2Blocks,
  cityV2BlocksToFields,
} from '@/lib/cms/city-v2-blocks';

// DB column names shared by both city templates — values carry over on switch
const CITY_SHARED_FIELDS = [
  'hero_image',
  'hero_heading_line1',
  'hero_callout',
  'hero_description',
  'content_heading',
  'content_body',
  'f2_heading',
  'f2_body',
  'faqs',
] as const;

// Fields required by local-office that don't exist in coverage-area
const LOCAL_OFFICE_ONLY_FIELDS = ['hero_heading_line2'] as const;

// Fields required by coverage-area that don't exist in local-office
//
// Brief 160 deliberately does NOT add `covered_heading` / `covered_image` here,
// even though both are coverage-area-only columns. This list drives the
// "⚠ Required — not yet filled in" highlight after a switch, and blank is a
// legitimate, intended state for both fields: a blank heading renders the
// template literal and a blank image renders the pipes fallback, so nothing is
// missing. They are also absent from the switch UPDATE below on purpose — the
// values simply persist on the row, unrendered, while the page is on another
// template, and come back intact on a switch to coverage-area. That is the
// whole reason they are their own columns instead of a reuse of
// `content_heading` (Brief 95 A.2 / Brief 157 Q9).
const COVERAGE_AREA_ONLY_FIELDS: readonly string[] = [];

// Brief 67 — V2-only DB columns. These carry no value from V1/coverage, so on a
// switch TO local-office-v2 they are reported as "missing" (the editor highlights
// them); on a switch AWAY from local-office-v2 they are reset (below) — but since
// Brief 116 the reset is recoverable: the archive written before every switch is
// read back on a later switch TO the template (see `getLatestTemplateArchive`).
const LOCAL_OFFICE_V2_ONLY_FIELDS = [
  'trust_bar_stars',
  'trust_bar_review_count',
  'services_intro',
  'most_requested_services',
  'mid_cta_text',
  'video_heading',
  'video_intro',
  'video_script',
  'reviews',
  'ndc_intro',
  'final_cta_heading',
  'final_cta_body',
  'why_points',
] as const;

// Brief 99 made `blocks` (JSONB) the authoritative order + content store for V2
// pages. It is V2-only content too, but is handled separately from the named
// columns above because it is not an editor-fillable "missing field".
const V2_BLOCKS_FIELD = 'blocks';

export type CityTemplate = 'coverage-area' | 'local-office' | 'local-office-v2';

const TEMPLATE_ONLY_FIELDS: Record<CityTemplate, readonly string[]> = {
  'local-office': LOCAL_OFFICE_ONLY_FIELDS,
  'coverage-area': COVERAGE_AREA_ONLY_FIELDS,
  'local-office-v2': LOCAL_OFFICE_V2_ONLY_FIELDS,
};

export const VALID_CITY_TEMPLATES: CityTemplate[] = ['coverage-area', 'local-office', 'local-office-v2'];

// ── Field-name translation (Brief 116) ──────────────────────────────────────
// The live `city_pages` row uses snake_case columns; draft content (the editor's
// `buildCityPayload`) uses camelCase keys. One table maps between them so the
// same field lists drive both the live switch and the draft re-template.

const DB_TO_CAMEL: Record<string, string> = {
  hero_image: 'heroImage',
  hero_heading_line1: 'heroHeadingLine1',
  hero_heading_line2: 'heroHeadingLine2',
  hero_callout: 'heroCallout',
  hero_description: 'heroDescription',
  content_heading: 'contentHeading',
  content_body: 'contentBody',
  f2_heading: 'f2Heading',
  f2_body: 'f2Body',
  faqs: 'faqs',
  trust_bar_stars: 'trustBarStars',
  trust_bar_review_count: 'trustBarReviewCount',
  services_intro: 'servicesIntro',
  most_requested_services: 'mostRequestedServices',
  mid_cta_text: 'midCtaText',
  video_heading: 'videoHeading',
  video_intro: 'videoIntro',
  video_script: 'videoScript',
  reviews: 'reviews',
  ndc_intro: 'ndcIntro',
  final_cta_heading: 'finalCtaHeading',
  final_cta_body: 'finalCtaBody',
  why_points: 'whyPoints',
  blocks: 'blocks',
};

function camelOf(dbKey: string): string {
  return DB_TO_CAMEL[dbKey] ?? dbKey;
}

/** True when a field value carries no content ('' / null / undefined / [] / '[]'). */
function isEmptyFieldValue(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === 'string') return v.trim() === '' || v.trim() === '[]';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/**
 * Read a field from an archived snapshot regardless of its key style: live-page
 * archives store the raw `city_pages` row (snake_case); draft archives store the
 * editor payload (camelCase).
 */
function snapshotFieldValue(snapshot: Record<string, unknown>, dbKey: string): unknown {
  const direct = snapshot[dbKey];
  if (!isEmptyFieldValue(direct)) return direct;
  const camel = snapshot[camelOf(dbKey)];
  if (!isEmptyFieldValue(camel)) return camel;
  return undefined;
}

function asArrayValue<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === 'string' && v.trim()) {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function asStringValue(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

/** Rebuild the V2 legacy flat field set from an archived snapshot (either key style). */
function legacyFieldsFromSnapshot(snapshot: Record<string, unknown>): CityV2LegacyFields {
  return {
    heroImage: asStringValue(snapshotFieldValue(snapshot, 'hero_image')),
    heroHeadingLine1: asStringValue(snapshotFieldValue(snapshot, 'hero_heading_line1')),
    heroDescription: asStringValue(snapshotFieldValue(snapshot, 'hero_description')),
    trustBarStars: asStringValue(snapshotFieldValue(snapshot, 'trust_bar_stars')),
    trustBarReviewCount: asStringValue(snapshotFieldValue(snapshot, 'trust_bar_review_count')),
    servicesIntro: asStringValue(snapshotFieldValue(snapshot, 'services_intro')),
    mostRequestedServices: asArrayValue(snapshotFieldValue(snapshot, 'most_requested_services')),
    midCtaText: asStringValue(snapshotFieldValue(snapshot, 'mid_cta_text')),
    whyPoints: asArrayValue(snapshotFieldValue(snapshot, 'why_points')),
    videoHeading: asStringValue(snapshotFieldValue(snapshot, 'video_heading')),
    videoIntro: asStringValue(snapshotFieldValue(snapshot, 'video_intro')),
    videoScript: asStringValue(snapshotFieldValue(snapshot, 'video_script')),
    reviews: asArrayValue(snapshotFieldValue(snapshot, 'reviews')),
    faqs: asArrayValue(snapshotFieldValue(snapshot, 'faqs')),
    ndcIntro: asStringValue(snapshotFieldValue(snapshot, 'ndc_intro')),
    finalCtaHeading: asStringValue(snapshotFieldValue(snapshot, 'final_cta_heading')),
    finalCtaBody: asStringValue(snapshotFieldValue(snapshot, 'final_cta_body')),
  };
}

/**
 * Overwrite the hero + FAQ block data with the current shared-field values so a
 * restored `blocks` array never resurrects a stale hero/FAQ set on top of content
 * the editor kept working on after the original switch. Only non-empty current
 * values win — an empty current hero keeps whatever the archive had.
 */
function patchSharedIntoCityV2Blocks(
  blocks: CityV2BlockInstance[],
  shared: {
    heroImage?: unknown;
    heroHeadingLine1?: unknown;
    heroDescription?: unknown;
    faqs?: unknown;
  }
): CityV2BlockInstance[] {
  let heroPatched = false;
  let faqPatched = false;
  return blocks.map((b) => {
    if (b.type === 'localOfficeV2Hero' && !heroPatched) {
      heroPatched = true;
      const data = { ...b.data };
      if (!isEmptyFieldValue(shared.heroImage)) data.heroImage = shared.heroImage;
      if (!isEmptyFieldValue(shared.heroHeadingLine1)) data.heroHeadingLine1 = shared.heroHeadingLine1;
      if (!isEmptyFieldValue(shared.heroDescription)) data.heroDescription = shared.heroDescription;
      return { ...b, data };
    }
    if (b.type === 'faqAccordion' && !faqPatched) {
      faqPatched = true;
      if (!isEmptyFieldValue(shared.faqs)) return { ...b, data: { ...b.data, faqs: shared.faqs } };
      return b;
    }
    return b;
  });
}

/** V2 named columns still empty after deriving the primary snapshot from `blocks`. */
function v2MissingFromBlocks(blocks: CityV2BlockInstance[]): string[] {
  const derived = cityV2BlocksToFields(blocks) as Record<string, unknown>;
  return LOCAL_OFFICE_V2_ONLY_FIELDS.filter((dbKey) => isEmptyFieldValue(derived[camelOf(dbKey)]));
}

// ── mapContentBetweenTemplates (Brief 116, Track A) ─────────────────────────

export interface TemplateContentMap {
  /** Shared fields carried over, keyed in the requested style. */
  mapped: Record<string, unknown>;
  /**
   * Target-template-only fields the content holds no value for (always DB column
   * names — the editor's missing-field highlight convention, Brief 35/67).
   * Callers that restore from `template_switch_archive` re-filter this list
   * against the restored values.
   */
  missing: string[];
  /**
   * Source-template-only fields that carry content but have no home in the
   * target template, keyed in the requested style. Callers must archive these
   * before dropping them (Brief 116 hard rule: never silently destroy content).
   */
  orphaned: Record<string, unknown>;
}

/**
 * The single source of field-mapping truth for city template changes (Brief 116).
 * Pure: works on a live `city_pages` row (`keyStyle: 'db'`) or an editor draft
 * payload (`keyStyle: 'camel'`). Used by both `switchTemplate` (live page) and
 * `retemplateDraft` (open draft) so the two can never disagree about what
 * carries over, what is missing, and what is orphaned.
 */
export function mapContentBetweenTemplates(
  content: Record<string, unknown>,
  fromTemplate: CityTemplate,
  toTemplate: CityTemplate,
  keyStyle: 'db' | 'camel' = 'db'
): TemplateContentMap {
  const key = (dbKey: string) => (keyStyle === 'db' ? dbKey : camelOf(dbKey));
  // Tolerate either key style in the input — a draft payload is camelCase but a
  // row snapshot is snake_case, and restore snapshots can be either.
  const read = (dbKey: string): unknown => {
    const primary = content[key(dbKey)];
    if (primary !== undefined) return primary;
    return content[keyStyle === 'db' ? camelOf(dbKey) : dbKey];
  };

  const mapped: Record<string, unknown> = {};
  for (const field of CITY_SHARED_FIELDS) {
    mapped[key(field)] = read(field) ?? '';
  }

  const missing = TEMPLATE_ONLY_FIELDS[toTemplate].filter((f) => isEmptyFieldValue(read(f)));

  const orphanCandidates: string[] = [
    ...TEMPLATE_ONLY_FIELDS[fromTemplate],
    ...(fromTemplate === 'local-office-v2' ? [V2_BLOCKS_FIELD] : []),
  ];
  const orphaned: Record<string, unknown> = {};
  for (const field of orphanCandidates) {
    const value = read(field);
    if (!isEmptyFieldValue(value)) orphaned[key(field)] = value;
  }

  return { mapped, missing, orphaned };
}

// ── Archive lookups (Brief 116, Track B) ────────────────────────────────────

/**
 * The most recent archived snapshot from the last time this page (or draft) was
 * ON the given template — i.e. rows written when switching AWAY from it. This is
 * the restore source that makes switching non-destructive: V2 → V1 → V2 pulls
 * the V2-only content back out of `template_switch_archive` instead of leaving
 * blanks. `draftId` scopes the lookup to a draft's own re-template history
 * (`page_type='city-draft'`); live lookups exclude draft rows.
 */
async function getLatestTemplateArchive(
  client: PoolClient,
  {
    pageType,
    pageSlug,
    template,
    draftId,
  }: { pageType: string; pageSlug: string; template: string; draftId?: number | null }
): Promise<Record<string, unknown> | null> {
  const res = draftId != null
    ? await client.query(
        `SELECT archived_content FROM template_switch_archive
          WHERE page_type = 'city-draft' AND draft_id = $1 AND from_template = $2
          ORDER BY id DESC LIMIT 1`,
        [draftId, template]
      )
    : await client.query(
        `SELECT archived_content FROM template_switch_archive
          WHERE page_type = $1 AND page_slug = $2 AND from_template = $3
            AND draft_id IS NULL
          ORDER BY id DESC LIMIT 1`,
        [pageType, pageSlug, template]
      );
  const content = res.rows[0]?.archived_content;
  return content && typeof content === 'object' ? (content as Record<string, unknown>) : null;
}

// ── Live-page switch ─────────────────────────────────────────────────────────

export interface SwitchTemplateParams {
  pageType: 'city';
  pageSlug: string;
  toTemplate: string;
  switchedBy: number | null;
}

export interface SwitchTemplateResult {
  mapped: Record<string, unknown>;
  missing: string[];
  /** DB keys of target-template-only fields pre-filled from the archive (Brief 116). */
  restored: string[];
}

export async function switchTemplate({
  pageType,
  pageSlug,
  toTemplate,
  switchedBy,
}: SwitchTemplateParams): Promise<SwitchTemplateResult> {
  if (pageType !== 'city') throw new Error(`Unsupported page type: ${pageType}`);

  if (!VALID_CITY_TEMPLATES.includes(toTemplate as CityTemplate)) {
    throw new Error(`Invalid template "${toTemplate}". Valid values: ${VALID_CITY_TEMPLATES.join(', ')}`);
  }
  const target = toTemplate as CityTemplate;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Load the current row
    const res = await client.query(`SELECT * FROM city_pages WHERE city_slug = $1`, [pageSlug]);
    if (!res.rows[0]) throw new Error(`No city_pages row for slug "${pageSlug}"`);
    const row = res.rows[0];
    const currentTemplate: CityTemplate = (row.template_type ?? 'coverage-area') as CityTemplate;

    // 2. No-op guard
    if (toTemplate === currentTemplate) {
      throw new Error(`Page "${pageSlug}" is already using template "${toTemplate}"`);
    }

    // 3. Archive the full current row before touching anything
    await client.query(
      `INSERT INTO template_switch_archive
         (page_type, page_slug, from_template, to_template, archived_content, switched_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [pageType, pageSlug, currentTemplate, toTemplate, JSON.stringify(row), switchedBy]
    );

    // 4. Map shared fields / target-only gaps / orphans (Brief 116: one helper
    //    shared with the draft re-template path).
    const { mapped, missing: baseMissing } = mapContentBetweenTemplates(
      row,
      currentTemplate,
      target,
      'db'
    );

    // 5. Brief 116 (Track B): the last time this page was ON the target template,
    //    a switch away from it archived a full snapshot. Restore the target's
    //    template-only fields from it instead of leaving blanks.
    const snapshot = await getLatestTemplateArchive(client, {
      pageType,
      pageSlug,
      template: target,
    });

    let missing = [...baseMissing];
    const restored: string[] = [];

    // 6. Update the row: new template_type, shared values preserved.
    //    hero_heading_line2: required by local-office (restore from archive if the
    //    row's own value is empty); preserved untouched for the other templates
    //    (not displayed but not destroyed).
    let heroHeadingLine2: string | null = row.hero_heading_line2 ?? null;
    if (target === 'local-office') {
      if (isEmptyFieldValue(heroHeadingLine2) && snapshot) {
        const restoredLine2 = asStringValue(snapshotFieldValue(snapshot, 'hero_heading_line2'));
        if (restoredLine2 !== null) {
          heroHeadingLine2 = restoredLine2;
          restored.push('hero_heading_line2');
        }
      }
      if (isEmptyFieldValue(heroHeadingLine2)) heroHeadingLine2 = ''; // editor must fill this in
      missing = missing.filter((f) => f !== 'hero_heading_line2' || isEmptyFieldValue(heroHeadingLine2));
    }

    await client.query(
      `UPDATE city_pages SET
        template_type      = $1,
        hero_image         = $2,
        hero_heading_line1 = $3,
        hero_heading_line2 = $4,
        hero_callout       = $5,
        hero_description   = $6,
        content_heading    = $7,
        content_body       = $8,
        f2_heading         = $9,
        f2_body            = $10,
        faqs               = $11::jsonb,
        updated_at         = NOW()
       WHERE city_slug = $12`,
      [
        toTemplate,
        mapped['hero_image'] ?? '',
        mapped['hero_heading_line1'] ?? '',
        heroHeadingLine2,
        mapped['hero_callout'] ?? '',
        mapped['hero_description'] ?? '',
        mapped['content_heading'] ?? '',
        mapped['content_body'] ?? '',
        mapped['f2_heading'] ?? '',
        mapped['f2_body'] ?? '',
        typeof mapped['faqs'] === 'string'
          ? mapped['faqs']
          : JSON.stringify(mapped['faqs'] ?? []),
        pageSlug,
      ]
    );

    // Brief 67 — when leaving local-office-v2, clear the V2-only columns so stale
    // V2 content doesn't linger on a row now rendered by a V1/coverage template.
    // Brief 116 adds `blocks` to the wipe (it is V2-only content too) — all of it
    // is recoverable from the archive row written in step 3.
    if (currentTemplate === 'local-office-v2') {
      await client.query(
        `UPDATE city_pages SET
           trust_bar_stars         = '',
           trust_bar_review_count  = '',
           services_intro          = '',
           most_requested_services = '[]'::jsonb,
           mid_cta_text            = '',
           video_heading           = '',
           video_intro             = '',
           video_script            = '',
           reviews                 = '[]'::jsonb,
           ndc_intro               = '',
           final_cta_heading       = '',
           final_cta_body          = '',
           why_points              = '[]'::jsonb,
           blocks                  = NULL
         WHERE city_slug = $1`,
        [pageSlug]
      );
    }

    // Brief 116 (Track B): switching TO local-office-v2 restores the V2-only
    // columns + `blocks` from the archived snapshot of the last V2 stint.
    if (target === 'local-office-v2' && snapshot) {
      const restoredValues: Record<string, unknown> = {};
      for (const field of LOCAL_OFFICE_V2_ONLY_FIELDS) {
        const value = snapshotFieldValue(snapshot, field);
        if (!isEmptyFieldValue(value)) {
          restoredValues[field] = value;
          restored.push(field);
        }
      }

      let blocks = normalizeCityV2Blocks(snapshotFieldValue(snapshot, V2_BLOCKS_FIELD));
      if (blocks.length === 0) {
        // Snapshot predates the Brief 99 blocks model — synthesize instances from
        // its flat fields, canonical order.
        blocks = assembleCityV2Blocks(legacyFieldsFromSnapshot(snapshot));
      } else {
        // Post-Brief-99 snapshots may carry content only inside `blocks` (the
        // flat columns are a lagging primary snapshot) — count those fields as
        // restored too so the report matches what actually came back.
        const snapshotDerived = cityV2BlocksToFields(blocks) as Record<string, unknown>;
        for (const field of LOCAL_OFFICE_V2_ONLY_FIELDS) {
          if (!restored.includes(field) && !isEmptyFieldValue(snapshotDerived[camelOf(field)])) {
            restored.push(field);
          }
        }
      }
      // Current shared values (hero, FAQs) win over the archived ones — the
      // editor kept working on those after the original switch away.
      blocks = patchSharedIntoCityV2Blocks(blocks, {
        heroImage: mapped['hero_image'],
        heroHeadingLine1: mapped['hero_heading_line1'],
        heroDescription: mapped['hero_description'],
        faqs: mapped['faqs'],
      });

      const asJson = (v: unknown): string | null =>
        isEmptyFieldValue(v) ? null : JSON.stringify(v);
      const asText = (v: unknown): string | null =>
        typeof v === 'string' && v.trim() !== '' ? v : null;

      await client.query(
        `UPDATE city_pages SET
           trust_bar_stars         = COALESCE($1, trust_bar_stars),
           trust_bar_review_count  = COALESCE($2, trust_bar_review_count),
           services_intro          = COALESCE($3, services_intro),
           most_requested_services = COALESCE($4::jsonb, most_requested_services),
           mid_cta_text            = COALESCE($5, mid_cta_text),
           video_heading           = COALESCE($6, video_heading),
           video_intro             = COALESCE($7, video_intro),
           video_script            = COALESCE($8, video_script),
           reviews                 = COALESCE($9::jsonb, reviews),
           ndc_intro               = COALESCE($10, ndc_intro),
           final_cta_heading       = COALESCE($11, final_cta_heading),
           final_cta_body          = COALESCE($12, final_cta_body),
           why_points              = COALESCE($13::jsonb, why_points),
           blocks                  = $14::jsonb
         WHERE city_slug = $15`,
        [
          asText(restoredValues['trust_bar_stars']),
          asText(restoredValues['trust_bar_review_count']),
          asText(restoredValues['services_intro']),
          asJson(restoredValues['most_requested_services']),
          asText(restoredValues['mid_cta_text']),
          asText(restoredValues['video_heading']),
          asText(restoredValues['video_intro']),
          asText(restoredValues['video_script']),
          asJson(restoredValues['reviews']),
          asText(restoredValues['ndc_intro']),
          asText(restoredValues['final_cta_heading']),
          asText(restoredValues['final_cta_body']),
          asJson(restoredValues['why_points']),
          JSON.stringify(blocks),
          pageSlug,
        ]
      );

      // Fields still absent from the archive stay flagged as missing.
      missing = v2MissingFromBlocks(blocks);
    }

    await client.query('COMMIT');
    return { mapped, missing, restored };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ── Draft re-template (Brief 116, Track A) ───────────────────────────────────

export interface RetemplateDraftParams {
  draftId: number;
  toTemplate: string;
  switchedBy: number | null;
}

export interface RetemplateDraftResult {
  /** DB keys of target-template-only fields the migrated draft still lacks. */
  missing: string[];
  /** Content keys (draft camelCase) that were archived and dropped — no home in the target. */
  orphaned: string[];
  /** DB keys pre-filled from a previous stint on the target template. */
  restored: string[];
  /** The draft row's new optimistic-lock version — the editor MUST adopt this or its next save 409s. */
  version: number;
  templateType: CityTemplate;
}

/**
 * Brief 116 (Track A) — the previously-missing operation: re-stamp an existing
 * draft's `template_type` AND migrate its content the same way `switchTemplate`
 * migrates a live row, so the draft becomes publishable (DP-4) against a live
 * page on the new template. Transactional: archive → migrate → re-stamp, or
 * nothing at all.
 */
export async function retemplateDraft({
  draftId,
  toTemplate,
  switchedBy,
}: RetemplateDraftParams): Promise<RetemplateDraftResult> {
  if (!VALID_CITY_TEMPLATES.includes(toTemplate as CityTemplate)) {
    throw new Error(`Invalid template "${toTemplate}". Valid values: ${VALID_CITY_TEMPLATES.join(', ')}`);
  }
  const target = toTemplate as CityTemplate;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const res = await client.query(
      `SELECT * FROM page_drafts WHERE id = $1 FOR UPDATE`,
      [draftId]
    );
    const draft = res.rows[0];
    if (!draft) throw new NotFoundError(`Draft ${draftId} not found`);
    if (draft.page_type !== 'city') {
      throw new Error(`Draft ${draftId} is a "${draft.page_type}" draft — only city drafts have templates.`);
    }

    const content: Record<string, unknown> =
      draft.content && typeof draft.content === 'object'
        ? (draft.content as Record<string, unknown>)
        : {};
    const fromTemplate = (draft.template_type ??
      (typeof content.templateType === 'string' ? content.templateType : null) ??
      'coverage-area') as CityTemplate;

    if (fromTemplate === target) {
      throw new ConflictError(`This draft already uses the "${target}" template.`);
    }

    // For a V2 draft, `blocks` is authoritative for hero/FAQ content — fold it
    // into the flat camelCase fields first so the shared-field mapping carries
    // the freshest values (the flat fields can be stale snapshots).
    const working: Record<string, unknown> = { ...content };
    if (fromTemplate === 'local-office-v2') {
      const folded = cityV2BlocksToFields(content.blocks) as Record<string, unknown>;
      for (const camelKey of ['heroImage', 'heroHeadingLine1', 'heroDescription', 'faqs']) {
        if (!isEmptyFieldValue(folded[camelKey])) working[camelKey] = folded[camelKey];
      }
    }

    const map = mapContentBetweenTemplates(working, fromTemplate, target, 'camel');

    // Archive the draft's full pre-migration content (+ its orphans, which are
    // inside it) before touching anything — same non-destructive rule as the
    // live switch. `page_type='city-draft'` + `draft_id` keep these restore
    // records separate from live-page switches.
    await client.query(
      `INSERT INTO template_switch_archive
         (page_type, page_slug, from_template, to_template, archived_content, switched_by, draft_id)
       VALUES ('city-draft', $1, $2, $3, $4::jsonb, $5, $6)`,
      [draft.page_slug, fromTemplate, target, JSON.stringify(content), switchedBy, draftId]
    );

    // Track B restore, draft flavor: prefer this draft's own re-template history,
    // fall back to the live page's switch archive.
    const snapshot =
      (await getLatestTemplateArchive(client, {
        pageType: 'city',
        pageSlug: draft.page_slug,
        template: target,
        draftId,
      })) ??
      (await getLatestTemplateArchive(client, {
        pageType: 'city',
        pageSlug: draft.page_slug,
        template: target,
      }));

    let missing = [...map.missing];
    const restored: string[] = [];

    const newContent: Record<string, unknown> = {
      ...map.mapped,
      templateType: target,
      metaTitle: (content.metaTitle as string | null) ?? null,
      metaDescription: (content.metaDescription as string | null) ?? null,
    };

    if (target === 'local-office') {
      let line2 = asStringValue(working.heroHeadingLine2);
      if (line2 === null && snapshot) {
        line2 = asStringValue(snapshotFieldValue(snapshot, 'hero_heading_line2'));
        if (line2 !== null) restored.push('hero_heading_line2');
      }
      newContent.heroHeadingLine2 = line2 ?? '';
      missing = missing.filter((f) => f !== 'hero_heading_line2' || line2 === null);
    } else if (target === 'coverage-area') {
      // Not displayed by coverage-area, but preserved rather than destroyed —
      // mirrors the live switch.
      newContent.heroHeadingLine2 = (working.heroHeadingLine2 as string | null) ?? null;
    } else if (target === 'local-office-v2') {
      let snapshotBlocks = snapshot
        ? normalizeCityV2Blocks(snapshotFieldValue(snapshot, V2_BLOCKS_FIELD))
        : [];
      if (snapshotBlocks.length === 0 && snapshot) {
        snapshotBlocks = assembleCityV2Blocks(legacyFieldsFromSnapshot(snapshot));
      }
      let blocks = snapshotBlocks;
      if (blocks.length === 0) {
        // No previous V2 stint anywhere — a fresh canonical-order skeleton the
        // editor fills in (hero/FAQs seeded from the shared fields below).
        blocks = assembleCityV2Blocks({});
      }
      blocks = patchSharedIntoCityV2Blocks(blocks, {
        heroImage: map.mapped['heroImage'],
        heroHeadingLine1: map.mapped['heroHeadingLine1'],
        heroDescription: map.mapped['heroDescription'],
        faqs: map.mapped['faqs'],
      });
      newContent.blocks = blocks;
      if (snapshot) {
        // A draft snapshot holds V2 content only inside `blocks` (no flat
        // columns), so check both the snapshot's own fields and what its blocks
        // derive to when reporting which fields the restore recovered.
        const snapshotDerived = cityV2BlocksToFields(snapshotBlocks) as Record<string, unknown>;
        for (const field of LOCAL_OFFICE_V2_ONLY_FIELDS) {
          if (
            !isEmptyFieldValue(snapshotFieldValue(snapshot, field)) ||
            !isEmptyFieldValue(snapshotDerived[camelOf(field)])
          ) {
            restored.push(field);
          }
        }
      }
      missing = v2MissingFromBlocks(blocks);
    }

    const upd = await client.query<{ version: number }>(
      `UPDATE page_drafts
          SET template_type = $1, content = $2, version = version + 1
        WHERE id = $3
        RETURNING version`,
      [target, JSON.stringify(newContent), draftId]
    );

    await client.query('COMMIT');
    return {
      missing,
      orphaned: Object.keys(map.orphaned),
      restored,
      version: upd.rows[0].version,
      templateType: target,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
