#!/usr/bin/env node
/**
 * Brief 229 (Track F/G) — site-wide sweep for links to a redirect source of this release. Walks every URL
 * the sitemap index lists (city-service shards sampled every Nth URL; articles sampled), fetches each
 * page and reports every `<a href>` (and every schema URL) that is still a source in
 * phase1-redirects.json. The Track F count — "links updated" — is the difference between a run against
 * the baseline build and a run against this branch.
 *
 * Brief 230: the 1,073 pages the pilot keeps live with noindex are out of the sitemap, so they are added
 * from phase1-noindex.json (all of them) — they must not link to a moved URL either.
 *
 *   node scripts/city-pruning/sweep-phase1-links.mjs [--base=http://localhost:3000] [--every=10] [--articles=80] [--out=sweep.json]
 */
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const BASE = String(args.base ?? 'http://localhost:3000').replace(/\/$/, '');
const EVERY = Number(args.every ?? 10);
const ARTICLES = Number(args.articles ?? 80);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const R = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'city-pruning', 'phase1-redirects.json'), 'utf8'));

async function text(p) {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(BASE + p, { redirect: 'manual', headers: { 'user-agent': 'jbp-b229-sweep' } });
      return { status: r.status, body: await r.text() };
    } catch (e) {
      if (a === 2) return { status: 0, body: '' };
    }
  }
}
const index = (await text('/sitemap.xml')).body;
const urls = [];
for (const child of [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)) {
  const locs = [...(await text(child)).body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  if (child.includes('city-services')) urls.push(...locs.filter((_, i) => i % EVERY === 0));
  else if (child.includes('articles')) urls.push(...locs.filter((_, i) => i % Math.max(1, Math.floor(locs.length / ARTICLES)) === 0));
  else urls.push(...locs);
}
const NOINDEX = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'lib', 'city-pruning', 'phase1-noindex.json'), 'utf8')).paths;
const pages = [...new Set([...urls, ...NOINDEX])];
const found = {};
let total = 0;
let i = 0;
async function worker() {
  while (i < pages.length) {
    const p = pages[i++];
    const { status, body } = await text(p);
    if (status !== 200) continue;
    const hits = {};
    for (const m of body.matchAll(/(?:href="|"url":"|"@id":"|"item":")((?:https:\/\/jblantonplumbing\.com)?)(\/[a-z0-9][a-z0-9\-/]*)/g)) {
      const k = m[2].replace(/\/+$/, '');
      if (R[k]) hits[k] = (hits[k] ?? 0) + 1;
    }
    const n = Object.values(hits).reduce((a, b) => a + b, 0);
    if (n) { found[p] = hits; total += n; }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
const summary = { base: BASE, pagesSwept: pages.length, noindexPagesIncluded: NOINDEX.length, pagesWithLinksToSources: Object.keys(found).length, links: total };
if (args.out) fs.writeFileSync(String(args.out), JSON.stringify({ summary, found }, null, 1));
console.log(JSON.stringify(summary));
for (const [p, h] of Object.entries(found).slice(0, 30)) console.log(`  ${p}: ${Object.entries(h).map(([k, v]) => `${k}×${v}`).join(', ')}`);
