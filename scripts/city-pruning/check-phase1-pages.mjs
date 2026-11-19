#!/usr/bin/env node
/**
 * Brief 229 (Track G) — the pilot's NEW and CHANGED pages against a running build:
 *   - 200, a self-referencing canonical on the apex (https://jblantonplumbing.com/…), NO noindex
 *     (neither the robots meta nor an X-Robots-Tag header), exactly one <h1>;
 *   - the title exactly as specified (the 10 suffix-free pages) or ending in the brand once (the rest);
 *   - listed in the sitemap exactly once;
 *   - every JSON-LD block parses and is typed; no schema URL points at a redirect source of this release;
 *     the expected types per page kind (README §1/§2/§4) and the forbidden ones absent; FAQPage = the
 *     visible FAQ, question for question;
 *   - with --crawl: every internal link on the page answers 200 (no 404, no redirect) — the /locations
 *     crawl of Track G, run on every pilot page.
 *
 *   node scripts/city-pruning/check-phase1-pages.mjs [--base=http://localhost:3000] [--crawl] [--out=report.json]
 */
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const BASE = String(args.base ?? 'http://localhost:3000').replace(/\/$/, '');
const SITE = 'https://jblantonplumbing.com';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const R = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'city-pruning', 'phase1-redirects.json'), 'utf8'));
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'city-pruning', 'phase1-data.json'), 'utf8'));
// Brief 230: pages the pilot keeps live with noindex — a pilot page shows them as text, never as a link.
const NI = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'city-pruning', 'phase1-noindex.json'), 'utf8'));
const NI_TOWNS = new Set(NI.townPages), NI_SERVICE_TOWNS = new Set(NI.serviceTowns);
const isNoindexPath = (h) => { const s = h.split(/[?#]/)[0].replace(/\/+$/, '').split('/').filter(Boolean); return (s.length === 1 && NI_TOWNS.has(s[0])) || (s.length === 2 && NI_SERVICE_TOWNS.has(s[0])); };
const COPY = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'city-pruning', 'phase1-pilot', 'hub-copy-updates.json'), 'utf8'));

/** The 4 hub service pages on the legacy city-service template (no Service JSON-LD there, before or after). */
const LEGACY_TEMPLATE = new Set(['bathroom-plumbing', 'drain-camera-inspection', 'flood-control-maintenance', 'gas-lines']);
const HUBS = ['mokena-il', 'tinley-park-il', 'skokie-il'];
const TOWNS = ['frankfort-il', 'orland-park-il', 'park-forest-il', 'park-ridge-il', 'niles-il', 'morton-grove-il', 'lincolnwood-il'];
const hubServices = Object.entries(R).filter(([f, t]) => HUBS.some((h) => t.startsWith(`/${h}/`)) && f.split('/').length === 3 && HUBS.some((h) => f.startsWith(`/${h.replace(/-il$/, '')}/`))).map(([, t]) => t);
const PAGES = [
  ...HUBS.map((h) => ({ p: `/${h}`, kind: 'hub' })),
  ...[...new Set(hubServices)].sort().map((p) => ({ p, kind: LEGACY_TEMPLATE.has(p.split('/')[2]) ? 'service-legacy' : 'service' })),
  ...TOWNS.map((t) => ({ p: `/${t}`, kind: 'town' })),
  { p: '/locations', kind: 'locations' },
  { p: '/locations/illinois', kind: 'locations' },
  { p: '/locations/ohio', kind: 'locations' },
  { p: '/joliet', kind: 'hub' },
  { p: '/columbus', kind: 'hub' },
];
const TITLES = {
  '/tinley-park-il': COPY['tinley-park-il'].title,
  '/joliet': COPY.joliet.title,
  '/columbus': COPY.columbus.title,
  ...Object.fromEntries(Object.entries(DATA.townMeta).map(([u, m]) => [u, m.title])),
  // The changes-MD title already opens with the brand, so the page sets it ABSOLUTE (no template suffix;
  // Marketing 2026-11-19).
  '/locations': 'J. Blanton Plumbing Locations | Illinois & Ohio Offices',
};
/** Links that already 301 on every hub before this release (not pilot sources) — reported, not failed. */
const PRE_EXISTING = (h) => h === '/no-drip-club/' || /^\/(joliet|columbus)\/(kitchen-faucet-repair-and-installation|kitchen-plumbing|plumbing-fixture-installations|sewer-drain-clearing|basement-waterproofing|clogged-drains|kitchen-sink-drain|residential-water-heater|water-heater-maintenance|gas-line-leak-detection|water-testing)$/.test(h);
const EXPECT = {
  hub: { need: ['Plumber', 'FAQPage', 'VideoObject'], forbid: [] },
  service: { need: ['Service', 'BreadcrumbList'], forbid: [] },
  'service-legacy': { need: [], forbid: [] },
  town: { need: ['Service', 'BreadcrumbList', 'FAQPage', 'VideoObject'], forbid: ['Plumber', 'PlumbingBusiness', 'AggregateRating', 'LocalBusiness'] },
  locations: { need: ['BreadcrumbList', 'ItemList'], forbid: ['FAQPage'] },
};

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<!-- -->/g, '');
async function get(p, opts = {}) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(p.startsWith('http') ? p : BASE + p, { redirect: 'manual', headers: { 'user-agent': 'jbp-b229-pages-check' }, ...opts });
      return { status: r.status, headers: r.headers, text: opts.method === 'HEAD' ? '' : await r.text() };
    } catch (e) {
      if (a === 2) return { status: 0, headers: new Headers(), text: String(e) };
    }
  }
}
function ld(html) {
  const out = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { out.push(JSON.parse(m[1])); } catch (e) { out.push({ __error: e.message }); }
  }
  return out;
}
const nodes = (blocks) => blocks.flatMap((b) => (b['@graph'] ? b['@graph'] : [b]));
const typesOf = (n) => [].concat(n['@type'] ?? []);
function walkUrls(v, out = []) {
  if (typeof v === 'string') { if (v.startsWith(SITE)) out.push(v); }
  else if (Array.isArray(v)) v.forEach((x) => walkUrls(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => walkUrls(x, out));
  return out;
}

const sitemapCount = {};
{
  const index = (await get('/sitemap.xml')).text;
  for (const c of [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)) {
    const xml = (await get(c)).text;
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const p = new URL(m[1]).pathname;
      sitemapCount[p] = (sitemapCount[p] ?? 0) + 1;
    }
  }
}
const sourcesInSitemap = Object.keys(R).filter((s) => sitemapCount[s]);

