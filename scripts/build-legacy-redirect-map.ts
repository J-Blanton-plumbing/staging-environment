/**
 * Brief 130/131 — Legacy redirect map generator.
 *
 * Streams the WordPress export, enumerates every published live URL, classifies
 * it into a bucket, resolves a new-site target, verifies that target against the
 * routes the new site ACTUALLY serves, folds in the WordPress Redirection-plugin
 * rule export, and writes `src/lib/redirects/legacy-redirect-map.json`.
 *
 * Brief 131 changes:
 *   - `PENDING_BUCKETS` is now empty — Marketing signed off on the `boiler` and
 *     `sewer-service` buckets on 2026-08-03, so both emit into the map.
 *   - Second input: `scripts/data/wp-redirection-rules.json` (the Redirection v5
 *     export) → `bucket: "wp-redirection"`.
 *   - `venetian-cillage` was dropped from CITY_REGISTRY as a duplicate typo row;
 *     `RETIRED_CITY_ALIASES` re-points its 46 live URLs at `venetian-village`.
 *   - `src/lib/redirects/lookup.ts` + `src/middleware.ts` consume the output, so
 *     this script now DOES drive live routing. Re-run it after any CITY_REGISTRY
 *     or route change.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/build-legacy-redirect-map.ts
 *
 *   # also write any still-held bucket to a side file (none are held today)
 *   ... scripts/build-legacy-redirect-map.ts --pending-preview <path.json>
 *
 * Determinism / idempotence
 * -------------------------
 * Output is sorted by (bucket, from) and contains no timestamps, so re-running
 * against the same export + registries produces a byte-identical file. Re-run it
 * whenever the export refreshes or CITY_REGISTRY / the route dirs change.
 *
 * Route verification (the "never redirect to a 404" rule)
 * -------------------------------------------------------
 * The served-route set is built from three sources, in this order:
 *   1. `src/app/**\/page.tsx` directory scan — every static route the build emits.
 *   2. CITY_REGISTRY (the `[city]` builder's allowlist) × getAllServiceSlugs()
 *      (the `[city]/[service]` builder's allowlist) — `dynamicParams` rejects
 *      anything outside these, so the cartesian product is exactly what serves.
 *   3. cms_articles published slugs → `/knowledge-hub/{slug}`, and
 *      sub_service_pages published slugs (a top-level sub-service route 404s via
 *      SubServicePageView when its row is unpublished).
 * Source 3 needs the DB. If it is unreachable the script still runs but marks
 * DB-gated targets `verified: false` and prints a loud warning — it never
 * silently emits an unverified target as verified.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import { CITY_REGISTRY } from '@/lib/content/cities';
import { getAllServiceSlugs } from '@/lib/content/city-services';
import { SERVICE_CATEGORY_SLUGS } from '@/lib/services';
import { normalizePath } from '@/lib/seo';

// ── Config ───────────────────────────────────────────────────────────────────

const XML_PATH =
  process.env.WP_EXPORT_PATH ||
  'C:/Users/marke/OneDrive/Documents/Claude/Projects/JBP Web Migration/jblantonplumbing.WordPress.2026-06-26.xml';

const REPO_ROOT = path.resolve(__dirname, '..');
const APP_DIR = path.join(REPO_ROOT, 'src', 'app');
const OUT_PATH = path.join(REPO_ROOT, 'src', 'lib', 'redirects', 'legacy-redirect-map.json');

/**
 * Brief 131 Track C — the WordPress Redirection-plugin (v5) rule export, copied
 * into the repo from the OneDrive project-docs folder so the generator has a
 * checked-in, reproducible second input (same convention as wp-article-ids.json).
 * Refresh it from a new plugin export whenever Marketing adds live rules.
 */
const WP_REDIRECTION_PATH = path.join(REPO_ROOT, 'scripts', 'data', 'wp-redirection-rules.json');

const LIVE_ORIGIN = 'https://jblantonplumbing.com';

type Bucket =
  | 'city-service'
  | 'misc'
  | 'boiler'
  | 'sewer-service'
  | 'article'
  | 'faq'
  | 'wp-redirection';

/**
 * Buckets held back for Marketing sign-off. Empty since Brief 131 — Marketing
 * approved `boiler` and `sewer-service` on 2026-08-03. Kept as the mechanism for
 * any future bucket that needs to be computed but withheld.
 */
const PENDING_BUCKETS = new Set<Bucket>([]);

interface RedirectEntry {
  from: string;
  to: string;
  status: 301;
  bucket: Bucket;
}

// ── Redirect sources already wired in next.config.mjs ────────────────────────
// Kept in sync by hand. Anything listed here is NOT re-emitted into the map, so
// Brief 131 can add the map wholesale without creating duplicate rules. The
// `/jb-articles/:slug` pattern is a parameterised rule, handled separately.
const ALREADY_REDIRECTED = new Set(
  [
    '/why-us',
    '/plumbing',
    '/sewer',
    '/drain',
    '/water-heater',
    '/water-quality',
    '/commercial',
    '/emergency',
    '/services/hydro-jetting',
    '/services/sewer-rodding',
    '/services/emergency-plumbing',
    '/reviews',
    '/gas-lines-chicago',
    '/contact-us',
    '/booking',
    '/admin/sub-services',
  ].map(normalizePath)
);

// ── City-slug aliases (live flat slug → CITY_REGISTRY slug) ──────────────────
// The flat legacy `-il-` pages predate the `chicago-*` neighbourhood slugs the
// registry (and the live nested pages) use, and two are outright typos on live.
// Every value here is asserted against CITY_REGISTRY at run time.
const CITY_ALIASES: Record<string, string> = {
  // Chicago neighbourhood pages: live flat slug had no `chicago-` prefix.
  andersonville: 'chicago-andersonville',
  avondale: 'chicago-avondale',
  edgewater: 'chicago-edgewater',
  'irving-park': 'chicago-irving-park',
  'lake-view': 'chicago-lake-view',
  'lincoln-park': 'chicago-lincoln-park',
  'lincoln-square': 'chicago-lincoln-square',
  ohare: 'chicago-ohare',
  ravenswood: 'chicago-ravenswood',
  uptown: 'chicago-uptown',
  'west-ridge': 'chicago-west-ridge',
  // Brief 131 — same `chicago-` case as the rest, but the legacy flat slug also
  // MISSPELLS Rogers as "Rodgers". `rodgers-park` is deliberately NOT a registry
  // city (registering it would duplicate chicago-rogers-park, the venetian-cillage
  // pattern), so this alias is the whole fix for the flat source.
  'rodgers-park': 'chicago-rogers-park',
  // Typo on the live flat slug — the live city page is /mettawa.
  mettewa: 'mettawa',
  // Live city page is /village-of-lakewood.
  lakewood: 'village-of-lakewood',
  // Live itself 301s /barrington → /barrington-hills, so the two are already
  // treated as one place on the current site.
  barrington: 'barrington-hills',
};

