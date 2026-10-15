/**
 * Brief 212 (Track A, A-1 = Brief 206 Track D1) — move the 5 Batch 1 City Hubs (Northbrook, Columbus,
 * Tinley Park, Joliet, Naperville) and the shared City Hub record onto the CMS, with no visible change.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-city-hubs-content.ts           # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-city-hubs-content.ts --apply   # write
 *   (deploy.sh passes `commit`; in the pipeline a missing choice exits non-zero — Brief 147.)
 *
 * 1. The shared record: the `main_pages` row `city-hubs` (created once) + "Version 1 — Shared across
 *    all City Hubs" from the code default, published.
 * 2. Each Batch 1 hub (scripts/lib/city-pages-seed.ts → loadHub): skip if `hub_content` is set;
 *    archive "Pre-hub archive (2026-10)" (every column verbatim); switch to City Hub
 *    (`pre_hub_template` = the row's own current template, read); "Version 1 — City Hub" from the
 *    code module; publish; assert.
 * The byte-identical assert against the pre-swap snapshot is the deploy's CITY PAGES LIVE CHECK
 * (scripts/check-city-pages-live.mjs); locally, compare with .scripts-out/b212.
 * Batch 2 hubs are NOT seeded here — they go through scripts/import-city-batch.ts (Track D).
 *
 * Exit codes (Brief 186): non-zero ONLY for a code/schema fault or a write this run attempted that did
 * not land. Editor state (an unpublished hub, edited copy, a missing row) is reported, exit 0.
 */
import pool from '../src/lib/db';
import { CITY_HUB_TEMPLATE, CITY_HUB_SHARED_TEMPLATE, HUB_V1_LABEL, SHARED_V1_LABEL, type CityHubDraftContent } from '../src/lib/city-hub-cms/model';
import { codeHubMeta, codeHubStored, codeSharedDefault } from '../src/lib/city-hub-cms/code-defaults';
import { CITY_PAGE_BATCHES } from '../src/lib/city-batches';
import { authorId, loadHub, loadHubShared, type PageResult } from './lib/city-pages-seed';
import { inPipeline, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'seed-city-hubs-content';
const argv = process.argv.slice(2);
const wantsCommit = argv.some((a) => ['commit', '--commit', 'apply', '--apply'].includes(a));
const wantsDry = argv.some((a) => ['dry', '--dry', 'dry-run', '--dry-run'].includes(a));
console.log(wantsCommit && !wantsDry ? 'APPLY — writing' : 'DRY RUN — nothing written');
const mode = resolveRunMode(SCRIPT, argv);

async function main() {
  console.log(`${SCRIPT} — Brief 212 City Hubs V2 → CMS (Batch 1)${inPipeline() ? ' [pipeline]' : ''}\n`);
  const by = await authorId();
  const apply = mode === 'commit';
  const results: PageResult[] = [];
  results.push(await loadHubShared({ template: CITY_HUB_SHARED_TEMPLATE, shared: codeSharedDefault() }, { by, apply, publish: true, label: SHARED_V1_LABEL }));
  for (const slug of CITY_PAGE_BATCHES[0].cities) {
    const hub = codeHubStored(slug);
    const meta = codeHubMeta(slug);
    if (!hub || !meta) throw new Error(`no code module for Batch 1 hub "${slug}"`);
    const draft: CityHubDraftContent = { template: CITY_HUB_TEMPLATE, hub, metaTitle: meta.title, metaDescription: meta.description };
    results.push(await loadHub(slug, draft, { by, apply, publish: true, label: HUB_V1_LABEL }));
  }
  for (const r of results) console.log(`  ${r.path.padEnd(30)} ${r.outcome.toUpperCase().padEnd(11)} ${r.detail}`);
  const failed = results.filter((r) => r.outcome === 'failed');
  const loaded = results.filter((r) => r.outcome === 'loaded').length;
  const missing = results.filter((r) => r.outcome === 'missing');
  if (missing.length) console.log(`\n  i ${missing.length} row(s) missing — reported, not created.`);
  if (failed.length) {
    verdict(SCRIPT, 'FAILED', `${failed.length} page(s) did not land`);
    process.exitCode = 1;
  } else if (mode === 'dry') {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${results.filter((r) => r.outcome === 'would-load').length} would be loaded`);
  } else if (loaded === 0) {
    verdict(SCRIPT, missing.length ? 'NOT-APPLIED (rows missing)' : 'ALREADY-APPLIED', missing.length ? `${missing.length} row(s) missing` : 'already loaded, no change');
  } else {
    verdict(SCRIPT, 'APPLIED', `${loaded} loaded and published, ${results.length - loaded} unchanged`);
  }
}

main()
  .catch((err) => {
    console.error(`\n!!!! ${SCRIPT} crashed:`, err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
