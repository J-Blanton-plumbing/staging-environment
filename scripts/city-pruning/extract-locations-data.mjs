#!/usr/bin/env node
/**
 * Brief 229 (Track D) — extracts the /locations, /locations/illinois and /locations/ohio DATA from the
 * package's approved prototypes into src/lib/city-pruning/locations-data.json:
 *
 *   offices  the finder rows (`OFF`): name, state, key, hub URL, phone, lat, lng, city, GBP address
 *   towns    the finder's town index (`TOWNS`): name, state, office key, tier, Tier 3 page
 *   zips     the finder's ZIP index (`ZIP`)
 *   areas    /locations: every place A to Z (state, search key, label, suffix, link)
 *   counties state pages: the county groups (key, heading, places) and the chips
 *
 * EVERY link is remapped through the package's link map (`final_url_later` → `link_to_use_now`), so
 * only the 13 pilot URLs are new and every other hub / town keeps its current URL (README §4). A link
 * the map doesn't know fails the run. Offices are checked against JBP_Office_NAP_2026-11-09.csv (19,
 * German Village excluded). Run:
 *   node scripts/city-pruning/extract-locations-data.mjs "<…/Phase1_Pilot_2026-11-18/templates>"
 */
import fs from 'node:fs';
import path from 'node:path';

const T = process.argv[2];
if (!T) throw new Error('usage: extract-locations-data.mjs <templates dir>');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'city-pruning', 'phase1-data.json'), 'utf8'));
const LINK = new Map(data.linkMap.map((r) => [r.finalUrlLater, r.linkToUseNow]));
const unknown = new Set();
const remap = (href) => {
  if (!href) return href;
  const to = LINK.get(href);
  if (!to) unknown.add(href);
  return to ?? href;
};
const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&middot;/g, '·')
    .replace(/&quot;/g, '"')
    // Numeric references, any form (&#39; and &#x27; both occur — "O&#x27;Hare" shipped undecoded on 2026-11-19).
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));

function scriptData(html) {
  const grab = (name) => {
    const m = html.match(new RegExp(`var ${name}=(\\[[\\s\\S]*?\\]|\\{[\\s\\S]*?\\});[^\\n]*\\n`));
    if (!m) throw new Error(`no ${name} in prototype script`);
    return JSON.parse(m[1]);
  };
  const OFF = grab('OFF');
  const TOWNS = grab('TOWNS');
  const ZIP = grab('ZIP');
  return {
    offices: OFF.map(([name, st, key, url, phone, lat, lng, city, address]) => ({ name, st, key, url: remap(url), phone, lat, lng, city, address })),
    towns: TOWNS.map(([name, st, office, tier, link]) => ({ name, st, office, tier, link: link ? remap(link) : '' })),
    zips: ZIP,
  };
}

/** `<li data-…>inner</li>` items of a list. */
function items(listHtml) {
  const out = [];
  for (const m of listHtml.matchAll(/<li([^>]*)>([\s\S]*?)<\/li>/g)) {
    const attrs = m[1];
    if (/class="sa-letter"/.test(attrs)) continue;
    const st = attrs.match(/data-st="([^"]*)"/)?.[1] ?? '';
    const n = decode(attrs.match(/data-n="([^"]*)"/)?.[1] ?? '');
    let inner = m[2];
    const suffix = inner.match(/<span class="sa-in">([\s\S]*?)<\/span>/)?.[1];
    inner = inner.replace(/\s*<span class="sa-in">[\s\S]*?<\/span>/, '');
    const a = inner.match(/^<a href="([^"]+)">([\s\S]*?)<\/a>$/);
    out.push({ st, n, label: decode(a ? a[2] : inner).trim(), ...(suffix ? { suffix: decode(suffix) } : {}), ...(a ? { href: remap(a[1]) } : {}) });
  }
  return out;
}