/**
 * Brief 131 (Track A.2) — city slugs REMOVED from CITY_REGISTRY, mapped to the
 * surviving slug. Unlike CITY_ALIASES (a live-only flat slug that never had a
 * registry row), these once served on the new build and their whole live URL
 * family — `/{slug}` plus every `/{slug}/{service}` child — must now 301 onto
 * the survivor. Values are asserted against CITY_REGISTRY at run time.
 */
const RETIRED_CITY_ALIASES: Record<string, string> = {
  // Duplicate typo row: live already 301s /venetian-cillage → /venetian-village.
  'venetian-cillage': 'venetian-village',
};

/**
 * Flat legacy service-slug fixes. The `-2` suffix is a WordPress duplicate-slug
 * disambiguator, not a service. `water-heater` is not a city-service slug; the
 * one page using it ("Water Heater Services: Repair, Installation &
 * Maintenance") maps to the general residential water-heater service page.
 */
const FLAT_SERVICE_ALIASES: Record<string, string> = {
  'sewer-rodding-2': 'sewer-rodding',
  'water-heater': 'residential-water-heater',
};

// ── Misc bucket: explicit target per live top-level page ─────────────────────
// Every live top-level page whose slug is neither a CITY_REGISTRY city nor a
// flat `-il-` city-service page. `null` = intentionally no redirect emitted
// (see NO_REDIRECT_REASONS). The script FAILS if a live slug reaches this stage
// without an entry here, so the table can never silently fall out of date.
const MISC_TARGETS: Record<string, string | null> = {
  // ── Identity: live slug already is the new-site route (no redirect needed) ──
  'basement-flooding': null,
  'bathroom-plumbing-chicago': null,
  'clogged-drains-in-chicago': null,
  'commercial-drain-service': null,
  'commercial-jetting': null,
  'commercial-water-heater': null,
  'customer-stories': null,
  'drain-cleaning-services-in-chicago': null,
  'emergency-plumbing': null,
  financing: null,
  'gas-lines': null,
  'help-and-support': null,
  'home-repipe': null,
  'hydro-jetting': null,
  'j-blanton-is-hiring': null,
  'kitchen-plumbing': null,
  'kitchen-sink-drain': null,
  'knowledge-hub': null,
  'laundry-room-plumbing': null,
  locations: null,
  'no-drip-club': null,
  'privacy-policy': null,
  'residential-water-heater': null,
  'restaurant-drain-clearing': null,
  'restaurant-plumbing-services': null,
  'restaurant-water-heater': null,
  services: null,
  'sewer-maintenance': null,
  'sewer-repair': null,
  'sewer-rodding': null,
  'tankless-water-heater': null,
  'thank-you': null,
  'water-filtration-systems': null,
  'why-j-blanton': null,

  // ── C1: boiler / heating-cooling line — Marketing signed off 2026-08-03 ────
  // INTERIM. The new build has no boiler content of any kind (Brief 130 §6), so
  // these three point at the nearest live category hub purely so nothing 404s at
  // cutover. Whether JBP still services boilers is pending an internal check; if
  // yes, a rebuild brief replaces these targets with real boiler pages.
  'boiler-services': '/services/plumbing',
  'boiler-repair': '/services/plumbing',
  'boiler-maintenance': '/services/plumbing',
  // Not boiler content — the legacy company/credentials page. Marketing
  // confirmed (2026-08-03) that dropping its HVAC/AC claim is intentional, so
  // this one is permanent rather than interim.
  'plumbing-heating-cooling-services': '/why-j-blanton',

  // ── Duplicate / superseded service pages → the surviving hub ───────────────
  'basement-flooding-service': '/basement-flooding',
  'basement-waterproofing': '/basement-flooding',
  'bathroom-plumbing': '/bathroom-plumbing-chicago',
  'drain-cleaning-services-chicagoland': '/drain-cleaning-services-in-chicago',
  'residential-water-heater-service': '/residential-water-heater',
  'sewer-maintenance-service': '/sewer-maintenance',
  'garbage-disposal-installation-repair-service': '/services/plumbing',
  'sewer-camera-inspection-service': '/services/sewer',
  'toilet-installation-repair-service': '/bathroom-plumbing-chicago',
  'water-heater-installation-service': '/services/water-heater',
  'water-heater-repair-service': '/services/water-heater',
  'water-heater-repair-services': '/services/water-heater',
  'is-hiring': '/j-blanton-is-hiring',

  // ── Gas line family → the /gas-lines hub ──────────────────────────────────
  'gas-line-installation': '/gas-lines',
  'gas-line-leak-detection': '/gas-lines',
  'gas-line-repair': '/gas-lines',
  'gas-repipe': '/gas-lines',
  // Both pages explicitly state JBP installs/repairs the GAS LINE serving the
  // appliance, not the appliance — /gas-lines is the accurate equivalent.
  'fireplace-installation-repair-maintenance': '/gas-lines',
  'pool-heater-installation-repair': '/gas-lines',
  'service-area-chicago-gas-grill-repair-installation-maintenance': '/gas-lines',

  // ── Repipe / water-line family → the /home-repipe hub ─────────────────────
  'galvanized-repipe': '/home-repipe',
  'install-water-lines': '/home-repipe',
  'pipe-replacement': '/home-repipe',

  // ── Bathroom fixtures → the /bathroom-plumbing-chicago hub ────────────────
  'shower-installation': '/bathroom-plumbing-chicago',
  'shower-repair': '/bathroom-plumbing-chicago',
  'shower-tub-repair': '/bathroom-plumbing-chicago',
  'toilet-installation-repair': '/bathroom-plumbing-chicago',

  // ── Kitchen fixtures → the /kitchen-plumbing hub ──────────────────────────
  'kitchen-faucet-repair-and-installation': '/kitchen-plumbing',
  'quality-sink-plumbing-installation': '/kitchen-plumbing',

  // ── Sewer line family ─────────────────────────────────────────────────────
  'main-line-replacement-and-repair': '/sewer-repair',
  'trenchless-main-line-repair': '/sewer-repair',
  'rooter-plumbing': '/sewer-rodding',
  'sewer-cleaning-emergency': '/emergency-plumbing',
  'sewer-cleaning-services': '/services/sewer',
  'sewer-camera-inspection': '/services/sewer',
  'sewers-drains': '/services/sewer',
  'sewers-drains-service': '/services/sewer',
  'ejector-pump': '/services/sewer',
  'overhead-sewer-systems': '/services/sewer',
  'sump-pumps': '/services/sewer',
  // Live title is "Flood Control Maintenance Services in Chicagoland".
  'maintenance-services': '/services/sewer',

  // ── No live top-level hub for the service → its category hub ──────────────
  'burst-pipe-repair': '/services/plumbing',
  'faucet-installation-repair': '/services/plumbing',
  'garbage-disposal-installation-repair': '/services/plumbing',
  'outdoor-yard-plumbing': '/services/plumbing',
  'residential-plumbing': '/services/plumbing',
  'slab-plumbing': '/services/plumbing',
  'water-leak-repair': '/services/plumbing',
  'catch-basin-cleaning': '/services/drain',
  'commercial-plumbing-installation': '/services/commercial',
  'water-heater-installation': '/services/water-heater',
  'water-heater-maintenance': '/services/water-heater',
  'water-heater-repair': '/services/water-heater',
  'water-heater-services': '/services/water-heater',
  'water-testing': '/water-filtration-systems',

  // ── Legacy service-area pages → the matching city page ────────────────────
  'service-area': '/locations',
  'service-area-urls': '/locations',
  'sewer-rodding-service-area': '/locations',
  'service-area-arlington-heights': '/arlington-heights',
  'service-area-aurora': '/aurora',
  'service-area-chicago': '/chicago',
  'service-area-evanston': '/evanston',
  'service-area-glenview': '/glenview',
  'service-area-highland-park': '/highland-park',
  'service-area-lake-forest': '/lake-forest',
  'service-area-mchenry': '/mchenry',
  'service-area-morton-grove': '/morton-grove',
  'service-area-naperville': '/naperville',
  'service-area-northbrook': '/northbrook',
  'service-area-ravenswood': '/chicago-ravenswood',
  'service-area-winnetka': '/winnetka',

  // ── One-off city+service page ─────────────────────────────────────────────
  'elgin-residential-water-heater': '/elgin/residential-water-heater',

  // ── Company / offer pages ─────────────────────────────────────────────────
  // WP's front-page alias; live 301s /home → /.
  home: '/',
  // COVID-era 0%-financing landing page; /financing is the surviving equivalent.
  'no-payments': '/financing',
  // "Current Offers & Promotions" — body is entirely about No Drip Club pricing.
  offers: '/no-drip-club',
  // Generic "top-rated contractor" boilerplate with no service of its own.
  solutions: '/why-j-blanton',
};

