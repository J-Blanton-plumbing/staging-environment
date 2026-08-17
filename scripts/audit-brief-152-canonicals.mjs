/**
 * Brief 152, Fix 2 Step 1 — the GATING canonical audit.
 *
 * Walks every URL the app can serve and records, per URL:
 *   request_url, http_status, declared_canonical, canonical_matches_self (Y/N)
 *
 * A row with `canonical_matches_self = N` is a page that answers 200 while
 * pointing Google at a DIFFERENT URL — i.e. a duplicate twin that should be a
 * 301 instead. Those rows, and only those rows, are eligible for conversion in
 * Fix 2 Step 2. Nothing may be redirected that does not appear here.
 *
 * Written as plain ESM (not ts-node) so it needs no DB connection and no build:
 * the URL inventory is assembled from the LIVE sitemap plus the repo's own
 * redirect sources.
 *
 * Usage:
 *   node scripts/audit-brief-152-canonicals.mjs [--base=https://jblantonplumbing.com]
 *                                               [--out=briefs/brief-152-canonical-audit.csv]
 *                                               [--legacy-sample=300] [--concurrency=8]
 *
 * `--legacy-sample` bounds how many of the ~6,800 generated legacy-redirect
 * sources are probed (evenly spaced across the file). They are redirect sources
 * by construction, so a sample is enough to prove the class behaves; the
 * hand-written rules and every sitemap URL are always probed in full.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=') || 'true'];
  })
);
const BASE = (args.get('base') || 'https://jblantonplumbing.com').replace(/\/+$/, '');
const OUT = resolve(REPO, args.get('out') || 'briefs/brief-152-canonical-audit.csv');
const LEGACY_SAMPLE = Number(args.get('legacy-sample') ?? 300);
const CONCURRENCY = Number(args.get('concurrency') ?? 8);

/** Every <loc> in the live sitemap, as paths. */
async function sitemapPaths() {
  const res = await fetch(`${BASE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap.xml returned ${res.status}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (locs.length === 0) throw new Error('sitemap.xml contained no <loc> entries');
  return locs.map((u) => new URL(u).pathname || '/');
}

/** Sources of the hand-written next.config.mjs rules (public ones only). */
async function configRedirectSources() {
  const cfg = (await import(new URL('../next.config.mjs', import.meta.url))).default;
  const rules = await cfg.redirects();
  return rules
    .map((r) => r.source)
    // Parameterised rules (/jb-articles/:slug) can't be probed as-is, and
    // /admin/* is not a search surface.
    .filter((s) => !s.includes(':') && !s.startsWith('/admin'));
}

/** Evenly-spaced sample of the generated legacy redirect map's sources. */
async function legacySources(limit) {
  const raw = await readFile(resolve(REPO, 'src/lib/redirects/legacy-redirect-map.json'), 'utf8');
  const rows = JSON.parse(raw);
  if (limit <= 0 || rows.length <= limit) return rows.map((r) => r.from);
  const step = rows.length / limit;
  return Array.from({ length: limit }, (_, i) => rows[Math.floor(i * step)].from);
}

/**
 * `/{city}/{service}` combo pages are ~10k URLs and are deliberately absent from
 * the sitemap, so they are sampled from the legacy map's TARGETS — every one of
 * those is a live combo URL by construction, which makes it a real sample rather
 * than a guess at which service rows exist.
 */
async function cityServiceSample(limit) {
  const raw = await readFile(resolve(REPO, 'src/lib/redirects/legacy-redirect-map.json'), 'utf8');
  const combos = [
    ...new Set(
      JSON.parse(raw)
        .map((r) => r.to)
        .filter((to) => typeof to === 'string' && /^\/[a-z0-9-]+\/[a-z0-9-]+$/.test(to))
        .filter((to) => !to.startsWith('/services/') && !to.startsWith('/knowledge-hub/'))
    ),
  ];
  if (combos.length <= limit) return combos;
  const step = combos.length / limit;
  return Array.from({ length: limit }, (_, i) => combos[Math.floor(i * step)]);
}

/** Keys of CITY_SLUG_TO_HUB_ALIAS — service slugs whose hub lives elsewhere. */
async function hubAliasSources() {
  const src = await readFile(resolve(REPO, 'src/lib/content/service-taxonomy.ts'), 'utf8');
  const block = src.match(/CITY_SLUG_TO_HUB_ALIAS[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!block) throw new Error('could not locate CITY_SLUG_TO_HUB_ALIAS in service-taxonomy.ts');
  const keys = [...block[1].matchAll(/'([a-z0-9-]+)'\s*:/g)].map((m) => `/${m[1]}`);
  if (keys.length === 0) throw new Error('CITY_SLUG_TO_HUB_ALIAS parsed to zero keys');
  return keys;
}

const CANONICAL_RE = /<link[^>]+rel=["']canonical["'][^>]*>/i;
const HREF_RE = /href=["']([^"']+)["']/i;

/** Fetch one URL; read only enough body to find the canonical link. */
async function probe(path) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'jbp-brief152-audit' } });
    const status = res.status;
    const location = res.headers.get('location') || '';
    let canonical = '';
    if (status === 200 && (res.headers.get('content-type') || '').includes('html')) {
      const head = await readHead(res);
      const tag = head.match(CANONICAL_RE);
      if (tag) canonical = (tag[0].match(HREF_RE) || ['', ''])[1];
    } else {
      // Drain so the socket is reusable.
      await res.arrayBuffer().catch(() => {});
    }
    return { path, url, status, location, canonical };
  } catch (err) {
    return { path, url, status: 0, location: '', canonical: '', error: String(err) };
  }
}

/** Read the response until </head> or 96 KB, whichever comes first. */
async function readHead(res) {
  if (!res.body) return await res.text();
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    while (buf.length < 96 * 1024) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      if (buf.includes('</head>')) break;
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return buf;
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  let done = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
        done++;
        if (done % 100 === 0) process.stderr.write(`  …${done}/${items.length}\n`);
      }
    })
  );
  return out;
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const main = async () => {
  console.log(`[audit] base = ${BASE}`);
  const [sitemap, configSrc, legacySrc, combos, hubAliases] = await Promise.all([
    sitemapPaths(),
    configRedirectSources(),
    legacySources(LEGACY_SAMPLE),
    cityServiceSample(120),
    hubAliasSources(),
  ]);

  // Trailing-slash twins of a representative slice — the Fix 1 class. Probing
  // all ~1,100 would double the crawl for no extra information: the rule is
  // path-shaped, not page-shaped.
  const slashTwins = [
    '/',
    ...sitemap.filter((p) => p !== '/').slice(0, 40),
    ...configSrc.slice(0, 10),
  ]
    .filter((p) => p !== '/')
    .map((p) => `${p}/`);

  const groups = [
    ['sitemap', sitemap],
    ['config-redirect-source', configSrc],
    ['legacy-redirect-source (sampled)', legacySrc],
    ['city-service combo (sampled)', combos],
    ['hub-alias slug', hubAliases],
    ['trailing-slash twin (sampled)', slashTwins],
    ['known-dead / brief-named', ['/hoa-line-piping', '/hoa-pipe-lining', '/hoa-pipe-lining/team', '/hoa-pipe-lining/reserve-studies', '/bathroom-plumbing', '/Evanston', '/this-page-does-not-exist-xyz123']],
  ];

  const seen = new Set();
  const queue = [];
  for (const [group, paths] of groups) {
    for (const p of paths) {
      if (seen.has(p)) continue;
      seen.add(p);
      queue.push({ path: p, group });
    }
  }
  console.log(`[audit] ${queue.length} unique URLs to probe (concurrency ${CONCURRENCY})`);

  const results = await mapLimit(queue, CONCURRENCY, async (item) => ({
    ...(await probe(item.path)),
    group: item.group,
  }));

  const rows = results.map((r) => {
    const self = `${BASE}${r.path === '/' ? '' : r.path}`;
    let matches;
    if (r.status !== 200) matches = 'n/a';
    else if (!r.canonical) matches = 'MISSING';
    else matches = r.canonical.replace(/\/+$/, '') === self.replace(/\/+$/, '') ? 'Y' : 'N';
    return {
      request_url: r.url,
      http_status: r.status,
      declared_canonical: r.canonical,
      canonical_matches_self: matches,
      redirect_location: r.location,
      source_group: r.group,
    };
  });

  const header = Object.keys(rows[0]);
  const csv = [header.join(','), ...rows.map((row) => header.map((h) => csvCell(row[h])).join(','))].join('\n');
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, `${csv}\n`, 'utf8');

  const tally = rows.reduce((acc, r) => {
    acc[r.canonical_matches_self] = (acc[r.canonical_matches_self] ?? 0) + 1;
    return acc;
  }, {});
  const statuses = rows.reduce((acc, r) => {
    acc[r.http_status] = (acc[r.http_status] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\n[audit] wrote ${rows.length} rows to ${OUT}`);
  console.log(`[audit] statuses: ${JSON.stringify(statuses)}`);
  console.log(`[audit] canonical_matches_self: ${JSON.stringify(tally)}`);

  const mismatches = rows.filter((r) => r.canonical_matches_self === 'N');
  console.log(`\n===== ${mismatches.length} MISMATCH (N) ROW(S) — the Fix 2 Step 2 candidate set =====`);
  for (const m of mismatches) console.log(`  200 ${m.request_url}  →  canonical ${m.declared_canonical}   [${m.source_group}]`);

  const missing = rows.filter((r) => r.canonical_matches_self === 'MISSING');
  console.log(`\n===== ${missing.length} row(s) that 200 with NO canonical tag =====`);
  for (const m of missing) console.log(`  200 ${m.request_url}   [${m.source_group}]`);

  const dead = rows.filter((r) => r.source_group === 'sitemap' && r.http_status !== 200);
  console.log(`\n===== ${dead.length} sitemap URL(S) that do not return 200 =====`);
  for (const d of dead) console.log(`  ${d.http_status} ${d.request_url}  → ${d.redirect_location}`);

  const chains = rows.filter((r) => [301, 302, 307, 308].includes(r.http_status) && r.redirect_location);
  console.log(`\n[audit] ${chains.length} redirecting URLs recorded (chain depth is checked separately).`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
