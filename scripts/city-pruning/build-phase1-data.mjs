#!/usr/bin/env node
/**
 * Brief 229 — City Pruning Phase 1 Pilot: turns the package's data CSVs (committed verbatim under
 * data/city-pruning/phase1-pilot/) into the two JSON modules the site reads.
 *
 *   src/lib/city-pruning/phase1-redirects.json   { "/from": "/to", … }  — the 1,184 301s. Plain data:
 *                                                 it is bundled into the Edge middleware.
 *   src/lib/city-pruning/phase1-data.json        service areas per pilot hub, the office NAP list,
 *                                                 the locations/state link map, the town titles.
 *
 * Re-run after editing a CSV:  node scripts/city-pruning/build-phase1-data.mjs
 * `--check` exits 1 when the committed JSON differs from what the CSVs produce (used by the build
 * validator so a CSV edit can't ship without its JSON).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const DATA = path.join(ROOT, 'data', 'city-pruning', 'phase1-pilot');
const OUT = path.join(ROOT, 'src', 'lib', 'city-pruning');

/** RFC 4180-ish: quoted fields with "" escapes, CRLF or LF. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
      continue;
    }
    if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((x) => x !== '')) rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}
const read = (f) => parseCsv(fs.readFileSync(path.join(DATA, f), 'utf8'));

const fail = (m) => { console.error(`[build-phase1-data] ${m}`); process.exit(1); };

// ── Redirects ───────────────────────────────────────────────────────────────────────────────────
const redirects = {};
for (const r of read('redirects_phase1_pilot.csv')) {
  if (r.type !== '301') fail(`row ${r.source}: type ${r.type} (only 301 is allowed)`);
  for (const p of [r.source, r.target]) {
    if (!/^\/[a-z0-9\-/]+$/.test(p) || p.endsWith('/') || p.includes('//')) fail(`row ${r.source}: "${p}" is not a normalized path`);
  }
  if (redirects[r.source]) fail(`duplicate source ${r.source}`);
  redirects[r.source] = r.target;
}
for (const [from, to] of Object.entries(redirects)) if (redirects[to]) fail(`chain inside the file: ${from} → ${to} → ${redirects[to]}`);

// ── Service areas (pilot hubs) ──────────────────────────────────────────────────────────────────
const serviceAreas = {};
for (const r of read('service_areas_pilot_hubs.csv')) {
  (serviceAreas[r.hub] ||= []).push({ town: r.town, tier: r.type, link: r.link || null, state: r.state });
}
for (const k of Object.keys(serviceAreas)) serviceAreas[k].sort((a, b) => a.town.localeCompare(b.town));

// ── Offices (NAP) ───────────────────────────────────────────────────────────────────────────────
const offices = read('JBP_Office_NAP_2026-11-09.csv').map((r) => ({
  office: r['Office'],
  state: r['State'],
  address: r['Address (GBP)'],
  phone: r['Phone (Google listing, Nov 9 2026)'],
  lat: Number(r['Latitude']),
  lng: Number(r['Longitude']),
}));
if (offices.length !== 19) fail(`expected 19 offices, got ${offices.length}`);

// ── Link map ────────────────────────────────────────────────────────────────────────────────────
const linkMap = read('link_map_locations_and_state_pages.csv').map((r) => ({
  pageType: r.page_type,
  finalUrlLater: r.final_url_later,
  currentUrl: r.current_url,
  linkToUseNow: r.link_to_use_now,
  note: r.note,
}));

// ── Tier 3 titles / metas ───────────────────────────────────────────────────────────────────────
const townMeta = {};
for (const r of read('tier3_titles_metas.csv')) {
  const titleKey = Object.keys(r).find((k) => k.startsWith('title'));
  townMeta[r.url] = { title: r[titleKey], description: r['meta description'] };
}

const files = {
  'phase1-redirects.json': JSON.stringify(redirects, null, 0).replace(/","/g, '",\n"').replace(/^\{/, '{\n').replace(/\}$/, '\n}') + '\n',
  'phase1-data.json': JSON.stringify({ serviceAreas, offices, linkMap, townMeta }, null, 1) + '\n',
};
const check = process.argv.includes('--check');
let stale = 0;
for (const [name, body] of Object.entries(files)) {
  const p = path.join(OUT, name);
  const cur = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  if (cur === body) continue;
  if (check) { stale++; console.error(`[build-phase1-data] ${name} is stale — re-run node scripts/city-pruning/build-phase1-data.mjs`); continue; }
  fs.writeFileSync(p, body);
  console.log(`[build-phase1-data] wrote ${path.relative(ROOT, p)}`);
}
if (stale) process.exit(1);
console.log(`[build-phase1-data] ${Object.keys(redirects).length} redirects, ${offices.length} offices, ${linkMap.length} link-map rows, ${Object.keys(townMeta).length} town titles.`);
