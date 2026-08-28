/**
 * Brief 159 (Track A3) — give every page a baseline version, and say which one
 * is live.
 *
 * Before this brief most pages had ZERO versions, and the handful that had some
 * had no way to record which one the public was actually seeing (`publishDraft`
 * COPIED content into the live row and marked nothing). After Track A1 the
 * question has an answer — `page_drafts.is_published` — and this script fills it
 * in for the existing corpus:
 *
 *   • a page with at least one version that has ever been published
 *       → mark the MOST RECENTLY published one `is_published = TRUE`.
 *         Nothing is created; that version's content is what went live last.
 *   • a page with versions but none ever published, or with no versions at all
 *       → create ONE version labelled "Version 1 — live" from the live row's
 *         current content, mark it published, and set its `base_version` to the
 *         live row's current `version` so the Brief 75 staleness guard starts
 *         clean instead of instantly false-positiving.
 *
 * HARD RULES OBSERVED
 *   • Never overwrites an existing version's content.
 *   • Never touches an image column (the created version is a verbatim snapshot
 *     of the live row, images included — it is not a transform).
 *   • Never sets a content row's `status`. That column has exactly one writer
 *     (`setLiveStatusInTx`), and every row is already 'published' after the
 *     migration — a seed that touched it would be the second door this brief
 *     exists to prevent.
 *   • Idempotent, fill-gaps-only: a second run reports zero changes.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/seed-brief-159-baseline-versions.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool, PoolClient } from 'pg';
import { announceMode, resolveRunMode, verdict } from './lib/run-mode';
import {
  SUB_SERVICE_BLOCK_ORDER,
  assembleBlocks,
  normalizeBlocks,
} from '../src/lib/cms/sub-service-blocks';

const SCRIPT = 'seed-brief-159-baseline-versions';
const mode = resolveRunMode(SCRIPT);
announceMode(SCRIPT, mode);

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const BASELINE_LABEL = 'Version 1 — live';

/**
 * One live content table, and how to turn its rows into (pageType, pageSlug,
 * content) triples. `pageType` is the CANONICAL value — the one today's editors
 * actually write — so a baseline version created here is the same page as the
 * versions the editor will create tomorrow.
 *
 * ─── The content shape is NOT the row shape ────────────────────────────────
 * `content` must be the EXACT payload the page type's editor authors, because
 * two things consume it and neither reads database columns:
 *
 *   • the editor, when you switch to this version (Track C1) — the city editor's
 *     `formFromApi` reads `heroCallout`, not `hero_callout`;
 *   • `publishDraft`'s writer, when you publish it — `updateCityCmsContent`
 *     takes a `CityCmsUpdatePayload`, also camelCase.
 *
 * A `to_jsonb(row)` dump looks right and is wrong for five of these seven page
 * types: switching to the baseline would blank the form, and publishing it would
 * write a payload of unrecognised keys onto the live row. So every projection
 * below is written out by hand against the editor's `getContent()`. If an editor
 * gains a field, add it here in the same change.
 *
 * The projections are SQL rather than TypeScript calls into the CMS readers for
 * one reason: `city_service_pages` has 9,738 rows, and a per-row round trip
 * through `getCityServiceCmsContent` would take minutes on every deploy.
 */
interface PageTypeSpec {
  pageType: string;
  table: string;
  /** SQL producing (slug, version, content-json) for every live row. */
  sql: string;
}

