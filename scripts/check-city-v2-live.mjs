#!/usr/bin/env node
/**
 * Brief 209 CMS wiring — the 150 City v2 pages (5 hubs + 145 service pages) serve their CMS rows,
 * unchanged, and are in the sitemap. Plain Node (no dependencies), so it runs on the box from
 * deploy.sh and the health check. The Brief 204 sewer check, keyed by city.
 *
 *   node scripts/check-city-v2-live.mjs --snapshot --base=http://localhost:3000 --out=.city-v2-snapshot
 *       BEFORE the build swap (deploy.sh): saves each page's normalised <head> facts + page-root markup
 *       as served by the build that is still live.
 *   node scripts/check-city-v2-live.mjs --compare  --base=http://localhost:3000 --snapshot-dir=.city-v2-snapshot
 *       AFTER the swap (deploy.yml health check). Asserts, for each page:
 *         1. it answers 200;
 *         2. /api/city-v2/source says its content comes from its CMS row ("row");
 *         3. it is listed in the sitemap exactly once;
 *         4. its title, description, canonical, JSON-LD and page-root markup equal the snapshot.
 *
 * Markup is compared NORMALISED (HTML comments and React streaming markers dropped, attributes sorted,
 * whitespace collapsed): the CMS wiring renders the service pages' blocks through the Sewer v2 node
 * renderer, which differs from the code-rendered JSX only in React's text-separator comments and SVG
 * attribute order — not in what the browser renders. The 55 folded service URLs in the hub directory
 * are normalised to their parent#anchor form (the CMS wiring repointed those links off the 301s).
 *
 * Editor state is NOT a failure (Brief 186): a page Marketing unpublished answers 404, reads
 * "not-found" and is out of the sitemap — reported, exit 0. Exit 1 only for a page that should serve
 * and doesn't, a page serving the code fallback although its row holds v2 content, a sitemap count
 * other than 1 for a live page, or a markup delta across the swap.
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const BASE = String(args.base ?? 'http://localhost:3000').replace(/\/$/, '');
const CITIES = ['northbrook', 'columbus', 'tinley-park', 'joliet', 'naperville'];
const SERVICES = ['basement-flooding', 'burst-pipe-repair', 'catch-basin', 'commercial-water-heater', 'drain-cleaning', 'ejector-pump', 'emergency-plumbing',
  'faucet-installation-repair', 'garbage-disposal-installation-repair', 'gas-fireplace', 'gas-line-installation', 'gas-line-repair', 'hydro-jetting', 'leak-repairs',
  'overhead-sewer-systems', 'plumbing-maintenance', 'sewage-line-backup-services', 'sewer-maintenance', 'sewer-repair', 'sewer-rodding', 'shower-repair', 'sump-pumps',
  'tankless-water-heater', 'toilet-installation-repair', 'trenchless-sewer-repair', 'video-camera-sewer-inspections', 'water-filtration-systems',
  'water-heater-installation', 'water-heater-repair'];
const PAGES = [...CITIES.map((c) => `/${c}`), ...CITIES.flatMap((c) => SERVICES.map((s) => `/${c}/${s}`))];
const file = (p) => p.slice(1).replace(/\//g, '__') + '.txt';
/** Folded service → [parent, anchor] (the fold maps' "Menu link" column). */
const FOLDS = { 'clogged-drains': ['drain-cleaning', 'clogged-drains'], 'sewer-drain-clearing': ['drain-cleaning', 'sewer-drain-clearing'],
  'kitchen-sink-drain': ['drain-cleaning', 'kitchen-sink-drain'], 'kitchen-faucet-repair-and-installation': ['faucet-installation-repair', 'kitchen-faucet'],
  'kitchen-plumbing': ['faucet-installation-repair', 'kitchen-plumbing'], 'plumbing-fixture-installations': ['faucet-installation-repair', 'fixture-installation'],
  'residential-water-heater': ['water-heater-repair', 'residential-water-heater'], 'basement-waterproofing': ['basement-flooding', 'basement-waterproofing'],
  'gas-line-leak-detection': ['gas-line-repair', 'gas-leak-detection'], 'water-heater-maintenance': ['water-heater-repair', 'water-heater-maintenance'],
  'water-testing': ['water-filtration-systems', 'water-testing'] };

async function get(p) {
  const r = await fetch(BASE + p, { redirect: 'manual', headers: { 'User-Agent': 'jbp-city-v2-check', Accept: 'text/html' } });
  return { status: r.status, text: await r.text() };
}

