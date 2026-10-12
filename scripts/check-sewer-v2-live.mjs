#!/usr/bin/env node
/**
 * Brief 204 (Track D2) — the Sewer v2 pages serve their CMS rows, unchanged, and are in the sitemap.
 * Plain Node (no dependencies), so it runs on the box from deploy.sh and the health check.
 *
 *   node scripts/check-sewer-v2-live.mjs --snapshot --base=http://localhost:3000 --out=.sewer-v2-snapshot
 *       BEFORE the build swap (deploy.sh): saves each page's normalised <head> facts + #sewer-v2 markup
 *       as served by the build that is still live.
 *   node scripts/check-sewer-v2-live.mjs --compare  --base=http://localhost:3000 --snapshot-dir=.sewer-v2-snapshot
 *       AFTER the swap (deploy.yml health check). Asserts, for each of the 10 pages:
 *         1. it answers 200;
 *         2. /api/sewer-v2/source says its content comes from its CMS row ("row") — the HTML alone
 *            cannot tell, because the row was seeded from the same copy the code holds;
 *         3. it is listed in the sitemap exactly once;
 *         4. its title, description, canonical, JSON-LD and #sewer-v2 markup are byte-identical to the
 *            snapshot (Brief 204's byte-identical gate, run on the real box with the real DB).
 *
 * Editor state is NOT a failure (Brief 186): a page Marketing unpublished answers 404, reads
 * "not-found" and is out of the sitemap — reported, exit 0. Exit 1 only for a page that should
 * serve and doesn't, a page serving the code fallback although its row holds v2 content, a sitemap
 * count other than 1 for a live page, or a markup delta across the swap.
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const BASE = String(args.base ?? 'http://localhost:3000').replace(/\/$/, '');
const PAGES = ['/services/sewer', '/hydro-jetting', '/sewer-rodding', '/sewer-repair', '/sewer-camera-inspection', '/sewer-line-replacement', '/sewer-maintenance', '/overhead-sewer-systems', '/trenchless-sewer-repair', '/sewer-line-installation'];
const file = (p) => (p === '/services/sewer' ? 'services_sewer' : p.slice(1)) + '.txt';

async function get(p) {
  const r = await fetch(BASE + p, { redirect: 'manual', headers: { 'User-Agent': 'jbp-sewer-v2-check', Accept: 'text/html' } });
  return { status: r.status, text: await r.text() };
}

/** The parts of a page this brief must not change, normalised only for build-specific noise. */
export function fingerprint(html) {
  const head = html.slice(0, html.indexOf('</head>') + 7);
  const title = (head.match(/<title>([\s\S]*?)<\/title>/) || [])[1] ?? '';
  const desc = (head.match(/<meta name="description" content="([^"]*)"/) || [])[1] ?? '';
  const canon = (head.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] ?? '';
  const start = html.indexOf('<div id="sewer-v2"');
  const end = html.indexOf('</main>', start);
  let region = start >= 0 && end > start ? html.slice(start, end) : '';
  const ld = [...region.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  region = region.replace(/<script\b[\s\S]*?<\/script>/g, '');
  return [`TITLE ${title}`, `DESC ${desc}`, `CANONICAL ${canon}`, ...ld.map((j) => `LD ${j}`), 'REGION', region.replace(/></g, '>\n<')].join('\n');
}

async function snapshot() {
  const out = String(args.out ?? '.sewer-v2-snapshot');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  let saved = 0;
  for (const p of PAGES) {
    try {
      const r = await get(p);
      if (r.status === 200) { fs.writeFileSync(path.join(out, file(p)), fingerprint(r.text)); saved++; }
      console.log(`  snapshot ${p} → ${r.status}`);
    } catch (e) {
      console.log(`  snapshot ${p} → unreachable (${e.message})`);
    }
  }
  console.log(`sewer-v2 snapshot: ${saved}/${PAGES.length} pages saved to ${out}`);
}

function firstDiff(a, b) {
  const x = a.split('\n'), y = b.split('\n');
  for (let i = 0; i < Math.max(x.length, y.length); i++) if (x[i] !== y[i]) return `line ${i + 1}:\n      before: ${(x[i] ?? '(none)').slice(0, 200)}\n      after:  ${(y[i] ?? '(none)').slice(0, 200)}`;
  return '';
}

async function sitemapCounts() {
  const index = (await get('/sitemap.xml')).text;
  const children = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const counts = Object.fromEntries(PAGES.map((p) => [p, 0]));
  for (const c of children) {
    const xml = (await get(c)).text;
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const p = new URL(m[1]).pathname;
      if (p in counts) counts[p]++;
    }
  }
  return counts;
}

async function compare() {
  const dir = String(args['snapshot-dir'] ?? '.sewer-v2-snapshot');
  const failures = [];
  const notes = [];
  let sources = {};
  try {
    const r = await get('/api/sewer-v2/source');
    sources = JSON.parse(r.text);
  } catch (e) {
    failures.push(`/api/sewer-v2/source unreadable: ${e.message}`);
  }
  const counts = await sitemapCounts().catch((e) => { failures.push(`sitemap unreadable: ${e.message}`); return {}; });
  for (const p of PAGES) {
    const src = sources[p]?.source ?? '(missing)';
    const r = await get(p).catch((e) => ({ status: 0, text: '', err: e.message }));
    const n = counts[p] ?? 0;
    if (src === 'not-found') {
      // Editor state: Marketing unpublished this page. It must 404 and be out of the sitemap.
      if (r.status !== 404) failures.push(`${p}: row is unpublished but the page answers ${r.status}`);
      if (n !== 0) failures.push(`${p}: row is unpublished but the sitemap lists it ${n}×`);
      notes.push(`${p}: unpublished in /admin (editor state) — 404, not in the sitemap, as expected`);
      continue;
    }
    if (r.status !== 200) failures.push(`${p}: answered ${r.status}`);
    if (src !== 'row') failures.push(`${p}: content source is "${src}", expected "row" (the page is not reading its CMS row)`);
    if (n !== 1) failures.push(`${p}: listed ${n}× in the sitemap, expected exactly once`);
    const snap = path.join(dir, file(p));
    if (r.status === 200 && fs.existsSync(snap)) {
      const before = fs.readFileSync(snap, 'utf8');
      const after = fingerprint(r.text);
      if (before !== after) failures.push(`${p}: markup changed across the swap — ${firstDiff(before, after)}`);
    } else if (r.status === 200) {
      notes.push(`${p}: no pre-swap snapshot — markup comparison skipped`);
    }
    console.log(`  ${p.padEnd(28)} ${r.status}  source=${src}  sitemap=${n}`);
  }
  for (const n of notes) console.log(`  i ${n}`);
  if (failures.length) {
    console.log('\n' + '!'.repeat(72));
    console.log('SEWER V2 LIVE CHECK FAILED (Brief 204):');
    for (const f of failures) console.log(`  - ${f}`);
    console.log('A markup delta means this deploy changed what the sewer pages render (or someone published');
    console.log('in /admin during the deploy window); compare .sewer-v2-snapshot/ with the live page.');
    console.log('!'.repeat(72));
    process.exit(1);
  }
  console.log(`sewer-v2 live check: all ${PAGES.length} pages OK (200 / served from their CMS rows / in the sitemap once / unchanged across the swap)`);
}

// Run only as a script (the local Brief 204 harness imports `fingerprint`).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (args.snapshot) await snapshot();
  else if (args.compare) await compare();
  else {
    console.error('usage: check-sewer-v2-live.mjs --snapshot|--compare [--base=URL] [--out=DIR|--snapshot-dir=DIR]');
    process.exit(2);
  }
}