const SPECS: PageTypeSpec[] = [
  {
    // Shape: buildCityPayload / formFromApi in src/app/admin/city/[slug]/page.tsx.
    // `blocks` is included ONLY for local-office-v2: the writer treats its
    // presence as "this save is authoritative for the V2 block model", so a V1
    // payload must not carry even an empty array.
    pageType: 'city',
    table: 'city_pages',
    sql: `SELECT city_slug AS slug, version,
                 jsonb_build_object(
                   'templateType',      COALESCE(template_type, 'coverage-area'),
                   'heroImage',         hero_image,
                   'heroHeadingLine1',  hero_heading_line1,
                   'heroHeadingLine2',  hero_heading_line2,
                   'heroCallout',       hero_callout,
                   'heroDescription',   hero_description,
                   'contentHeading',    content_heading,
                   'contentBody',       content_body,
                   'f2Heading',         f2_heading,
                   'f2Body',            f2_body,
                   'faqs',              COALESCE(faqs, '[]'::jsonb),
                   'metaTitle',         meta_title,
                   'metaDescription',   meta_description
                 )
                 || CASE WHEN template_type = 'local-office-v2'
                         THEN jsonb_build_object('blocks', COALESCE(blocks, '[]'::jsonb))
                         ELSE '{}'::jsonb END AS content
            FROM city_pages ORDER BY city_slug`,
  },
  {
    // Shape: the getContent() literal in src/app/admin/[slug]/page.tsx.
    // `service_area_*` and `tiktok_headline` are SITE-WIDE (global_content), not
    // per-page; they are in the editor's payload, so they are in the snapshot.
    // `subcategories` is the editor's flat form of the `serviceSubcategories`
    // block (Brief 98) — label/href/description/image.
    pageType: 'service',
    table: 'service_category_pages',
    sql: `SELECT p.slug, p.version,
                 jsonb_build_object(
                   'hero_heading',            p.hero_heading,
                   'hero_intro',              p.hero_intro,
                   'hero_image',              p.hero_image,
                   'intro_heading',           p.intro_heading,
                   'intro_body',              p.intro_body,
                   'f_image',                 p.f_image,
                   'problems_heading',        p.problems_heading,
                   'problems_items',          COALESCE(p.problems_items, '[]'::jsonb),
                   'subcategories_heading',   p.subcategories_heading,
                   'preventative_heading',    p.preventative_heading,
                   'preventative_body',       p.preventative_body,
                   'final_pitch_tagline',     p.final_pitch_tagline,
                   'final_pitch_body',        p.final_pitch_body,
                   'f3_image',                p.f3_image,
                   'articles_featured_slugs', COALESCE(p.articles_featured_slugs, '[]'::jsonb),
                   'service_area_heading',    g.service_area_heading,
                   'service_area_body',       g.service_area_body,
                   'tiktok_headline',         g.tiktok_headline,
                   'subcategories',           COALESCE((
                      SELECT jsonb_agg(jsonb_build_object(
                               'label',       item->>'label',
                               'href',        item->>'href',
                               'description', item->>'desc',
                               'image',       COALESCE(item->>'image', '')))
                        FROM jsonb_array_elements(p.blocks) blk,
                             jsonb_array_elements(COALESCE(blk->'data'->'items', '[]'::jsonb)) item
                       WHERE blk->>'type' = 'serviceSubcategories'
                   ), '[]'::jsonb),
                   'meta_title',              p.meta_title,
                   'meta_description',        p.meta_description
                 ) AS content
            FROM service_category_pages p
            LEFT JOIN LATERAL (SELECT * FROM global_content LIMIT 1) g ON TRUE
           ORDER BY p.slug`,
  },
  {
    // Shape: the getContent() literal in src/app/admin/sub-service/[slug]/page.tsx.
    // Brief 159 removed `status` from that payload — status is derived now.
    //
    // `blocks` needs a TypeScript step, so this spec carries no usable `blocks`
    // key and `synthesizeSubServiceBlocks` below fills it in. 19 of the 22 rows
    // have a NULL `blocks` column: they pre-date Brief 90 and render through the
    // reader's fallback, which SYNTHESISES one block instance per type from the
    // named columns. Snapshotting the raw column for those would produce a
    // baseline version holding no content at all — the form would open empty and
    // publishing it would blank the page. The fallback lives in
    // `assembleBlocks`, which is TypeScript, and there are only 22 rows, so this
    // page type is the one that pays for a per-row round trip.
    pageType: 'sub-service',
    table: 'sub_service_pages',
    sql: `SELECT slug, version,
                 jsonb_build_object(
                   'title',           title,
                   'metaTitle',       meta_title,
                   'metaDescription', meta_description,
                   'blocks',          blocks,
                   'heroImage',       hero_image,
                   'heroHeading',     hero_heading,
                   'heroIntro',       hero_intro,
                   'introHeading',    intro_heading,
                   'introBody',       intro_body,
                   'fImage',          f_image,
                   'problemsHeading', problems_heading,
                   'problemsItems',   COALESCE(problems_items, '[]'::jsonb),
                   'ndcTitle',        ndc_title,
                   'ndcBody',         ndc_body,
                   'ctaHeading',      cta_heading,
                   'ctaBody',         cta_body,
                   'f3Image',         f3_image
                 ) AS content
            FROM sub_service_pages ORDER BY slug`,
  },
  {
    // Shape: buildPayload() in src/app/admin/city-service/[city]/[service]/page.tsx.
    pageType: 'city-service',
    table: 'city_service_pages',
    sql: `SELECT city_slug || '/' || service_slug AS slug, version,
                 jsonb_build_object(
                   'serviceIntroHeading',    service_intro_heading,
                   'serviceIntroParagraphs', COALESCE(service_intro_paragraphs, '[]'::jsonb),
                   'serviceIntroImage',      service_intro_image,
                   'secondaryHeading',       secondary_heading,
                   'secondaryParagraphs',    COALESCE(secondary_paragraphs, '[]'::jsonb),
                   'secondaryImage',         secondary_image,
                   'faqs',                   COALESCE(faqs, '[]'::jsonb),
                   'metaTitle',              meta_title,
                   'metaDescription',        meta_description,
                   'parentSlug',             parent_slug
                 ) AS content
            FROM city_service_pages ORDER BY city_slug, service_slug`,
  },
  {
    // Shape: the getContent() literal in src/app/admin/emergency-plumbing/page.tsx.
    // Brief 145 (Track D): address this singleton by the lowest id, exactly as
    // the reader and getLivePageState do.
    pageType: 'emergency-plumbing',
    table: 'emergency_plumbing_page',
    sql: `SELECT 'emergency-plumbing'::text AS slug, version,
                 jsonb_build_object(
                   'heroHeading',     hero_heading,
                   'heroDescription', hero_description,
                   'heroImage',       hero_image,
                   'fHeading',        f_heading,
                   'fBody',           f_body,
                   'fImage',          f_image,
                   'cardHeading',     card_heading,
                   'cardItems',       COALESCE(card_items, '[]'::jsonb),
                   'mapHeading',      map_heading,
                   'mapBody',         map_body,
                   'f2Heading',       f2_heading,
                   'f2Body',          f2_body,
                   'f2Image',         f2_image,
                   'f3Heading',       f3_heading,
                   'f3Body',          f3_body,
                   'f3Image',         f3_image,
                   'metaTitle',       meta_title,
                   'metaDescription', meta_description
                 ) AS content
            FROM emergency_plumbing_page ORDER BY id LIMIT 1`,
  },
  {
    // Shape: buildPayload()/getContent() in the nine main-page editors — the
    // `content` JSONB blob itself, plus the two meta columns beside it. That is
    // exactly what `updateMainPage` splits back apart on publish.
    pageType: 'main',
    table: 'main_pages',
    sql: `SELECT slug, version,
                 COALESCE(content, '{}'::jsonb)
                 || jsonb_build_object('meta_title', meta_title, 'meta_description', meta_description)
                   AS content
            FROM main_pages ORDER BY slug`,
  },
  {
    // Shape: the getContent() literal in src/app/admin/articles/[slug]/page.tsx.
    // `body` is stored as `{html}` and edited as a plain string; `category` is
    // the column behind the editor's `categories`.
    // Articles have no `version` column — base_version stays null and the DP-2
    // guard stays skipped for them, exactly as `getLivePageState` already does.
    pageType: 'article',
    table: 'cms_articles',
    sql: `SELECT slug, NULL::int AS version,
                 jsonb_build_object(
                   'title',           title,
                   'excerpt',         excerpt,
                   'body',            body->>'html',
                   'image',           image,
                   'categories',      COALESCE(to_jsonb(category), '[]'::jsonb),
                   'metaTitle',       meta_title,
                   'metaDescription', meta_description
                 ) AS content
            FROM cms_articles ORDER BY slug`,
  },
];

