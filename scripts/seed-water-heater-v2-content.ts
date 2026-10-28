/**
 * Brief 222 (Track C6) — load the Water Heater Cluster v1 content into the CMS: the hub + 5 service pages +
 * the sections shared by all 6, archiving each existing row's pre-v2 content as a past version. The
 * Brief 204 sewer seed, for the water heater pages.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-water-heater-v2-content.ts commit
 *   … scripts/seed-water-heater-v2-content.ts commit --retire-residential   (ONLY the Track D3 step — deploy.sh runs it
 *     AFTER the build swap: before it, the old build still serves /residential-water-heater from that row)
 *   (`dry` previews; in the pipeline a missing choice exits non-zero — Brief 147.)
 *   Optional, local only: --check-url=http://localhost:3000 asserts each page answers 200 after writing.
 *
 * Per page, in order:
 *   1. The row already holds v2 content → "already seeded, no change". NOTHING is written, so a Marketing
 *      edit is never overwritten (this runs on EVERY deploy — fill-only).
 *   2. An existing row (production: the hub, tankless, commercial) → its current content is saved,
 *      verbatim, as the unpublished version "Pre-v2 archive (2026-10)" (once). It is old-shaped, so the
 *      publish path refuses it on these pages (409).
 *   3. A missing row (production: water-heater-repair / -installation / -maintenance, which had no row —
 *      Marketing approved creating them, 2026-10-28) → created WITHOUT touching `status` (column default
 *      'draft'); the next step publishes it.
 *   4. The code module → "Version 1 — Water Heater v2" through `createDraft` (sanitised + layout-checked
 *      like an editor save, stamped with its template version) and `publishDraft` (status set by its one
 *      writer).
 *   5. Asserts: status 'published', v2 content present, exactly that version live.
 * Then, ONCE (Track D3): `/residential-water-heater` now 301s to the hub, so its sub-service row is
 * unpublished through `unpublishDraft` (kept, not deleted). Marker: the changelog entry this step writes;
 * a later re-publish by an editor is never undone.
 *
 * Exit codes (Brief 186): non-zero ONLY for a code/schema fault or a write this run attempted that did not
 * land. Editor-causable state (a page Marketing unpublished, edited copy) is reported, exit 0.
 */
