/**
 * Brief 204 (Track D1) — load today's Sewer v2 content into the CMS: the hub + 9 service pages + the
 * sections shared by all 10, archiving each existing row's pre-v2 content as a past version.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-sewer-v2-content.ts           # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-sewer-v2-content.ts --apply   # write
 *   (deploy.sh passes `commit`; in the pipeline a missing choice exits non-zero — Brief 147.)
 *   Optional, local only: --check-url=http://localhost:3000 asserts each page answers 200 after writing.
 *
 * Per page, in order:
 *   1. The row already holds v2 content → "already seeded, no change". NOTHING is written, so a
 *      Marketing edit is never overwritten (this runs on EVERY deploy — the Brief 202 trap).
 *   2. An existing row (5 of the 10 on the local dev DB: sewer, hydro-jetting, sewer-rodding,
 *      sewer-repair, sewer-maintenance) → its current content is saved, verbatim, as the unpublished
 *      version "Pre-v2 archive (2026-10)" (once; a re-run after a crash finds it and does not repeat).
 *   3. A missing row → created WITHOUT touching `status` (it defaults to 'draft', so the page would
 *      404 if nothing else happened — the next step publishes it; Brief 204 hard rule 3).
 *   4. The code module → a v2 version ("Version 1 — Sewer v2") through `createDraft` (sanitised and
 *      layout-checked like any editor save), published through `publishDraft` — so `status` is set by
 *      its one writer, `setLiveStatusInTx`, and the version history is correct.
 *   5. Asserts: status 'published', v2 content present, exactly that version live.
 *
 * Exit codes (Brief 186): non-zero ONLY for a code/schema fault or a write this run attempted that did
 * not land. Editor-causable state (a page Marketing unpublished, edited copy) is reported, exit 0.
 */
import pool from '../src/lib/db';
import { createDraft, publishDraft } from '../src/lib/cms/drafts';
import { assembleBlocks, normalizeBlocks, SUB_SERVICE_BLOCK_ORDER } from '../src/lib/cms/sub-service-blocks';
import { SEWER_V2_SERVICE_SLUGS } from '../src/lib/content/sewer-v2/routes';
import { SEWER_V2_PAGES } from '../src/lib/content/sewer-v2';
import {
  PRE_V2_ARCHIVE_LABEL,
  SEWER_V2_HUB_SLUG,
  SEWER_V2_TEMPLATE,
  type SewerServiceSlug,
  type SewerV2DraftContent,
} from '../src/lib/sewer-v2-cms/model';
import { codeHubMeta, codeHubStored, codeServiceMeta, codeServiceStored } from '../src/lib/sewer-v2-cms/code-defaults';
import { inPipeline, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'seed-sewer-v2-content';
const argv = process.argv.slice(2);
const wantsCommit = argv.some((a) => ['commit', '--commit', 'apply', '--apply'].includes(a));
const wantsDry = argv.some((a) => ['dry', '--dry', 'dry-run', '--dry-run'].includes(a));
// The mode is the FIRST line this script prints (Brief 204 hard rule 8).
console.log(wantsCommit && !wantsDry ? 'APPLY — writing' : 'DRY RUN — nothing written');
const mode = resolveRunMode(SCRIPT, argv);
const checkUrl = argv.find((a) => a.startsWith('--check-url='))?.slice('--check-url='.length).replace(/\/$/, '');

const V2_LABEL = 'Version 1 — Sewer v2';

interface Page {
  slug: string;
  pageType: 'service' | 'sub-service';
  table: 'service_category_pages' | 'sub_service_pages';
  path: string;
}
const PAGES: Page[] = [
  { slug: SEWER_V2_HUB_SLUG, pageType: 'service', table: 'service_category_pages', path: '/services/sewer' },
  ...SEWER_V2_SERVICE_SLUGS.map((slug): Page => ({ slug, pageType: 'sub-service', table: 'sub_service_pages', path: `/${slug}` })),
];

function v2ContentFor(p: Page): SewerV2DraftContent {
  if (p.slug === SEWER_V2_HUB_SLUG) {
    const m = codeHubMeta();
    return { template: SEWER_V2_TEMPLATE, sewerV2: codeHubStored(), metaTitle: m.title, metaDescription: m.description };
  }
  const m = codeServiceMeta(p.slug as SewerServiceSlug);
  return { template: SEWER_V2_TEMPLATE, sewerV2: codeServiceStored(p.slug as SewerServiceSlug), metaTitle: m.title, metaDescription: m.description };
}

/**
 * The row's pre-v2 content in the OLD editor's own shape (the same shapes Brief 159's baseline seed
 * snapshots), plus `_archive`: every column of the row verbatim, so nothing is lost even where the
 * editor shape is lossy.
 */
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
    const subcategories = (
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
  return {
    ...editorShape,
    _archive: { table: p.table, rowId: raw.id, rowVersion: raw.version, capturedAt: new Date().toISOString(), brief: 204, columns },
  };
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

  const aliases = p.pageType === 'service' ? ['service'] : ['sub-service'];
  const archiveExists = row
    ? (await pool.query(`SELECT 1 FROM page_drafts WHERE page_type = ANY($1) AND page_slug = $2 AND label = $3`, [aliases, p.slug, PRE_V2_ARCHIVE_LABEL])).rowCount! > 0
    : false;
  const plan = [
    row ? (archiveExists ? `archive "${PRE_V2_ARCHIVE_LABEL}" already present` : `archive row ${row.id} as "${PRE_V2_ARCHIVE_LABEL}"`) : 'create the row (status untouched)',
    `create + publish "${V2_LABEL}"`,
  ].join('; ');
  if (mode === 'dry') return { outcome: 'would-seed', detail: `would ${plan}` };

  // 2. archive the pre-v2 content (verbatim, unpublished).
  if (row && !archiveExists) {
    const snapshot = await legacySnapshot(p);
    await pool.query(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, base_version)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [p.pageType, p.slug, PRE_V2_ARCHIVE_LABEL, JSON.stringify(snapshot), authorId, row.version]
    );
  }
  // 3. create the missing row — `status` deliberately NOT set (column default 'draft').
  if (!row) {
    if (p.table !== 'sub_service_pages') throw new Error(`no ${p.table} row for "${p.slug}" — the hub row is expected to exist`);
    const m = codeServiceMeta(p.slug as SewerServiceSlug);
    const page = SEWER_V2_PAGES[p.slug as SewerServiceSlug];
    await pool.query(
      `INSERT INTO sub_service_pages (slug, title, hero_heading, hero_intro, parent_slug, created_by, created_at)
       VALUES ($1, $2, $3, $4, 'sewer', $5, NOW())`,
      [p.slug, m.title, page.hero.heading, page.hero.intro, authorId]
    );
  }
  // 4. the v2 version, through the same path an editor's save + publish takes.
  const draft = await createDraft({
    pageType: p.pageType, pageSlug: p.slug, label: V2_LABEL, content: v2ContentFor(p), createdBy: authorId, templateType: SEWER_V2_TEMPLATE,
  });
  await publishDraft(draft.id, authorId);

  // 5. assert what this run wrote actually landed.
  const after = (
    await pool.query<{ status: string; has_v2: boolean; live_id: number | null }>(
      `SELECT t.status, (t.v2_content IS NOT NULL) AS has_v2,
              (SELECT id FROM page_drafts d WHERE d.page_type = ANY($2) AND d.page_slug = t.slug AND d.is_published) AS live_id
         FROM ${p.table} t WHERE t.slug = $1`,
      [p.slug, aliases]
    )
  ).rows[0];
  if (!after || after.status !== 'published' || !after.has_v2 || after.live_id !== draft.id) {
    return { outcome: 'failed', detail: `wrote but did not land: ${JSON.stringify(after)} (expected published, v2 content, live version ${draft.id})` };
  }
  return { outcome: 'seeded', detail: `${plan} → live version #${draft.id}` };
}