/**
 * MISC_TARGETS slugs that belong in the `boiler` bucket rather than `misc`, so
 * the interim boiler line stays isolated and easy to retarget when the rebuild
 * decision lands. `/plumbing-heating-cooling-services` is included because it is
 * the fourth URL of the same live content family (Brief 130 §6).
 */
const BOILER_SLUGS = new Set([
  'boiler-services',
  'boiler-repair',
  'boiler-maintenance',
  'plumbing-heating-cooling-services',
]);

/**
 * jb_faq `_jb_faq_category` → the new-site page carrying that topic. Resolved to
 * the live top-level hub route where one exists, else the category hub. The 45
 * categories are the same 45 city-service topics, so this is a mechanical
 * mapping; the six names that do not slugify onto a registry service slug are
 * listed explicitly and called out in the report.
 */
const FAQ_CATEGORY_TARGETS: Record<string, string> = {
  'Basement Flooding': '/basement-flooding',
  'Basement Waterproofing': '/basement-flooding',
  'Bathroom Plumbing': '/bathroom-plumbing-chicago',
  'Burst Pipe Repair': '/services/plumbing',
  'Catch Basin': '/services/drain',
  'Clogged Drains': '/clogged-drains-in-chicago',
  'Commercial Water Heater': '/commercial-water-heater',
  'Drain Cleaning': '/drain-cleaning-services-in-chicago',
  'Ejector Pump': '/services/sewer',
  'Emergency Plumbing': '/emergency-plumbing',
  'Faucet Installation & Repair': '/services/plumbing',
  'Flood Control Maintenance': '/services/sewer',
  'Garbage Disposal Installation & Repair': '/services/plumbing',
  'Gas Fireplace': '/gas-lines',
  'Gas Line Installation': '/gas-lines',
  'Gas Line Leak Detection': '/gas-lines',
  'Gas Line Repair': '/gas-lines',
  'Gas Lines': '/gas-lines',
  'Hydro Jetting': '/hydro-jetting',
  'Kitchen Faucet Repair And Installation': '/kitchen-plumbing',
  'Kitchen Plumbing': '/kitchen-plumbing',
  'Kitchen Sink Drain': '/kitchen-sink-drain',
  'Leak Repairs': '/services/plumbing',
  'Overhead Sewer Systems': '/services/sewer',
  'Plumbing Fixture Installations': '/services/plumbing',
  'Plumbing Maintenance': '/services/plumbing',
  // No `plumbing-repairs` service slug exists — generic plumbing repair Q&A.
  'Plumbing Repairs': '/services/plumbing',
  'Plumbing Services': '/services/plumbing',
  'Residential Water Heater': '/residential-water-heater',
  'Sewage Line Backup Services': '/services/sewer',
  // Both inspection categories land on the sewer hub — the new site's inspection
  // service (`video-camera-sewer-inspections`) has no top-level route.
  'Sewer Camera Inspection': '/services/sewer',
  'Video Camera Sewer & Drain Inspections': '/services/sewer',
  'Sewer Drain Clearing': '/services/sewer',
  'Sewer Maintenance': '/sewer-maintenance',
  'Sewer Repair': '/sewer-repair',
  'Shower Repair': '/bathroom-plumbing-chicago',
  'Sump Pumps': '/services/sewer',
  'Tankless Water Heater': '/tankless-water-heater',
  'Toilet Installation & Repair': '/bathroom-plumbing-chicago',
  'Trenchless Sewer Repair': '/sewer-repair',
  'Water Filtration Systems': '/water-filtration-systems',
  'Water Heater Installation': '/services/water-heater',
  'Water Heater Maintenance': '/services/water-heater',
  'Water Heater Repair': '/services/water-heater',
  'Water Testing': '/water-filtration-systems',
};

/**
 * C2 PROPOSAL ONLY — not emitted unless --pending-preview is passed.
 *
 * `jb_sewer` posts carry `_jb_sewer_city` (a GEO AREA name, not always a city)
 * and `_jb_sewer_service` (one of 51 keyword variants of ~6 real services). This
 * table collapses the 51 keywords onto the new site's real sewer services; the
 * geo is slugified and checked against CITY_REGISTRY, falling back to
 * /services/sewer when the geo is a region rather than a city.
 */