/** Attribute-order-insensitive, comment-free markup (see the header). */
function normalise(html) {
  let s = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<template id="B:[^"]*"><\/template>/g, '');
  s = s.replace(/<([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(\/?)>/g, (m, tag, attrs, self) => {
    const list = [...attrs.matchAll(/\s+([^\s=>/]+)(?:="([^"]*)")?/g)].map(([, k, v]) => `${k.toLowerCase()}="${v ?? ''}"`).sort();
    return `<${tag}${list.length ? ' ' + list.join(' ') : ''}${self ? '/' : ''}>`;
  });
  for (const city of CITIES) for (const [from, [to, a]] of Object.entries(FOLDS)) s = s.split(`href="/${city}/${from}"`).join(`href="/${city}/${to}#${a}"`);
  return s.replace(/>\s+</g, '><').replace(/\s+/g, ' ');
}

/** The parts of a page the CMS wiring must not change. */
export function fingerprint(html) {
  const head = html.slice(0, html.indexOf('</head>') + 7);
  const title = (head.match(/<title>([\s\S]*?)<\/title>/) || [])[1] ?? '';
  const desc = (head.match(/<meta name="description" content="([^"]*)"/) || [])[1] ?? '';
  const canon = (head.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] ?? '';
  const m = html.match(/<div[^>]*id="city-(?:service|hub)-v2"/);
  const start = m ? m.index : -1;
  const end = html.indexOf('</main>', start);
  let region = start >= 0 && end > start ? html.slice(start, end) : '';
  const ld = [...region.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => x[1]);
  region = region.replace(/<script\b[\s\S]*?<\/script>/g, '');
  return [`TITLE ${title}`, `DESC ${desc}`, `CANONICAL ${canon}`, ...ld.map((j) => `LD ${j}`), 'REGION', normalise(region).replace(/></g, '>\n<')].join('\n');
}

async function snapshot() {
  const out = String(args.out ?? '.city-v2-snapshot');
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
  console.log(`city-v2 snapshot: ${saved}/${PAGES.length} pages saved to ${out}`);
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
  const dir = String(args['snapshot-dir'] ?? '.city-v2-snapshot');
  const failures = [];
  const notes = [];
  let sources = {};
  try {
    sources = JSON.parse((await get('/api/city-v2/source')).text);
  } catch (e) {
    failures.push(`/api/city-v2/source unreadable: ${e.message}`);
  }
  const counts = await sitemapCounts().catch((e) => { failures.push(`sitemap unreadable: ${e.message}`); return {}; });
  const tally = { ok: 0, compared: 0 };
  for (const p of PAGES) {
    const src = sources[p]?.source ?? '(missing)';
    const r = await get(p).catch((e) => ({ status: 0, text: '', err: e.message }));
    const n = counts[p] ?? 0;
    if (src === 'not-found') {
      if (r.status !== 404) failures.push(`${p}: row is unpublished but the page answers ${r.status}`);
      if (n !== 0) failures.push(`${p}: row is unpublished but the sitemap lists it ${n}×`);
      notes.push(`${p}: unpublished in /admin (editor state) — 404, not in the sitemap, as expected`);
      continue;
    }
    const before = failures.length;
    if (r.status !== 200) failures.push(`${p}: answered ${r.status}`);
    if (src !== 'row') failures.push(`${p}: content source is "${src}", expected "row" (the page is not reading its CMS row)`);
    if (n !== 1) failures.push(`${p}: listed ${n}× in the sitemap, expected exactly once`);
    const snap = path.join(dir, file(p));
    if (r.status === 200 && fs.existsSync(snap)) {
      tally.compared++;
      const a = fs.readFileSync(snap, 'utf8');
      const b = fingerprint(r.text);
      if (a !== b) failures.push(`${p}: markup changed across the swap — ${firstDiff(a, b)}`);
    } else if (r.status === 200) {
      notes.push(`${p}: no pre-swap snapshot — markup comparison skipped`);
    }
    if (failures.length === before) tally.ok++;
  }
  for (const x of notes.slice(0, 20)) console.log(`  i ${x}`);
  if (notes.length > 20) console.log(`  i …and ${notes.length - 20} more note(s)`);
  if (failures.length) {
    console.log('\n' + '!'.repeat(72));
    console.log('CITY V2 LIVE CHECK FAILED (Brief 209 CMS wiring):');
    for (const f of failures.slice(0, 40)) console.log(`  - ${f}`);
    if (failures.length > 40) console.log(`  …and ${failures.length - 40} more`);
    console.log('A markup delta means this deploy changed what the city pages render (or someone published');
    console.log('in /admin during the deploy window); compare .city-v2-snapshot/ with the live page.');
    console.log('!'.repeat(72));
    process.exit(1);
  }
  console.log(`city-v2 live check: ${tally.ok}/${PAGES.length} pages OK (200 / served from their CMS rows / in the sitemap once), ${tally.compared} compared unchanged across the swap`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (args.snapshot) await snapshot();
  else if (args.compare) await compare();
  else {
    console.error('usage: check-city-v2-live.mjs --snapshot|--compare [--base=URL] [--out=DIR|--snapshot-dir=DIR]');
    process.exit(2);
  }
}
