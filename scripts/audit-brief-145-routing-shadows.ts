/**
 * Brief 145 Track A — sitewide routing-shadow audit. READ-ONLY.
 *
 * WHY THIS EXISTS
 * ---------------
 * `/sewer-rodding` is served by a hand-built top-level route that reads
 * `service_category_pages`, while a `sub_service_pages` row for the same slug
 * exists, is published, is editable in the CMS — and never renders. An editor
 * who opens that row, edits it and saves sees their change silently vanish.
 * Nobody knew how many other rows behave that way. This script answers that,
 * mechanically, from the actual route tree and the actual database.
 *
 * WHAT IT DOES
 * ------------
 * Two passes, in both directions:
 *
 *   ROW → ROUTE   For every row in every CMS page table, compute the URL the row
 *                 is supposed to render at, then determine what actually serves
 *                 that URL and from which source. Classify:
 *                   RENDERS        the row is the live source for its page
 *                   SHADOWED       the page renders, but from another source
 *                   DEAD-404       the URL is not served at all
 *                   DEAD-REDIRECT  the URL 301s away before rendering
 *
 *   ROUTE → SOURCE  For every public route, record where its content actually
 *                 comes from, and flag every route rendering from static/
 *                 hardcoded data while a plausibly-matching CMS row exists.
 *
 * The route→source mapping is a hand-maintained table (ROUTE_SOURCES below)
 * derived by reading every `src/app/**\/page.tsx`. It is asserted against the
 * filesystem at run time: a route file with no entry, or an entry with no route
 * file, fails the run. That is what keeps it honest as routes come and go.
 *
 * WRITES NOTHING. Opens the DB read-only, prints a report, and writes a JSON +
 * Markdown artifact under `scripts/backups/` for the brief report.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/audit-brief-145-routing-shadows.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import { CITY_REGISTRY } from '@/lib/content/cities';
import { getAllServiceSlugs } from '@/lib/content/city-services';
import { SERVICE_CATEGORY_SLUGS } from '@/lib/services';
import { normalizePath } from '@/lib/seo';

const REPO_ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(REPO_ROOT, 'src', 'app');

const env = fs.existsSync(path.join(REPO_ROOT, '.env.local'))
  ? fs.readFileSync(path.join(REPO_ROOT, '.env.local'), 'utf8')
  : '';
function envGet(k: string): string {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
}

const pool = new Pool({
  connectionString: envGet('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

// ── Redirects that fire BEFORE any page renders ──────────────────────────────
// Mirrored by hand from next.config.mjs `redirects()`. Asserted below against
// the actual file so it cannot silently drift.
const CONFIG_REDIRECTS: Record<string, string> = {
  '/why-us': '/why-j-blanton',
  '/plumbing': '/services/plumbing',
  '/sewer': '/services/sewer',
  '/drain': '/services/drain',
  '/water-heater': '/services/water-heater',
  '/water-quality': '/services/water-quality',
  '/commercial': '/services/commercial',
  '/emergency': '/emergency-plumbing',
  '/services/hydro-jetting': '/hydro-jetting',
  '/services/sewer-rodding': '/sewer-rodding',
  '/services/emergency-plumbing': '/emergency-plumbing',
  '/reviews': '/customer-stories',
  '/gas-lines-chicago': '/gas-lines',
  '/contact-us': '/contact',
  '/booking': '/contact',
};

/** The checked-in legacy map consumed by middleware (Brief 131). */
function loadLegacyRedirects(): Map<string, string> {
  const p = path.join(REPO_ROOT, 'src', 'lib', 'redirects', 'legacy-redirect-map.json');
  const out = new Map<string, string>();
  if (!fs.existsSync(p)) return out;
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  const rows: Array<{ from: string; to: string; status: number }> = Array.isArray(raw)
    ? raw
    : raw.redirects ?? [];
  for (const r of rows) out.set(normalizePath(r.from), r.to);
  return out;
}

// ── Route → content source ───────────────────────────────────────────────────

