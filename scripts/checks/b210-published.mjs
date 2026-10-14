// Brief 210 C4–C8 + C10 — the Columbus "Old House Plumbing" article after Version 3 was published.
// Extends the Brief 203 C12 post-Publish checks (b203-published.mjs: public 200, indexable,
// self-canonical, one BlogPosting + one BreadcrumbList, no FAQPage, brand once in <title>, sitemap,
// hub/topic/area listings, review-link hops) with Brief 210's licence-clause, listing, content and
// neighbouring-draft checks. Read-only: HTTP GETs, no DB.
//
//   node scripts/checks/b210-published.mjs                       # production
//   BASE=http://localhost:3210 node scripts/checks/b210-published.mjs
//   PUBLISHED_AFTER=2026-10-14T20:00:00Z node scripts/checks/b210-published.mjs   # C6 datePublished bound
//
// Exit 1 if any check FAILs. The review password is the shared jbp / 2026 (CLAUDE.md gotcha 26).
const BASE = (process.env.BASE || 'https://jblantonplumbing.com').replace(/\/$/, '');
const AUTH = process.env.REVIEW_AUTH || 'jbp:2026';
const PUBLISHED_AFTER = process.env.PUBLISHED_AFTER ? new Date(process.env.PUBLISHED_AFTER) : null;
const CANON_BASE = 'https://jblantonplumbing.com';

const OLD = 'older-homes-plumbing-problems-grandview-clintonville-german-village';
const NEW = 'old-house-plumbing-problems-grandview-worthington-german-village';
const TITLE = 'Old House Plumbing Problems in Grandview, Worthington and German Village: What to Expect';
const PAGE_TITLE = 'Old House Plumbing Problems: Grandview, Worthington, German Village | J. Blanton Plumbing';
const WORTHINGTON_P =
  '<p>Like Grandview Heights, Worthington is its own city, separate from Columbus. The City of Worthington says <a href="https://www.worthington.org/317/Sewer"';
const WORTHINGTON_END = "is the property owner's responsibility</a>.</p>";
const PHONE = '614-547-6516';
const OTHER_DRAFTS = [
  'deerfield-animal-shelter-donation-orphans-of-the-storm', // Brief 207
  'j-blanton-plumbing-opens-highland-park-office', // Brief 195
  'how-to-winterize-outdoor-faucets-spigots', // Brief 198/202
];
const LAUNCH = 'now-serving-columbus-central-ohio'; // Brief 191, published

const A = { Authorization: 'Basic ' + Buffer.from(AUTH).toString('base64') };
const res = [];
const ok = (n, p, d = '') => res.push(`${p ? 'PASS' : 'FAIL'} | ${n}${d ? ` | ${d}` : ''}`);
const get = async (p, h = {}) => {
  const r = await fetch(BASE + p, { redirect: 'manual', headers: h });
  return { r, t: await r.text() };
};
const noScripts = (h) => h.replace(/<script[\s\S]*?<\/script>/g, '');

// ── C4: public page ──
const { r, t: h } = await get(`/knowledge-hub/${NEW}`);
const html = noScripts(h);
ok('C4 public URL 200', r.status === 200, String(r.status));
ok('C4 indexable: no robots noindex meta, no X-Robots-Tag', !/name="robots" content="[^"]*noindex/.test(h) && !r.headers.get('x-robots-tag'), r.headers.get('x-robots-tag') || '');
const canon = (h.match(/<link rel="canonical" href="([^"]+)"/) || [])[1];
ok('C4 self-canonical', canon === `${CANON_BASE}/knowledge-hub/${NEW}`, canon);
ok('C4 licensing clause absent (rendered HTML incl. RSC payload)', !/licensed with the City|install or repair|Worthington permit/.test(h));
ok('C4 no "licens" / "permit" anywhere in the article page', !/licens|permit/i.test(html));
const wi = html.indexOf(WORTHINGTON_P);
const wp = wi >= 0 ? html.slice(wi, html.indexOf('</p>', wi) + 4) : '';
ok('C4 Worthington paragraph ends "…property owner\'s responsibility." with the link intact', wp.endsWith(WORTHINGTON_END) && /<a href="https:\/\/www\.worthington\.org\/317\/Sewer"[^>]*>the sewer lateral, including the wye where it connects to the city's main, is the property owner's responsibility<\/a>\.<\/p>$/.test(wp), wp.slice(-120));
ok("C4 R17 kept (\"Worthington's rule is the same.\")", html.includes("Worthington's rule is the same."));