const SEWER_KEYWORD_TO_SERVICE: Record<string, string> = {
  'sewer repair': 'sewer-repair',
  'sewer fix': 'sewer-repair',
  'sewer broke': 'sewer-repair',
  'sewer broke fix': 'sewer-repair',
  'sewer broke repair': 'sewer-repair',
  'busted sewer': 'sewer-repair',
  'cracked sewer': 'sewer-repair',
  'cracked sewer repair': 'sewer-repair',
  'sewer line': 'sewer-repair',
  'sewer line repair': 'sewer-repair',
  'sewer line fix': 'sewer-repair',
  'sewer line broke': 'sewer-repair',
  'sewer line broke fix': 'sewer-repair',
  'sewer line broke repair': 'sewer-repair',
  'busted sewer line': 'sewer-repair',
  'cracked sewer line': 'sewer-repair',
  'cracked sewer line repair': 'sewer-repair',
  'sewer replacement': 'sewer-repair',
  'sewer line replacement': 'sewer-repair',
  'emergency sewer': 'sewer-repair',
  'emergency sewer repair': 'sewer-repair',
  'emergency sewer line repair': 'sewer-repair',
  '24 hour sewer': 'sewer-repair',
  'sewer blocked': 'sewer-rodding',
  'sewer blockage': 'sewer-rodding',
  'sewer clogged': 'sewer-rodding',
  'sewer clogged fix': 'sewer-rodding',
  'sewer clogged repair': 'sewer-rodding',
  'sewer rooter': 'sewer-rodding',
  'unblock sewer': 'sewer-rodding',
  'sewer line blocked': 'sewer-rodding',
  'sewer line blockage': 'sewer-rodding',
  'sewer line clogged': 'sewer-rodding',
  'sewer line clogged fix': 'sewer-rodding',
  'sewer line clogged repair': 'sewer-rodding',
  'sewer line rooter': 'sewer-rodding',
  'sewer hydro jetting': 'hydro-jetting',
  'sewer line hydro jetting': 'hydro-jetting',
  'sewer inspection': 'video-camera-sewer-inspections',
  'sewer scope': 'video-camera-sewer-inspections',
  'sewer camera inspection': 'video-camera-sewer-inspections',
  'sewer line inspection': 'video-camera-sewer-inspections',
  'sewer line scope': 'video-camera-sewer-inspections',
  'sewer line camera inspection': 'video-camera-sewer-inspections',
  'trenchless sewer': 'trenchless-sewer-repair',
  'trenchless sewer repair': 'trenchless-sewer-repair',
  'trenchless sewer line': 'trenchless-sewer-repair',
  'trenchless sewer line repair': 'trenchless-sewer-repair',
  'trenchless sewer replacement': 'trenchless-sewer-repair',
  'trenchless sewer line replacement': 'trenchless-sewer-repair',
  'reline sewer': 'trenchless-sewer-repair',
};

/**
 * `_jb_sewer_city` values whose slugified form doesn't match CITY_REGISTRY but
 * which name a city that IS in the registry under a different form. Everything
 * left over after this is either a genuine region name (no `/{city}` page can
 * exist) or a city missing from the registry — both fall back to /services/sewer.
 */
const SEWER_GEO_ALIASES: Record<string, string> = {
  'elk-grove-village': 'elk-grove',
  'saint-charles': 'st-charles',
  // "City of Golf" is Golf, IL — the registry slug is `golf`.
  'city-of-golf': 'golf',
};

// ── XML streaming helpers (same shape as the other migrate-wp-* scripts) ─────

function extractTag(xml: string, tag: string): string {
  const escaped = tag.replace(':', '\\:').replace('/', '\\/');
  const cdata = new RegExp(`<${escaped}><!\\[CDATA\\[[\\s\\S]*?\\]\\]></${escaped}>`).exec(xml);
  if (cdata) return cdata[0].replace(/^.*?<!\[CDATA\[/, '').replace(/\]\]>.*$/, '');
  const plain = new RegExp(`<${escaped}>([\\s\\S]*?)</${escaped}>`).exec(xml);
  return plain ? plain[1] : '';
}

function getPostMeta(itemXml: string): Record<string, string> {
  const meta: Record<string, string> = {};
  for (const block of itemXml.split('</wp:postmeta>')) {
    const k = block.match(/<wp:meta_key>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/wp:meta_key>/);
    const v = block.match(/<wp:meta_value>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/wp:meta_value>/);
    if (k && v) meta[k[1].trim()] = v[1].trim();
  }
  return meta;
}

async function parseItems(xmlPath: string, onItem: (xml: string) => void): Promise<void> {
  const stream = fs.createReadStream(xmlPath, { encoding: 'utf8', highWaterMark: 4 * 1024 * 1024 });
  let buffer = '';
  for await (const chunk of stream) {
    buffer += chunk as string;
    for (;;) {
      const start = buffer.indexOf('<item>');
      if (start === -1) {
        buffer = buffer.length > 200 ? buffer.slice(-200) : buffer;
        break;
      }
      const end = buffer.indexOf('</item>', start);
      if (end === -1) break;
      onItem(buffer.substring(start, end + 7));
      buffer = buffer.slice(end + 7);
    }
  }
}

/** The live `<link>` minus origin, normalized. Falls back to the bare slug. */
function livePathFrom(itemXml: string, slug: string): string {
  const link = extractTag(itemXml, 'link');
  if (link.startsWith(LIVE_ORIGIN)) return normalizePath(link.slice(LIVE_ORIGIN.length) || '/');
  return normalizePath(`/${slug}`);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Served-route set ─────────────────────────────────────────────────────────

export interface ServedRoutes {
  /** Static route paths from the src/app scan (never includes dynamic segments). */
  staticPaths: Set<string>;
  cities: Set<string>;
  services: Set<string>;
  /**
   * Every slug with a `sub_service_pages` row, published or not. Only these
   * top-level routes render via SubServicePageView (and therefore 404 when
   * unpublished) — `/emergency-plumbing` has its own table and template, so it
   * must NOT be publish-gated against this list.
   */
  subServiceSlugs: Set<string>;
  /** Sub-service slugs published in the DB (empty when the DB is unreachable). */
  publishedSubServices: Set<string>;
  /** Article slugs published in the DB (empty when the DB is unreachable). */
  publishedArticles: Set<string>;
  dbAvailable: boolean;
}

/** Walk src/app and collect every static route a `page.tsx` produces. */
function scanStaticRoutes(dir: string, prefix = ''): string[] {
  const out: string[] = [];
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const name = dirent.name;
    // Dynamic segments and route groups are not static paths.
    if (name.startsWith('[') || name.startsWith('(') || name.startsWith('_') || name === 'api') {
      continue;
    }
    const segment = `${prefix}/${name}`;
    const child = path.join(dir, name);
    if (fs.existsSync(path.join(child, 'page.tsx'))) out.push(normalizePath(segment));
    out.push(...scanStaticRoutes(child, segment));
  }
  return out;
}

export async function loadServedRoutes(): Promise<ServedRoutes> {
  const staticPaths = new Set(scanStaticRoutes(APP_DIR));
  // Root page + the two rewrite-served static-file routes the app scan can't see.
  staticPaths.add('/');
  if (fs.existsSync(path.join(REPO_ROOT, 'public', 'hoa-line-piping', 'index.html'))) {
    staticPaths.add('/hoa-line-piping');
  }
  for (const slug of SERVICE_CATEGORY_SLUGS) staticPaths.add(`/services/${slug}`);

  const cities = new Set(CITY_REGISTRY.map((c) => c.slug));
  const services = new Set(getAllServiceSlugs());

  const subServiceSlugs = new Set<string>();
  const publishedSubServices = new Set<string>();
  const publishedArticles = new Set<string>();
  let dbAvailable = false;

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
  });
  try {
    const sub = await pool.query<{ slug: string; status: string }>(
      `SELECT slug, status FROM sub_service_pages`
    );
    for (const r of sub.rows) {
      subServiceSlugs.add(r.slug);
      if (r.status === 'published') publishedSubServices.add(r.slug);
    }
    const art = await pool.query(`SELECT slug FROM cms_articles WHERE status = 'published'`);
    for (const r of art.rows) publishedArticles.add(r.slug as string);
    dbAvailable = true;
  } catch (err) {
    console.warn(
      '\n⚠  DB unreachable — sub-service and article targets cannot be publish-verified.\n' +
        `   ${err instanceof Error ? err.message : String(err)}\n` +
        '   Entries are still emitted (the routes exist) but re-run with the DB up before Brief 131.\n'
    );
  } finally {
    await pool.end().catch(() => undefined);
  }

  return {
    staticPaths,
    cities,
    services,
    subServiceSlugs,
    publishedSubServices,
    publishedArticles,
    dbAvailable,
  };
}

