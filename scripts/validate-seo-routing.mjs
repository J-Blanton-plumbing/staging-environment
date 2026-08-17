/**
 * Brief 152 (Fix 3) — LIVE SEO/routing validator. Runs against a serving app, so
 * it can assert the things the build-time validator provably cannot: that a
 * CMS-driven URL is actually published, and that the page's RENDERED canonical
 * equals the sitemap URL exactly.
 *
 * Wired into deploy.yml's post-deploy health-check step (against
 * http://localhost:3000, i.e. the app itself rather than nginx) so a violation
 * turns the deploy red. `scripts/validate-sitemap.ts` is its build-time
 * counterpart and runs as `prebuild`.
 *
 * Phases:
 *   1. SITEMAP     — /sitemap.xml is a <sitemapindex>; every child fetches; every
 *                    <loc> across every child returns 200 and declares a canonical
 *                    equal to itself. This is the check that would have caught
 *                    /hoa-line-piping (404, advertised in sitemap.xml for weeks).
 *   2. ROBOTS      — robots.txt carries no `Disallow` line and does advertise the
 *                    sitemap (Brief 152 Fix 4).
 *   3. NOINDEX     — /admin and /api answer `X-Robots-Tag: noindex`, while
 *                    /robots.txt and /sitemap.xml do NOT.
 *   4. REDIRECTS   — a trailing-slash URL, an alias slug, a slashed alias, a
 *                    `/{city}/{category}` and a WordPress duplicate-slug artifact
 *                    each reach a 200 in exactly ONE hop, with a permanent status.
 *
 * Usage:
 *   node scripts/validate-seo-routing.mjs [--base=http://localhost:3000]
 *                                         [--articles-sample=60]
 *                                         [--city-services-sample=40]
 *                                         [--concurrency=6]
 *
 * Brief 153 moved the sitemap to an index with children, one of which
 * (/sitemap-city-services-N.xml) carries 11,160 URLs. Two independent bounds
 * exist so a deploy health check stays quick:
 *
 *   --articles-sample=N        bounds /knowledge-hub/*        (812 URLs)
 *   --city-services-sample=N   bounds /{city}/{service}       (11,160 URLs)
 *
 * `0` means "all". EVERY other sitemap URL is checked in full on every run, and
 * the script prints exactly how many of each class it skipped, so a bounded run
 * can never read as full coverage. Samples are evenly spaced across the list,
 * never truncated, so they span every shard.
 */

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=') || 'true'];
  })
);
const BASE = (args.get('base') || 'http://localhost:3000').replace(/\/+$/, '');
const ARTICLES_SAMPLE = Number(args.get('articles-sample') ?? 60);
const CITY_SERVICES_SAMPLE = Number(args.get('city-services-sample') ?? 40);
const CONCURRENCY = Number(args.get('concurrency') ?? 6);
/**
 * The sitemap always emits the PRODUCTION origin (CANONICAL_BASE), by design —
 * staging must never advertise its own hostname. So when probing a non-production
 * base, each <loc> is re-pointed at BASE and the canonical is compared against
 * the sitemap's own origin.
 */
const failures = [];
const warnings = [];
const fail = (msg) => failures.push(msg);

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    })
  );
  return out;
}

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

const strip = (u) => u.replace(/\/+$/, '');

// ── Phase 1: sitemap index + children ───────────────────────────────────────

/** Evenly-spaced sample across the WHOLE list — never `slice(0, n)`, which would
 *  only ever exercise the first shard and the alphabetically-earliest cities. */
function spread(list, n) {
  if (n <= 0 || list.length <= n) return list;
  const step = list.length / n;
  return Array.from({ length: n }, (_, i) => list[Math.floor(i * step)]);
}

async function fetchLocs(url, tag) {
  const res = await fetch(url, { headers: { 'user-agent': 'jbp-seo-validate' } });
  if (!res.ok) {
    await res.arrayBuffer().catch(() => {});
    fail(`${tag} returned ${res.status} — ${url}`);
    return null;
  }
  const xml = await res.text();
  return {
    xml,
    locs: [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim()),
  };
}

