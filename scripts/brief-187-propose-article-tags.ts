/**
 * Brief 187 (Track D) — backfill STOP 1: the tag PROPOSAL spreadsheet.
 *
 * READ-ONLY. Run locally against the dev DB; NEVER on deploy (it is not, and
 * must not be, wired into scripts/deploy.sh). It writes nothing to any database.
 * Its only output is a CSV for Marketing to review:
 *
 *   {briefs}/brief-187-article-tag-proposals.csv   (UTF-8 with BOM, CRLF — opens cleanly in Excel)
 *
 * Marketing fills `decision` (approve / skip), edits primary_topic /
 * secondary_topics / locations / confidence in place where they disagree, and
 * returns it. STOP 2 (`scripts/apply-brief-187-article-tags.ts`) applies only
 * the approved rows, in a separate session.
 *
 * ── INPUTS ──────────────────────────────────────────────────────────────────
 *   • cms_articles — every row, any status
 *   • the WordPress export XML — the OLD categories are not in the DB; joined on
 *     wp_post_id
 *   • kh_terms — the valid topic / location names (run the Brief 187 migration first)
 *
 * ── RULES, IN PRIORITY ORDER (Brief 187 Track D) ────────────────────────────
 *   1. Old WP category → topic, via WP_CATEGORY_MAP below (High).
 *   2. Keyword rules on title + slug (Medium), else the first ~500 words of the
 *      body (Low). Ties go to the more specific topic (SPECIFICITY).
 *   3. Company News: announcement vocabulary in the TITLE/SLUG takes precedence
 *      over service keywords (an announcement mentions services incidentally).
 *   4. Locations: exact registry city names in title/slug (High) or body only
 *      (Low). "Chicago" alone → the Chicagoland region; ambiguous names → Low;
 *      old WP categories evanston / northbrook → those cities (High).
 *   5. Nothing matched → topic blank, Low, "No signal". Never guess.
 *
 * Row confidence is the LOWEST of the proposed items' confidences: approving a
 * row applies every tag on it, so a row is only as sure as its weakest tag. The
 * `reason` column names the basis of each item.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/brief-187-propose-article-tags.ts [--wp=path/to/export.xml] [--out=path.csv]
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { Pool } from 'pg';
import { CHICAGOLAND_CITIES, OHIO_CITIES } from '../src/lib/content/locations-regions';

const BRIEFS_DIR = 'C:/Users/marke/OneDrive/Documents/Claude/Projects/JBP Web Migration/briefs';
const PROJECT_DIR = 'C:/Users/marke/OneDrive/Documents/Claude/Projects/JBP Web Migration';
const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=').slice(1).join('=');
const WP_XML = arg('wp') ?? `${PROJECT_DIR}/jblantonplumbing.WordPress.2026-06-26.xml`;
const OUT = arg('out') ?? `${BRIEFS_DIR}/brief-187-article-tag-proposals.csv`;
const LIVE_BASE = 'https://jblantonplumbing.com';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

type Conf = 'High' | 'Medium' | 'Low';
const RANK: Record<Conf, number> = { High: 3, Medium: 2, Low: 1 };
const minConf = (cs: Conf[]): Conf => cs.reduce((a, b) => (RANK[b] < RANK[a] ? b : a), 'High' as Conf);

/* ── Rule 1: the WP category → topic table (Brief 187, verbatim) ───────────── */

