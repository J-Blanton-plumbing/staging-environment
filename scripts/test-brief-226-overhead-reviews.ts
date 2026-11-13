/**
 * Brief 226 — offline tests for the overhead sewer reviews (no DB writes, no network).
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/test-brief-226-overhead-reviews.ts
 *
 * Proves:
 *   1. the data file is the brief: 4 reviews with https Google links, the main page's A, B, C, 18 fixed city
 *      picks (+ Highland Park, Marketing 2026-11-13) — all orders different, every 3-review set used, D on 13
 *      of the brief's 18 — and no `[` token in any quote other than the approved `[...]` cut;
 *   2. the SOURCE DATA a seed or re-import reads holds the same reviews (Brief 226 "Seeds and re-imports must
 *      not undo this"): the Sewer v2 code module (quotes with their quote marks, H2 unchanged), the 5 Batch 1
 *      City Service V2 code modules and the 14 Batch 2/3 + Highland Park import records (city H2 "Real
 *      Overhead Sewer System Reviews");
 *   3. the editor's own checks (the same conform the update script and /admin run, with the real server
 *      sanitisers) accept every one of those pages and store each quote, name and link UNCHANGED — nothing
 *      cleans, re-quotes or trims the review text.
 * Exits 1 on any failure.
 */
import fs from 'fs';
import path from 'path';
import pool from '../src/lib/db';
import { conformSewerV2Content } from '../src/lib/cms/sewer-v2-write';
import { conformCityServiceV2Content } from '../src/lib/cms/city-services-v2-write';
import { codeServiceMeta, codeServiceStored } from '../src/lib/sewer-v2-cms/code-defaults';
import { SEWER_V2_TEMPLATE } from '../src/lib/sewer-v2-cms/model';
import { CITY_SERVICE_V2_TEMPLATE, type CityServiceStored, type CityServiceV2DraftContent } from '../src/lib/city-service-v2-cms/model';
import { codeServiceMeta as cityCodeMeta, codeServiceStored as cityCodeStored } from '../src/lib/city-service-v2-cms/code-defaults';

let failures = 0;
const ok = (cond: boolean, msg: string) => {
  if (cond) console.log(`  ok   ${msg}`);
  else {
    failures++;
    console.log(`  FAIL ${msg}`);
  }
};

interface Review { name: string; url: string; text: string }
const ROOT = path.join(__dirname, '..');
const D = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'brief-226-overhead-reviews.json'), 'utf8')) as {
  versionLabel: string;
  service: string;
  cityH2: string;
  mainH2: string;
  bank: Record<string, Review>;
  main: { path: string; remove: string[]; reviews: string[] };
  cities: Array<{ city: string; remove: string[]; reviews: string[] }>;
};
const pick = (keys: string[]) => keys.map((k) => D.bank[k]);

const BATCH_1 = ['northbrook', 'columbus', 'tinley-park', 'joliet', 'naperville'];
const BATCH_FILE: Record<string, string> = {};
for (const b of ['batch-2', 'batch-3', 'highland-park']) {
  for (const c of fs.readdirSync(path.join(ROOT, 'data', 'city-batches', b))) {
    const f = path.join(ROOT, 'data', 'city-batches', b, c, `${D.service}.json`);
    if (fs.existsSync(f)) BATCH_FILE[c] = f;
  }
}

function sameReviews(got: Array<{ name: string; url: string | null; text: string }>, want: Review[]): string | null {
  if (got.length !== want.length) return `${got.length} reviews, want ${want.length}`;
  for (let i = 0; i < want.length; i++) {
    if (got[i].name !== want[i].name) return `review ${i + 1} name "${got[i].name}" ≠ "${want[i].name}"`;
    if (got[i].url !== want[i].url) return `review ${i + 1} link ${got[i].url} ≠ ${want[i].url}`;
    if (got[i].text !== want[i].text) return `review ${i + 1} text differs`;
  }
  return null;
}

