#!/usr/bin/env node
/**
 * Brief 229 (Track G) — runs each pilot page's JSON-LD through the Schema Markup Validator
 * (validator.schema.org; only the page's own public JSON-LD blocks are sent) and reports errors and
 * warnings per page.
 *   node scripts/city-pruning/validate-phase1-jsonld.mjs [--base=http://localhost:3000] [--out=report.json]
 */
import fs from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
const BASE = String(args.base ?? 'http://localhost:3000').replace(/\/$/, '');
const PAGES = [
  '/mokena-il', '/tinley-park-il', '/skokie-il',
  '/frankfort-il', '/orland-park-il', '/park-forest-il', '/park-ridge-il', '/niles-il', '/morton-grove-il', '/lincolnwood-il',
  '/locations', '/locations/illinois', '/locations/ohio',
  '/joliet', '/columbus',
  '/mokena-il/drain-cleaning', '/tinley-park-il/sewer-repair', '/skokie-il/water-heater-repair',
];

function walk(node, out, path = []) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach((x) => walk(x, out, path));
  for (const e of node.errors ?? []) out.push({ path: [...path, node.pred ?? node.typeGroup ?? ''].filter(Boolean).join(' > '), ...e });
  for (const [k, v] of Object.entries(node)) if (k !== 'errors' && v && typeof v === 'object') walk(v, out, [...path, node.typeGroup ?? node.pred ?? ''].filter(Boolean));
}

const report = [];
for (const p of PAGES) {
  const html = await (await fetch(BASE + p)).text();
  const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[0]);
  const r = await fetch('https://validator.schema.org/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams({ html: blocks.join('\n') }).toString(),
  });
  const json = JSON.parse((await r.text()).replace(/^\)\]\}'\s*/, ''));
  const issues = [];
  walk(json.tripleGroups, issues);
  const types = [...new Set((json.tripleGroups ?? []).flatMap((g) => (g.nodes ?? []).map((n) => n.typeGroup)))];
  const errors = issues.filter((e) => (e.severity ?? 'ERROR') === 'ERROR');
  const warnings = issues.filter((e) => e.severity === 'WARNING');
  report.push({ page: p, blocks: blocks.length, types, errors: errors.length, warnings: warnings.length, issues: issues.slice(0, 20) });
  console.log(`${p.padEnd(34)} blocks ${blocks.length}  types ${types.join(',')}  errors ${errors.length}  warnings ${warnings.length}`);
  await new Promise((res) => setTimeout(res, 800));
}
if (args.out) fs.writeFileSync(String(args.out), JSON.stringify(report, null, 1));
process.exit(report.some((x) => x.errors) ? 1 : 0);