/** True when `to` is a path the new site actually serves with a 200. */
export function isServed(to: string, routes: ServedRoutes): boolean {
  const p = normalizePath(to);
  const segs = p === '/' ? [] : p.slice(1).split('/');

  if (segs.length === 0) return true;

  if (segs.length === 1) {
    if (routes.cities.has(segs[0])) return true;
    if (!routes.staticPaths.has(p)) return false;
    // A top-level sub-service route 404s while its DB row is unpublished.
    if (routes.dbAvailable && routes.subServiceSlugs.has(segs[0])) {
      return routes.publishedSubServices.has(segs[0]);
    }
    return true;
  }

  if (segs.length === 2) {
    if (segs[0] === 'knowledge-hub') {
      return routes.dbAvailable ? routes.publishedArticles.has(segs[1]) : true;
    }
    if (routes.staticPaths.has(p)) return true;
    // `[city]/[service]` — both halves must be in their registry.
    return routes.cities.has(segs[0]) && routes.services.has(segs[1]);
  }

  return routes.staticPaths.has(p);
}

// ── Rule-sourced redirects (live 301s that are NOT pages in the export) ──────

/**
 * Live 301 rules whose SOURCE URL exists nowhere in the WordPress export,
 * because the export contains pages and these are redirect rules. Brief 130 §10
 * found them by spot-check and confirmed each returns a 301 on live today;
 * without an entry here every one of them 404s at cutover.
 *
 * This table is NOT exhaustive — it is only what a manual spot-check surfaced.
 * The complete set can only come from the origin's rule tables: the Redirection
 * plugin (imported in Track C — currently only 2 rules) plus, most likely, Yoast
 * Premium's auto slug-change redirects, which Marketing has not yet exported.
 * Brief 131's report flags that as the outstanding ask.
 *
 * Targets are written as the LIVE target; the importer then collapses them
 * through the emitted map so the stored `to` is always the final 200.
 */
const EXTRA_REDIRECTS: Array<{ from: string; to: string; bucket: Bucket; why: string }> = [
  {
    // Brief 131 Track A.2. Never a page — brief-50 imported the slug from a
    // typo'd internal link, which is how it ended up in CITY_REGISTRY at all.
    from: '/venetian-cillage',
    to: '/venetian-village',
    bucket: 'misc',
    why: 'live 301; registry typo row dropped in Track A.2',
  },
  {
    // Brief 131 follow-up. Same class as /venetian-cillage: never a page (0 rows
    // in the export), only the flat `/rodgers-park-il-sewer-rodding` slug. Kept
    // out of CITY_REGISTRY because it misspells Rogers Park, which is already
    // there as `chicago-rogers-park` — so the bare slug needs this entry to 200
    // rather than 404.
    from: '/rodgers-park',
    to: '/chicago-rogers-park',
    bucket: 'city-service',
    why: 'misspelled duplicate of chicago-rogers-park; aliased, not registered',
  },
  {
    // Live 301s /barrington → /barrington-hills, i.e. live already treats the two
    // as one place (the same evidence behind the CITY_ALIASES entry).
    from: '/barrington',
    to: '/barrington-hills',
    bucket: 'city-service',
    why: 'live 301; no /barrington page or registry row exists',
  },
  {
    // Live 301s to the `-2` duplicate-slug page, which the map in turn sends to
    // /palatine/sewer-rodding — collapsed to one hop by the importer.
    from: '/palatine-il-sewer-rodding',
    to: '/palatine-il-sewer-rodding-2',
    bucket: 'city-service',
    why: 'live 301 onto a WordPress duplicate-slug page',
  },
];

// ── Track C: WordPress Redirection-plugin import ─────────────────────────────

/** The subset of the Redirection v5 export shape this script relies on. */
interface WpRedirectionRule {
  url?: string;
  action_code?: number;
  action_type?: string;
  action_data?: { url?: string } | string | null;
  enabled?: boolean;
  regex?: boolean;
  title?: string;
}

interface RuleImportResult {
  /** Rules in the source, before any filtering. */
  total: number;
  /** Rules that survived the shape filter (enabled · url · 301 · non-regex). */
  eligible: number;
  /** Eligible rules that produced no entry, counted by reason. */
  skipped: Record<string, number>;
  /** Rules that produced a brand-new map entry. */
  netNew: Array<{ from: string; to: string }>;
  /** Eligible rules whose target was collapsed through an existing entry. */
  collapsed: Array<{ from: string; via: string; to: string }>;
}

const emptyRuleImportResult = (): RuleImportResult => ({
  total: 0,
  eligible: 0,
  skipped: {},
  netNew: [],
  collapsed: [],
});

interface RuleImportContext {
  entries: RedirectEntry[];
  seenFrom: Map<string, RedirectEntry>;
  /** Live paths the new build serves identically — must never be redirected away. */
  identity: Set<string>;
  routes: ServedRoutes;
}

/**
 * Admit one rule-sourced redirect into the map, or record why it was skipped.
 *
 * Shared by the Redirection-plugin import and the hand-curated EXTRA_REDIRECTS
 * table so both obey the same guards: collapse chains to the final 200, never
 * redirect an identity page away, never duplicate an export-derived entry, never
 * point at a route the build doesn't serve.
 *
 * Mutates `ctx.entries` / `ctx.seenFrom` in place, exactly as `emit()` does, so
 * the chain guard and the sort downstream see the full set.
 */
function admitRuleSourcedRedirect(
  candidate: { from: string; to: string; bucket: Bucket },
  ctx: RuleImportContext,
  result: RuleImportResult
): void {
  const skip = (k: string) => {
    result.skipped[k] = (result.skipped[k] || 0) + 1;
  };

  const from = normalizePath(candidate.from);
  let to = normalizePath(candidate.to.replace(/^https?:\/\/[^/]+/i, '') || '/');

  // Collapse chains: if the live target is itself one of our sources, walk to the
  // final destination so the browser never takes two hops.
  const viaStart = to;
  let hops = 0;
  while (ctx.seenFrom.has(to)) {
    to = ctx.seenFrom.get(to)!.to;
    if (++hops > 10) throw new Error(`rule import: redirect cycle resolving ${from}`);
  }
  if (hops > 0) result.collapsed.push({ from, via: viaStart, to });

  if (from === to) {
    skip('source and target are the same path once normalized');
    return;
  }
  if (ctx.identity.has(from)) {
    // The new build serves this source as a real 200 — redirecting it away would
    // delete a working page.
    skip('source is a live page the new build serves identically (identity)');
    return;
  }
  if (ctx.routes.cities.has(from.slice(1)) || ctx.routes.staticPaths.has(from)) {
    // Same hazard, caught for sources that never appear in the export at all.
    skip('source is a route the new build serves as a 200');
    return;
  }
  if (ALREADY_REDIRECTED.has(from)) {
    skip('source already redirected by next.config.mjs');
    return;
  }
  const existing = ctx.seenFrom.get(from);
  if (existing) {
    skip(
      existing.to === to
        ? 'already emitted from the WordPress export with the same target'
        : `already emitted from the WordPress export with a DIFFERENT target (${existing.to})`
    );
    return;
  }
  if (!isServed(to, ctx.routes)) {
    skip(`target ${to} is not a served route on the new build`);
    return;
  }

  const record: RedirectEntry = { from, to, status: 301, bucket: candidate.bucket };
  ctx.seenFrom.set(from, record);
  ctx.entries.push(record);
  result.netNew.push({ from, to });
}