const norm = (s: string) =>
  s.toLowerCase().replace(/&amp;/g, '&').replace(/&/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

const WP_CATEGORY_MAP: Record<string, { primary: string; secondary?: string }> = {};
const addMap = (topic: string, cats: string[]) => {
  for (const c of cats) {
    const m = c.match(/^(.*?)\s*\[(.+)\]$/);
    WP_CATEGORY_MAP[norm(m ? m[1] : c)] = { primary: topic, secondary: m ? m[2] : undefined };
  }
};
addMap('sewers', ['sewer', 'sewer repair', 'sewer maintenance', 'sewer maintenance service', 'sewer rodding',
  'sewer camera inspection', 'trenchless sewer repair', 'overhead sewer systems', 'sewers drains [drains]']);
addMap('drains', ['drain', 'kitchen sink drain', 'clogged drains in chicago', 'drain cleaning services in chicago',
  'hydro jetting [sewers]', 'basement flooding', 'basement waterproofing', 'sump pumps', 'ejector pump', 'catch basin cleaning']);
addMap('water-heaters', ['residential water heater', 'water heater repair', 'water heater maintenance',
  'water heater installation', 'water heater services', 'tankless water heater', 'boiler']);
addMap('gas-lines', ['gas lines', 'gas line installation', 'gas line repair', 'gas line leak detection', 'gas repipe',
  'gas grill', 'fireplace installation repair maintenance']);
addMap('water-quality', ['water filtration systems', 'lead service line replacements']);
addMap('emergency', ['emergency plumbing', 'burst pipe repair']);
addMap('commercial', ['commercial', 'commercial drain service', 'commercial jetting', 'commercial plumbing services',
  'commercial water heater [water-heaters]', 'restaurant plumbing services', 'restaurant drain clearing',
  'restaurant water heater [water-heaters]']);
addMap('plumbing-tips', ['plumbing', 'residential plumbing', 'bathroom plumbing', 'bathroom plumbing chicago', 'baths',
  'kitchen plumbing', 'kitchen faucet repair and installation', 'faucet installation repair', 'shower repair',
  'toilet installation repair', 'laundry room plumbing', 'garbage disposal installation repair', 'home repipe',
  'galvanized repipe', 'maintenance services', 'pool heater installation repair']);
addMap('company-news', ['no drip club', 'financing']);
/** WP categories that are LOCATIONS, not topics (Track D rule 4). */
const WP_LOCATION_CATEGORIES: Record<string, string> = { evanston: 'evanston', northbrook: 'northbrook' };
/** Treated as "no category" → keyword rules. */
const WP_KEYWORD_CATEGORIES = new Set(['uncategorized']);

/** Tie-break order: most specific first, the catch-all last. */
const SPECIFICITY = ['water-heaters', 'gas-lines', 'water-quality', 'sewers', 'drains', 'commercial', 'emergency', 'company-news', 'plumbing-tips'];
const bySpecificity = (a: string, b: string) => SPECIFICITY.indexOf(a) - SPECIFICITY.indexOf(b);

/* ── Rule 2/3: keyword vocabulary (same vocabulary as the mapping table) ───── */

const KEYWORDS: Record<string, RegExp[]> = {
  sewers: [/\bsewers?\b/g, /\bsewage\b/g, /\btrenchless\b/g, /\brodding\b/g, /\bmain (?:sewer )?line\b/g, /\bcamera inspection\b/g, /\boverhead sewer\b/g],
  drains: [/\bdrains?\b/g, /\bdrainage\b/g, /\bclog(?:s|ged|ging)?\b/g, /\bhydro[- ]?jet(?:ting)?\b/g, /\bsump pumps?\b/g, /\bejector pumps?\b/g, /\bbasement flood(?:s|ing)?\b/g, /\bcatch basins?\b/g, /\bwaterproofing\b/g],
  'water-heaters': [/\bwater heaters?\b/g, /\btankless\b/g, /\bboilers?\b/g, /\bhot water\b/g, /\banode rods?\b/g],
  'gas-lines': [/\bgas (?:lines?|leaks?|pipes?|piping|grills?|appliances?|meters?)\b/g, /\bnatural gas\b/g, /\bfireplaces?\b/g],
  'water-quality': [/\bwater (?:quality|filtration|filters?|softeners?|testing|treatment)\b/g, /\bhard water\b/g, /\blead (?:pipes?|service lines?|lines?)\b/g, /\breverse osmosis\b/g, /\bcontaminants?\b/g, /\bpfas\b/g, /\bpink (?:stains?|residue|slime)\b/g, /\bwater softeners?\b/g],
  emergency: [/\bemergenc(?:y|ies)\b/g, /\bburst(?:ing)? pipes?\b/g, /\bfrozen pipes?\b/g, /\bpipes? (?:burst|freez\w*)\b/g],
  commercial: [/\bcommercial\b/g, /\brestaurants?\b/g, /\bgrease traps?\b/g, /\bbusiness(?:es)?\b/g, /\bproperty manag\w*/g, /\bhoas?\b/g, /\blandlords?\b/g],
  'plumbing-tips': [/\bfaucets?\b/g, /\btoilets?\b/g, /\bshowers?\b/g, /\bbath(?:room|tub)s?\b/g, /\bkitchen\b/g, /\bgarbage disposals?\b/g, /\brepip\w*/g, /\bgalvanized\b/g, /\bmaintenance\b/g, /\bplumbing tips?\b/g, /\bdiy\b/g, /\b(?:pvc|abs|pex|cpvc)\b/g, /\blaundry\b/g, /\bwater pressure\b/g, /\bleak(?:s|y|ing)?\b/g, /\bpool heaters?\b/g, /\bcast iron\b/g, /\bpipes?\b/g],
};
const COMPANY_NEWS: RegExp[] = [
  // "hiring" only as OUR hiring — "Hiring a Licensed Plumber" is a how-to, not news.
  /\b(?:is|are|we'?re|now) hiring\b/g, /\bhiring (?:event|now|fair)\b/g, /\bjoin our team\b/g, /\bcareers? at\b/g,
  /\bnow serving\b/g, /\bgrand opening\b/g, /\bnew (?:office|location)\b/g,
  // "expands into …", not "Expansion Tank".
  /\bopen(?:s|ed|ing)? (?:in|our)\b/g, /\bexpan(?:ds|ded|sion) (?:to|into)\b/g, /\bawards?\b/g, /\bcommunity\b/g, /\bsponsor\w*/g,
  /\bno drip club\b/g, /\bfinancing\b/g, /\bchariti?\w*/g, /\bdonat\w*/g, /\bvolunteer\w*/g, /\banniversar\w*/g, /\bcolumbus launch\b/g,
  // Community content: "2025 Best Restaurants of Evanston — Curated by J Blanton", campaigns.
  /\bcurated by\b/g, /\bchosen by\b/g, /\bcampaign\b/g, /\bbest (?:[\w-]+ ){1,4}of\b/g,
];

function countHits(text: string, patterns: RegExp[]): { n: number; top: string; topN: number } {
  const tally = new Map<string, number>();
  let n = 0;
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      n++;
      const k = m[0].toLowerCase();
      tally.set(k, (tally.get(k) ?? 0) + 1);
    }
  }
  let top = '';
  let topN = 0;
  for (const [k, v] of tally) if (v > topN) { top = k; topN = v; }
  return { n, top, topN };
}