const linkStatus = new Map();
const preExisting = new Set();
const report = [];
for (const { p, kind } of PAGES) {
  const r = await get(p);
  const probs = [];
  const html = r.text;
  if (r.status !== 200) { report.push({ p, kind, status: r.status, problems: [`answered ${r.status}`] }); continue; }
  const canon = (html.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] ?? '';
  if (canon !== SITE + p) probs.push(`canonical "${canon}" ≠ ${SITE + p}`);
  if (/<meta name="robots" content="[^"]*noindex/i.test(html)) probs.push('robots meta noindex');
  if (/noindex/i.test(r.headers.get('x-robots-tag') ?? '')) probs.push(`X-Robots-Tag ${r.headers.get('x-robots-tag')}`);
  const h1 = (html.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) probs.push(`${h1} <h1>`);
  const title = decode((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] ?? '');
  if (TITLES[p] !== undefined) { if (title !== TITLES[p]) probs.push(`title "${title}" ≠ "${TITLES[p]}"`); }
  else if ((title.match(/J\. Blanton Plumbing/g) || []).length !== 1 || !title.endsWith('| J. Blanton Plumbing')) probs.push(`title "${title}" should end with the brand once`);
  if ((sitemapCount[p] ?? 0) !== 1) probs.push(`listed ${sitemapCount[p] ?? 0}× in the sitemap`);
  const blocks = ld(html);
  if (blocks.some((b) => b.__error)) probs.push(`JSON-LD parse error: ${blocks.find((b) => b.__error).__error}`);
  const all = nodes(blocks.filter((b) => !b.__error));
  if (all.some((n) => !n['@type'])) probs.push('a JSON-LD node without @type');
  const types = all.flatMap(typesOf);
  const isFooterGraph = (n) => typesOf(n).includes('PlumbingBusiness');
  const e = EXPECT[kind];
  for (const t of e.need) if (!types.includes(t)) probs.push(`no ${t} JSON-LD`);
  for (const t of e.forbid) if (all.some((n) => typesOf(n).includes(t))) probs.push(`forbidden ${t} JSON-LD`);
  // The legacy city-service template keeps the footer graph (as /mokena/gas-lines did) — Brief 217 scoped
  // the one-location rule to the City Hub / City Service V2 templates.
  if (kind !== 'service' && kind !== 'service-legacy' && all.some(isFooterGraph)) probs.push('the footer all-offices graph is on this page');
  for (const u of walkUrls(blocks)) {
    const path_ = new URL(u).pathname.replace(/\/+$/, '') || '/';
    if (R[path_]) probs.push(`schema URL ${u} is a redirect source`);
  }
  // FAQPage = the visible FAQ
  const faq = all.find((n) => typesOf(n).includes('FAQPage'));
  const visQ = [...html.matchAll(/<span class="faq-q-text">([\s\S]*?)<\/span>/g)].map((m) => decode(m[1]).trim());
  if (faq) {
    const schemaQ = (faq.mainEntity ?? []).map((q) => q.name);
    if (JSON.stringify(schemaQ) !== JSON.stringify(visQ)) probs.push(`FAQPage questions ≠ visible FAQ (${schemaQ.length} vs ${visQ.length})`);
  }
  if (kind === 'town') {
    const svc = all.find((n) => typesOf(n).includes('Service'));
    const hub = { 'frankfort-il': 'mokena-il', 'orland-park-il': 'tinley-park-il', 'park-forest-il': 'tinley-park-il' }[p.slice(1)] ?? 'skokie-il';
    if (JSON.stringify(svc?.provider) !== JSON.stringify({ '@id': `${SITE}/${hub}#office` })) probs.push(`Service provider ${JSON.stringify(svc?.provider)} ≠ {"@id":"${SITE}/${hub}#office"}`);
  }
  if (kind === 'hub' && HUBS.includes(p.slice(1))) {
    const pl = all.find((n) => typesOf(n).includes('Plumber'));
    if (pl?.['@id'] !== `${SITE}${p}#office`) probs.push(`Plumber @id ${pl?.['@id']}`);
    const nap = { 'mokena-il': '+1-708-240-3862', 'tinley-park-il': '+1-708-247-1422', 'skokie-il': '+1-847-220-6177' }[p.slice(1)];
    if (pl?.telephone !== nap) probs.push(`Plumber telephone ${pl?.telephone} ≠ ${nap}`);
    if (!types.includes('BreadcrumbList')) probs.push('no BreadcrumbList');
  }
  if (p === '/joliet') {
    const pl = all.find((n) => typesOf(n).includes('Plumber'));
    if (pl?.telephone !== '+1-815-200-9953') probs.push(`Joliet Plumber telephone ${pl?.telephone}`);
  }
  // Links
  const links = [...new Set([...html.matchAll(/<a[^>]+href="([^"]+)"/g)].map((m) => decode(m[1])).filter((h) => h.startsWith('/') && !h.startsWith('//') && !h.startsWith('/_next')).map((h) => h.split('#')[0]).filter(Boolean))];
  const toSources = links.filter((h) => R[h.split('?')[0].replace(/\/+$/, '')]);
  if (toSources.length) probs.push(`links to redirect sources: ${toSources.slice(0, 5).join(', ')}`);
  // Brief 230: Joliet / Columbus are not pilot pages (copy updates only) — their links are out of scope here.
  const toNoindex = p === '/joliet' || p === '/columbus' ? [] : links.filter(isNoindexPath);
  if (toNoindex.length) probs.push(`links to noindexed pilot pages: ${toNoindex.slice(0, 5).join(', ')}`);
  if (args.crawl) {
    const bad = [];
    for (const h of links) {
      if (!linkStatus.has(h)) linkStatus.set(h, get(h).then((x) => x.status));
      const s = await linkStatus.get(h);
      if (s !== 200 && PRE_EXISTING(h)) preExisting.add(`${p} → ${h} (${s})`);
      else if (s !== 200) bad.push(`${h} (${s})`);
    }
    if (bad.length) probs.push(`${bad.length} link(s) not 200: ${bad.slice(0, 8).join(', ')}`);
  }
  report.push({ p, kind, status: r.status, title, types: [...new Set(types)], links: links.length, problems: probs });
}
const failed = report.filter((x) => x.problems.length);
const summary = { preExistingRedirectLinks: [...preExisting].length, base: BASE, pages: report.length, ok: report.length - failed.length, failed: failed.length, crawledLinks: linkStatus.size, redirectSourcesInSitemap: sourcesInSitemap.length };
if (args.out) fs.writeFileSync(String(args.out), JSON.stringify({ summary, sourcesInSitemap, preExisting: [...preExisting], report }, null, 1));
console.log(JSON.stringify(summary, null, 1));
for (const f of failed) console.log(`  ✗ ${f.p}: ${f.problems.join(' | ')}`);
if (sourcesInSitemap.length) console.log(`  ✗ redirect sources in the sitemap: ${sourcesInSitemap.slice(0, 10).join(', ')}`);
process.exit(failed.length || sourcesInSitemap.length ? 1 : 0);