type SourceKind =
  /** Content comes from this CMS table and edits to it appear on the page. */
  | 'cms'
  /** Page renders from hardcoded TS content only — no CMS table is consulted. */
  | 'static'
  /** Route file exists but the router never reaches it. */
  | 'dead-code'
  /** Not a public content route (admin, api, redirect stub). */
  | 'n/a';

interface RouteSource {
  /** Route path as served, or a description for dynamic routes. */
  route: string;
  kind: SourceKind;
  /** CMS table(s) actually read at render time, in precedence order. */
  tables: string[];
  /** Static content module also merged in (CMS wins per-field where noted). */
  staticSource?: string;
  note?: string;
}

/**
 * Every public route in src/app, with the source its content ACTUALLY comes
 * from — established by reading the route file, not by inferring from the path.
 *
 * `dirRoute` is the directory path under src/app (used for the filesystem
 * assertion); it is omitted for dynamic routes, which are listed separately.
 */
const ROUTE_SOURCES: Array<RouteSource & { dirRoute: string }> = [
  { dirRoute: '/', route: '/', kind: 'cms', tables: ['main_pages(home)'], staticSource: 'lib/content/home.ts', note: 'getMainPage("home"); static fallback' },

  // ── main_pages-backed routes ──────────────────────────────────────────────
  { dirRoute: '/why-j-blanton', route: '/why-j-blanton', kind: 'cms', tables: ['main_pages(why-j-blanton)'], staticSource: 'lib/content/why-j-blanton.ts' },
  { dirRoute: '/no-drip-club', route: '/no-drip-club', kind: 'cms', tables: ['main_pages(no-drip-club)'], staticSource: 'lib/content/ndc.ts' },
  { dirRoute: '/knowledge-hub', route: '/knowledge-hub', kind: 'cms', tables: ['main_pages(knowledge-hub)', 'cms_articles'], staticSource: 'lib/content/knowledge-hub.ts' },
  { dirRoute: '/customer-stories', route: '/customer-stories', kind: 'cms', tables: ['main_pages(customer-stories)'], staticSource: 'lib/content/customer-stories.ts' },
  { dirRoute: '/financing', route: '/financing', kind: 'cms', tables: ['main_pages(financing)'], staticSource: 'lib/content/financing.ts' },
  { dirRoute: '/locations', route: '/locations', kind: 'cms', tables: ['main_pages(locations)'], staticSource: 'lib/content/cities' },
  { dirRoute: '/help-and-support', route: '/help-and-support', kind: 'cms', tables: ['main_pages(help-and-support)'], staticSource: 'lib/content/help-and-support.ts' },
  { dirRoute: '/privacy-policy', route: '/privacy-policy', kind: 'cms', tables: ['main_pages(privacy-policy)'], staticSource: 'lib/content/privacy-policy.ts' },
  { dirRoute: '/j-blanton-is-hiring', route: '/j-blanton-is-hiring', kind: 'cms', tables: ['main_pages(j-blanton-is-hiring)'], staticSource: 'lib/content/is-hiring.ts' },

  // ── service_category_pages-backed routes ──────────────────────────────────
  { dirRoute: '/services/plumbing', route: '/services/plumbing', kind: 'cms', tables: ['service_category_pages(plumbing)'], staticSource: 'lib/content/plumbing.ts' },
  { dirRoute: '/services/sewer', route: '/services/sewer', kind: 'cms', tables: ['service_category_pages(sewer)'], staticSource: 'lib/content/sewer.ts' },
  { dirRoute: '/services/drain', route: '/services/drain', kind: 'cms', tables: ['service_category_pages(drain)'], staticSource: 'lib/content/drain.ts' },
  { dirRoute: '/services/water-heater', route: '/services/water-heater', kind: 'cms', tables: ['service_category_pages(water-heater)'], staticSource: 'lib/content/water-heater.ts' },
  { dirRoute: '/services/water-quality', route: '/services/water-quality', kind: 'cms', tables: ['service_category_pages(water-quality)'], staticSource: 'lib/content/water-quality.ts' },
  { dirRoute: '/services/commercial', route: '/services/commercial', kind: 'cms', tables: ['service_category_pages(commercial)'], staticSource: 'lib/content/commercial.ts' },

  // ── The two hand-built service routes at the heart of this brief ──────────
  {
    dirRoute: '/sewer-rodding',
    route: '/sewer-rodding',
    kind: 'cms',
    tables: ['service_category_pages(sewer-rodding)'],
    staticSource: 'lib/content/services/sewer-rodding.ts',
    note:
      'Reads getServiceCmsContent() = service_category_pages, NOT sub_service_pages. ' +
      'Only hero_heading/hero_intro/problems_heading/problems_items are merged; every other ' +
      'field is the static file. The sub_service_pages row of the same slug is shadowed.',
  },
  {
    dirRoute: '/hydro-jetting',
    route: '/hydro-jetting',
    kind: 'cms',
    tables: ['service_category_pages(hydro-jetting)'],
    staticSource: 'lib/content/services/hydro-jetting.ts',
    note: 'Same shape as /sewer-rodding — service_category_pages, not sub_service_pages.',
  },
  {
    dirRoute: '/gas-lines',
    route: '/gas-lines',
    kind: 'static',
    tables: [],
    staticSource: 'lib/content/services/gas-lines.ts',
    note:
      'Calls getServiceCmsContent("gas-lines") — but there is NO service_category_pages row ' +
      'with that slug, so the call returns null and the page renders 100% static. Both ' +
      'sub_service_pages rows (gas-lines, gas-lines-chicago) are unreachable.',
  },

  // ── sub_service_pages-backed routes (SubServicePageView) ──────────────────
  ...([
    'basement-flooding',
    'bathroom-plumbing-chicago',
    'clogged-drains-in-chicago',
    'commercial-drain-service',
    'commercial-jetting',
    'commercial-water-heater',
    'drain-cleaning-services-in-chicago',
    'home-repipe',
    'kitchen-plumbing',
    'kitchen-sink-drain',
    'laundry-room-plumbing',
    'residential-water-heater',
    'restaurant-drain-clearing',
    'restaurant-plumbing-services',
    'restaurant-water-heater',
    'sewer-maintenance',
    'sewer-repair',
    'tankless-water-heater',
    'water-filtration-systems',
  ].map((slug) => ({
    dirRoute: `/${slug}`,
    route: `/${slug}`,
    kind: 'cms' as SourceKind,
    tables: [`sub_service_pages(${slug})`],
    note: 'SubServicePageView — 404s when the row is missing or unpublished.',
  }))),

  // ── singletons + static pages ─────────────────────────────────────────────
  { dirRoute: '/emergency-plumbing', route: '/emergency-plumbing', kind: 'cms', tables: ['emergency_plumbing_page'], staticSource: 'lib/content/emergency-plumbing.ts' },
  { dirRoute: '/services', route: '/services', kind: 'static', tables: [], staticSource: 'lib/services.ts', note: 'Services index. No CMS row exists for it.' },
  { dirRoute: '/contact', route: '/contact', kind: 'static', tables: [], staticSource: 'lib/content/contact.ts', note: 'Offices come from global_settings; body copy is static. No page row.' },
  { dirRoute: '/thank-you', route: '/thank-you', kind: 'static', tables: [], staticSource: 'lib/content/thank-you.ts', note: 'Brief 129 — deliberately static, no CMS row.' },
  { dirRoute: '/booking', route: '/booking', kind: 'n/a', tables: [], note: '301 → /contact in next.config.mjs; the page.tsx is never reached.' },
];