/**
 * Brief 159 (Track A3) — turn a sub-service row into the editor's exact payload.
 *
 * The `blocks` array is the authoritative content for these pages (Brief 90),
 * but 19 of the 22 rows still have a NULL column and render through the reader's
 * FALLBACK, which synthesises one instance per type from the named columns. This
 * calls the very same `assembleBlocks` the reader and the editor's load call, so
 * the baseline version holds what the editor would show — not an empty array.
 *
 * The extra named-column keys the SQL selected are dropped afterwards: they are
 * inputs to this function, not part of the editor's payload.
 */
function synthesizeSubServiceBlocks(raw: Record<string, unknown>): Record<string, unknown> {
  const existing = normalizeBlocks(raw.blocks);
  const blocks =
    existing.length > 0
      ? existing
      : assembleBlocks(
          {
            slug: '',
            heroImage: (raw.heroImage as string) ?? null,
            heroHeading: (raw.heroHeading as string) ?? null,
            heroIntro: (raw.heroIntro as string) ?? null,
            introHeading: (raw.introHeading as string) ?? null,
            introBody: (raw.introBody as string) ?? null,
            fImage: (raw.fImage as string) ?? null,
            problemsHeading: (raw.problemsHeading as string) ?? null,
            problemsItems: Array.isArray(raw.problemsItems) ? (raw.problemsItems as string[]) : [],
            ndcTitle: (raw.ndcTitle as string) ?? null,
            ndcBody: (raw.ndcBody as string) ?? null,
            ctaHeading: (raw.ctaHeading as string) ?? null,
            ctaBody: (raw.ctaBody as string) ?? null,
            f3Image: (raw.f3Image as string) ?? null,
          } as Parameters<typeof assembleBlocks>[0],
          SUB_SERVICE_BLOCK_ORDER
        );
  return {
    title: raw.title,
    metaTitle: raw.metaTitle,
    metaDescription: raw.metaDescription,
    blocks,
  };
}

