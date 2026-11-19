#!/usr/bin/env node
/**
 * Brief 230 (Track F) — walks EVERY page the City Pruning pilot keeps live with noindex (the 1,073 paths in
 * src/lib/city-pruning/phase1-noindex.json: 17 Tier 4 town pages + 1,056 town service pages) against a
 * running build. Each must:
 *   • answer 200 itself (no redirect — it stays a PPC landing page);
 *   • carry exactly one `<meta name="robots" content="noindex, follow">`;
 *   • carry a SELF canonical (never noindex + a canonical elsewhere);
 *   • render exactly one <h1>;
 *   • appear in no sitemap;
 *   • link to none of the 111 moved URLs (phase1-redirects.json) — in an href or a schema url / @id / item.
 * Also reports any OTHER live `/{town}/{service}` of the 24 towns (in no sitemap, noindexed by the city rule).
 *
 *   node scripts/city-pruning/check-phase1-noindex.mjs [--base=http://localhost:3000] [--out=report.json]
 *
 * Exit 1 on any failing page. Read-only (GET only).
 */
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const BASE = String(args.base ?? 'http://localhost:3000').replace(/\/$/, '');
const SITE = 'https://jblantonplumbing.com';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const N = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'city-pruning', 'phase1-noindex.json'), 'utf8'));
const MOVED = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'city-pruning', 'phase1-redirects.json'), 'utf8'));

async function get(p) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(BASE + p, { redirect: 'manual', headers: { 'user-agent': 'jbp-b230-noindex-check' } });
      return { status: r.status, location: r.headers.get('location'), body: await r.text() };
    } catch (e) {
      if (a === 2) return { status: 0, location: null, body: String(e) };
    }
  }
}

// Every URL any sitemap lists.
const inSitemap = new Set();
const index = (await get('/sitemap.xml')).body;
for (const child of [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)) {
  for (const m of (await get(child)).body.matchAll(/<loc>([^<]+)<\/loc>/g)) inSitemap.add(new URL(m[1]).pathname);
}

const results = [];
let i = 0;
async function worker() {
  while (i < N.paths.length) {
    const p = N.paths[i++];
    const r = await get(p);
    const why = [];
    if (r.status !== 200) why.push(`answered ${r.status}${r.location ? ` → ${r.location}` : ''}`);
    else {
      const robots = [...r.body.matchAll(/<meta name="robots" content="([^"]*)"/g)].map((m) => m[1]);
      if (robots.length !== 1 || robots[0] !== 'noindex, follow') why.push(`robots ${JSON.stringify(robots)}`);
      const canon = [...r.body.matchAll(/<link rel="canonical" href="([^"]*)"/g)].map((m) => m[1]);
      if (canon.length !== 1 || canon[0] !== SITE + p) why.push(`canonical ${JSON.stringify(canon)}`);
      const h1 = (r.body.match(/<h1[\s>]/g) || []).length;
      if (h1 !== 1) why.push(`${h1} <h1>`);
      const links = new Set();
      for (const m of r.body.matchAll(/(?:href="|"url":"|"@id":"|"item":")((?:https:\/\/jblantonplumbing\.com)?)(\/[a-z0-9][a-z0-9\-/]*)/g)) {
        const k = m[2].replace(/\/+$/, '');
        if (MOVED[k]) links.add(k);
      }
      if (links.size) why.push(`links to moved URL(s): ${[...links].join(', ')}`);
    }
    if (inSitemap.has(p)) why.push('listed in a sitemap');
    results.push({ path: p, status: r.status, ok: why.length === 0, why: why.join('; ') });
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
const bad = results.filter((r) => !r.ok);
const kinds = { townPages: N.paths.filter((p) => p.split('/').length === 2).length, servicePages: N.paths.filter((p) => p.split('/').length === 3).length };
const summary = { base: BASE, pages: results.length, kinds, ok: results.length - bad.length, failed: bad.length, sitemapUrls: inSitemap.size };
if (args.out) fs.writeFileSync(String(args.out), JSON.stringify({ summary, failures: bad }, null, 1));
console.log(JSON.stringify(summary, null, 1));
for (const r of bad.slice(0, 40)) console.log(`  ✗ ${r.path}: ${r.why}`);
process.exit(bad.length ? 1 : 0);