/** Dynamic routes — not directory-scannable, described explicitly. */
const DYNAMIC_ROUTE_SOURCES: RouteSource[] = [
  { route: '/[city]', kind: 'cms', tables: ['city_pages'], staticSource: 'lib/content/cities', note: 'Renders only for slugs in CITY_REGISTRY; anything else 404s.' },
  { route: '/[city]/[service]', kind: 'cms', tables: ['city_service_pages'], staticSource: 'lib/content/city-services', note: 'Both halves must be in their registry, else 404.' },
  { route: '/knowledge-hub/[slug]', kind: 'cms', tables: ['cms_articles'], note: '404s unless status = published (or an admin session is present).' },
  { route: '/services/[slug]', kind: 'dead-code', tables: ['service_category_pages'], note: 'Shadowed for all 6 canonical slugs by the static /services/<slug> routes (Brief 98). dynamicParams=false + allowlist means it can never serve anything else.' },
];

// ── Classification ───────────────────────────────────────────────────────────

type Verdict = 'RENDERS' | 'PARTIAL' | 'SHADOWED' | 'DEAD-404' | 'DEAD-REDIRECT';

interface Finding {
  table: string;
  id: number | string;
  slug: string;
  url: string;
  verdict: Verdict;
  servedBy: string;
  recommendation: string;
}

