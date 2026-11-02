/**
 * Brief 225 (Track C6) — load the Emergency Plumbing Hub v2 into the CMS: `/emergency-plumbing`'s singleton
 * row (`emergency_plumbing_page`) gets the Emergency Hub content in `v2_content`, and its pre-v2 content is
 * kept as a past version. The Brief 222 water heater seed, for this one page.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-emergency-v2-content.ts commit
 *   (`dry` previews; in the pipeline a missing choice exits non-zero — Brief 147.)
 *   Optional, local only: --check-url=http://localhost:3000 asserts the page answers 200 after writing.
 *
 * In order:
 *   1. The row already holds v2 content → "already seeded, no change". NOTHING is written, so a Marketing
 *      edit is never overwritten (this runs on EVERY deploy — fill-only).
 *   2. The existing row (production has one) → its current content is saved, verbatim, as the unpublished
 *      version "Pre-v2 archive (2026-11)" (once): the old editor's fields + `_archive.columns` (every column).
 *      It is old-shaped, so the publish path refuses it on this page (409) and the editor opens it read-only.
 *   3. No row at all (a fresh database only) → one is created with status 'draft'; the next step publishes it.
 *   4. The code module → "Version 1 — Emergency Hub v2" through `createDraft` (sanitised + layout-checked like
 *      an editor save, stamped `em-hub`) and `publishDraft` (status set by its one writer).
 *   5. Asserts: status 'published', v2 content present, exactly that version live.
 * Runs PRE-swap: the old build never reads `v2_content` (it keeps serving the legacy columns until the swap).
 *
 * Exit codes (Brief 186): non-zero ONLY for a code/schema fault or a write this run attempted that did not
 * land. Editor-causable state (Marketing unpublished the page, edited copy) is reported, exit 0.
 */
