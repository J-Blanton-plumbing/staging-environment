#!/usr/bin/env node
/**
 * Brief 212 (Track A/B, the Brief 204 pattern) — the CITY PAGES LIVE CHECK: the City Hub and City
 * Service V2 pages of every batch in src/lib/city-batches.ts serve their CMS rows, unchanged across a
 * deploy, and are SEO-clean. Plain Node (no dependencies), so it runs on the box.
 *
 *   node scripts/check-city-pages-live.mjs --snapshot --base=http://localhost:3000 --out=.city-pages-snapshot
 *       BEFORE the build swap (deploy.sh): each page's normalised <head> facts + page markup, as served
 *       by the build that is still live (and before any seed of this deploy writes).
 *   node scripts/check-city-pages-live.mjs --compare --base=http://localhost:3000 --snapshot-dir=.city-pages-snapshot [--expect-changed=geneva,elgin]
 *       AFTER the swap (deploy.yml health check). For every hub + 29 service pages per city:
 *         1. 200 (an unpublished row → 404 and out of the sitemap is EDITOR STATE: reported, exit 0);
 *         2. a page whose row holds hub / V2 content serves it ("row") — never the fallback;
 *         3. listed in the sitemap exactly once;
 *         4. exactly one <h1>, no FAQPage JSON-LD, a title with one brand tail, a self canonical;
 *         5. markup byte-identical to the snapshot — except for the cities in --expect-changed (a
 *            deploy that INTENDS to change them, e.g. the Batch 2 publish), which must instead serve
 *            their rows. A delta anywhere else turns the check red: read its diff.
 * Exit 1 only for a page that should serve and doesn't, a fallback served over real content, a sitemap
 * count other than 1, an SEO-rule break, or an unexpected markup delta.
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const BASE = String(args.base ?? 'http://localhost:3000').replace(/\/$/, '');
const SITE = 'https://jblantonplumbing.com';

// Kept in step with src/lib/city-batches.ts and CITY_SERVICE_V2_SLUGS (this script cannot import TS).
const CITIES = ['northbrook', 'columbus', 'tinley-park', 'joliet', 'naperville', 'arlington-heights', 'elgin', 'mchenry', 'algonquin', 'geneva'];
const SERVICES = ['basement-flooding', 'burst-pipe-repair', 'catch-basin', 'commercial-water-heater', 'drain-cleaning', 'ejector-pump', 'emergency-plumbing', 'faucet-installation-repair', 'garbage-disposal-installation-repair', 'gas-fireplace', 'gas-line-installation', 'gas-line-repair', 'hydro-jetting', 'leak-repairs', 'overhead-sewer-systems', 'plumbing-maintenance', 'sewage-line-backup-services', 'sewer-maintenance', 'sewer-repair', 'sewer-rodding', 'shower-repair', 'sump-pumps', 'tankless-water-heater', 'toilet-installation-repair', 'trenchless-sewer-repair', 'video-camera-sewer-inspections', 'water-filtration-systems', 'water-heater-installation', 'water-heater-repair'];
const PAGES = CITIES.flatMap((c) => [`/${c}`, ...SERVICES.map((s) => `/${c}/${s}`)]);
const file = (p) => p.slice(1).replace(/\//g, '__') + '.txt';

async function get(p) {
  const r = await fetch(BASE + p, { redirect: 'manual', headers: { 'User-Agent': 'jbp-city-pages-check', Accept: 'text/html' } });
  return { status: r.status, text: await r.text() };
}

/** The parts of a page a deploy must not change, normalised only for build-specific noise. */
export function fingerprint(html) {
  const head = html.slice(0, html.indexOf('</head>') + 7);
  const title = (head.match(/<title>([\s\S]*?)<\/title>/) || [])[1] ?? '';
  const desc = (head.match(/<meta name="description" content="([^"]*)"/) || [])[1] ?? '';
  const canon = (head.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] ?? '';
  const robots = (head.match(/<meta name="robots" content="([^"]*)"/) || [])[1] ?? '';
  let start = -1;
  for (const id of ['city-hub-v2', 'city-service-v2']) {
    start = html.indexOf(`<div id="${id}"`);
    if (start >= 0) break;
  }
  if (start < 0) start = html.indexOf('<main');
  const end = html.indexOf('</main>', start);
  let region = start >= 0 && end > start ? html.slice(start, end) : '';
  const ld = [...region.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  region = region
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<!--\$\?-->/g, '<!--$-->') // a Suspense boundary that streamed late on a cold first request
    .replace(/\/_next\/static\/[^"']+/g, '/_next/static/X');
  return [`TITLE ${title}`, `DESC ${desc}`, `CANONICAL ${canon}`, `ROBOTS ${robots}`, ...ld.map((j) => `LD ${j}`), 'REGION', region.replace(/></g, '>\n<')].join('\n');
}

/** SEO rules every one of these pages must meet. */
export function seoProblems(p, html) {
  const out = [];
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) out.push(`${h1} <h1> elements (expected exactly 1)`);
  if (/"@type"\s*:\s*"FAQPage"/.test(html)) out.push('FAQPage JSON-LD present (forbidden, Brief 164)');
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] ?? '';
  const tails = (title.match(/J\.(?:\s|&nbsp;)?Blanton|\bJBP\b/g) || []).length;
  if (tails !== 1) out.push(`title "${title}" carries ${tails} brand tails (expected 1)`);
  const canon = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] ?? '';
  if (canon !== SITE + p) out.push(`canonical "${canon}" is not self (${SITE + p})`);
  return out;
}