// ── /locations ──────────────────────────────────────────────────────────────────────────────────
const idx = fs.readFileSync(path.join(T, 'Locations - Index Page', 'index.html'), 'utf8');
const saList = idx.match(/<ul class="cb-list sa-list" id="sa-list">([\s\S]*?)<\/ul>/)[1];
const index = { ...scriptData(idx), areas: items(saList) };

// ── State pages ─────────────────────────────────────────────────────────────────────────────────
function statePage(dir) {
  const html = fs.readFileSync(path.join(T, dir, 'index.html'), 'utf8');
  const chipsHtml = html.match(/<div class="lc-tabs sa-tabs st-chips"[^>]*>([\s\S]*?)<\/div>/)[1];
  const chips = [...chipsHtml.matchAll(/<button[^>]*data-g="([^"]*)"[^>]*>([^<]*)<span>(\d+)<\/span><\/button>/g)].map((m) => ({ key: m[1], label: decode(m[2]).trim(), count: Number(m[3]) }));
  const counties = [...html.matchAll(/<div class="st-county" data-g="([^"]*)"><h3 class="st-county-h">([\s\S]*?) <span>(\d+)<\/span><\/h3><ul class="cb-list sa-list">([\s\S]*?)<\/ul><\/div>/g)].map((m) => ({
    key: m[1],
    heading: decode(m[2]).trim(),
    count: Number(m[3]),
    places: items(m[4]),
  }));
  for (const c of counties) if (c.places.length !== c.count) throw new Error(`${dir}: county "${c.heading}" lists ${c.places.length} places, heading says ${c.count}`);
  return { ...scriptData(html), chips, counties };
}
const illinois = statePage('State Page - Illinois');
const ohio = statePage('State Page - Ohio');

// ── Checks ──────────────────────────────────────────────────────────────────────────────────────
if (unknown.size) throw new Error(`links not in the link map: ${[...unknown].join(', ')}`);
const nap = new Map(data.offices.map((o) => [o.office, o]));
for (const o of index.offices) {
  const n = nap.get(o.name);
  if (!n) throw new Error(`/locations office "${o.name}" is not in the NAP sheet`);
  if (n.address !== o.address || n.phone !== o.phone) throw new Error(`/locations office "${o.name}" differs from the NAP sheet`);
}
if (index.offices.length !== 19) throw new Error(`/locations lists ${index.offices.length} offices, expected 19`);
if (index.offices.some((o) => /german village/i.test(o.name))) throw new Error('German Village must stay out (README §4)');

const out = { index, illinois, ohio };
// No HTML entity may survive into the data: React escapes these strings again, so one would print literally.
const leftover = JSON.stringify(out).match(/&(#x?[0-9a-f]+|[a-z]+);/gi);
if (leftover) throw new Error(`undecoded HTML entities in the locations data: ${[...new Set(leftover)].join(' ')}`);
const file = path.join(ROOT, 'src', 'lib', 'city-pruning', 'locations-data.json');
fs.writeFileSync(file, JSON.stringify(out) + '\n');
const linked = (xs) => xs.filter((x) => x.href).length;
console.log(`[extract-locations] /locations: ${index.offices.length} offices, ${index.towns.length} towns, ${Object.keys(index.zips).length} ZIPs, ${index.areas.length} places (${linked(index.areas)} linked)`);
for (const [k, s] of [['illinois', illinois], ['ohio', ohio]]) {
  const places = s.counties.flatMap((c) => c.places);
  console.log(`[extract-locations] /locations/${k}: ${s.offices.length} offices, ${s.towns.length} towns, ${s.counties.length} groups, ${places.length} places (${linked(places)} linked), chips ${s.chips.map((c) => c.key || 'all').join('/')}`);
}
console.log(`[extract-locations] distinct links: ${[...new Set([...index.areas, ...illinois.counties.flatMap((c) => c.places), ...ohio.counties.flatMap((c) => c.places)].filter((x) => x.href).map((x) => x.href))].sort().join(' ')}`);