async function checkUrls(): Promise<string[]> {
  const problems: string[] = [];
  for (const p of PAGES) {
    try {
      const r = await fetch(`${checkUrl}${p.path}`, { redirect: 'manual' });
      console.log(`  ${r.status === 200 ? 'ok  ' : 'FAIL'} ${p.path} → ${r.status}`);
      if (r.status !== 200) problems.push(`${p.path} answered ${r.status}`);
    } catch (e) {
      problems.push(`${p.path}: ${(e as Error).message}`);
    }
  }
  return problems;
}

async function main() {
  console.log(`${SCRIPT} — Brief 204 Sewer v2 → CMS${inPipeline() ? ' [pipeline]' : ''}\n`);
  const authorId = (await pool.query<{ id: number }>(`SELECT id FROM cms_users ORDER BY id LIMIT 1`)).rows[0]?.id;
  if (!authorId) throw new Error('no cms_users row to author the versions');

  const results: [Page, { outcome: Outcome; detail: string }][] = [];
  for (const p of PAGES) {
    const r = await seedPage(p, authorId);
    results.push([p, r]);
    console.log(`  ${p.path.padEnd(28)} ${r.outcome.toUpperCase().padEnd(11)} ${r.detail}`);
  }

  const failed = results.filter(([, r]) => r.outcome === 'failed');
  const seeded = results.filter(([, r]) => r.outcome === 'seeded').length;
  const unpublished = results.filter(([, r]) => r.outcome === 'unpublished');
  if (unpublished.length) {
    console.log(`\n  i ${unpublished.length} page(s) hold v2 content but are unpublished — editor state, left alone (they 404 until published in /admin).`);
  }

  if (checkUrl && mode === 'commit') {
    console.log(`\nURL check against ${checkUrl}:`);
    const problems = await checkUrls();
    if (problems.length) failed.push(...problems.map((m): [Page, { outcome: Outcome; detail: string }] => [PAGES[0], { outcome: 'failed', detail: m }]));
  }

  if (failed.length) {
    console.error(`\n!!!! ${SCRIPT}: ${failed.length} write(s) did not land:\n${failed.map(([p, r]) => `  ${p.path}: ${r.detail}`).join('\n')}`);
    verdict(SCRIPT, 'FAILED', `${failed.length} page(s) did not end up published with v2 content`);
    process.exitCode = 1;
  } else if (mode === 'dry') {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${results.filter(([, r]) => r.outcome === 'would-seed').length} page(s) would be seeded`);
  } else if (seeded === 0) {
    verdict(SCRIPT, 'ALREADY-APPLIED', 'already seeded, no change (all 10 hold v2 content)');
  } else {
    verdict(SCRIPT, 'APPLIED', `${seeded} page(s) seeded and published, ${results.length - seeded} already seeded`);
  }
}

main()
  .catch((err) => {
    console.error(`\n!!!! ${SCRIPT} crashed:`, err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