/**
 * Track C — read `scripts/data/wp-redirection-rules.json` and add any rule the
 * export doesn't already cover, as `bucket: "wp-redirection"`.
 *
 * These are already-earned live 301s whose SOURCE URLs exist nowhere in the
 * WordPress export (the export contains pages, not rules), so without this input
 * they would be silently lost at cutover — Brief 130 §10 flagged the gap.
 */
function importWpRedirectionRules(ctx: RuleImportContext): RuleImportResult {
  const result = emptyRuleImportResult();
  const skip = (k: string) => {
    result.skipped[k] = (result.skipped[k] || 0) + 1;
  };

  if (!fs.existsSync(WP_REDIRECTION_PATH)) {
    // A missing input here means silently lost redirects — the exact failure this
    // track exists to prevent. Fail rather than warn.
    throw new Error(
      `WordPress Redirection export not found at ${WP_REDIRECTION_PATH}. ` +
        'Copy the latest plugin export there (Brief 131, Track C).'
    );
  }

  const raw = JSON.parse(fs.readFileSync(WP_REDIRECTION_PATH, 'utf8')) as {
    redirects?: WpRedirectionRule[];
  };
  const rules = raw.redirects ?? [];
  result.total = rules.length;

  for (const rule of rules) {
    if (rule.enabled !== true) {
      skip('rule disabled in the plugin');
      continue;
    }
    if (rule.action_type !== 'url') {
      skip(`action_type "${rule.action_type}" is not a URL redirect`);
      continue;
    }
    if (rule.action_code !== 301) {
      skip(`action_code ${rule.action_code} is not a 301`);
      continue;
    }
    if (rule.regex === true) {
      // A regex rule can't go in an exact-match Map. None exist today; if one
      // ever appears it needs a hand-written next.config.mjs rule instead.
      skip('regex rule — needs a hand-written next.config.mjs rule');
      continue;
    }
    const targetRaw =
      typeof rule.action_data === 'string' ? rule.action_data : rule.action_data?.url;
    if (!rule.url || !targetRaw) {
      skip('missing source or target URL');
      continue;
    }
    result.eligible += 1;
    admitRuleSourcedRedirect(
      { from: rule.url, to: targetRaw, bucket: 'wp-redirection' },
      ctx,
      result
    );
  }

  return result;
}

/** Add the hand-curated EXTRA_REDIRECTS table through the same guards. */
function importExtraRedirects(ctx: RuleImportContext): RuleImportResult {
  const result = emptyRuleImportResult();
  result.total = EXTRA_REDIRECTS.length;
  result.eligible = EXTRA_REDIRECTS.length;
  for (const r of EXTRA_REDIRECTS) admitRuleSourcedRedirect(r, ctx, result);
  return result;
}

// ── Classification ───────────────────────────────────────────────────────────

interface Unmapped {
  from: string;
  bucket: string;
  reason: string;
  title: string;
}

interface Summary {
  totals: Record<string, number>;
  emitted: Record<string, number>;
  identity: string[];
  alreadyRedirected: string[];
  pendingSignOff: Record<string, number>;
  unmapped: Unmapped[];
  flatMapped: Array<{ from: string; to: string }>;
  faqCategoriesSeen: Record<string, number>;
  sewerGeoNoCity: Record<string, number>;
}

