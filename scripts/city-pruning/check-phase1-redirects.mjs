#!/usr/bin/env node
/**
 * Brief 229 (Track G) — walks EVERY row of the City Pruning Phase 1 redirect file against a running
 * build: the source (with Google Ads' query string appended) must answer ONE 301 whose Location is the
 * row's target with the query string intact, and the target must answer 200 itself (no second hop).
 * Brief 230: that holds for the 111 rows that MOVE (phase1-redirects.json); the other 1,073 rows (Tier 4
 * towns, town service pages) must NOT redirect — they answer 200 themselves (noindex; check-phase1-noindex.mjs).
 *
 *   node scripts/city-pruning/check-phase1-redirects.mjs [--base=http://localhost:3000] [--out=report.json]
 *
 * Exit 1 on any failing row. Read-only (GET only).
 */
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const BASE = String(args.base ?? 'http://localhost:3000').replace(/\/$/, '');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const csv = fs.readFileSync(path.join(ROOT, 'data', 'city-pruning', 'phase1-pilot', 'redirects_phase1_pilot.csv'), 'utf8').trim().split(/\r?\n/).slice(1);
const rows = csv.map((l) => { const [source, target, type, group, area] = l.split(','); return { source, target, type, group, area }; });
const QS = '?source=google&medium=cpc&gclid=TEST123';
const MOVED = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'city-pruning', 'phase1-redirects.json'), 'utf8'));

async function get(p) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(BASE + p, { redirect: 'manual', headers: { 'user-agent': 'jbp-b229-redirect-check' } });
      await r.arrayBuffer();
      return { status: r.status, location: r.headers.get('location') };
    } catch (e) {
      if (a === 2) return { status: 0, location: String(e) };
    }
  }
}

const targetStatus = new Map();
const results = [];
let i = 0;
async function worker() {
  while (i < rows.length) {
    const r = rows[i++];
    const src = await get(r.source + QS);
    let ok = true;
    const why = [];
    if (!MOVED[r.source]) {
      // Brief 230: a noindex row — the page stays live; any redirect is a failure.
      if (src.status !== 200) { ok = false; why.push(`expected 200 (live, noindex — not redirected), got ${src.status}${src.location ? ` → ${src.location}` : ''}`); }
      results.push({ ...r, kind: 'noindex', sourceStatus: src.status, location: src.location, targetStatus: null, ok, why: why.join('; ') });
      continue;
    }
    if (MOVED[r.source] !== r.target) { ok = false; why.push(`phase1-redirects.json says ${MOVED[r.source]}`); }
    if (src.status !== 301) { ok = false; why.push(`source answered ${src.status}`); }
    const loc = src.location ? new URL(src.location, BASE) : null;
    if (!loc || loc.pathname !== r.target) { ok = false; why.push(`Location ${src.location ?? '(none)'} ≠ ${r.target}`); }
    if (loc && loc.search !== QS) { ok = false; why.push(`query string not kept (${loc.search || 'none'})`); }
    if (!targetStatus.has(r.target)) targetStatus.set(r.target, get(r.target + QS));
    const t = await targetStatus.get(r.target);
    if (t.status !== 200) { ok = false; why.push(`target answered ${t.status}${t.location ? ` → ${t.location}` : ''} (expected 200, one hop)`); }
    results.push({ ...r, kind: '301', sourceStatus: src.status, location: src.location, targetStatus: t.status, ok, why: why.join('; ') });
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
results.sort((a, b) => rows.findIndex((x) => x.source === a.source) - rows.findIndex((x) => x.source === b.source));
const byGroup = {};
for (const r of results) {
  byGroup[r.group] ??= { rows: 0, ok: 0 };
  byGroup[r.group].rows++;
  if (r.ok) byGroup[r.group].ok++;
}
const bad = results.filter((r) => !r.ok);
const kinds = { '301': results.filter((r) => r.kind === '301').length, noindex: results.filter((r) => r.kind === 'noindex').length };
const summary = { base: BASE, query: QS, rows: results.length, kinds, ok: results.length - bad.length, failed: bad.length, distinctTargets: targetStatus.size, byGroup };
if (args.out) fs.writeFileSync(String(args.out), JSON.stringify({ summary, failures: bad, results }, null, 1));
console.log(JSON.stringify(summary, null, 1));
for (const r of bad.slice(0, 40)) console.log(`  ✗ ${r.source} → ${r.target}: ${r.why}`);
process.exit(bad.length ? 1 : 0);
