/**
 * Brief 212 (Track B) — move the 145 Batch 1 City Service V2 pages (Northbrook, Columbus, Tinley
 * Park, Joliet, Naperville × 29) onto their `city_service_pages` rows, with no visible change.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-city-services-v2-content.ts [--apply] [--create-missing]
 *   (deploy.sh passes `commit`; in the pipeline a missing choice exits non-zero — Brief 147.)
 *
 * Per page (scripts/lib/city-pages-seed.ts → loadService): skip if `v2_content` is set; archive
 * "Pre-V2 archive (2026-10)" (every column verbatim); "Version 1 — City Service V2" from
 * src/lib/content/city-services-v2/data/{city}.json (its Service JSON-LD re-derived from the fields
 * on save, which reproduces all 145 byte for byte); publish; assert.
 *
 * Production has NO row for many of these pages (Columbus and Tinley Park: none; Joliet: some) — they
 * render from code today. A missing row is REPORTED and skipped unless `--create-missing` is passed
 * (Brief 212 STOP decision); the page keeps rendering from its code module either way.
 *
 * Exit codes (Brief 186): non-zero ONLY for a code/schema fault or a write that did not land.
 */
import pool from '../src/lib/db';
import { CITY_SERVICE_V2_TEMPLATE, SERVICE_V1_LABEL, type CityServiceV2DraftContent } from '../src/lib/city-service-v2-cms/model';
import { CITY_SERVICE_V2_SLUGS, codeServiceMeta, codeServiceStored } from '../src/lib/city-service-v2-cms/code-defaults';
import { CITY_PAGE_BATCHES } from '../src/lib/city-batches';
import { authorId, loadService, type PageResult } from './lib/city-pages-seed';
import { inPipeline, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'seed-city-services-v2-content';
const argv = process.argv.slice(2);
const wantsCommit = argv.some((a) => ['commit', '--commit', 'apply', '--apply'].includes(a));
const wantsDry = argv.some((a) => ['dry', '--dry', 'dry-run', '--dry-run'].includes(a));
console.log(wantsCommit && !wantsDry ? 'APPLY — writing' : 'DRY RUN — nothing written');
const mode = resolveRunMode(SCRIPT, argv);
const createMissing = argv.includes('--create-missing');
const only = argv.find((a) => a.startsWith('--city='))?.slice(7);

async function main() {
  console.log(`${SCRIPT} — Brief 212 City Service Pages V2 → CMS (Batch 1)${inPipeline() ? ' [pipeline]' : ''}${createMissing ? ' [create missing rows]' : ''}\n`);
  const by = await authorId();
  const apply = mode === 'commit';
  const results: PageResult[] = [];
  for (const city of CITY_PAGE_BATCHES[0].cities) {
    if (only && city !== only) continue;
    for (const service of CITY_SERVICE_V2_SLUGS) {
      const page = codeServiceStored(city, service);
      const meta = codeServiceMeta(city, service);
      if (!page || !meta) throw new Error(`no code module for ${city}/${service}`);
      const draft: CityServiceV2DraftContent = { template: CITY_SERVICE_V2_TEMPLATE, page, metaTitle: meta.title, metaDescription: meta.description };
      const r = await loadService(city, service, draft, { by, apply, publish: true, label: SERVICE_V1_LABEL, createMissing });
      results.push(r);
      if (r.outcome !== 'already') console.log(`  ${r.path.padEnd(52)} ${r.outcome.toUpperCase().padEnd(11)} ${r.detail}`);
    }
  }
  const count = (o: string) => results.filter((r) => r.outcome === o).length;
  console.log(`\n  ${results.length} pages: loaded ${count('loaded')}, already ${count('already')}, would-load ${count('would-load')}, missing ${count('missing')}, unpublished ${count('unpublished')}, failed ${count('failed')}`);
  if (count('failed')) {
    verdict(SCRIPT, 'FAILED', `${count('failed')} page(s) did not land`);
    process.exitCode = 1;
  } else if (mode === 'dry') {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${count('would-load')} would be loaded, ${count('missing')} rows missing`);
  } else if (count('loaded') === 0) {
    verdict(SCRIPT, count('missing') ? 'NOT-APPLIED (rows missing)' : 'ALREADY-APPLIED', count('missing') ? `${count('missing')} row(s) missing (not created)` : 'already loaded, no change');
  } else {
    verdict(SCRIPT, 'APPLIED', `${count('loaded')} loaded and published, ${count('already')} already, ${count('missing')} missing`);
  }
}

main()
  .catch((err) => {
    console.error(`\n!!!! ${SCRIPT} crashed:`, err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
