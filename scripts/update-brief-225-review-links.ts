/**
 * Brief 225 follow-up (Marketing 2026-11-03) — link each reviewer's name on `/emergency-plumbing` to their
 * Google review. The code module (src/lib/content/emergency-v2/hub.ts) already carries the links, but the
 * live page renders from `emergency_plumbing_page.v2_content`, seeded on deploy #175 with every link blank.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-225-review-links.ts          # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/update-brief-225-review-links.ts commit   # apply
 *
 * The Brief 216 / 221 pattern: the live content is patched (only the three `href`s), run through the
 * editor's own checks (`createDraft`), saved as a NEW VERSION and PUBLISHED — the previous version stays
 * in history and can be restored. Guards (Brief 186 — editor state is reported, exit 0):
 *   - no v2 content / row not published → left alone;
 *   - every reviewer must still be on the page with a blank link or already this link; a renamed reviewer
 *     or a different link means it was edited in /admin since → NOTHING is written (NOT-APPLIED);
 *   - all three already linked → ALREADY-APPLIED (every later deploy);
 *   - the published row is read back.
 * Runs PRE-swap: the build being replaced already renders a set link (WhParts HubAuthor).
 */
import pool from '../src/lib/db';
import { createDraft, publishDraft } from '../src/lib/cms/drafts';
import { EM_PAGE_TYPE, EM_V2_MARKER, EM_V2_PATH, EM_V2_SLUG, type WhV2DraftContent } from '../src/lib/water-heater-v2-cms/model';
import type { WhHubStored, WhReview } from '../src/lib/content/water-heater-v2/types';
import { inPipeline, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'update-brief-225-review-links';
const argv = process.argv.slice(2);
const mode = resolveRunMode(SCRIPT, argv);
console.log(mode === 'commit' ? 'APPLY — writing' : 'DRY RUN — nothing written');

/** From Marketing's "JBP EMERGENCY PLUMBING REVIEWS.pdf" (2026-11-03). */
const LINKS: Record<string, string> = {
  'Betty Knows': 'https://maps.app.goo.gl/3WpnaH18n4LiyMyD6',
  'Veronica Flores': 'https://maps.app.goo.gl/iEHVigmJspUUxLc18',
  'Brady Bendau': 'https://maps.app.goo.gl/J8Ek9EP8LSsW9JpA9',
};
const LABEL = 'review links';
const PIN = 'id = (SELECT id FROM emergency_plumbing_page ORDER BY id LIMIT 1)';

type Outcome = 'applied' | 'would-apply' | 'already' | 'edited' | 'not-applied' | 'failed';

function reviewItems(v2: WhHubStored): WhReview[] | null {
  const sec = v2.sections.find((x) => x.kind === 'reviews');
  return sec && sec.kind === 'reviews' ? sec.items : null;
}

async function run(authorId: number): Promise<{ outcome: Outcome; detail: string }> {
  const row = (
    await pool.query<{ status: string; v2: WhHubStored | null; mt: string | null; md: string | null }>(
      `SELECT status, v2_content AS v2, meta_title AS mt, meta_description AS md FROM emergency_plumbing_page WHERE ${PIN}`
    )
  ).rows[0];
  if (!row?.v2) return { outcome: 'not-applied', detail: 'no v2 content on the row (not seeded) — left alone' };
  if (row.status !== 'published') return { outcome: 'not-applied', detail: `row is '${row.status}' (an editor unpublished it) — left alone` };

  const v2 = JSON.parse(JSON.stringify(row.v2)) as WhHubStored;
  const items = reviewItems(v2);
  if (!items) return { outcome: 'edited', detail: 'no reviews section — nothing written' };

  const todo: string[] = [];
  const problems: string[] = [];
  for (const [name, href] of Object.entries(LINKS)) {
    const it = items.find((r) => r.name === name);
    if (!it) problems.push(`"${name}" is no longer on the page`);
    else if (it.href === href) continue;
    else if (it.href) problems.push(`"${name}" already links to ${it.href}`);
    else todo.push(name);
  }
  if (problems.length) return { outcome: 'edited', detail: `${problems.join('; ')}; nothing written` };
  if (!todo.length) return { outcome: 'already', detail: 'all three reviewer names already link to their Google review' };
  if (mode === 'dry') return { outcome: 'would-apply', detail: `would link ${todo.join(', ')} and publish a new version` };

  for (const r of items) if (todo.includes(r.name)) r.href = LINKS[r.name];
  const content: WhV2DraftContent = { template: EM_V2_MARKER, whV2: v2, metaTitle: row.mt ?? '', metaDescription: row.md ?? '' };
  const n = Number((await pool.query<{ n: string }>(`SELECT count(*) AS n FROM page_drafts WHERE page_type = $1 AND page_slug = $2`, [EM_PAGE_TYPE, EM_V2_SLUG])).rows[0].n) + 1;
  const draft = await createDraft({ pageType: EM_PAGE_TYPE, pageSlug: EM_V2_SLUG, label: `Version ${n} — ${LABEL}`, content, createdBy: authorId, templateType: 'em-hub' });
  await publishDraft(draft.id, authorId);

  const after = (await pool.query<{ v2: WhHubStored | null }>(`SELECT v2_content AS v2 FROM emergency_plumbing_page WHERE ${PIN}`)).rows[0]?.v2;
  const got = after ? reviewItems(after) : null;
  const missing = Object.entries(LINKS).filter(([name, href]) => got?.find((r) => r.name === name)?.href !== href).map(([name]) => name);
  if (missing.length) return { outcome: 'failed', detail: `published version #${draft.id} but the row does not link ${missing.join(', ')}` };
  return { outcome: 'applied', detail: `linked ${todo.join(', ')} → live version #${draft.id} "Version ${n} — ${LABEL}"` };
}

async function main() {
  console.log(`${SCRIPT} — Brief 225 follow-up: reviewer names link to their Google reviews${inPipeline() ? ' [pipeline]' : ''}\n`);
  const authorId = (await pool.query<{ id: number }>(`SELECT id FROM cms_users ORDER BY id LIMIT 1`)).rows[0]?.id;
  if (!authorId) throw new Error('no cms_users row to author the version');

  const r = await run(authorId);
  console.log(`  ${EM_V2_PATH.padEnd(24)} ${r.outcome.toUpperCase().padEnd(11)} ${r.detail}`);
  if (r.outcome === 'failed') {
    console.error(`\n!!!! ${SCRIPT}: the write did not land: ${r.detail}`);
    verdict(SCRIPT, 'FAILED', r.detail);
    process.exitCode = 1;
  } else if (r.outcome === 'applied') verdict(SCRIPT, 'APPLIED', r.detail);
  else if (r.outcome === 'already') verdict(SCRIPT, 'ALREADY-APPLIED', r.detail);
  else if (r.outcome === 'would-apply') verdict(SCRIPT, 'NOT-APPLIED (dry run)', r.detail);
  else if (r.outcome === 'edited') verdict(SCRIPT, 'NOT-APPLIED (edited in admin)', r.detail);
  else verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', r.detail);
}

main()
  .catch((err) => {
    console.error(`\n!!!! ${SCRIPT} crashed:`, err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
