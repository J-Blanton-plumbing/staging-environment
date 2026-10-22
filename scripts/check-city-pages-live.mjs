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
 *         4. exactly one <h1>, a title with one brand tail, a self canonical, and (Brief 216,
 *            Marketing 2026-10-21) exactly ONE FAQPage JSON-LD whose questions and answers equal the
 *            page's visible FAQ text — on a page served by the City Hub / City Service V2 template;
 *            a Batch 3 page still on its legacy template is only checked for 200 + the snapshot;
 *         5. markup byte-identical to the snapshot — except for the cities in --expect-changed (a
 *            deploy that INTENDS to change them, e.g. the Batch 2 publish), which must instead serve
 *            their rows. A delta anywhere else turns the check red: read its diff. One delta is the
 *            Brief 216 rollout itself and is allowed: a FAQPage / Plumber JSON-LD block ADDED to a
 *            page whose snapshot had none of that type (once present, any change to it is a delta);
 *         6. (Brief 216) the 10 sewer v2 pages carry NO FAQPage — FAQPage is allowed on the two city
 *            templates only.
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
const CITIES = ['northbrook', 'columbus', 'tinley-park', 'joliet', 'naperville', 'arlington-heights', 'elgin', 'mchenry', 'algonquin', 'geneva',
  'mokena', 'hinsdale', 'skokie', 'chicago-lincoln-park', 'elmhurst', 'chicago-ravenswood', 'evanston', 'hanover-park',
  'highland-park'];
const SEWER_PAGES = ['/services/sewer', '/hydro-jetting', '/sewer-rodding', '/sewer-repair', '/sewer-camera-inspection', '/sewer-line-replacement', '/sewer-maintenance', '/overhead-sewer-systems', '/trenchless-sewer-repair', '/sewer-line-installation'];
/** Brief 217: pages outside the two city templates that must keep the footer's office graph. */
const OTHER_PAGES = ['/', '/services/plumbing', '/knowledge-hub', '/wilmette', '/wilmette/drain-cleaning'];
/** JSON-LD types Brief 216 adds to these pages (allowed once as an addition — see 5. above). */
const NEW_LD_TYPES = ['FAQPage', 'Plumber'];
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

const decode = (t) =>
  t.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => { try { return JSON.parse(m[1]); } catch { return null; } }).filter(Boolean);

/**
 * Brief 216: the page's FAQPage JSON-LD vs its visible FAQ (.faq-q-text / .faq-full, in order).
 * `expect` = 1 on a City Hub / City Service V2 render, 0 anywhere else.
 */
export function faqProblems(html, expect) {
  const out = [];
  const faqs = ldBlocks(html).filter((j) => j['@type'] === 'FAQPage');
  if (faqs.length !== expect) return [`${faqs.length} FAQPage JSON-LD block(s) (expected ${expect})`];
  if (!expect) return out;
  const qs = [...html.matchAll(/<span class="faq-q-text">([\s\S]*?)<\/span>/g)].map((m) => decode(m[1]));
  const as = [...html.matchAll(/<p class="faq-full">([\s\S]*?)<\/p>/g)].map((m) => decode(m[1]));
  const ld = faqs[0].mainEntity ?? [];
  if (ld.length !== qs.length || qs.length !== as.length) return [`FAQPage has ${ld.length} questions, the page shows ${qs.length}`];
  ld.forEach((e, i) => {
    if (e.name !== qs[i]) out.push(`FAQPage Q${i + 1} "${e.name}" ≠ the visible question "${qs[i]}"`);
    if (e.acceptedAnswer?.text !== as[i]) out.push(`FAQPage Q${i + 1}: the answer ≠ the visible answer ("${String(e.acceptedAnswer?.text).slice(0, 80)}" vs "${as[i].slice(0, 80)}")`);
  });
  return out;
}

const OFFICE_TYPES = ['Plumber', 'PlumbingBusiness', 'LocalBusiness'];
const isOffice = (n) => [].concat(n?.['@type'] ?? []).some((t) => OFFICE_TYPES.includes(t));

/**
 * Brief 217 (Marketing 2026-10-22, decision 4) — one location per city page. On a City Hub / City
 * Service V2 render: NO footer @graph; exactly one office node, its own office's (`/{city}#office`),
 * sameAs = hasMap = its GBP link, no geo; on a service page the Service `provider` is a reference to
 * it. `problems` = code faults (exit 1); `notes` = editor state (a hub whose GBP link was removed in
 * /admin emits no node — reported, exit 0, Brief 186).
 */
export function oneLocationProblems(p, html) {
  const problems = [];
  const notes = [];
  const blocks = ldBlocks(html);
  if (blocks.some((b) => Array.isArray(b['@graph']))) problems.push('the footer\'s all-offices @graph is on the page (one location per city page)');
  const nodes = blocks.flatMap((b) => (Array.isArray(b['@graph']) ? b['@graph'] : [b])).filter(isOffice);
  const city = p.split('/')[1];
  const id = `${SITE}/${city}#office`;
  const svc = blocks.find((b) => b['@type'] === 'Service');
  if (nodes.length === 0) {
    notes.push(`${p}: no office node — the /${city} hub has no Google Business Profile link (editor state)`);
    return { problems, notes };
  }
  if (nodes.length !== 1) problems.push(`${nodes.length} office nodes (expected exactly 1)`);
  const n = nodes[0];
  if (n['@id'] !== id) problems.push(`office node @id "${n['@id']}" is not ${id}`);
  if (!Array.isArray(n.sameAs) || n.sameAs.length !== 1 || n.sameAs[0] !== n.hasMap) problems.push('office node sameAs ≠ [hasMap]');
  if ('geo' in n) problems.push('office node carries geo (decision 5: no coordinates)');
  if (svc && JSON.stringify(svc.provider) !== JSON.stringify({ '@id': id })) problems.push(`Service provider is ${JSON.stringify(svc.provider).slice(0, 80)}, not a reference to ${id}`);
  return { problems, notes };
}