async function main() {
  console.log('1. The data file');
  ok(Object.keys(D.bank).join('') === 'ABCD', 'the bank holds reviews A, B, C, D');
  for (const [k, r] of Object.entries(D.bank)) {
    ok(/^https:\/\/maps\.app\.goo\.gl\/[A-Za-z0-9]+$/.test(r.url), `${k} (${r.name}) links to a maps.app.goo.gl review`);
    ok(!/["“”]/.test(r.text) && r.text === r.text.trim(), `${k} is stored without surrounding quote marks or padding`);
    ok((r.text.match(/\[[^\]]*\]/g) ?? []).every((t) => t === '[...]'), `${k} has no [ token other than [...]`);
  }
  ok(D.bank.B.text.split('[...]').length === 3, 'B keeps both [...] cuts');
  ok(D.bank.A.text.includes('10 - 11 inches'), 'A keeps "10 - 11 inches"');
  ok(D.main.reviews.join('') === 'ABC', 'main page: A, B, C in that order');
  // The brief's 18 + Highland Park (Marketing 2026-11-13).
  ok(D.cities.length === 19, '19 city pages');
  ok(D.cities.slice(0, 18).every((c) => c.city !== 'highland-park') && D.cities[18].city === 'highland-park', 'the brief’s 18, then Highland Park');
  const orders = D.cities.map((c) => c.reviews.join(''));
  ok(new Set(orders).size === 19, 'all 19 city orders are different');
  ok(orders.every((o) => o.length === 3 && new Set(o).size === 3), 'every city page shows 3 different reviews');
  const sets: Record<string, number> = {};
  for (const o of orders) sets[[...o].sort().join('')] = (sets[[...o].sort().join('')] ?? 0) + 1;
  ok(['ABC', 'ABD', 'ACD', 'BCD'].every((s) => sets[s] > 0), `all 4 possible sets are used (${JSON.stringify(sets)})`);
  ok(D.cities.slice(0, 18).filter((c) => c.reviews.includes('D')).length === 13, 'D is on 13 of the brief’s 18 city pages');
  ok(D.cities[18].reviews.join('') === 'CDB', 'Highland Park: C, D, B');
  ok(D.cityH2 === 'Real Overhead Sewer System Reviews' && D.mainH2 === 'Overhead Sewer System Reviews', 'H2s as decided (city changed, main kept)');

  console.log('\n2 + 3. /overhead-sewer-systems — Sewer v2 code module, through the editor’s checks');
  const stored = codeServiceStored('overhead-sewer-systems');
  const sec = stored.sections.find((s) => s.kind === 'reviews');
  const want = pick(D.main.reviews);
  if (sec && sec.kind === 'reviews') {
    ok(sec.heading === D.mainH2, `H2 "${sec.heading}"`);
    ok(sec.items.length === 3 && sec.items.every((it, i) => it.name === want[i].name && it.href === want[i].url && it.quote === `"${want[i].text}"`), 'code module = A, B, C (quotes with their quote marks)');
    const meta = codeServiceMeta('overhead-sewer-systems');
    const clean = conformSewerV2Content('sub-service', 'overhead-sewer-systems', { template: SEWER_V2_TEMPLATE, sewerV2: stored, metaTitle: meta.title, metaDescription: meta.description });
    const after = (clean.sewerV2 as typeof stored).sections.find((s) => s.kind === 'reviews');
    ok(JSON.stringify(after) === JSON.stringify(sec), 'conform stores the reviews section unchanged');
  } else ok(false, 'the code module has a reviews section');

  console.log('\n2 + 3. The 19 city pages — code modules (Batch 1) and import records (Batch 2/3, Highland Park)');
  for (const c of D.cities) {
    const slug = `${c.city}/${D.service}`;
    let draft: CityServiceV2DraftContent | null = null;
    let src = '';
    if (BATCH_1.includes(c.city)) {
      // Exactly what the Batch 1 seed (seed-city-services-v2-content.ts) would store.
      const page = cityCodeStored(c.city, D.service);
      const meta = cityCodeMeta(c.city, D.service);
      if (page && meta) {
        draft = { template: CITY_SERVICE_V2_TEMPLATE, page, metaTitle: meta.title, metaDescription: meta.description };
        src = 'code module';
      }
    } else if (BATCH_FILE[c.city]) {
      const j = JSON.parse(fs.readFileSync(BATCH_FILE[c.city], 'utf8')) as { page: CityServiceStored; metaTitle: string; metaDescription: string };
      draft = { template: CITY_SERVICE_V2_TEMPLATE, page: j.page, metaTitle: j.metaTitle, metaDescription: j.metaDescription };
      src = path.relative(ROOT, BATCH_FILE[c.city]).replace(/\\/g, '/');
    }
    if (!draft) {
      ok(false, `${slug}: no source data found`);
      continue;
    }
    const b = draft.page.blocks.find((x) => x.type === 'reviews');
    if (!b || b.type !== 'reviews') {
      ok(false, `${slug}: no reviews block in ${src}`);
      continue;
    }
    const w = pick(c.reviews);
    const d1 = sameReviews(b.reviews, w);
    ok(b.h2 === D.cityH2 && !d1, `${slug} (${src}): H2 + ${c.reviews.join(', ')}${d1 ? ` — ${d1}` : ''}`);
    try {
      const clean = conformCityServiceV2Content(slug, draft);
      const cb = clean.page.blocks.find((x) => x.type === 'reviews');
      const d2 = cb && cb.type === 'reviews' ? sameReviews(cb.reviews, w) : 'no reviews block after conform';
      ok(!d2 && cb?.type === 'reviews' && cb.h2 === D.cityH2 && cb.rating === b.rating, `${slug}: conform keeps H2, rating line and the 3 reviews unchanged${d2 ? ` — ${d2}` : ''}`);
    } catch (e) {
      ok(false, `${slug}: conform refused — ${(e as Error).message}`);
    }
  }

  console.log(failures ? `\n${failures} FAILURE(S)` : '\nall Brief 226 checks passed');
  if (failures) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
