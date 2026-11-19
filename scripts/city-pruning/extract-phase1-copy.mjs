#!/usr/bin/env node
/**
 * Brief 229 — extracts the City Pruning Phase 1 package's COPY (Markdown, outside this public repo)
 * into the JSON the site and the deploy scripts read:
 *
 *   data/city-pruning/phase1-pilot/towns/{slug}.json      the 7 Tier 3 town pages (rendered copy only:
 *                                                          the MD frontmatter and the research "Sources"
 *                                                          table are NOT carried over)
 *   data/city-pruning/phase1-pilot/hub-copy-updates.json  the Tinley Park, Joliet and Columbus updates
 *
 * Copy is carried byte-for-byte except ONE typographic rule, the City Hub convention (Brief 212): a
 * straight apostrophe in prose becomes ’ (never inside a link target). Run locally:
 *   node scripts/city-pruning/extract-phase1-copy.mjs "<…/Phase1_Pilot_2026-11-18>"
 */
import fs from 'node:fs';
import path from 'node:path';

const PKG = process.argv[2];
if (!PKG) throw new Error('usage: extract-phase1-copy.mjs <package dir>');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const OUT = path.join(ROOT, 'data', 'city-pruning', 'phase1-pilot');
const fail = (m) => { throw new Error(`[extract-phase1-copy] ${m}`); };