async function checkSitemap() {
  const index = await fetchLocs(`${BASE}/sitemap.xml`, 'sitemap.xml');
  if (!index) return;

  // Brief 153: /sitemap.xml is an INDEX. A flat <urlset> here means the index
  // was reverted and the ~11,160 /{city}/{service} URLs are invisible again.
  if (!/<sitemapindex[\s>]/.test(index.xml)) {
    fail(
      'sitemap.xml is not a <sitemapindex>. Brief 153 Track B replaced the flat urlset with an ' +
        'index; a flat file here means the whole /{city}/{service} layer is missing from the sitemap.'
    );
    return;
  }
  if (index.locs.length === 0) {
    fail('sitemap.xml is a <sitemapindex> with no children.');
    return;
  }

  // Fetch every child. A child that 404s is the /hoa-line-piping defect one
  // level up: the index advertises something that does not serve.
  const locs = [];
  const cityServiceLocs = new Set();
  for (const childLoc of index.locs) {
    const childPath = new URL(childLoc).pathname;
    const child = await fetchLocs(`${BASE}${childPath}`, `sitemap child ${childPath}`);
    if (!child) continue;
    if (child.locs.length === 0) {
      fail(`sitemap child ${childPath} contained no <loc> entries.`);
      continue;
    }
    console.log(`[seo-validate]   child ${childPath.padEnd(32)} ${child.locs.length} URLs`);
    locs.push(...child.locs);
    if (childPath.startsWith('/sitemap-city-services-')) {
      for (const l of child.locs) cityServiceLocs.add(l);
    }
  }
  if (locs.length === 0) {
    fail('sitemap index children contained no <loc> entries between them.');
    return;
  }

  const dupes = locs.length - new Set(locs).size;
  if (dupes > 0) {
    fail(`${dupes} URL(s) appear in more than one sitemap child — each URL must be listed once.`);
  }

  const articles = locs.filter((u) => u.includes('/knowledge-hub/'));
  const cityServices = [...cityServiceLocs];
  const others = locs.filter((u) => !u.includes('/knowledge-hub/') && !cityServiceLocs.has(u));

  const articleSlice = spread(articles, ARTICLES_SAMPLE);
  const cityServiceSlice = spread(cityServices, CITY_SERVICES_SAMPLE);
  const targets = [...others, ...articleSlice, ...cityServiceSlice];

  console.log(
    `[seo-validate] sitemap index: ${index.locs.length} children, ${locs.length} URLs total.\n` +
      `[seo-validate]   checking ${others.length}/${others.length} pages+cities (all), ` +
      `${articleSlice.length}/${articles.length} articles ` +
      `(${articles.length - articleSlice.length} NOT checked), ` +
      `${cityServiceSlice.length}/${cityServices.length} city-services ` +
      `(${cityServices.length - cityServiceSlice.length} NOT checked).`
  );

  const results = await mapLimit(targets, CONCURRENCY, async (loc) => {
    const declared = new URL(loc);
    const probe = `${BASE}${declared.pathname === '/' ? '/' : declared.pathname}`;
    try {
      const r = await fetch(probe, { redirect: 'manual', headers: { 'user-agent': 'jbp-seo-validate' } });
      if (r.status !== 200) {
        await r.arrayBuffer().catch(() => {});
        return { loc, status: r.status, canonical: '', location: r.headers.get('location') || '' };
      }
      const head = await readHead(r);
      const tag = head.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
      const canonical = tag ? (tag[0].match(/href=["']([^"']+)["']/i) || ['', ''])[1] : '';
      return { loc, status: 200, canonical, location: '' };
    } catch (err) {
      return { loc, status: 0, canonical: '', location: '', error: String(err) };
    }
  });

  for (const r of results) {
    if (r.status !== 200) {
      fail(
        `SITEMAP URL DOES NOT SERVE: ${r.loc} → ${r.status}${r.location ? ` (Location: ${r.location})` : ''}` +
          `${r.error ? ` (${r.error})` : ''}. Remove it from the sitemap or fix the route.`
      );
      continue;
    }
    if (!r.canonical) {
      fail(`SITEMAP URL HAS NO CANONICAL: ${r.loc} returns 200 but declares no <link rel="canonical">.`);
      continue;
    }
    if (strip(r.canonical) !== strip(r.loc)) {
      fail(
        `CANONICAL MISMATCH: sitemap lists ${r.loc} but the page declares ${r.canonical}. ` +
          'A sitemap must list only self-canonical URLs — the non-self URL should 301 instead.'
      );
    }
  }
}

// ── Phase 2: robots.txt ─────────────────────────────────────────────────────
async function checkRobots() {
  const res = await fetch(`${BASE}/robots.txt`);
  if (!res.ok) return fail(`robots.txt returned ${res.status}.`);
  const body = await res.text();
  const disallows = body.split('\n').filter((l) => /^\s*Disallow\s*:\s*\S/i.test(l));
  if (/Disallow:\s*\/\s*$/im.test(body)) {
    // A whole-site Disallow means this host is deliberately opted out
    // (ROBOTS_DISALLOW=1 / off-brand host) — not a Brief 152 violation.
    warnings.push('robots.txt serves a site-wide `Disallow: /` — this host is opted out of crawling.');
    return;
  }
  for (const line of disallows) {
    fail(
      `robots.txt still carries "${line.trim()}". Brief 152 Fix 4 removed every Disallow: ` +
        'blocking the crawl makes the X-Robots-Tag noindex unreadable, which is what left 25 ' +
        'URLs permanently stuck in the index.'
    );
  }
  if (!/^Sitemap:\s*https?:\/\/\S+\/sitemap\.xml/im.test(body)) {
    fail('robots.txt no longer advertises the sitemap.');
  }
}