async function main() {
  const pendingPreviewIdx = process.argv.indexOf('--pending-preview');
  const pendingPreviewPath =
    pendingPreviewIdx !== -1 ? process.argv[pendingPreviewIdx + 1] : undefined;
  /**
   * Brief 131 Track D — with `--require-db`, an unreachable CMS DB is a hard
   * failure instead of a warning. Use it for the authoritative pre-cutover run
   * against the production DB, so a connection error can never quietly produce a
   * map whose article / sub-service targets were merely assumed to be published.
   */
  const requireDb = process.argv.includes('--require-db');

  console.log('Brief 130/131 — building the legacy redirect map');
  console.log(`  export : ${XML_PATH}`);
  if (!fs.existsSync(XML_PATH)) throw new Error(`WordPress export not found at ${XML_PATH}`);

  const routes = await loadServedRoutes();
  if (requireDb && !routes.dbAvailable) {
    throw new Error(
      '--require-db was passed but the CMS DB is unreachable. Article and ' +
        'sub-service targets cannot be publish-verified — refusing to write a map ' +
        'whose targets are unverified. Fix DATABASE_URL and re-run.'
    );
  }
  console.log(
    `  routes : ${routes.staticPaths.size} static · ${routes.cities.size} cities · ` +
      `${routes.services.size} services · ${routes.publishedSubServices.size} published sub-services · ` +
      `${routes.publishedArticles.size} published articles (db=${routes.dbAvailable})`
  );

  // Assert every alias target actually exists before we rely on it.
  for (const [from, to] of Object.entries(CITY_ALIASES)) {
    if (!routes.cities.has(to)) throw new Error(`CITY_ALIASES: ${from} → ${to} is not in CITY_REGISTRY`);
  }
  for (const [from, to] of Object.entries(FLAT_SERVICE_ALIASES)) {
    if (!routes.services.has(to)) throw new Error(`FLAT_SERVICE_ALIASES: ${from} → ${to} is not a service`);
  }
  for (const [from, to] of Object.entries(RETIRED_CITY_ALIASES)) {
    if (!routes.cities.has(to)) {
      throw new Error(`RETIRED_CITY_ALIASES: ${from} → ${to} is not in CITY_REGISTRY`);
    }
    if (routes.cities.has(from)) {
      throw new Error(
        `RETIRED_CITY_ALIASES: ${from} is still in CITY_REGISTRY — remove the registry row ` +
          'or drop the alias, otherwise the map would 301 a page the build serves as a 200'
      );
    }
  }

  const entries: RedirectEntry[] = [];
  const pending: RedirectEntry[] = [];
  const seenFrom = new Map<string, RedirectEntry>();

  const summary: Summary = {
    totals: {},
    emitted: {},
    identity: [],
    alreadyRedirected: [],
    pendingSignOff: {},
    unmapped: [],
    flatMapped: [],
    faqCategoriesSeen: {},
    sewerGeoNoCity: {},
  };

  const bump = (o: Record<string, number>, k: string) => {
    o[k] = (o[k] || 0) + 1;
  };

  function emit(entry: RedirectEntry, title: string) {
    const from = normalizePath(entry.from);
    const to = normalizePath(entry.to);

    if (from === to) {
      summary.identity.push(from);
      return;
    }
    if (ALREADY_REDIRECTED.has(from)) {
      summary.alreadyRedirected.push(from);
      return;
    }
    if (!isServed(to, routes)) {
      summary.unmapped.push({
        from,
        bucket: entry.bucket,
        reason: `proposed target ${to} is not a served route`,
        title,
      });
      return;
    }
    const existing = seenFrom.get(from);
    if (existing) {
      if (existing.to !== to) {
        summary.unmapped.push({
          from,
          bucket: entry.bucket,
          reason: `duplicate 'from' with a conflicting target (${existing.to} vs ${to})`,
          title,
        });
      }
      return;
    }
    const record: RedirectEntry = { from, to, status: 301, bucket: entry.bucket };
    seenFrom.set(from, record);
    if (PENDING_BUCKETS.has(entry.bucket)) {
      pending.push(record);
      bump(summary.pendingSignOff, entry.bucket);
    } else {
      entries.push(record);
      bump(summary.emitted, entry.bucket);
    }
  }

  await parseItems(XML_PATH, (itemXml) => {
    const postType = extractTag(itemXml, 'wp:post_type');
    const status = extractTag(itemXml, 'wp:status');
    bump(summary.totals, `${postType}|${status}`);
    if (status !== 'publish') return;

    const slug = extractTag(itemXml, 'wp:post_name');
    const title = extractTag(itemXml, 'title').replace(/\s+/g, ' ');
    const parent = extractTag(itemXml, 'wp:post_parent');
    const from = livePathFrom(itemXml, slug);

    // ── jb_article: live canonical is root-level /{slug} ─────────────────────
    if (postType === 'jb_article') {
      emit({ from, to: `/knowledge-hub/${slug}`, status: 301, bucket: 'article' }, title);
      return;
    }

    // ── jb_faq: /faq/{slug} ─────────────────────────────────────────────────
    if (postType === 'jb_faq') {
      const category = getPostMeta(itemXml)['_jb_faq_category'] || '';
      bump(summary.faqCategoriesSeen, category || '(none)');
      const to = FAQ_CATEGORY_TARGETS[category];
      if (!to) {
        summary.unmapped.push({
          from,
          bucket: 'faq',
          reason: `no target for _jb_faq_category "${category}"`,
          title,
        });
        return;
      }
      emit({ from, to, status: 301, bucket: 'faq' }, title);
      return;
    }

    // ── jb_sewer: /sewer-service/{obfuscated-id} — C2, held for sign-off ─────
    if (postType === 'jb_sewer') {
      const meta = getPostMeta(itemXml);
      const geo = slugify(meta['_jb_sewer_city'] || '');
      const citySlug = SEWER_GEO_ALIASES[geo] ?? geo;
      const service = SEWER_KEYWORD_TO_SERVICE[(meta['_jb_sewer_service'] || '').trim()];
      if (!routes.cities.has(citySlug)) bump(summary.sewerGeoNoCity, meta['_jb_sewer_city'] || '(none)');
      const to =
        routes.cities.has(citySlug) && service ? `/${citySlug}/${service}` : '/services/sewer';
      emit({ from, to, status: 301, bucket: 'sewer-service' }, title);
      return;
    }

    if (postType !== 'page') return;

    // ── Nested live city-service page: /{city}/{service} ────────────────────
    if (parent && parent !== '0') {
      const segs = from.slice(1).split('/');
      const retired = segs.length === 2 ? RETIRED_CITY_ALIASES[segs[0]] : undefined;
      if (segs.length === 2 && routes.cities.has(segs[0]) && routes.services.has(segs[1])) {
        // Identity — the new site serves the same path. Nothing to redirect.
        emit({ from, to: from, status: 301, bucket: 'city-service' }, title);
      } else if (retired && routes.services.has(segs[1])) {
        // Retired city slug (Track A.2) — carry the service across to the survivor.
        emit({ from, to: `/${retired}/${segs[1]}`, status: 301, bucket: 'city-service' }, title);
      } else {
        summary.unmapped.push({
          from,
          bucket: 'city-service',
          reason:
            segs.length !== 2
              ? 'nested page whose live path is not /{city}/{service}'
              : !routes.cities.has(segs[0])
                ? `city "${segs[0]}" is not in CITY_REGISTRY`
                : `service "${segs[1]}" is not a registered city-service`,
          title,
        });
      }
      return;
    }

    // ── Top-level page: city, flat legacy city-service, boiler, or misc ──────
    // next.config.mjs already redirects some live slugs (/plumbing, /contact-us,
    // …). Check before the MISC_TARGETS lookup so those slugs are attributed to
    // the existing rule rather than reported as an unhandled gap.
    if (ALREADY_REDIRECTED.has(from)) {
      summary.alreadyRedirected.push(from);
      return;
    }

    if (routes.cities.has(slug)) {
      emit({ from, to: from, status: 301, bucket: 'city-service' }, title);
      return;
    }

    if (RETIRED_CITY_ALIASES[slug]) {
      emit({ from, to: `/${RETIRED_CITY_ALIASES[slug]}`, status: 301, bucket: 'city-service' }, title);
      return;
    }

    const flat = slug.match(/^(.+)-il-(.+)$/);
    if (flat) {
      const rawCity = flat[1];
      const rawService = flat[2];
      const citySlug = CITY_ALIASES[rawCity] ?? RETIRED_CITY_ALIASES[rawCity] ?? rawCity;
      const serviceSlug = FLAT_SERVICE_ALIASES[rawService] ?? rawService;
      if (!routes.cities.has(citySlug)) {
        summary.unmapped.push({
          from,
          bucket: 'city-service',
          reason: `city "${rawCity}" has no CITY_REGISTRY entry (add it and this maps automatically)`,
          title,
        });
        return;
      }
      if (!routes.services.has(serviceSlug)) {
        summary.unmapped.push({
          from,
          bucket: 'city-service',
          reason: `service "${rawService}" is not a registered city-service`,
          title,
        });
        return;
      }
      const to = `/${citySlug}/${serviceSlug}`;
      summary.flatMapped.push({ from, to });
      emit({ from, to, status: 301, bucket: 'city-service' }, title);
      return;
    }

    if (!(slug in MISC_TARGETS)) {
      summary.unmapped.push({
        from,
        bucket: 'misc',
        reason: 'live top-level page with no MISC_TARGETS entry — add one to the generator',
        title,
      });
      return;
    }

    const target = MISC_TARGETS[slug];
    if (target === null) {
      summary.identity.push(from);
      return;
    }
    emit(
      { from, to: target, status: 301, bucket: BOILER_SLUGS.has(slug) ? 'boiler' : 'misc' },
      title
    );
  });

  // Reconciliation guard: every published URL must land in exactly one outcome.
  // Prevents a silently dropped bucket from reading as "everything is covered".
  const publishedUrls = Object.entries(summary.totals)
    .filter(([k]) => k.endsWith('|publish'))
    .filter(([k]) => !k.startsWith('wp_navigation|') && !k.startsWith('wpcf7_contact_form|'))
    .reduce((n, [, v]) => n + v, 0);
  const accounted =
    entries.length +
    summary.identity.length +
    summary.alreadyRedirected.length +
    Object.values(summary.pendingSignOff).reduce((n, v) => n + v, 0) +
    summary.unmapped.length;
  if (accounted !== publishedUrls) {
    throw new Error(
      `Reconciliation failed: ${accounted} outcomes for ${publishedUrls} published URLs ` +
        `(emitted ${entries.length}, identity ${summary.identity.length}, ` +
        `already-redirected ${summary.alreadyRedirected.length}, ` +
        `pending ${Object.values(summary.pendingSignOff).reduce((n, v) => n + v, 0)}, ` +
        `unmapped ${summary.unmapped.length})`
    );
  }

  // ── Track C: fold in the WordPress Redirection-plugin rules ───────────────
  // Runs AFTER the reconciliation guard on purpose: these sources are live
  // redirect rules, not published pages, so they are not part of the export's
  // published-URL count and would break that assertion if counted in it.
  const ruleCtx: RuleImportContext = {
    entries,
    seenFrom,
    identity: new Set(summary.identity),
    routes,
  };
  const wpImport = importWpRedirectionRules(ruleCtx);
  // EXTRA_REDIRECTS runs second so its targets can collapse through anything the
  // plugin import just added.
  const extraImport = importExtraRedirects(ruleCtx);
  if (wpImport.netNew.length) summary.emitted['wp-redirection'] = wpImport.netNew.length;
  for (const n of extraImport.netNew) {
    bump(summary.emitted, seenFrom.get(n.from)!.bucket);
  }

  // Chained-redirect guard: no entry's target may itself be a redirect source.
  const chains = entries.filter((e) => seenFrom.has(e.to));
  if (chains.length) {
    throw new Error(
      `Chained redirects detected (${chains.length}): ` +
        chains.slice(0, 5).map((c) => `${c.from} → ${c.to} → …`).join(', ')
    );
  }

  // Shadowing guard (Brief 131): no entry's SOURCE may be a path the new build
  // serves with a 200. Middleware runs the map before routing, so any such entry
  // would silently 301 a working page out of existence. The live-URL classifier
  // can't catch this on its own — a new-build route that has no live page (every
  // Track A city, e.g. /deerfield) never reaches the identity branch, so an
  // article or rule with the same slug would shadow it unnoticed.
  const shadowed = entries.filter((e) => isServed(e.from, routes));
  if (shadowed.length) {
    throw new Error(
      `Redirect sources shadow served routes (${shadowed.length}): ` +
        shadowed.slice(0, 10).map((s) => `${s.from} (would 301 to ${s.to})`).join(', ')
    );
  }

  const sortKey = (e: RedirectEntry) => `${e.bucket}\u0000${e.from}`;
  entries.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));
  pending.sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : sortKey(a) > sortKey(b) ? 1 : 0));

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');

  if (pendingPreviewPath) {
    fs.mkdirSync(path.dirname(pendingPreviewPath), { recursive: true });
    fs.writeFileSync(pendingPreviewPath, `${JSON.stringify(pending, null, 2)}\n`, 'utf8');
  }

  // ── Report ────────────────────────────────────────────────────────────────
  const publishedTotal = Object.entries(summary.totals)
    .filter(([k]) => k.endsWith('|publish'))
    .reduce((n, [, v]) => n + v, 0);

  console.log('\n── Live inventory (from the export) ────────────────────────');
  for (const [k, v] of Object.entries(summary.totals).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(6)}  ${k}`);
  }
  console.log(`  ${String(publishedTotal).padStart(6)}  TOTAL published`);
  console.log(
    `  ${String(publishedUrls).padStart(6)}  TOTAL published PUBLIC URLs ` +
      '(excludes wp_navigation + wpcf7_contact_form, which are not pages)'
  );

  const printRuleImport = (label: string, r: RuleImportResult) => {
    console.log(`\n── ${label} ${'─'.repeat(Math.max(0, 56 - label.length))}`);
    console.log(`  ${String(r.total).padStart(6)}  rules in the source`);
    console.log(`  ${String(r.eligible).padStart(6)}  eligible (enabled · url · 301 · non-regex)`);
    for (const [reason, n] of Object.entries(r.skipped).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(n).padStart(6)}  skipped: ${reason}`);
    }
    for (const c of r.collapsed) {
      console.log(`         chain collapsed: ${c.from} → ${c.via} → ${c.to}`);
    }
    console.log(`  ${String(r.netNew.length).padStart(6)}  NET-NEW entries`);
    for (const n of r.netNew) console.log(`         ${n.from} → ${n.to}`);
  };
  printRuleImport('Track C: WordPress Redirection-plugin import', wpImport);
  printRuleImport('Rule-sourced EXTRA_REDIRECTS (live 301s, not pages)', extraImport);

  console.log('\n── Emitted redirects by bucket ─────────────────────────────');
  for (const [k, v] of Object.entries(summary.emitted).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(6)}  ${k}`);
  }
  console.log(`  ${String(entries.length).padStart(6)}  TOTAL emitted`);

  console.log('\n── Not emitted ─────────────────────────────────────────────');
  console.log(`  ${String(summary.identity.length).padStart(6)}  identity (live path == new path)`);
  console.log(
    `  ${String(summary.alreadyRedirected.length).padStart(6)}  already redirected in next.config.mjs`
  );
  for (const [k, v] of Object.entries(summary.pendingSignOff)) {
    console.log(`  ${String(v).padStart(6)}  pending sign-off: ${k}`);
  }
  console.log(`  ${String(summary.unmapped.length).padStart(6)}  unmapped`);

  console.log('\n── Unmapped detail ─────────────────────────────────────────');
  const byReason = new Map<string, Unmapped[]>();
  for (const u of summary.unmapped) {
    const key = u.reason.replace(/"[^"]*"/g, '"…"');
    if (!byReason.has(key)) byReason.set(key, []);
    byReason.get(key)!.push(u);
  }
  for (const [reason, list] of [...byReason.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${list.length}× ${reason}`);
    for (const u of list) console.log(`      ${u.from}  — ${u.reason}`);
  }

  if (Object.keys(summary.sewerGeoNoCity).length) {
    console.log('\n── C2: jb_sewer geos with no CITY_REGISTRY match ───────────');
    for (const [k, v] of Object.entries(summary.sewerGeoNoCity).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(v).padStart(6)}  ${k}`);
    }
  }

  console.log(`\n✔ wrote ${entries.length} entries to ${path.relative(REPO_ROOT, OUT_PATH)}`);
  if (pendingPreviewPath) {
    console.log(`✔ wrote ${pending.length} pending (unapproved) entries to ${pendingPreviewPath}`);
  }
  if (!routes.dbAvailable) {
    console.log('\n⚠  DB was unreachable — re-run with the CMS DB up before Brief 131 wires this.');
  }
}

// Guarded so `scripts/verify-redirect-targets.ts` can import loadServedRoutes /
// isServed without kicking off a full 146 MB export parse.
if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