/** Legacy page_type aliases that address the same page as a canonical type. */
const ALIASES: Readonly<Record<string, string[]>> = {
  city: ['city', 'city-coverage', 'city-local', 'local-office-v2'],
  main: ['main', 'financing', 'customer-stories', 'help-and-support', 'locations'],
};
const aliasesFor = (pt: string) => ALIASES[pt] ?? [pt];

interface Tally { marked: number; created: number; skipped: number }

async function seedPageType(client: PoolClient, spec: PageTypeSpec, authorId: number): Promise<Tally> {
  const tally: Tally = { marked: 0, created: 0, skipped: 0 };
  const rows = (await client.query<{ slug: string; version: number | null; content: unknown }>(spec.sql)).rows;

  // One query per page type rather than per page — the city-service table has
  // 9,738 rows and a per-row round trip would take minutes.
  const drafts = (await client.query<{
    id: number; page_type: string; page_slug: string; published_at: string | null; is_published: boolean;
  }>(
    `SELECT id, page_type, page_slug, published_at, is_published
       FROM page_drafts WHERE page_type = ANY($1) ORDER BY page_slug, published_at DESC NULLS LAST, id DESC`,
    [aliasesFor(spec.pageType)]
  )).rows;

  const bySlug = new Map<string, typeof drafts>();
  for (const d of drafts) {
    if (!bySlug.has(d.page_slug)) bySlug.set(d.page_slug, []);
    bySlug.get(d.page_slug)!.push(d);
  }

  for (const row of rows) {
    const existing = bySlug.get(row.slug) ?? [];

    // Already answered — a previous run, or a publish since the migration.
    if (existing.some((d) => d.is_published)) { tally.skipped++; continue; }

    // A version that has actually been live before is the truthful baseline; the
    // ordering above already put the most recently published one first.
    const everPublished = existing.find((d) => d.published_at !== null);
    if (everPublished) {
      if (mode === 'commit') {
        await client.query(`UPDATE page_drafts SET is_published = TRUE WHERE id = $1`, [everPublished.id]);
      }
      tally.marked++;
      continue;
    }

    // Sub-service payloads need a TypeScript step for `blocks` — see
    // synthesizeSubServiceBlocks.
    const content =
      spec.pageType === 'sub-service'
        ? synthesizeSubServiceBlocks(row.content as Record<string, unknown>)
        : row.content;

    // No version has ever been live: snapshot the live row as the baseline.
    if (mode === 'commit') {
      await client.query(
        `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, base_version, is_published, published_at)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())`,
        [spec.pageType, row.slug, BASELINE_LABEL, JSON.stringify(content), authorId, row.version]
      );
    }
    tally.created++;
  }
  return tally;
}

async function main() {
  const authorId = (await pool.query<{ id: number }>(`SELECT id FROM cms_users ORDER BY id LIMIT 1`)).rows[0]?.id;
  if (!authorId) throw new Error('no cms_users row to attribute the baseline versions to');

  const client = await pool.connect();
  const totals: Record<string, Tally> = {};
  try {
    await client.query('BEGIN');
    for (const spec of SPECS) {
      totals[spec.pageType] = await seedPageType(client, spec, authorId);
    }
    if (mode === 'commit') await client.query('COMMIT');
    else await client.query('ROLLBACK');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log('\nPer page type — marked / created / skipped');
  let marked = 0, created = 0, skipped = 0;
  for (const [pt, t] of Object.entries(totals)) {
    console.log(`  ${pt.padEnd(20)} marked=${String(t.marked).padStart(5)}  created=${String(t.created).padStart(5)}  skipped=${String(t.skipped).padStart(5)}`);
    marked += t.marked; created += t.created; skipped += t.skipped;
  }
  console.log(`  ${'TOTAL'.padEnd(20)} marked=${String(marked).padStart(5)}  created=${String(created).padStart(5)}  skipped=${String(skipped).padStart(5)}`);

  if (mode === 'dry') {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${marked + created} page(s) would gain a live version`);
  } else if (marked + created === 0) {
    verdict(SCRIPT, 'ALREADY-APPLIED', `every page already has a live version (${skipped} skipped)`);
  } else {
    verdict(SCRIPT, 'APPLIED', `${marked} marked, ${created} created`);
  }
}

main()
  .catch((e) => {
    console.error(`\n${SCRIPT} FAILED: ${e instanceof Error ? e.message : String(e)}`);
    verdict(SCRIPT, 'FAILED', e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