/** ' → ’ in prose, never inside a markdown link target or a bare URL. */
function typo(s) {
  const parts = s.split(/(\]\([^)]*\)|https?:\/\/\S+)/);
  return parts.map((p, i) => (i % 2 === 1 ? p : p.replace(/'/g, '’'))).join('');
}

function sections(md) {
  const out = {};
  let cur = null;
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(/^## (\d+)\.\s*(.*)$/);
    if (h) { cur = h[1]; out[cur] = { title: h[2], lines: [] }; continue; }
    if (/^## /.test(line)) { cur = null; continue; }
    if (cur) out[cur].lines.push(line);
  }
  return out;
}
const cells = (line) => line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split(' | ').map((c) => c.trim());
/** `| Key | Value |` rows of a section (header/separator rows skipped). */
function kv(lines) {
  const m = {};
  for (const l of lines) {
    if (!/^\s*\|/.test(l) || /^\s*\|\s*-/.test(l)) continue;
    const [k, ...rest] = cells(l);
    if (k && rest.length) m[k] = rest.join(' | ');
  }
  return m;
}
const need = (o, k, where) => (o[k] !== undefined && o[k] !== '' ? o[k] : fail(`${where}: missing "${k}"`));
const arrow = (s, where) => {
  const m = s.match(/^(.*?)\s*->\s*(\S+)$/);
  if (!m) fail(`${where}: "${s}" is not "label -> /href"`);
  return { label: m[1].trim(), href: m[2].trim() };
};

// ── Town pages ──────────────────────────────────────────────────────────────────────────────────
const townDir = path.join(PKG, 'content', 'tier3_town_pages');
fs.mkdirSync(path.join(OUT, 'towns'), { recursive: true });
for (const f of fs.readdirSync(townDir).filter((x) => x.endsWith('.md')).sort()) {
  const md = fs.readFileSync(path.join(townDir, f), 'utf8');
  const fm = Object.fromEntries((md.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? fail(`${f}: no frontmatter`)).split(/\r?\n/).map((l) => l.split(/:\s*/).map((x, i, a) => (i === 0 ? x : a.slice(1).join(': ')))).map(([k, v]) => [k.trim(), (v ?? '').trim()]));
  const S = sections(md);
  const hero = kv(S['1'].lines);
  const svcLines = S['3'].lines;
  const svcHead = kv(svcLines.slice(0, svcLines.findIndex((l) => /^### Card/.test(l))));
  const cards = [];
  let card = null;
  for (const l of svcLines) {
    const c = l.match(/^### Card (\d+) \/ (\d+): (.+)$/);
    if (c) { card = { n: Number(c[1]), of: Number(c[2]), tag: c[3].trim(), rows: [] }; cards.push(card); continue; }
    if (card) card.rows.push(l);
  }
  if (cards.length !== 7) fail(`${f}: ${cards.length} cards, expected 7`);
  const redBarRow = kv(svcLines.filter((l) => /^\| Red bar/.test(l)));
  const office = kv(S['4'].lines);
  const why = kv(S['6'].lines);
  const revLines = S['8'].lines;
  const revH2 = (revLines.find((l) => /^H2 /.test(l)) ?? fail(`${f}: no reviews H2`)).replace(/^H2\s+/, '').replace(/^"|"$/g, '');
  const reviews = revLines.filter((l) => /^\| Review \d/.test(l)).map((l) => {
    const v = cells(l)[1];
    const m = v.match(/^"([\s\S]*)"\s+-\s+(.+)$/);
    if (!m) fail(`${f}: review "${v.slice(0, 40)}…" is not "\\"text\\" - Name"`);
    return { text: m[1], name: m[2].trim() };
  });
  const faq = [];
  for (const l of S['9'].lines) {
    if (!/^\s*\|/.test(l) || /^\s*\|\s*-/.test(l)) continue;
    const [q, a] = cells(l);
    if (q === 'Q' && a === 'A') continue;
    faq.push({ q: typo(q), a: typo(a) });
  }
  const ndc = kv(S['10'].lines);
  const final = kv(S['11'].lines);
  const item = (s, where) => {
    const i = s.indexOf(' - ');
    if (i < 0) fail(`${where}: "${s.slice(0, 40)}" is not "Title - body"`);
    return { h3: typo(s.slice(0, i).trim()), body: typo(s.slice(i + 3).trim()) };
  };
  const communities = need(office, 'Communities', `${f} §4`).split(/,\s*/).map((c) => {
    const m = c.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    return m ? { label: m[1], href: m[2] } : { label: c.trim() };
  });
  const [addrName, addrLine] = need(office, 'Address card', `${f} §4`).split(/\s+\/\s+/);
  const town = {
    url: fm.url,
    town: fm.town,
    state: fm.state,
    hub: fm.hub,
    hubUrl: fm.hub_url,
    featuredService: fm.featured_service,
    region: fm.region,
    hero: { eyebrow: typo(need(hero, 'Eyebrow', `${f} §1`)), h1: typo(need(hero, 'H1', `${f} §1`)), intro: typo(need(hero, 'Intro', `${f} §1`)) },
    services: {
      eyebrow: typo(need(svcHead, 'Eyebrow', `${f} §3`)),
      h2: typo(need(svcHead, 'H2', `${f} §3`)),
      intro: typo(need(svcHead, 'Intro', `${f} §3`)),
      cards: cards.map((c) => {
        const r = kv(c.rows);
        const btn = arrow(need(r, 'Button', `${f} card ${c.n}`), `${f} card ${c.n}`);
        return { tag: typo(c.tag), h3: typo(need(r, 'H3', `${f} card ${c.n}`)), paragraph: typo(need(r, 'Paragraph', `${f} card ${c.n}`)), cta: typo(btn.label), href: btn.href };
      }),
      redBar: (() => { const b = arrow(need(redBarRow, 'Red bar', `${f} §3`), `${f} red bar`); return { label: typo(b.label), href: b.href }; })(),
    },
    office: {
      eyebrow: typo(need(office, 'Eyebrow', `${f} §4`)),
      h2: typo(need(office, 'H2', `${f} §4`)),
      body: typo(need(office, 'Paragraph', `${f} §4`)),
      addressName: addrName.trim(),
      address: (addrLine ?? fail(`${f}: address card has no " / "`)).trim(),
      license: need(office, 'License line', `${f} §4`),
      panelHeading: typo(need(office, 'Panel heading', `${f} §4`)),
      communities,
      closing: typo(need(office, 'Closing line', `${f} §4`)),
    },
    why: { h2: typo(need(why, 'H2', `${f} §6`)), intro: typo(need(why, 'Intro', `${f} §6`)), items: ['Item 1', 'Item 2', 'Item 3'].map((k) => item(need(why, k, `${f} §6`), `${f} §6 ${k}`)) },
    reviews: { h2: typo(revH2), items: reviews },
    faq,
    ndc: { h2: typo(need(ndc, 'H2', `${f} §10`)), body: typo(need(ndc, 'Body', `${f} §10`)) },
    final: { h2: typo(need(final, 'H2', `${f} §11`)), body: typo(need(final, 'Body', `${f} §11`)) },
  };
  const slug = fm.url.replace(/^\//, '');
  fs.writeFileSync(path.join(OUT, 'towns', `${slug}.json`), JSON.stringify(town, null, 1) + '\n');
  console.log(`[extract] towns/${slug}.json — ${town.services.cards.length} cards, ${faq.length} FAQ, ${reviews.length} reviews, ${communities.length} communities`);
}

// ── Hub copy updates ────────────────────────────────────────────────────────────────────────────
const hubDir = path.join(PKG, 'content', 'hub_copy_updates');
const HUBS = { tinley_park: 'TinleyPark_Hub_Optimization_Nov2026.md', joliet: 'Joliet_Hub_Optimization_Nov2026.md', columbus: 'Columbus_Hub_Optimization_Nov2026.md' };
const SLUG = { tinley_park: 'tinley-park-il', joliet: 'joliet', columbus: 'columbus' };
/**
 * Marketing corrections to the package MDs, applied to the raw text before parsing (the importer's
 * corrections pattern, gotcha 34): every `find` must occur exactly `count` times or the run fails.
 */
const HUB_CORRECTIONS = {
  // Marketing 2026-11-19: "take the West out" — the office is 1387 Goodale Blvd (NAP sheet + Google listing).
  'Columbus_Hub_Optimization_Nov2026.md': [{ find: 'office on West Goodale Boulevard', replace: 'office on Goodale Boulevard', count: 2 }],
};
function corrected(file, md) {
  for (const c of HUB_CORRECTIONS[file] ?? []) {
    const n = md.split(c.find).length - 1;
    if (n !== c.count) fail(`${file}: correction "${c.find}" found ${n} time(s), expected ${c.count}`);
    md = md.split(c.find).join(c.replace);
  }
  return md;
}
const updates = {};
for (const [key, file] of Object.entries(HUBS)) {
  const md = corrected(file, fs.readFileSync(path.join(hubDir, file), 'utf8'));
  const S = sections(md);
  const bullet = (sec, label) => {
    const l = (S[sec]?.lines ?? []).find((x) => x.trim().startsWith(`- **${label}:**`));
    if (!l) fail(`${file} §${sec}: no "${label}"`);
    return l.trim().replace(`- **${label}:**`, '').trim();
  };
  // §4: "Card 2 H3" bullet, and the Body bullet indented under "Card 3 H3".
  const s4 = S['4'].lines;
  const c3 = s4.findIndex((l) => l.includes('**Card 3 H3:**'));
  const c3body = s4.slice(c3 + 1).find((l) => l.trim().startsWith('- **Body:**'));
  if (!c3body) fail(`${file} §4: no Card 3 body`);
  const faq = [];
  const s5 = S['5'].lines;
  for (let i = 0; i < s5.length; i++) {
    const q = s5[i].match(/^\*\*Q: (.+)\*\*$/);
    if (!q) continue;
    const a = (s5[i + 1] ?? '').match(/^A: (.+)$/);
    if (!a) fail(`${file}: Q "${q[1]}" has no "A:" line`);
    faq.push({ q: typo(q[1]), a: typo(a[1]) });
  }
  if (faq.length !== 7) fail(`${file}: ${faq.length} FAQ, expected 7`);
  const tel = (S['7']?.lines ?? []).join('\n').match(/\*\*(\+1-\d{3}-\d{3}-\d{4})\*\*/);
  updates[SLUG[key]] = {
    source: file,
    title: bullet('1', 'Title'),
    metaDescription: bullet('1', 'Meta description'),
    hero: { eyebrow: typo(bullet('2', 'Eyebrow')), h1: typo(bullet('2', 'H1')), sub: typo(bullet('2', 'Text')) },
    servicesIntro: typo(bullet('3', 'Intro')),
    whyCard2H3: typo(s4.find((l) => l.includes('**Card 2 H3:**')).replace(/^.*\*\*Card 2 H3:\*\*\s*/, '').trim()),
    whyCard3Body: typo(c3body.trim().replace('- **Body:**', '').trim()),
    faq,
    finalBody: typo(bullet('6', 'Text')),
    ...(tel ? { schemaTelephone: tel[1] } : {}),
  };
  console.log(`[extract] ${SLUG[key]}: title "${updates[SLUG[key]].title}", ${faq.length} FAQ${tel ? `, schema telephone ${tel[1]}` : ''}`);
}
fs.writeFileSync(path.join(OUT, 'hub-copy-updates.json'), JSON.stringify(updates, null, 1) + '\n');