import pool from '../src/lib/db';
import { createDraft, publishDraft } from '../src/lib/cms/drafts';
import { EM_PAGE_TYPE, EM_PRE_V2_ARCHIVE_LABEL, EM_V2_MARKER, EM_V2_PATH, EM_V2_SLUG, type WhV2DraftContent } from '../src/lib/water-heater-v2-cms/model';
import { codeEmHubMeta, codeEmHubStored } from '../src/lib/water-heater-v2-cms/code-defaults';
import { inPipeline, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'seed-emergency-v2-content';
const argv = process.argv.slice(2);
const wantsCommit = argv.some((a) => ['commit', '--commit', 'apply', '--apply'].includes(a));
const wantsDry = argv.some((a) => ['dry', '--dry', 'dry-run', '--dry-run'].includes(a));
console.log(wantsCommit && !wantsDry ? 'APPLY — writing' : 'DRY RUN — nothing written');
const mode = resolveRunMode(SCRIPT, argv);
const checkUrl = argv.find((a) => a.startsWith('--check-url='))?.slice('--check-url='.length).replace(/\/$/, '');

const V2_LABEL = 'Version 1 — Emergency Hub v2';
/** The singleton, pinned by the lowest id exactly as every reader of it pins it (Brief 145). */
const PIN = 'id = (SELECT id FROM emergency_plumbing_page ORDER BY id LIMIT 1)';

function v2Content(): WhV2DraftContent {
  const m = codeEmHubMeta();
  return { template: EM_V2_MARKER, whV2: codeEmHubStored(), metaTitle: m.title, metaDescription: m.description };
}

/** The row's pre-v2 content in the OLD editor's shape (Brief 38 / Brief 159 baseline), plus every column verbatim. */
async function legacySnapshot(): Promise<Record<string, unknown>> {
  const raw = (await pool.query(`SELECT * FROM emergency_plumbing_page WHERE ${PIN}`)).rows[0] as Record<string, unknown>;
  const { v2_content: _drop, ...columns } = raw;
  void _drop;
  const editorShape = {
    heroHeading: raw.hero_heading, heroDescription: raw.hero_description, heroImage: raw.hero_image,
    fHeading: raw.f_heading, fBody: raw.f_body, fImage: raw.f_image,
    cardHeading: raw.card_heading, cardItems: raw.card_items ?? [],
    mapHeading: raw.map_heading, mapBody: raw.map_body,
    f2Heading: raw.f2_heading, f2Body: raw.f2_body, f2Image: raw.f2_image,
    f3Heading: raw.f3_heading, f3Body: raw.f3_body, f3Image: raw.f3_image,
    metaTitle: raw.meta_title, metaDescription: raw.meta_description,
  };
  return { ...editorShape, _archive: { table: 'emergency_plumbing_page', rowId: raw.id, rowVersion: raw.version, capturedAt: new Date().toISOString(), brief: 225, columns } };
}

type Outcome = 'already' | 'seeded' | 'would-seed' | 'unpublished' | 'failed';

async function seed(authorId: number): Promise<{ outcome: Outcome; detail: string }> {
  const row = (
    await pool.query<{ id: number; status: string; version: number; has_v2: boolean }>(
      `SELECT id, status, version, (v2_content IS NOT NULL) AS has_v2 FROM emergency_plumbing_page WHERE ${PIN}`
    )
  ).rows[0];
  if (row?.has_v2) {
    if (row.status !== 'published') return { outcome: 'unpublished', detail: `already seeded, no change — row is '${row.status}' (an editor unpublished it; left alone)` };
    return { outcome: 'already', detail: 'already seeded, no change' };
  }
  const archiveExists = row
    ? (await pool.query(`SELECT 1 FROM page_drafts WHERE page_type = $1 AND page_slug = $2 AND label = $3`, [EM_PAGE_TYPE, EM_V2_SLUG, EM_PRE_V2_ARCHIVE_LABEL])).rowCount! > 0
    : false;
  const plan = [
    row ? (archiveExists ? `archive "${EM_PRE_V2_ARCHIVE_LABEL}" already present` : `archive row ${row.id} as "${EM_PRE_V2_ARCHIVE_LABEL}"`) : 'create the row (status draft)',
    `create + publish "${V2_LABEL}"`,
  ].join('; ');
  if (mode === 'dry') return { outcome: 'would-seed', detail: `would ${plan}` };

  if (row && !archiveExists) {
    const snapshot = await legacySnapshot();
    await pool.query(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, base_version) VALUES ($1, $2, $3, $4, $5, $6)`,
      [EM_PAGE_TYPE, EM_V2_SLUG, EM_PRE_V2_ARCHIVE_LABEL, JSON.stringify(snapshot), authorId, row.version]
    );
  }
  if (!row) {
    // Fresh database only (production has the row). The legacy columns get the code module's words so the
    // row is never blank; `status` is 'draft' until publishDraft below sets it.
    const c = codeEmHubStored();
    await pool.query(
      `INSERT INTO emergency_plumbing_page (hero_heading, hero_description, f_heading, f_body, card_heading, map_heading, map_body, f2_heading, f2_body, f3_heading, f3_body, status)
       VALUES ($1, $2, '', '', '', '', '', '', '', '', '', 'draft')`,
      [c.hero.h1, c.hero.intro]
    );
  }
  const content = v2Content();
  const draft = await createDraft({ pageType: EM_PAGE_TYPE, pageSlug: EM_V2_SLUG, label: V2_LABEL, content, createdBy: authorId, templateType: 'em-hub' });
  await publishDraft(draft.id, authorId);

  const after = (
    await pool.query<{ status: string; has_v2: boolean; live_id: number | null }>(
      `SELECT t.status, (t.v2_content IS NOT NULL) AS has_v2,
              (SELECT id FROM page_drafts d WHERE d.page_type = $1 AND d.page_slug = $2 AND d.is_published) AS live_id
         FROM emergency_plumbing_page t WHERE ${PIN.replace(/^id/, 't.id')}`,
      [EM_PAGE_TYPE, EM_V2_SLUG]
    )
  ).rows[0];
  if (!after || after.status !== 'published' || !after.has_v2 || after.live_id !== draft.id) {
    return { outcome: 'failed', detail: `wrote but did not land: ${JSON.stringify(after)} (expected published, v2 content, live version ${draft.id})` };
  }
  return { outcome: 'seeded', detail: `${plan} → live version #${draft.id}` };
}

async function main() {
  console.log(`${SCRIPT} — Brief 225 Emergency Plumbing Hub v2 → CMS${inPipeline() ? ' [pipeline]' : ''}\n`);
  const authorId = (await pool.query<{ id: number }>(`SELECT id FROM cms_users ORDER BY id LIMIT 1`)).rows[0]?.id;
  if (!authorId) throw new Error('no cms_users row to author the versions');

  const r = await seed(authorId);
  console.log(`  ${EM_V2_PATH.padEnd(24)} ${r.outcome.toUpperCase().padEnd(11)} ${r.detail}`);
  let failed = r.outcome === 'failed' ? r.detail : '';

  if (!failed && checkUrl && mode === 'commit') {
    try {
      const res = await fetch(`${checkUrl}${EM_V2_PATH}`, { redirect: 'manual' });
      console.log(`  ${res.status === 200 ? 'ok  ' : 'FAIL'} ${EM_V2_PATH} → ${res.status}`);
      if (res.status !== 200) failed = `answered ${res.status}`;
    } catch (e) {
      failed = (e as Error).message;
    }
  }

  if (failed) {
    console.error(`\n!!!! ${SCRIPT}: the write did not land: ${failed}`);
    verdict(SCRIPT, 'FAILED', failed);
    process.exitCode = 1;
  } else if (r.outcome === 'would-seed') verdict(SCRIPT, 'NOT-APPLIED (dry run)', r.detail);
  else if (r.outcome === 'seeded') verdict(SCRIPT, 'APPLIED', r.detail);
  else verdict(SCRIPT, 'ALREADY-APPLIED', r.detail);
}

main()
  .catch((err) => {
    console.error(`\n!!!! ${SCRIPT} crashed:`, err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