// ── C6: schema ──
const ld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const nodes = ld.flatMap((j) => (j['@graph'] ? j['@graph'] : [j]));
const types = nodes.map((n) => n['@type']);
const bp = nodes.find((n) => n['@type'] === 'BlogPosting');
const h1 = (html.match(/<h1[^>]*>([^<]*)<\/h1>/) || [])[1]?.replace(/&amp;/g, '&');
ok('C6 exactly one H1, = the title', (html.match(/<h1[\s>]/g) || []).length === 1 && h1 === TITLE, h1);
ok('C6 one BlogPosting, headline = H1', types.filter((t) => t === 'BlogPosting').length === 1 && bp?.headline === h1, bp?.headline);
const dp = bp?.datePublished ? new Date(bp.datePublished) : null;
ok(`C6 BlogPosting datePublished set${PUBLISHED_AFTER ? ` and ≥ ${PUBLISHED_AFTER.toISOString()}` : ''}`, !!dp && (!PUBLISHED_AFTER || dp >= PUBLISHED_AFTER), bp?.datePublished);
const bl = nodes.find((n) => n['@type'] === 'BreadcrumbList');
const crumbs = bl?.itemListElement?.map((i) => i.name) ?? [];
ok('C6 one BreadcrumbList: Home › Knowledge Hub › Sewers › title, ending at the canonical',
  types.filter((t) => t === 'BreadcrumbList').length === 1 && crumbs.join(' › ') === `Home › Knowledge Hub › Sewers › ${TITLE}` && bl.itemListElement.at(-1).item === canon,
  crumbs.join(' › '));
ok('C6 no FAQPage', !types.includes('FAQPage'));
const title = (h.match(/<title>([^<]*)<\/title>/) || [])[1]?.replace(/&amp;/g, '&');
ok('C6 <title> has the brand once', title === PAGE_TITLE && title.split('J. Blanton Plumbing').length === 2, `${title} (${title?.length} chars)`);

// ── C8: content intact ──
ok('C8 table renders with the Worthington row', html.includes('<table') && html.includes('<th scope="row">Worthington</th>'));
const imgs = [...html.matchAll(/<img src="(\/images\/knowledge-hub\/columbus-older-homes\/[^"]+)"/g)].map((m) => m[1]);
const imgStatus = await Promise.all(imgs.map(async (s) => (await fetch(BASE + s)).status));
ok('C8 3 article images, 0 broken', imgs.length === 3 && imgStatus.every((s) => s === 200), imgs.map((s, i) => `${s.split('/').pop()} ${imgStatus[i]}`).join(', '));
const gv = html.indexOf('<h3>German Village</h3>');
const map = html.indexOf('class="office-map-block"');
ok('C8 office map after German Village', gv > 0 && map > gv, `German Village @${gv}, map @${map}`);
ok('C8 #schedule link present (opens the booking popup)', /href="#schedule"/.test(html));
ok(`C8 phone ${PHONE}`, html.includes(PHONE));

// ── C5: listings ──
const sm = (await get('/sitemap-articles.xml')).t;
ok('C5 in sitemap-articles.xml; old slug absent', sm.includes(`/knowledge-hub/${NEW}<`) && !sm.includes(OLD));
for (const p of [
  '/knowledge-hub',
  '/knowledge-hub/topic/sewers',
  '/knowledge-hub/area/central-ohio',
  '/knowledge-hub/area/columbus-grandview-heights',
  '/knowledge-hub/area/columbus-german-village',
]) {
  const x = await get(p);
  ok(`C5 listed on ${p}`, x.r.status === 200 && x.t.includes(`/knowledge-hub/${NEW}`), String(x.r.status));
}
{
  const x = await get('/api/articles?topic=sewers');
  let found = false;
  try { found = (JSON.parse(x.t).articles || []).some((a) => a.slug === NEW || String(a.href || a.url || '').includes(NEW)); } catch { /* not JSON */ }
  ok('C5 in /api/articles?topic=sewers', found || x.t.includes(NEW), String(x.r.status));
}

// ── C7: review links ──
const hop = async (path) => {
  const out = [];
  let p = path;
  for (let i = 0; i < 5; i++) {
    const x = await fetch(BASE + p, { headers: A, redirect: 'manual' });
    out.push(String(x.status));
    const l = x.headers.get('location');
    if (!l || x.status < 300 || x.status >= 400) break;
    p = new URL(l, BASE).pathname;
    out.push(p);
  }
  return out;
};
const n = await hop(`/review/knowledge-hub/${NEW}`);
const o = await hop(`/review/knowledge-hub/${OLD}`);
ok('C7 new review link → 308 → public 200', n.join(' ') === `308 /knowledge-hub/${NEW} 200`, n.join(' → '));
ok('C7 old (Clintonville) review link → 2 hops → public 200', o.join(' ') === `308 /review/knowledge-hub/${NEW} 308 /knowledge-hub/${NEW} 200`, o.join(' → '));
{ const x = await get(`/knowledge-hub/${OLD}`); ok('C7 old public URL still 404 (no new redirect)', x.r.status === 404, String(x.r.status)); }

// ── C10: nothing else changed ──
for (const s of OTHER_DRAFTS) {
  const rv = await fetch(`${BASE}/review/knowledge-hub/${s}`, { headers: A, redirect: 'manual' });
  const pb = await fetch(`${BASE}/knowledge-hub/${s}`, { redirect: 'manual' });
  ok(`C10 ${s}: review 200, public 404`, rv.status === 200 && pb.status === 404, `${rv.status}/${pb.status}`);
}
{ const x = await get(`/knowledge-hub/${LAUNCH}`); ok(`C10 ${LAUNCH} still 200`, x.r.status === 200, String(x.r.status)); }

console.log(`Brief 210 post-publish checks — ${BASE}\n` + res.join('\n'));
const fails = res.filter((l) => l.startsWith('FAIL')).length;
console.log(`\n${res.length - fails}/${res.length} PASS`);
process.exitCode = fails ? 1 : 0;