/* ── Rule 4: locations ──────────────────────────────────────────────────────── */

interface LocTarget { slug: string; name: string; region: 'Chicagoland' | 'Central Ohio' }
const CITIES: LocTarget[] = [
  ...CHICAGOLAND_CITIES.map((c) => ({ slug: c.slug, name: c.name, region: 'Chicagoland' as const })),
  ...OHIO_CITIES.map((c) => ({ slug: c.slug, name: c.name, region: 'Central Ohio' as const })),
];
const REGION_TARGET = {
  chicagoland: { slug: 'chicagoland', name: 'Chicagoland', region: 'Chicagoland' as const },
  'central-ohio': { slug: 'central-ohio', name: 'Central Ohio', region: 'Central Ohio' as const },
};
/**
 * Names that are also common words, people or other places. Any match is Low.
 * "Columbus" is here (the explorer) — except "Columbus, Ohio/OH", which is not.
 */
const AMBIGUOUS = new Set([
  'Columbus', 'Aurora', 'Geneva', 'Golf', 'Harmony', 'Manhattan', 'Riverside', 'Richmond', 'Burlington', 'Cary',
  'Harvey', 'Greenwood', 'Starks', 'Roseland', 'Butterfield', 'Prospect', 'Orient', 'Cable', 'Carroll', 'Derby',
  'Fulton', 'Galena', 'Heath', 'Irwin', 'Kingston', 'Lancaster', 'London', 'Marengo', 'Newark', 'Raymond',
  'Springfield', 'Urbana', 'Utica', 'Baltimore', 'Alexandria', 'Amanda', 'Ashley', 'Delaware', 'Dublin', 'Hebron',
  'Powell', 'Radnor', 'Sedalia', 'Waldo', 'Brice', 'Croton', 'Harrisburg', 'Middleburg', 'Williamsport',
  'Mechanicsburg', 'Thurston', 'Commercial Point', 'Old Town', 'Gold Coast', 'Hyde Park', 'Lincoln Park',
  'Forest Park', 'Deer Park', 'Buena Park', 'Mount Vernon', 'Grove City', 'New Holland', 'East Liberty',
  'Green Camp', 'Woodstock', 'Belden', 'Almora', 'Fairmont', 'Ferndale', 'Madison', 'Lake View East', 'Plain City',
  'Kilbourne', 'Adelphi', 'Galloway', 'Johnstown', 'Rockdale', 'Hartland', 'Ringwood', 'Rondout',
]);
/** Registry names that appear twice (Woodstock IL / OH) are written "Name (Region)" in the CSV. */
const nameCount = new Map<string, number>();
for (const c of CITIES) nameCount.set(c.name.toLowerCase(), (nameCount.get(c.name.toLowerCase()) ?? 0) + 1);
const displayName = (t: LocTarget) => (nameCount.get(t.name.toLowerCase())! > 1 ? `${t.name} (${t.region})` : t.name);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Longest names first, so "North Chicago" / "Chicago Heights" win over "Chicago". */
const CITY_MATCHERS = CITIES
  .filter((c) => c.slug !== 'chicago')
  .sort((a, b) => b.name.length - a.name.length)
  .map((c) => ({ c, re: new RegExp(`(?<![A-Za-z])${escapeRe(c.name)}(?![A-Za-z])`, 'g') }));