// ── Phase 3: X-Robots-Tag ───────────────────────────────────────────────────
async function checkNoindexHeaders() {
  for (const p of ['/admin', '/admin/login', '/api/cms/pages']) {
    const r = await fetch(`${BASE}${p}`, { redirect: 'manual' });
    await r.arrayBuffer().catch(() => {});
    const tag = r.headers.get('x-robots-tag') || '';
    if (!/noindex/i.test(tag)) {
      fail(`${p} answered ${r.status} with X-Robots-Tag "${tag || '(absent)'}" — expected noindex, nofollow.`);
    }
  }
  for (const p of ['/robots.txt', '/sitemap.xml', '/']) {
    const r = await fetch(`${BASE}${p}`, { redirect: 'manual' });
    await r.arrayBuffer().catch(() => {});
    const tag = r.headers.get('x-robots-tag');
    if (tag) fail(`${p} must NOT carry an X-Robots-Tag header, but sent "${tag}".`);
  }
}

// ── Phase 4: redirects reach a 200 in one hop ───────────────────────────────
const PERMANENT = [301, 308];

async function hops(startPath, max = 6) {
  const chain = [];
  let url = new URL(startPath, BASE).toString();
  for (let i = 0; i < max; i++) {
    const r = await fetch(url, { redirect: 'manual' });
    const loc = r.headers.get('location');
    chain.push({ url, status: r.status, location: loc || '' });
    await r.arrayBuffer().catch(() => {});
    if (!loc || r.status < 300 || r.status >= 400) return chain;
    url = new URL(loc, url).toString();
  }
  return chain;
}

async function checkRedirects() {
  const cases = [
    { path: '/evanston/', label: 'trailing slash on a live page' },
    { path: '/bathroom-plumbing', label: 'alias slug (WordPress Redirection id 1)' },
    { path: '/bathroom-plumbing/', label: 'slashed alias — must NOT chain through /bathroom-plumbing' },
    { path: '/why-us/', label: 'slashed config redirect source' },
    { path: '/hoa-line-piping', label: 'corrected HOA slug (Brief 152 Fix 2.4)' },
    { path: '/clogged-drains', label: 'derived hub alias' },
    // Brief 153 Track C — the city-scoped category rule, both the /services/*
    // arm and the /emergency-plumbing arm.
    { path: '/keeneyville/drain', label: 'city-scoped category → /services/drain' },
    { path: '/algonquin/emergency', label: 'city-scoped category → /emergency-plumbing' },
    { path: '/keeneyville/drain/', label: 'slashed city-scoped category — must not chain' },
    // Brief 153 Track D — a service with a hub page but no per-city content file,
    // and a WordPress duplicate-slug artifact.
    { path: '/fort-sheridan/laundry-room-plumbing', label: 'hub-only service → /laundry-room-plumbing' },
    { path: '/naperville/shower-repair-3', label: 'WP duplicate-slug artifact (-3)' },
    { path: '/catch-basin-2', label: 'WP duplicate-slug artifact, single segment' },
  ];
  for (const c of cases) {
    const chain = await hops(c.path);
    const redirects = chain.filter((h) => h.status >= 300 && h.status < 400);
    const last = chain[chain.length - 1];
    if (redirects.length === 0) {
      fail(`${c.path} (${c.label}) did not redirect at all — got ${last.status}.`);
      continue;
    }
    if (redirects.length > 1) {
      fail(
        `REDIRECT CHAIN: ${c.path} (${c.label}) took ${redirects.length} hops — ` +
          chain.map((h) => `${h.status} ${new URL(h.url).pathname}`).join(' → ')
      );
    }
    for (const h of redirects) {
      if (!PERMANENT.includes(h.status)) {
        fail(`${c.path}: hop ${new URL(h.url).pathname} used ${h.status}, not a permanent redirect.`);
      }
    }
    if (last.status !== 200) {
      fail(`${c.path} (${c.label}) ended on ${last.status} at ${last.url}, not a 200.`);
    }
  }

  // The root must never redirect.
  const root = await hops('/');
  if (root.length !== 1 || root[0].status !== 200) {
    fail(`"/" must serve 200 with no redirect — got ${root.map((h) => h.status).join(' → ')}.`);
  }
}

const main = async () => {
  console.log(`[seo-validate] base = ${BASE}`);
  await checkSitemap();
  await checkRobots();
  await checkNoindexHeaders();
  await checkRedirects();

  for (const w of warnings) console.log(`[seo-validate] NOTE: ${w}`);
  if (failures.length > 0) {
    console.error(`\n${'!'.repeat(72)}\n[seo-validate] FAILED — ${failures.length} violation(s):\n`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    console.error(`${'!'.repeat(72)}\n`);
    process.exit(1);
  }
  console.log('[seo-validate] OK — sitemap self-canonical and serving, robots clean, noindex headers set, no redirect chains.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