const findings: Finding[] = [];
function add(f: Finding) {
  findings.push(f);
}

async function main() {
  // ── Assertions: keep the hand-maintained tables honest ────────────────────
  const configSrc = fs.readFileSync(path.join(REPO_ROOT, 'next.config.mjs'), 'utf8');
  const declaredSources = Array.from(configSrc.matchAll(/source:\s*'([^']+)'/g)).map((m) => m[1]);
  const publicDeclared = declaredSources.filter(
    (s) => !s.startsWith('/admin') && !s.includes(':') && !s.startsWith('/hoa-line-piping')
  );
  const missing = publicDeclared.filter((s) => !(s in CONFIG_REDIRECTS));
  const extra = Object.keys(CONFIG_REDIRECTS).filter((s) => !publicDeclared.includes(s));
  if (missing.length || extra.length) {
    throw new Error(
      `CONFIG_REDIRECTS has drifted from next.config.mjs.\n  missing: ${missing.join(', ')}\n  extra: ${extra.join(', ')}`
    );
  }

  const scanned = new Set(scanStaticRoutes(APP_DIR));
  scanned.add('/');
  const mapped = new Set(ROUTE_SOURCES.map((r) => r.dirRoute));
  const unmapped = [...scanned].filter((r) => !mapped.has(r) && !r.startsWith('/admin'));
  const stale = [...mapped].filter((r) => !scanned.has(r));
  if (unmapped.length || stale.length) {
    throw new Error(
      `ROUTE_SOURCES has drifted from src/app.\n  route with no entry: ${unmapped.join(', ')}\n  entry with no route: ${stale.join(', ')}`
    );
  }

  const legacy = loadLegacyRedirects();
  const cities = new Set(CITY_REGISTRY.map((c) => c.slug));
  const services = new Set(getAllServiceSlugs());
  const categorySlugs = new Set<string>(SERVICE_CATEGORY_SLUGS);
  const subServiceRouteSlugs = new Set(
    ROUTE_SOURCES.filter((r) => r.tables.some((t) => t.startsWith('sub_service_pages'))).map((r) =>
      r.route.slice(1)
    )
  );

  /** Does this exact path redirect away before anything renders? */
  const redirectsTo = (p: string): string | null =>
    CONFIG_REDIRECTS[normalizePath(p)] ?? legacy.get(normalizePath(p)) ?? null;

  // ── main_pages ────────────────────────────────────────────────────────────
  const mainRows = await pool.query<{ id: number; slug: string }>(
    'SELECT id, slug FROM main_pages ORDER BY id'
  );
  for (const r of mainRows.rows) {
    const url = r.slug === 'home' ? '/' : `/${r.slug}`;
    const red = redirectsTo(url);
    if (red) {
      add({ table: 'main_pages', id: r.id, slug: r.slug, url, verdict: 'DEAD-REDIRECT', servedBy: `301 → ${red}`, recommendation: 'review' });
      continue;
    }
    const entry = ROUTE_SOURCES.find((x) => x.route === url);
    if (!entry) {
      add({ table: 'main_pages', id: r.id, slug: r.slug, url, verdict: 'DEAD-404', servedBy: 'no route', recommendation: 'review' });
      continue;
    }
    const reads = entry.tables.some((t) => t === `main_pages(${r.slug})`);
    add({
      table: 'main_pages',
      id: r.id,
      slug: r.slug,
      url,
      verdict: reads ? 'RENDERS' : 'SHADOWED',
      servedBy: `${entry.dirRoute} → ${entry.tables.join(' + ') || entry.staticSource}`,
      recommendation: reads ? '—' : 'review',
    });
  }

  // ── service_category_pages ────────────────────────────────────────────────
  const catRows = await pool.query<{ id: number; slug: string }>(
    'SELECT id, slug FROM service_category_pages ORDER BY id'
  );
  for (const r of catRows.rows) {
    // The canonical URL for a category row is /services/{slug} — that is what
    // the sitemap emits and what canonical-overrides.ts keys on.
    const url = `/services/${r.slug}`;
    const red = redirectsTo(url);
    if (red) {
      // The redirect target may itself read this very row (the /sewer-rodding
      // and /hydro-jetting case) — then the row is NOT dead, its content
      // renders, only its canonical-override path is unreachable.
      const target = ROUTE_SOURCES.find((x) => x.route === red);
      const targetReads = target?.tables.some((t) => t === `service_category_pages(${r.slug})`);
      add({
        table: 'service_category_pages',
        id: r.id,
        slug: r.slug,
        url,
        verdict: targetReads ? 'PARTIAL' : 'DEAD-REDIRECT',
        servedBy: targetReads
          ? `301 → ${red}, which DOES read this row (hero + problems only)`
          : `301 → ${red}`,
        recommendation: targetReads ? 'route-consolidation decision' : 'review',
      });
      continue;
    }
    const entry = ROUTE_SOURCES.find((x) => x.route === url);
    const reads = entry?.tables.some((t) => t === `service_category_pages(${r.slug})`);
    add({
      table: 'service_category_pages',
      id: r.id,
      slug: r.slug,
      url,
      verdict: entry ? (reads ? 'RENDERS' : 'SHADOWED') : 'DEAD-404',
      servedBy: entry ? `${entry.dirRoute} → ${entry.tables.join(' + ')}` : 'no route',
      recommendation: reads ? '—' : 'review',
    });
    if (!categorySlugs.has(r.slug)) {
      // defensive: a category row outside SERVICE_CATEGORY_SLUGS can never be
      // reached through /services/[slug] either.
    }
  }

  // ── sub_service_pages ─────────────────────────────────────────────────────
  const subRows = await pool.query<{ id: number; slug: string; status: string }>(
    'SELECT id, slug, status FROM sub_service_pages ORDER BY id'
  );
  for (const r of subRows.rows) {
    const url = `/${r.slug}`;
    const red = redirectsTo(url);
    if (red) {
      add({
        table: 'sub_service_pages',
        id: r.id,
        slug: r.slug,
        url,
        verdict: 'DEAD-REDIRECT',
        servedBy: `301 → ${red}`,
        recommendation: 'Track C — marketing decision',
      });
      continue;
    }
    if (subServiceRouteSlugs.has(r.slug)) {
      add({
        table: 'sub_service_pages',
        id: r.id,
        slug: r.slug,
        url,
        verdict: r.status === 'published' ? 'RENDERS' : 'DEAD-404',
        servedBy:
          r.status === 'published'
            ? `${url} → SubServicePageView → sub_service_pages`
            : `${url} → 404 (status = ${r.status})`,
        recommendation: r.status === 'published' ? '—' : 'publish or delete',
      });
      continue;
    }
    const entry = ROUTE_SOURCES.find((x) => x.route === url);
    if (!entry) {
      add({ table: 'sub_service_pages', id: r.id, slug: r.slug, url, verdict: 'DEAD-404', servedBy: 'no route', recommendation: 'review' });
      continue;
    }
    add({
      table: 'sub_service_pages',
      id: r.id,
      slug: r.slug,
      url,
      verdict: 'SHADOWED',
      servedBy: `${entry.dirRoute} → ${entry.tables.join(' + ') || 'static: ' + entry.staticSource}`,
      recommendation: 'route-consolidation decision',
    });
  }

  // ── city_pages ────────────────────────────────────────────────────────────
  const cityRows = await pool.query<{ id: number; city_slug: string }>(
    'SELECT id, city_slug FROM city_pages ORDER BY city_slug'
  );
  for (const r of cityRows.rows) {
    const url = `/${r.city_slug}`;
    const red = redirectsTo(url);
    if (red) {
      add({ table: 'city_pages', id: r.id, slug: r.city_slug, url, verdict: 'DEAD-REDIRECT', servedBy: `301 → ${red}`, recommendation: 'delete row or re-slug' });
      continue;
    }
    // A city slug that collides with a static route loses: the static route wins.
    const collide = ROUTE_SOURCES.find((x) => x.route === url);
    if (collide) {
      add({ table: 'city_pages', id: r.id, slug: r.city_slug, url, verdict: 'SHADOWED', servedBy: `static route ${collide.dirRoute}`, recommendation: 'review' });
      continue;
    }
    if (!cities.has(r.city_slug)) {
      add({ table: 'city_pages', id: r.id, slug: r.city_slug, url, verdict: 'DEAD-404', servedBy: 'not in CITY_REGISTRY → [city] 404s', recommendation: 'register the city or delete the row' });
      continue;
    }
    add({ table: 'city_pages', id: r.id, slug: r.city_slug, url, verdict: 'RENDERS', servedBy: '/[city] → city_pages', recommendation: '—' });
  }

  // ── city_service_pages ────────────────────────────────────────────────────
  const csRows = await pool.query<{ id: number; city_slug: string; service_slug: string }>(
    'SELECT id, city_slug, service_slug FROM city_service_pages ORDER BY city_slug, service_slug'
  );
  for (const r of csRows.rows) {
    const url = `/${r.city_slug}/${r.service_slug}`;
    const red = redirectsTo(url);
    if (red) {
      add({ table: 'city_service_pages', id: r.id, slug: `${r.city_slug}/${r.service_slug}`, url, verdict: 'DEAD-REDIRECT', servedBy: `301 → ${red}`, recommendation: 'delete row or re-slug' });
      continue;
    }
    const cityOk = cities.has(r.city_slug);
    const svcOk = services.has(r.service_slug);
    if (cityOk && svcOk) {
      add({ table: 'city_service_pages', id: r.id, slug: `${r.city_slug}/${r.service_slug}`, url, verdict: 'RENDERS', servedBy: '/[city]/[service] → city_service_pages', recommendation: '—' });
    } else {
      add({
        table: 'city_service_pages',
        id: r.id,
        slug: `${r.city_slug}/${r.service_slug}`,
        url,
        verdict: 'DEAD-404',
        servedBy: !cityOk && !svcOk ? 'city AND service unregistered' : !cityOk ? 'city not in CITY_REGISTRY' : 'service not in city-services registry',
        recommendation: !cityOk ? 'fix city slug / register city' : 'fix service slug / register service',
      });
    }
  }

  // ── cms_articles ──────────────────────────────────────────────────────────
  const artRows = await pool.query<{ id: number; slug: string; status: string }>(
    'SELECT id, slug, status FROM cms_articles ORDER BY id'
  );
  for (const r of artRows.rows) {
    const url = `/knowledge-hub/${r.slug}`;
    const red = redirectsTo(url);
    if (red) {
      add({ table: 'cms_articles', id: r.id, slug: r.slug, url, verdict: 'DEAD-REDIRECT', servedBy: `301 → ${red}`, recommendation: 'review' });
      continue;
    }
    add({
      table: 'cms_articles',
      id: r.id,
      slug: r.slug,
      url,
      verdict: r.status === 'published' ? 'RENDERS' : 'DEAD-404',
      servedBy: r.status === 'published' ? '/knowledge-hub/[slug] → cms_articles' : `404 (status = ${r.status})`,
      recommendation: r.status === 'published' ? '—' : 'publish or delete',
    });
  }

  // ── emergency_plumbing_page ───────────────────────────────────────────────
  const epRows = await pool.query<{ id: number }>('SELECT id FROM emergency_plumbing_page ORDER BY id');
  epRows.rows.forEach((r, i) => {
    add({
      table: 'emergency_plumbing_page',
      id: r.id,
      slug: '(singleton)',
      url: '/emergency-plumbing',
      // The reader is `SELECT * ... LIMIT 1` with no ORDER BY: Postgres is free
      // to return any row. Only one of them can be the one that renders, and
      // which one is not deterministic — so no row here can be called RENDERS.
      verdict: i === 0 ? 'RENDERS' : 'SHADOWED',
      servedBy:
        i === 0
          ? '/emergency-plumbing → emergency_plumbing_page (unordered LIMIT 1 — usually the lowest id)'
          : 'duplicate row; reader takes an unordered LIMIT 1, writer UPDATEs all rows',
      recommendation: i === 0 ? '—' : 'Track D — de-duplicate',
    });
  });

  // ── Route → source pass ───────────────────────────────────────────────────
  const staticRoutesWithCmsRowCandidate: string[] = [];
  const allCmsSlugs = new Map<string, string>();
  for (const r of mainRows.rows) allCmsSlugs.set(`/${r.slug}`, `main_pages id ${r.id}`);
  for (const r of subRows.rows) allCmsSlugs.set(`/${r.slug}`, `sub_service_pages id ${r.id}`);
  for (const r of catRows.rows) allCmsSlugs.set(`/services/${r.slug}`, `service_category_pages id ${r.id}`);
  for (const entry of ROUTE_SOURCES) {
    if (entry.kind !== 'static') continue;
    const cand = allCmsSlugs.get(entry.route);
    if (cand) staticRoutesWithCmsRowCandidate.push(`${entry.route}  ← ${cand}`);
  }

  // ── Output ────────────────────────────────────────────────────────────────
  const byTable = new Map<string, Record<string, number>>();
  for (const f of findings) {
    const t = byTable.get(f.table) ?? {};
    t[f.verdict] = (t[f.verdict] ?? 0) + 1;
    byTable.set(f.table, t);
  }

  console.log('\n══ Counts per classification per table ══════════════════════════\n');
  for (const [t, counts] of byTable) {
    console.log(`  ${t.padEnd(26)} ${JSON.stringify(counts)}`);
  }

  const nonRenders = findings.filter((f) => f.verdict !== 'RENDERS');
  console.log(`\n══ Non-RENDERS rows: ${nonRenders.length} ═════════════════════════\n`);
  for (const f of nonRenders) {
    console.log(`  [${f.verdict}] ${f.table} #${f.id} ${f.slug}`);
    console.log(`        url: ${f.url}`);
    console.log(`        served by: ${f.servedBy}`);
    console.log(`        recommend: ${f.recommendation}`);
  }

  console.log('\n══ Static routes with a plausibly-matching CMS row ══════════════\n');
  if (staticRoutesWithCmsRowCandidate.length === 0) console.log('  (none)');
  for (const l of staticRoutesWithCmsRowCandidate) console.log(`  ${l}`);

  const outDir = path.join(REPO_ROOT, 'scripts', 'backups');
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(outDir, `brief-145-track-a-audit-${stamp}.json`);
  fs.writeFileSync(
    outFile,
    JSON.stringify(
      {
        generated: stamp,
        counts: Object.fromEntries(byTable),
        findings,
        routeSources: [...ROUTE_SOURCES, ...DYNAMIC_ROUTE_SOURCES],
        staticRoutesWithCmsRowCandidate,
      },
      null,
      2
    )
  );
  console.log(`\nfull findings: ${outFile}`);
}

/** Mirror of build-legacy-redirect-map.ts's scanner — kept local so this audit
 *  does not depend on that script's 146 MB WordPress export path constant. */
function scanStaticRoutes(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const name = dirent.name;
    if (name.startsWith('[') || name.startsWith('(') || name.startsWith('_') || name === 'api') continue;
    const segment = `${prefix}/${name}`;
    const child = path.join(dir, name);
    if (fs.existsSync(path.join(child, 'page.tsx'))) out.push(normalizePath(segment));
    out.push(...scanStaticRoutes(child, segment));
  }
  return out;
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