async function snapshot() {
  const out = String(args.out ?? '.city-pages-snapshot');
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  let saved = 0;
  for (const p of PAGES) {
    try {
      const r = await get(p);
      if (r.status === 200) { fs.writeFileSync(path.join(out, file(p)), fingerprint(r.text)); saved++; }
    } catch (e) {
      console.log(`  snapshot ${p} → unreachable (${e.message})`);
    }
  }
  console.log(`city-pages snapshot: ${saved}/${PAGES.length} pages saved to ${out}`);
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
  const dir = String(args['snapshot-dir'] ?? '.city-pages-snapshot');
  const changed = new Set(String(args['expect-changed'] ?? '').split(',').filter(Boolean));
  // Cities a batch import published during THIS deploy (deploy.sh → import-city-batch.ts --changed-file):
  // their pages are meant to change, so they must serve their rows instead of matching the snapshot.
  const marker = path.join(dir, 'changed.txt');
  if (fs.existsSync(marker)) for (const c of fs.readFileSync(marker, 'utf8').split(/\s+/).filter(Boolean)) changed.add(c);
  const failures = [];
  const notes = [];
  let sources = {};
  try {
    const hubs = JSON.parse((await get(`/api/city-hubs/source?slugs=${CITIES.join(',')}`)).text);
    const svcs = JSON.parse((await get(`/api/city-services-v2/source?cities=${CITIES.join(',')}`)).text);
    sources = { ...hubs, ...svcs };
  } catch (e) {
    failures.push(`source APIs unreadable: ${e.message}`);
  }
  const counts = await sitemapCounts().catch((e) => { failures.push(`sitemap unreadable: ${e.message}`); return {}; });
  const tally = {};
  for (const p of PAGES) {
    const city = p.split('/')[1];
    const s = sources[p] ?? { source: '(missing)', row: '?' };
    let r = await get(p).catch((e) => ({ status: 0, text: '', err: e.message }));
    const n = counts[p] ?? 0;
    tally[s.source] = (tally[s.source] ?? 0) + 1;
    if (s.source === 'not-found') {
      if (r.status !== 404) failures.push(`${p}: row is unpublished but the page answers ${r.status}`);
      if (n !== 0) failures.push(`${p}: row is unpublished but the sitemap lists it ${n}×`);
      notes.push(`${p}: unpublished in /admin (editor state) — 404, not in the sitemap, as expected`);
      continue;
    }
    if (r.status !== 200) { failures.push(`${p}: answered ${r.status}`); continue; }
    if ((s.row === 'hub' || s.row === 'v2') && s.source !== 'row') failures.push(`${p}: its row holds content but the page serves "${s.source}" (the stored content no longer fits — see the server log)`);
    if (changed.has(city) && s.source !== 'row') failures.push(`${p}: expected to serve its new CMS row this deploy, serves "${s.source}"`);
    if (n !== 1) failures.push(`${p}: listed ${n}× in the sitemap, expected exactly once`);
    if (s.source === 'row' || s.source === 'code') for (const prob of seoProblems(p, r.text)) failures.push(`${p}: ${prob}`);
    const snap = path.join(dir, file(p));
    if (!changed.has(city) && fs.existsSync(snap)) {
      const before = fs.readFileSync(snap, 'utf8');
      let after = fingerprint(r.text);
      if (before !== after) {
        r = await get(p); // one retry: the first hit after a restart can stream differently
        after = fingerprint(r.text);
      }
      if (before !== after) failures.push(`${p}: markup changed across the swap — ${firstDiff(before, after)}`);
    }
  }
  console.log(`  sources: ${JSON.stringify(tally)}${changed.size ? `; expected to change: ${[...changed].join(', ')}` : ''}`);
  for (const n of notes.slice(0, 20)) console.log(`  i ${n}`);
  if (failures.length) {
    console.log('\n' + '!'.repeat(72));
    console.log('CITY PAGES LIVE CHECK FAILED (Brief 212):');
    for (const f of failures.slice(0, 60)) console.log(`  - ${f}`);
    if (failures.length > 60) console.log(`  … and ${failures.length - 60} more`);
    console.log('A markup delta means this deploy changed what these pages render (or someone published in');
    console.log('/admin during the deploy window); compare .city-pages-snapshot/ with the live page.');
    console.log('!'.repeat(72));
    process.exit(1);
  }
  console.log(`city-pages live check: all ${PAGES.length} pages OK`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (args.snapshot) await snapshot();
  else if (args.compare) await compare();
  else {
    console.error('usage: check-city-pages-live.mjs --snapshot|--compare [--base=URL] [--out=DIR|--snapshot-dir=DIR] [--expect-changed=a,b]');
    process.exit(2);
  }
}