interface LocHit { target: LocTarget; conf: Conf; why: string }

/** Case-sensitive proper-noun matching with longest-first masking. */
function findLocations(text: string): Map<string, { target: LocTarget; ambiguous: boolean }> {
  const found = new Map<string, { target: LocTarget; ambiguous: boolean }>();
  let masked = text;
  // "Columbus, Ohio" / "Columbus, OH" is unambiguous.
  const columbusOhio = /\bColumbus,?\s+(?:Ohio|OH)\b/.test(masked);
  for (const { c, re } of CITY_MATCHERS) {
    re.lastIndex = 0;
    if (re.test(masked)) {
      const ambiguous = AMBIGUOUS.has(c.name) && !(c.name === 'Columbus' && columbusOhio);
      // Woodstock appears in both regions; a bare mention is taken as Illinois (the
      // library is Chicagoland-era) and marked Low.
      if (c.name === 'Woodstock' && c.region === 'Central Ohio') continue;
      found.set(c.slug, { target: c, ambiguous });
      masked = masked.replace(re, (m) => '#'.repeat(m.length));
    }
  }
  if (/(?<![A-Za-z])Chicagoland(?![A-Za-z])/.test(masked) || /(?<![A-Za-z])Chicago(?![A-Za-z])/.test(masked)) {
    found.set('chicagoland', { target: REGION_TARGET.chicagoland, ambiguous: false });
  }
  if (/\bCentral Ohio\b/.test(masked)) found.set('central-ohio', { target: REGION_TARGET['central-ohio'], ambiguous: false });
  return found;
}
/** Slug form: hyphen-bounded registry slug inside the article slug. */
function findLocationsInSlug(slug: string): Map<string, LocTarget> {
  const out = new Map<string, LocTarget>();
  let s = `-${slug}-`;
  for (const c of [...CITIES].sort((a, b) => b.slug.length - a.slug.length)) {
    if (c.slug === 'chicago' || c.slug === 'woodstock-oh') continue;
    const needle = `-${c.slug}-`;
    if (s.includes(needle)) { out.set(c.slug, c); s = s.split(needle).join('-#-'); }
  }
  if (/-chicago(land)?-/.test(s)) out.set('chicagoland', REGION_TARGET.chicagoland);
  return out;
}

/* ── WP export ──────────────────────────────────────────────────────────────── */

function loadWpCategories(file: string): Map<number, string[]> {
  const xml = readFileSync(file, 'utf8');
  const out = new Map<number, string[]>();
  for (const item of xml.split('<item>').slice(1)) {
    const end = item.indexOf('</item>');
    const body = end >= 0 ? item.slice(0, end) : item;
    const id = body.match(/<wp:post_id>(\d+)<\/wp:post_id>/);
    if (!id) continue;
    const cats = [...body.matchAll(/<category domain="category" nicename="[^"]*"><!\[CDATA\[([^\]]*)\]\]><\/category>/g)].map((m) => m[1]);
    if (cats.length) out.set(Number(id[1]), cats);
  }
  return out;
}

/* ── Text helpers ───────────────────────────────────────────────────────────── */

function bodyText(html: string, words = 500): string {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8217;|&rsquo;/g, "'").replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.split(' ').slice(0, words).join(' ');
}
const slugText = (slug: string) => slug.replace(/-/g, ' ');

function csvCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/* ── Main ───────────────────────────────────────────────────────────────────── */

interface Row {
  article_id: number; slug: string; title: string; status: string; live_url: string;
  old_wp_category: string; primary_topic: string; secondary_topics: string; locations: string;
  confidence: Conf; reason: string; decision: string; notes: string;
}

async function main() {
  if (!existsSync(WP_XML)) throw new Error(`WP export not found: ${WP_XML} (pass --wp=…)`);
  console.log(`Reading the WP export (${WP_XML})…`);
  const wpCats = loadWpCategories(WP_XML);
  console.log(`  ${wpCats.size} WP items carry at least one category.`);

  const termsRes = await pool.query<{ type: string; slug: string; name: string }>(`SELECT type, slug, name FROM kh_terms`);
  if (termsRes.rows.length === 0) throw new Error('kh_terms is empty — run scripts/migrate-brief-187-kh-taxonomy.ts first.');
  const topicName = new Map(termsRes.rows.filter((t) => t.type === 'topic').map((t) => [t.slug, t.name]));
  const locationSlugs = new Set(termsRes.rows.filter((t) => t.type === 'location').map((t) => t.slug));

  const arts = await pool.query<{ id: number; slug: string; title: string; status: string; wp_post_id: number | null; html: string | null }>(
    `SELECT id, slug, title, status, wp_post_id, body->>'html' AS html FROM cms_articles
      ORDER BY created_at DESC, wp_post_id DESC NULLS LAST, id DESC`
  );
  console.log(`  ${arts.rows.length} cms_articles rows (all statuses).`);

  const unmappedCats = new Map<string, number>();
  const rows: Row[] = [];

  for (const a of arts.rows) {
    const cats = a.wp_post_id ? wpCats.get(a.wp_post_id) ?? [] : [];
    const titleSlug = `${a.title} ${slugText(a.slug)}`;
    const titleSlugLc = titleSlug.toLowerCase();
    const body = bodyText(a.html ?? '');
    const reasons: string[] = [];
    const confs: Conf[] = [];

    // ── Topic ────────────────────────────────────────────────────────────────
    let primary = '';
    const secondary: string[] = [];
    const wpTopics: string[] = [];
    const wpSecondaries: string[] = [];
    const wpLocs: string[] = [];
    for (const c of cats) {
      const k = norm(c);
      if (WP_CATEGORY_MAP[k]) {
        wpTopics.push(WP_CATEGORY_MAP[k].primary);
        if (WP_CATEGORY_MAP[k].secondary) wpSecondaries.push(WP_CATEGORY_MAP[k].secondary!);
      } else if (WP_LOCATION_CATEGORIES[k]) {
        wpLocs.push(WP_LOCATION_CATEGORIES[k]);
      } else if (!WP_KEYWORD_CATEGORIES.has(k)) {
        unmappedCats.set(c, (unmappedCats.get(c) ?? 0) + 1);
      }
    }

    if (wpTopics.length) {
      // Rule 1. Several categories → the topic with the most, ties to the more specific.
      const tally = new Map<string, number>();
      for (const t of wpTopics) tally.set(t, (tally.get(t) ?? 0) + 1);
      const ranked = [...tally.keys()].sort((x, y) => tally.get(y)! - tally.get(x)! || bySpecificity(x, y));
      primary = ranked[0];
      for (const t of [...wpSecondaries, ...ranked.slice(1)]) if (t !== primary && !secondary.includes(t)) secondary.push(t);
      const mapped = cats.filter((c) => WP_CATEGORY_MAP[norm(c)]);
      reasons.push(`Old WP categor${mapped.length > 1 ? 'ies' : 'y'} ${mapped.map((c) => `'${c}'`).join(', ')}`);
      confs.push('High');
      // Rule 1 wins, but say so when the title reads like an announcement.
      const news = countHits(titleSlugLc, COMPANY_NEWS);
      if (news.n > 0 && primary !== 'company-news') {
        reasons.push(`CHECK: the title reads like Company News ('${news.top}')`);
      }
    } else {
      // Rule 3 first on title/slug: an announcement mentions services incidentally.
      const news = countHits(titleSlugLc, COMPANY_NEWS);
      const titleHits = Object.entries(KEYWORDS)
        .map(([topic, pats]) => ({ topic, ...countHits(titleSlugLc, pats) }))
        .filter((h) => h.n > 0)
        .sort((x, y) => y.n - x.n || bySpecificity(x.topic, y.topic));
      if (news.n > 0) {
        primary = 'company-news';
        reasons.push(`Title/slug mentions '${news.top}'${news.topN > 1 ? ` ×${news.topN}` : ''} (announcement)`);
        confs.push('Medium');
        for (const h of titleHits) if (secondary.length < 2) secondary.push(h.topic);
      } else if (titleHits.length) {
        // Rule 2, title/slug → Medium.
        primary = titleHits[0].topic;
        reasons.push(`Title/slug mentions '${titleHits[0].top}'${titleHits[0].topN > 1 ? ` ×${titleHits[0].topN}` : ''}`);
        confs.push('Medium');
        for (const h of titleHits.slice(1)) if (secondary.length < 2) secondary.push(h.topic);
      } else {
        // Rule 2, body only → Low; at least 2 mentions, or it is noise.
        const bodyHits = Object.entries(KEYWORDS)
          .map(([topic, pats]) => ({ topic, ...countHits(body.toLowerCase(), pats) }))
          .filter((h) => h.n >= 2)
          .sort((x, y) => y.n - x.n || bySpecificity(x.topic, y.topic));
        if (bodyHits.length) {
          primary = bodyHits[0].topic;
          reasons.push(`Body mentions '${bodyHits[0].top}' ×${bodyHits[0].topN} (first 500 words; ${bodyHits[0].n} topic words in all)`);
          confs.push('Low');
        }
      }
    }

    // ── Locations ────────────────────────────────────────────────────────────
    const locs = new Map<string, LocHit>();
    const put = (h: LocHit) => {
      const prev = locs.get(h.target.slug);
      if (!prev || RANK[h.conf] > RANK[prev.conf]) locs.set(h.target.slug, h);
    };
    for (const s of wpLocs) {
      const t = CITIES.find((c) => c.slug === s)!;
      put({ target: t, conf: 'High', why: `old WP category '${s}'` });
    }
    for (const [, { target, ambiguous }] of findLocations(a.title)) {
      put({ target, conf: ambiguous ? 'Low' : 'High', why: `title${ambiguous ? ', ambiguous name' : ''}${target.slug === 'chicagoland' ? " ('Chicago' → region)" : ''}` });
    }
    for (const [, target] of findLocationsInSlug(a.slug)) {
      const ambiguous = AMBIGUOUS.has(target.name);
      put({ target, conf: ambiguous ? 'Low' : 'High', why: `slug${ambiguous ? ', ambiguous name' : ''}` });
    }
    const bodyLocs = [...findLocations(body)].filter(([slug]) => !locs.has(slug));
    const bodyCities = bodyLocs.filter(([, v]) => v.target.slug !== 'chicagoland' && v.target.slug !== 'central-ohio');
    if (bodyCities.length > 5) {
      reasons.push(`Body lists ${bodyCities.length} cities (a service-area list) — not proposed`);
      for (const [, v] of bodyLocs.filter(([s]) => s === 'chicagoland' || s === 'central-ohio')) {
        put({ target: v.target, conf: 'Low', why: 'body only' });
      }
    } else {
      for (const [, v] of bodyLocs) put({ target: v.target, conf: 'Low', why: `body only${v.ambiguous ? ', ambiguous name' : ''}` });
    }
    const locList = [...locs.values()].filter((l) => locationSlugs.has(l.target.slug));
    if (locList.length) {
      reasons.push(`Location${locList.length > 1 ? 's' : ''}: ${locList.map((l) => `${l.target.name} (${l.why}, ${l.conf})`).join('; ')}`);
      confs.push(...locList.map((l) => l.conf));
    }

    // Rule 5: no topic matched → blank, Low, "No signal". Never guessed. Any
    // location evidence is still reported after it.
    if (!primary) reasons.unshift('No signal');

    rows.push({
      article_id: a.id,
      slug: a.slug,
      title: a.title,
      status: a.status,
      live_url: `${LIVE_BASE}/knowledge-hub/${a.slug}`,
      old_wp_category: cats.join('; '),
      primary_topic: primary ? topicName.get(primary) ?? primary : '',
      secondary_topics: secondary.slice(0, 2).map((s) => topicName.get(s) ?? s).join('; '),
      locations: locList.map((l) => displayName(l.target)).join('; '),
      confidence: primary ? minConf(confs) : 'Low',
      reason: reasons.join('. '),
      decision: '',
      notes: '',
    });
  }

  // ── Write the CSV ──────────────────────────────────────────────────────────
  const COLS: (keyof Row)[] = ['article_id', 'slug', 'title', 'status', 'live_url', 'old_wp_category', 'primary_topic',
    'secondary_topics', 'locations', 'confidence', 'reason', 'decision', 'notes'];
  const csv = '\uFEFF' + [COLS.join(','), ...rows.map((r) => COLS.map((c) => csvCell(String(r[c]))).join(','))].join('\r\n') + '\r\n';
  writeFileSync(OUT, csv, 'utf8');

  // ── Report ─────────────────────────────────────────────────────────────────
  const byTopic = new Map<string, number>();
  const byConf = new Map<string, number>();
  for (const r of rows) {
    byTopic.set(r.primary_topic || '(none)', (byTopic.get(r.primary_topic || '(none)') ?? 0) + 1);
    byConf.set(r.confidence, (byConf.get(r.confidence) ?? 0) + 1);
  }
  const withLoc = rows.filter((r) => r.locations).length;
  const noProposal = rows.filter((r) => !r.primary_topic && !r.locations);
  const noTopic = rows.filter((r) => !r.primary_topic);
  console.log(`\nWrote ${rows.length} rows → ${OUT}\n`);
  console.log('By primary topic:');
  for (const [k, v] of [...byTopic].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(16)} ${v}`);
  console.log('By confidence:');
  for (const k of ['High', 'Medium', 'Low']) console.log(`  ${k.padEnd(16)} ${byConf.get(k) ?? 0}`);
  console.log(`Rows with ≥1 location proposed: ${withLoc}`);
  console.log(`No topic proposed ("No signal"): ${noTopic.length} — of which nothing at all proposed (no location either): ${noProposal.length}`);
  console.log('\nWP categories not in the mapping table (treated as keyword rules):');
  if (unmappedCats.size === 0) console.log('  (none)');
  for (const [k, v] of [...unmappedCats].sort((a, b) => b[1] - a[1])) console.log(`  ${k} ×${v}`);
  // "Most common": titles repeat in this library (spun-content era), so rank by
  // how often a title occurs among the No-signal rows, then hub order.
  const titleFreq = new Map<string, number>();
  for (const r of noTopic) titleFreq.set(r.title, (titleFreq.get(r.title) ?? 0) + 1);
  const topTitles = [...titleFreq].sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.log('\nThe 20 most common "No signal" titles:');
  for (const [t, n] of topTitles) console.log(`  - ${t}${n > 1 ? `  (×${n})` : ''}`);
  // And the words those titles share — the quickest way to spot a missing topic.
  const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'for', 'your', 'you', 'is', 'how', 'what', 'why', 'with', 'on', 'do', 'are', 'can', 'it', 'when', 'should', 'be', 'from', 'about', 'this', 'that', 'my', 'we', 'our', 'at', 'vs', 'i', 'does', 'need', 'know', 'tips', 'home', 'j', 'blanton']);
  const wordFreq = new Map<string, number>();
  for (const r of noTopic) {
    for (const w of new Set(r.title.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/))) {
      if (w.length > 2 && !STOP.has(w)) wordFreq.set(w, (wordFreq.get(w) ?? 0) + 1);
    }
  }
  console.log('\nMost frequent words in "No signal" titles:');
  console.log('  ' + [...wordFreq].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([w, n]) => `${w} ×${n}`).join(', '));

  const totalLocTags = rows.reduce((n, r) => n + (r.locations ? r.locations.split('; ').length : 0), 0);
  console.log(`\nLocation tags proposed in total: ${totalLocTags}`);
  console.log('\nSTOP 1 complete. Nothing was written to any database.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