import pool from '../src/lib/db';
import { createDraft, publishDraft, unpublishDraft } from '../src/lib/cms/drafts';
import { assembleBlocks, normalizeBlocks, SUB_SERVICE_BLOCK_ORDER } from '../src/lib/cms/sub-service-blocks';
import {
  whPathFor,
  whTemplateOf,
  WH_PRE_V2_ARCHIVE_LABEL,
  WH_V2_HUB_SLUG,
  WH_V2_MARKER,
  WH_V2_SERVICE_SLUGS,
  type WhServiceSlug,
  type WhV2DraftContent,
} from '../src/lib/water-heater-v2-cms/model';
import { codeWhHubMeta, codeWhHubStored, codeWhServiceMeta, codeWhServiceStored, WH_PAGES } from '../src/lib/water-heater-v2-cms/code-defaults';
import { inPipeline, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'seed-water-heater-v2-content';
const argv = process.argv.slice(2);
const wantsCommit = argv.some((a) => ['commit', '--commit', 'apply', '--apply'].includes(a));
const wantsDry = argv.some((a) => ['dry', '--dry', 'dry-run', '--dry-run'].includes(a));
console.log(wantsCommit && !wantsDry ? 'APPLY — writing' : 'DRY RUN — nothing written');
const mode = resolveRunMode(SCRIPT, argv);
const retireOnly = argv.includes('--retire-residential');
const checkUrl = argv.find((a) => a.startsWith('--check-url='))?.slice('--check-url='.length).replace(/\/$/, '');

const V2_LABEL = 'Version 1 — Water Heater v2';
const RETIRED_SLUG = 'residential-water-heater';
const RETIRE_MARKER = 'brief-222-retire-residential-water-heater';

interface Page {
  slug: string;
  pageType: 'service' | 'sub-service';
  table: 'service_category_pages' | 'sub_service_pages';
  path: string;
}
const PAGES: Page[] = [
  { slug: WH_V2_HUB_SLUG, pageType: 'service', table: 'service_category_pages', path: whPathFor(WH_V2_HUB_SLUG) },
  ...WH_V2_SERVICE_SLUGS.map((slug): Page => ({ slug, pageType: 'sub-service', table: 'sub_service_pages', path: whPathFor(slug) })),
];

function v2ContentFor(p: Page): WhV2DraftContent {
  if (p.slug === WH_V2_HUB_SLUG) {
    const m = codeWhHubMeta();
    return { template: WH_V2_MARKER, whV2: codeWhHubStored(), metaTitle: m.title, metaDescription: m.description };
  }
  const m = codeWhServiceMeta(p.slug as WhServiceSlug);
  return { template: WH_V2_MARKER, whV2: codeWhServiceStored(p.slug as WhServiceSlug), metaTitle: m.title, metaDescription: m.description };
}

/** The row's pre-v2 content in the OLD editor's shape, plus `_archive`: every column verbatim. */
async function legacySnapshot(p: Page): Promise<Record<string, unknown>> {
  const raw = (await pool.query(`SELECT * FROM ${p.table} WHERE slug = $1`, [p.slug])).rows[0] as Record<string, unknown>;
  const { v2_content: _drop, ...columns } = raw;
  void _drop;
  let editorShape: Record<string, unknown>;
  if (p.table === 'sub_service_pages') {
    const existing = normalizeBlocks(raw.blocks);
    const blocks =
      existing.length > 0
        ? existing
        : assembleBlocks(
            {
              slug: '',
              heroImage: (raw.hero_image as string) ?? null,
              heroHeading: (raw.hero_heading as string) ?? null,
              heroIntro: (raw.hero_intro as string) ?? null,
              introHeading: (raw.intro_heading as string) ?? null,
              introBody: (raw.intro_body as string) ?? null,
              fImage: (raw.f_image as string) ?? null,
              problemsHeading: (raw.problems_heading as string) ?? null,
              problemsItems: Array.isArray(raw.problems_items) ? (raw.problems_items as string[]) : [],
              ndcTitle: (raw.ndc_title as string) ?? null,
              ndcBody: (raw.ndc_body as string) ?? null,
              ctaHeading: (raw.cta_heading as string) ?? null,
              ctaBody: (raw.cta_body as string) ?? null,
              f3Image: (raw.f3_image as string) ?? null,
            } as Parameters<typeof assembleBlocks>[0],
            SUB_SERVICE_BLOCK_ORDER
          );
    editorShape = { title: raw.title, metaTitle: raw.meta_title, metaDescription: raw.meta_description, blocks };
  } else {
    const subcategories =
      (
        await pool.query(
          `SELECT COALESCE(jsonb_agg(jsonb_build_object('label', item->>'label', 'href', item->>'href',
                    'description', item->>'desc', 'image', COALESCE(item->>'image', ''))), '[]'::jsonb) AS s
             FROM ${p.table} p, jsonb_array_elements(COALESCE(p.blocks, '[]'::jsonb)) blk,
                  jsonb_array_elements(COALESCE(blk->'data'->'items', '[]'::jsonb)) item
            WHERE p.slug = $1 AND blk->>'type' = 'serviceSubcategories'`,
          [p.slug]
        )
      ).rows[0]?.s ?? [];
    editorShape = {
      hero_heading: raw.hero_heading, hero_intro: raw.hero_intro, hero_image: raw.hero_image,
      intro_heading: raw.intro_heading, intro_body: raw.intro_body, f_image: raw.f_image,
      problems_heading: raw.problems_heading, problems_items: raw.problems_items ?? [],
      subcategories_heading: raw.subcategories_heading, preventative_heading: raw.preventative_heading,
      preventative_body: raw.preventative_body, final_pitch_tagline: raw.final_pitch_tagline,
      final_pitch_body: raw.final_pitch_body, f3_image: raw.f3_image,
      articles_featured_slugs: raw.articles_featured_slugs ?? [], subcategories,
      meta_title: raw.meta_title, meta_description: raw.meta_description,
    };
  }
  return { ...editorShape, _archive: { table: p.table, rowId: raw.id, rowVersion: raw.version, capturedAt: new Date().toISOString(), brief: 222, columns } };
}

type Outcome = 'already' | 'seeded' | 'would-seed' | 'unpublished' | 'failed';

async function seedPage(p: Page, authorId: number): Promise<{ outcome: Outcome; detail: string }> {
  const row = (
    await pool.query<{ id: number; status: string; version: number; has_v2: boolean }>(
      `SELECT id, status, version, (v2_content IS NOT NULL) AS has_v2 FROM ${p.table} WHERE slug = $1`,
      [p.slug]
    )
  ).rows[0];
  if (row?.has_v2) {
    if (row.status !== 'published') return { outcome: 'unpublished', detail: `already seeded, no change — row is '${row.status}' (an editor unpublished it; left alone)` };
    return { outcome: 'already', detail: 'already seeded, no change' };
  }
  const archiveExists = row
    ? (await pool.query(`SELECT 1 FROM page_drafts WHERE page_type = $1 AND page_slug = $2 AND label = $3`, [p.pageType, p.slug, WH_PRE_V2_ARCHIVE_LABEL])).rowCount! > 0
    : false;
  const plan = [
    row ? (archiveExists ? `archive "${WH_PRE_V2_ARCHIVE_LABEL}" already present` : `archive row ${row.id} as "${WH_PRE_V2_ARCHIVE_LABEL}"`) : 'create the row (status untouched)',
    `create + publish "${V2_LABEL}"`,
  ].join('; ');
  if (mode === 'dry') return { outcome: 'would-seed', detail: `would ${plan}` };

  if (row && !archiveExists) {
    const snapshot = await legacySnapshot(p);
    await pool.query(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, base_version) VALUES ($1, $2, $3, $4, $5, $6)`,
      [p.pageType, p.slug, WH_PRE_V2_ARCHIVE_LABEL, JSON.stringify(snapshot), authorId, row.version]
    );
  }
  if (!row) {
    if (p.table !== 'sub_service_pages') throw new Error(`no ${p.table} row for "${p.slug}" — the hub row is expected to exist`);
    const m = codeWhServiceMeta(p.slug as WhServiceSlug);
    const page = WH_PAGES[p.slug as WhServiceSlug];
    await pool.query(
      `INSERT INTO sub_service_pages (slug, title, hero_heading, hero_intro, parent_slug, created_by, created_at)
       VALUES ($1, $2, $3, $4, 'water-heater', $5, NOW())`,
      [p.slug, m.title, page.hero.h1, page.hero.intro, authorId]
    );
  }
  const content = v2ContentFor(p);
  const draft = await createDraft({ pageType: p.pageType, pageSlug: p.slug, label: V2_LABEL, content, createdBy: authorId, templateType: whTemplateOf(content) });
  await publishDraft(draft.id, authorId);

  const after = (
    await pool.query<{ status: string; has_v2: boolean; live_id: number | null }>(
      `SELECT t.status, (t.v2_content IS NOT NULL) AS has_v2,
              (SELECT id FROM page_drafts d WHERE d.page_type = $2 AND d.page_slug = t.slug AND d.is_published) AS live_id
         FROM ${p.table} t WHERE t.slug = $1`,
      [p.slug, p.pageType]
    )
  ).rows[0];
  if (!after || after.status !== 'published' || !after.has_v2 || after.live_id !== draft.id) {
    return { outcome: 'failed', detail: `wrote but did not land: ${JSON.stringify(after)} (expected published, v2 content, live version ${draft.id})` };
  }
  return { outcome: 'seeded', detail: `${plan} → live version #${draft.id}` };
}

/** Track D3: unpublish the retired `/residential-water-heater` row once (it 301s to the hub now). */
async function retireResidential(authorId: number): Promise<{ outcome: 'already' | 'applied' | 'would' | 'skipped' | 'failed'; detail: string }> {
  const marker = (await pool.query(`SELECT 1 FROM page_changelog WHERE page_type = 'sub-service' AND page_slug = $1 AND snapshot->>'marker' = $2`, [RETIRED_SLUG, RETIRE_MARKER])).rowCount! > 0;
  if (marker) return { outcome: 'already', detail: 'already retired once (an editor may have re-published it since — left alone)' };
  const row = (await pool.query<{ status: string }>(`SELECT status FROM sub_service_pages WHERE slug = $1`, [RETIRED_SLUG])).rows[0];
  if (!row) return { outcome: 'skipped', detail: 'no row — nothing to unpublish' };
  const live = (await pool.query<{ id: number }>(`SELECT id FROM page_drafts WHERE page_type = 'sub-service' AND page_slug = $1 AND is_published`, [RETIRED_SLUG])).rows[0];
  if (row.status !== 'published' && !live) {
    if (mode === 'commit') await pool.query(`INSERT INTO page_changelog (page_type, page_slug, changed_by, snapshot) VALUES ('sub-service', $1, $2, $3)`, [RETIRED_SLUG, authorId, JSON.stringify({ marker: RETIRE_MARKER, note: 'already not published' })]);
    return { outcome: mode === 'commit' ? 'applied' : 'would', detail: `row is already '${row.status}'` };
  }
  if (!live) return { outcome: 'skipped', detail: 'published but no live version (seed-brief-159-baseline-versions gives it one; next deploy retries)' };
  if (mode === 'dry') return { outcome: 'would', detail: `would unpublish live version #${live.id} (row kept)` };
  try {
    await unpublishDraft(live.id, authorId);
  } catch (err) {
    // A guard refusal (e.g. the page became a redirect target) is content state, not a code fault (Brief 186).
    return { outcome: 'skipped', detail: `not unpublished: ${err instanceof Error ? err.message : String(err)}` };
  }
  await pool.query(`INSERT INTO page_changelog (page_type, page_slug, changed_by, snapshot) VALUES ('sub-service', $1, $2, $3)`, [RETIRED_SLUG, authorId, JSON.stringify({ marker: RETIRE_MARKER, unpublished_draft: live.id })]);
  const after = (await pool.query<{ status: string }>(`SELECT status FROM sub_service_pages WHERE slug = $1`, [RETIRED_SLUG])).rows[0];
  return after?.status === 'published' ? { outcome: 'failed', detail: 'unpublish did not land' } : { outcome: 'applied', detail: `unpublished live version #${live.id}; row kept` };
}

async function main() {
  console.log(`${SCRIPT} — Brief 222 Water Heater Cluster v1 → CMS${inPipeline() ? ' [pipeline]' : ''}\n`);
  const authorId = (await pool.query<{ id: number }>(`SELECT id FROM cms_users ORDER BY id LIMIT 1`)).rows[0]?.id;
  if (!authorId) throw new Error('no cms_users row to author the versions');

  const results: [string, { outcome: string; detail: string }][] = [];
  if (retireOnly) {
    const retire = await retireResidential(authorId);
    console.log(`  ${`/${RETIRED_SLUG} (retire)`.padEnd(30)} ${retire.outcome.toUpperCase().padEnd(11)} ${retire.detail}`);
    if (retire.outcome === 'failed') {
      verdict(SCRIPT, 'FAILED', retire.detail);
      process.exitCode = 1;
    } else verdict(SCRIPT, retire.outcome === 'applied' ? 'APPLIED' : retire.outcome === 'would' ? 'NOT-APPLIED (dry run)' : 'ALREADY-APPLIED', `retire /${RETIRED_SLUG}: ${retire.detail}`);
    return;
  }
  for (const p of PAGES) {
    const r = await seedPage(p, authorId);
    results.push([p.path, r]);
    console.log(`  ${p.path.padEnd(30)} ${r.outcome.toUpperCase().padEnd(11)} ${r.detail}`);
  }
  console.log(`  ${`/${RETIRED_SLUG} (retire)`.padEnd(30)} NOT-RUN     runs after the build swap (--retire-residential)`);

  if (checkUrl && mode === 'commit') {
    console.log(`\nURL check against ${checkUrl}:`);
    for (const p of PAGES) {
      try {
        const r = await fetch(`${checkUrl}${p.path}`, { redirect: 'manual' });
        console.log(`  ${r.status === 200 ? 'ok  ' : 'FAIL'} ${p.path} → ${r.status}`);
        if (r.status !== 200) results.push([p.path, { outcome: 'failed', detail: `answered ${r.status}` }]);
      } catch (e) {
        results.push([p.path, { outcome: 'failed', detail: (e as Error).message }]);
      }
    }
  }

  const failed = results.filter(([, r]) => r.outcome === 'failed');
  const seeded = results.filter(([, r]) => r.outcome === 'seeded').length;
  if (failed.length) {
    console.error(`\n!!!! ${SCRIPT}: ${failed.length} write(s) did not land:\n${failed.map(([p, r]) => `  ${p}: ${r.detail}`).join('\n')}`);
    verdict(SCRIPT, 'FAILED', `${failed.length} write(s) did not land`);
    process.exitCode = 1;
  } else if (mode === 'dry') {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${results.filter(([, r]) => r.outcome === 'would-seed').length} page(s) would be seeded`);
  } else if (seeded === 0) {
    verdict(SCRIPT, 'ALREADY-APPLIED', 'already seeded, no change (all 6 hold v2 content)');
  } else {
    verdict(SCRIPT, 'APPLIED', `${seeded} page(s) seeded and published, ${PAGES.length - seeded} already seeded`);
  }
}

main()
  .catch((err) => {
    console.error(`\n!!!! ${SCRIPT} crashed:`, err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
