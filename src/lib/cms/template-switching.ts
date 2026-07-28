import pool from '@/lib/db';

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
const COVERAGE_AREA_ONLY_FIELDS: readonly string[] = [];

// Brief 67 — V2-only DB columns. These carry no value from V1/coverage, so on a
// switch TO local-office-v2 they are reported as "missing" (the editor highlights
// them); on a switch AWAY from local-office-v2 they are reset (below).
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

type CityTemplate = 'coverage-area' | 'local-office' | 'local-office-v2';

const TEMPLATE_ONLY_FIELDS: Record<CityTemplate, readonly string[]> = {
  'local-office': LOCAL_OFFICE_ONLY_FIELDS,
  'coverage-area': COVERAGE_AREA_ONLY_FIELDS,
  'local-office-v2': LOCAL_OFFICE_V2_ONLY_FIELDS,
};

export const VALID_CITY_TEMPLATES: CityTemplate[] = ['coverage-area', 'local-office', 'local-office-v2'];

export interface SwitchTemplateParams {
  pageType: 'city';
  pageSlug: string;
  toTemplate: string;
  switchedBy: number | null;
}

export interface SwitchTemplateResult {
  mapped: Record<string, unknown>;
  missing: string[];
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

    // 4. Build mapped: carry over all shared fields
    const mapped: Record<string, unknown> = {};
    for (const field of CITY_SHARED_FIELDS) {
      mapped[field] = row[field] ?? '';
    }

    // 5. Determine which fields the new template needs that aren't in the shared set
    const missing: string[] = [...TEMPLATE_ONLY_FIELDS[toTemplate as CityTemplate]];

    // 6. Update the row: new template_type, shared values preserved, missing fields reset to ''
    const heroHeadingLine2 =
      toTemplate === 'local-office'
        ? '' // editor must fill this in
        : (row.hero_heading_line2 ?? null); // preserve for coverage-area (not displayed but don't destroy)

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
           why_points              = '[]'::jsonb
         WHERE city_slug = $1`,
        [pageSlug]
      );
    }

    await client.query('COMMIT');
    return { mapped, missing };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