/** Brief 217: a page OUTSIDE the city templates keeps the footer graph (when the footer lists offices). */
export function footerGraphProblems(html) {
  const listed = /class="offices grid/.test(html);
  const graph = ldBlocks(html).find((b) => Array.isArray(b['@graph']));
  if (listed && !graph) return ['the footer lists offices but its PlumbingBusiness @graph is missing — the one-location switch leaked outside the city templates'];
  return [];
}

/**
 * Brief 217 (deploy D-a): the one allowed markup delta on a service page — its Service `provider` was
 * the stored inline Plumber and is now a reference to the office node the page gained. Rewrites the
 * Service LD line(s) of `fp` to carry that reference, so before and after compare on everything else.
 */
function withProviderRef(fp, id) {
  return fp.split('\n').map((l) => {
    if (!l.startsWith('LD ')) return l;
    try {
      const j = JSON.parse(l.slice(3));
      if (j['@type'] !== 'Service' || !j.provider) return l;
      return 'LD ' + JSON.stringify({ ...j, provider: { '@id': id } }).replace(/</g, '\\u003c');
    } catch { return l; }
  }).join('\n');
}

/** SEO rules every one of these pages must meet. */
export function seoProblems(p, html) {
  const out = [];
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) out.push(`${h1} <h1> elements (expected exactly 1)`);
  out.push(...faqProblems(html, 1));
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

/** A fingerprint with the LD lines of `types` removed (the Brief 216 allowed-addition comparison). */
function withoutLd(fp, types) {
  return fp.split('\n').filter((l) => {
    if (!l.startsWith('LD ')) return true;
    try { return !types.includes(JSON.parse(l.slice(3))['@type']); } catch { return true; }
  }).join('\n');
}
const ldTypesIn = (fp) => fp.split('\n').filter((l) => l.startsWith('LD ')).map((l) => { try { return JSON.parse(l.slice(3))['@type']; } catch { return '?'; } });

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
    if (s.source === 'row' || s.source === 'code') {
      const one = oneLocationProblems(p, r.text);
      for (const prob of one.problems) failures.push(`${p}: ${prob}`);
      notes.push(...one.notes);
    }
    const snap = path.join(dir, file(p));
    if (!changed.has(city) && fs.existsSync(snap)) {
      const before = fs.readFileSync(snap, 'utf8');
      let after = fingerprint(r.text);
      if (before !== after) {
        r = await get(p); // one retry: the first hit after a restart can stream differently
        after = fingerprint(r.text);
      }
      if (before !== after) {
        // Brief 216: a FAQPage / Plumber block ADDED where the snapshot had none is the rollout itself.
        const had = ldTypesIn(before);
        const added = NEW_LD_TYPES.filter((t) => !had.includes(t));
        // Brief 217: a service page that GAINED its hub's office node, with the Service provider now a
        // reference to it (one location per city page) — allowed once, only when that node is there.
        const id = `${SITE}/${city}#office`;
        const gainedOffice = !had.includes('Plumber') && ldTypesIn(after).includes('Plumber') && after.includes(`"@id":"${id}"`);
        if (added.length && withoutLd(before, added) === withoutLd(after, added)) tally['+jsonld'] = (tally['+jsonld'] ?? 0) + 1;
        else if (gainedOffice && withoutLd(withProviderRef(before, id), added) === withoutLd(withProviderRef(after, id), added)) tally['+one-location'] = (tally['+one-location'] ?? 0) + 1;
        else failures.push(`${p}: markup changed across the swap — ${firstDiff(before, after)}`);
      }
    }
  }
  for (const p of SEWER_PAGES) {
    const r = await get(p).catch(() => ({ status: 0, text: '' }));
    if (r.status !== 200) { notes.push(`${p}: answered ${r.status} (sewer FAQPage rule not checked)`); continue; }
    for (const prob of faqProblems(r.text, 0)) failures.push(`${p}: ${prob} — FAQPage is allowed on the City Hub / City Service V2 templates only`);
    for (const prob of footerGraphProblems(r.text)) failures.push(`${p}: ${prob}`);
  }
  // Brief 217: the one-location rule is scoped to the two city templates — a sample of other page types
  // (homepage, a category, an article hub, a legacy city page and its service page) keeps the footer graph.
  for (const p of OTHER_PAGES) {
    const r = await get(p).catch(() => ({ status: 0, text: '' }));
    if (r.status !== 200) { notes.push(`${p}: answered ${r.status} (footer graph rule not checked)`); continue; }
    for (const prob of footerGraphProblems(r.text)) failures.push(`${p}: ${prob}`);
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
  console.log(`city-pages live check: all ${PAGES.length} pages OK (+ ${SEWER_PAGES.length} sewer pages FAQPage-free)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (args.snapshot) await snapshot();
  else if (args.compare) await compare();
  else {
    console.error('usage: check-city-pages-live.mjs --snapshot|--compare [--base=URL] [--out=DIR|--snapshot-dir=DIR] [--expect-changed=a,b]');
    process.exit(2);
  }
}
