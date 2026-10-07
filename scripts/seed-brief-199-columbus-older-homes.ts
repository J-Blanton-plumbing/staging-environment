/**
 * Brief 199 — "Older Homes in Grandview, Clintonville and German Village: Which
 * Plumbing Problems to Expect", the first Columbus ranking article, on the
 * Article V2 template, as an UNPUBLISHED draft for manager review:
 *   /knowledge-hub/older-homes-plumbing-problems-grandview-clintonville-german-village          (404 until Publish)
 *   /review/knowledge-hub/older-homes-plumbing-problems-grandview-clintonville-german-village   (Basic Auth, Brief 195)
 *
 * The copy is VERBATIM from Marketing's .md
 * (`New Pages/Columbus Older Homes Article/01-older-homes-plumbing-problems-grandview-clintonville-german-village.md`),
 * rebuilt as CMS content the way Briefs 191/195/198 rebuilt theirs:
 *   • body — rich text in the ARTICLE-BODY allow-list (sanitizeArticleBodyHtml:
 *     the shared Brief 73 list + simple tables, Brief 199 Track B);
 *   • v2   — subtitle, byline, hero alt/caption, key takeaways, office and FAQ.
 * The ONLY departures from the .md are the brief's eight allowed changes:
 *   1. the DRAFT NOTES / IMPLEMENTATION NOTE comments are not imported;
 *   2. the TL;DR becomes the subtitle + key takeaways, and is not in the body;
 *   3. the housing-age table is a real <table> (th scope="col" header row), with
 *      the Grandview Heights cell rewritten from ACS 2024 5-year B25034 (Track C);
 *   4. the inline "NEED AN EXPERT? … SCHEDULE NOW" band is dropped — the V2
 *      template supplies the service CTA, rail card and call bar;
 *   5. the "FAQ Schema (JSON-LD)" section is not imported (V2 emits no FAQPage;
 *      never a <script> in the body);
 *   6. the phone is `{{phone}}` (office `columbus` → the Central Ohio phone,
 *      614-547-6516, Brief 192), never typed;
 *   7. every https://jblantonplumbing.com/… link is relative, and "schedule
 *      service online" (/contact) is `#schedule` (the booking popup);
 *   8. FAQ 3: "German Village many may still have" → "German Village may still have".
 * Plus Marketing's first review round (R1, 2026-10-07): takeaway 1 starts "Age often means…"; the
 * table's lead-in line is gone; the clay-pipe photo follows the "What Kind of Pipes…" intro; the
 * office map sits at the end of "Neighborhood by Neighborhood". On a box where the article already
 * exists, `update-brief-199-older-homes-review-1.ts` applies the same R1 edits to the draft.
 * Images: `public/images/knowledge-hub/columbus-older-homes/` (real photos).
 *
 * ── CREATE-ONCE (Brief 186) ─────────────────────────────────────────────────
 * If an article with this slug exists, NOTHING is written: ALREADY-EXISTS,
 * exit 0. From then on editors own the article. Never updates or deletes.
 *
 * ── GUARDS ──────────────────────────────────────────────────────────────────
 * Content state → report NOT-APPLIED (guard tripped), write nothing, exit 0:
 *   • the `sewers` topic or the `central-ohio` location is missing;
 *   • the `columbus` office is missing or not OH, or Global Settings' Central
 *     Ohio phone is not exactly 614-547-6516 (Brief 191 guard; never written here);
 *   • no cms_users row to author Version 1.
 * Code/schema fault → exit 1:
 *   • the Brief 190 `template` / `v2` columns are missing;
 *   • the sanitized body holds no <table> (Track B is not active) — never seed
 *     the body with the table silently stripped.
 * A hand-picked related article that is missing or not published, and a
 * neighbourhood location term that doesn't exist, are skipped and reported —
 * neither is a guard.
 *
 * ── DRAFT THROUGH THE VERSION MODEL (Brief 159/195/198) ─────────────────────
 * In ONE transaction: the live `cms_articles` row (status DRAFT, template
 * article-v2), its tags and hand-picked related articles, and ONE `page_drafts`
 * row "Version 1 — for review" with is_published = FALSE whose content is the
 * payload the editor saves. The label is deliberately NOT Brief 159's
 * "Version 1 — live", so datePublished becomes the time Marketing clicks Publish.
 *
 * Needs an explicit mode (Brief 147): `commit` applies; `--dry-run` previews.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/seed-brief-199-columbus-older-homes.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';
import { sanitizeArticleV2Content } from '../src/lib/cms/article-v2-sanitize';
import { writeArticleRelated, writeArticleTerms } from '../src/lib/cms/kh-taxonomy';

const SCRIPT = 'seed-brief-199-columbus-older-homes';
const mode = resolveRunMode(SCRIPT);

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

const SLUG = 'older-homes-plumbing-problems-grandview-clintonville-german-village';
const VERSION_LABEL = 'Version 1 — for review';
const IMG = '/images/knowledge-hub/columbus-older-homes';
const OFFICE = 'columbus';
const EXPECTED_CENTRAL_OHIO_PHONE = '614-547-6516'; // the guard's expected value — never written by this script

const TITLE = 'Older Homes in Grandview, Clintonville and German Village: Which Plumbing Problems to Expect';
const META_TITLE = 'Older Home Plumbing Problems in Columbus Neighborhoods';
const DEK = 'Many homes in Grandview Heights, Clintonville and German Village are 80 to more than 150 years old.';
const META_DESCRIPTION =
  'Clay sewer lines, cast iron drains and lead service lines: what to expect under older homes in Grandview Heights, Clintonville and German Village, and when to get a sewer camera inspection.';

const CITY_LATERAL_PDF =
  'https://www.columbus.gov/files/sharedassets/city/v/1/utilities/sustainability/blueprint/lateral-lining_brochure_fnl_ajg.pdf';
/** (3) Track C — ACS 2024 5-year, table B25034, Grandview Heights city, Ohio (place 39-31304). */
const CENSUS_URL = 'https://data.census.gov/table/ACSDT5Y2024.B25034?g=160XX00US3931304';

/** Brief 195/198 in-article photo shape. */
const fig = (file: string, w: number, h: number, alt: string, caption: string) =>
  `<figure><img src="${IMG}/${file}" alt="${alt}" width="${w}" height="${h}" loading="lazy"><figcaption>${caption}</figcaption></figure>`;

const BODY = [
  // (1) draft-notes comment not imported. (2) The TL;DR is the subtitle + key takeaways; the body starts here.
  `<p>Brick streets. Big front porches. Bungalows built back when streetcars still ran up High Street. The charm of Central Ohio's older neighborhoods is real, and so is the age of what's hidden below it.</p>`,
  `<p>Many homes in Grandview Heights, Clintonville and German Village still have their original pipes. And after more than 30 years serving homeowners in neighborhoods with the same clay sewer lines and cast iron drains, we've learned that's where most plumbing problems start.</p>`,
  `<p>If you own, or are thinking of buying, a house in these areas, here's what you'll likely find underneath, the warning signs to watch for and when a sewer camera inspection can save you from a surprise repair bill.</p>`,

  `<h2>How Old Are the Homes in Central Ohio's Older Neighborhoods?</h2>`,
  `<p>Many homes in Grandview Heights, Clintonville and German Village were built between the mid-1800s and the 1940s, which makes them roughly 80 to more than 150 years old. A lot of them still rely on plumbing from that era.</p>`,
  // (3) A real table (Track B). Grandview Heights cell = Track C wording. The .md's lead-in line
  // "Here's when most homes in each neighborhood were built:" was removed in Marketing's review (R1).
  `<table>` +
    `<thead><tr><th scope="col">Neighborhood</th><th scope="col">Housing age</th><th scope="col">What you'll find</th></tr></thead>` +
    `<tbody>` +
    `<tr><th scope="row">Grandview Heights</th><td>In Grandview Heights, <a href="${CENSUS_URL}">1,798 of 4,238 housing units (about 42%) were built in 1939 or earlier</a></td><td>Pre-war homes on tree-lined streets</td></tr>` +
    `<tr><th scope="row">German Village</th><td><a href="https://germanvillage.com/history/">Developed mainly between 1840 and 1914</a>, and listed on the National Register of Historic Places in 1974</td><td>Small brick cottages and rowhouses on tight lots</td></tr>` +
    `<tr><th scope="row">Clintonville</th><td>Farmland turned into housing <a href="https://devcolumbusneighborhoods.osu.edu/neighborhood/clintonville/">after streetcar lines extended north from downtown in the early 1900s</a></td><td>Streetcar-era homes near ravines and mature trees</td></tr>` +
    `</tbody>` +
    `</table>`,
  `<p>Age alone doesn't mean a pipe has failed. It does mean it's worth knowing what you have before something goes wrong.</p>`,

  `<h2>What Kind of Pipes Are Under an Older Columbus Home?</h2>`,
  `<p>Older Columbus homes commonly have a clay sewer lateral, cast iron drains inside the house and galvanized steel or copper water pipes. Some homes built before 1964 may still have a lead water service line. Each material has its own weak spots, from roots in clay joints to rust inside iron and steel.</p>`,
  // R1: the photo goes with the section intro, above the four material paragraphs (not after the first one).
  fig(
    'clay-sewer-pipe-roots.webp', 1100, 614,
    'Cracked clay sewer pipe with tree roots growing through a joint, dug up in front of an older brick home',
    'Clay pipe was laid in short sections, and every joint is a spot where roots can get in.'
  ),
  `<p><strong>Clay sewer laterals.</strong> The lateral is the pipe that carries everything you flush or drain from your house to the city sewer. The City of Columbus explains that <a href="${CITY_LATERAL_PDF}">in older homes, the lateral is usually clay pipe</a>, which can crack or fill with tree roots over time. Clay was laid in short sections, and every joint between them is a spot where roots can slip in. Here's more on <a href="/knowledge-hub/roots-in-sewer-line">tree roots in your sewer line</a>.</p>`,
  `<p><strong>Cast iron drains.</strong> Cast iron is heavy and strong, which is why it was used for drain and waste lines for so long. In older homes, we often find cast iron that has rusted from the inside. That buildup narrows the pipe, catches debris and can eventually lead to cracks or leaks.</p>`,
  `<p><strong>Galvanized water lines.</strong> Galvanized pipe is steel coated with zinc. As the coating wears away, the steel underneath rusts. The signs we usually see are low water pressure and brown or rusty water.</p>`,
  `<p><strong>Lead service lines.</strong> This is the pipe that brings drinking water into your home. The City of Columbus says <a href="https://www.columbus.gov/leadandwater">homes built before 1964 may still have a lead service line</a>, and homes built before 1989 may have copper pipes joined with lead solder. If your home was built after 1965, the City says you don't have a lead service line.</p>`,

  `<h2>Neighborhood by Neighborhood: What to Watch For</h2>`,
  `<p>Every home is different, but each neighborhood has a few things worth knowing.</p>`,
  `<h3>Grandview Heights</h3>`,
  `<p>Many Grandview homes may still have their original sewer lateral. Mature trees make root problems more likely. Slow drains that come back a few months after cleaning are often the first clue.</p>`,
  `<p>One thing to keep in mind: Grandview Heights is its own city, separate from Columbus. Its rules and services can differ, so check with the city if you're not sure where your responsibility ends. Our Columbus office sits in the Grandview Heights area, and you can see what we do locally on our <a href="/columbus-grandview-heights">Grandview Heights plumbing page</a>.</p>`,
  `<h3>Clintonville</h3>`,
  `<p>Two issues are worth watching in Clintonville: roots in older laterals, and basement backups during heavy rain.</p>`,
  `<p>Storms make it worse, because a cracked lateral lets water into the sanitary sewer. The City of Columbus explains the system <a href="${CITY_LATERAL_PDF}">wasn't designed to carry rainwater</a>, so extra water can overload it and push sewage back into basements. See our <a href="/columbus-clintonville">Clintonville plumbing services</a> for help in the area.</p>`,
  `<h3>German Village</h3>`,
  `<p>Homes here sit close together and close to the street, so sewer lines often run under garden walls, patios and brick walkways, which can make repairs tricky.</p>`,
  `<p>The public sewers here are old, too. In one case, <a href="https://myfox28columbus.com/news/local/sewer-collapse-in-south-pearl-alley-in-german-village-sewer-maintenance-operations-center-columbus-water-and-gas-livingston-avenue-south-3rd-street">a large combined sewer collapsed under South Pearl Alley</a>, backing up flow and flooding part of South 3rd Street.</p>`,
  `<p>A combined sewer carries both stormwater and wastewater in the same pipe. That was city pipe, not a homeowner's lateral, but it shows how much old infrastructure sits under the neighborhood. For help with your own line, talk to our <a href="/columbus-german-village">plumbers in German Village</a>.</p>`,
  // R1: the Columbus office map closes the neighborhood section (V2's [[office-map]] marker).
  `<p>[[office-map]]</p>`,

  `<h2>What Does a Sewer Camera Inspection Show?</h2>`,
  `<p>A sewer camera inspection sends a small waterproof camera through your sewer line so you can see the inside on a screen. It can reveal tree roots, cracks, separated or offset joints, sagging sections called bellies, grease buildup and collapsed pipe. It's one of the easiest ways to find a problem without digging.</p>`,
  fig(
    'sewer-camera-inspection.webp', 1100, 825,
    'Two J. Blanton plumbers running a sewer camera inspection and checking the footage on the monitor',
    'We show you the camera footage and explain what we found.'
  ),
  `<p>This matters because the lateral is your pipe. In Columbus, the City says <a href="${CITY_LATERAL_PDF}">homeowners are responsible for maintaining their lateral pipes</a>, while the City takes care of its own part of the system. If roots or a crack cause a backup in your lateral, the repair is on you.</p>`,
  `<p>Here's when a camera inspection makes the most sense:</p>`,
  `<ul>` +
    `<li><strong>Before you buy an older home.</strong> You can't see a sewer line during a walkthrough.</li>` +
    `<li><strong>Before a remodel</strong>, like adding a bathroom or finishing the basement.</li>` +
    `<li><strong>After a backup</strong>, so you know what caused it.</li>` +
    `<li><strong>When clogs keep coming back</strong>, especially in more than one drain.</li>` +
    `<li><strong>If you've never had one</strong>, especially with big trees and an original lateral.</li>` +
    `</ul>`,
  `<p>Most inspections start at a <strong>cleanout</strong>, a capped pipe that gives access to the sewer line. If you're not sure where yours is, here's <a href="/knowledge-hub/what-is-a-clean-out-plug-and-how-does-it-work">what a cleanout plug is and how it works</a>.</p>`,
  `<p>On older homes, we pay close attention to the joints between pipe sections. That's where roots and small cracks usually show up first.</p>`,
  `<p>When we run a <a href="/columbus/video-camera-sewer-inspections">sewer camera inspection</a>, we show you the footage and explain what we found in plain English. Then we walk you through your options and give you a flat rate before any work begins.</p>`,

  `<h2>Warning Signs Your Older Home's Plumbing Needs Attention</h2>`,
  `<p>Old pipes usually give hints before they fail. Watch for these:</p>`,
  `<ul>` +
    `<li><strong>Several slow drains at once.</strong> One slow sink is usually a local clog. Slow drains in several fixtures can point to the main line. Here's <a href="/knowledge-hub/is-your-main-sewer-line-blocked">how to tell if your main sewer line is blocked</a>.</li>` +
    `<li><strong>Gurgling</strong> from toilets or drains when you run water somewhere else.</li>` +
    `<li><strong>Sewer smell</strong> in the basement or yard.</li>` +
    `<li><strong>Water coming up through a floor drain</strong>, especially after heavy rain.</li>` +
    `<li><strong>Brown or rusty water</strong> from the tap.</li>` +
    `<li><strong>Low water pressure</strong> that keeps getting worse.</li>` +
    `<li><strong>Soggy or extra-green patches</strong> in the yard along the sewer line's path.</li>` +
    `</ul>`,
  `<p>Any one of these is worth a closer look. Two or more together is a good reason to call. If sewage is already backing up, don't wait. <a href="/columbus/emergency-plumbing">Our team is available 24/7</a>.</p>`,

  `<h2>What About City Sewer and Water Line Programs?</h2>`,
  `<p>The City of Columbus runs several programs aimed at aging sewer and water lines. These include sewer lining in some neighborhoods, a backflow device program for homes with reported sewer backups, and a long-term effort to replace lead service lines. Eligibility depends on your address and situation, so check with the City directly.</p>`,
  `<p>A quick overview, for general information:</p>`,
  `<ul>` +
    `<li><strong>Sewer lining.</strong> Through Blueprint Columbus, the City has <a href="https://www.columbus.gov/Business-Development/Capital-Improvement-Projects/Blueprint-CIPs/Blueprint-Clintonville-Area-Projects">lined sewer mains and laterals in parts of Clintonville</a> to keep rainwater out of the sanitary sewer.</li>` +
    `<li><strong>Backwater valves.</strong> The City's <a href="https://www.columbus.gov/PDB/">Project Dry Basement</a> program covers an approved backflow device for eligible single and two-family homes that had a sewer backup. The backup must be reported to the City first.</li>` +
    `<li><strong>Lead line replacement.</strong> Columbus is <a href="https://www.columbus.gov/leadandwater">working to replace lead and galvanized water service lines</a> across the city.</li>` +
    `</ul>`,
  `<p>These programs are run by the City of Columbus. If you live in Grandview Heights, ask Grandview Heights what applies to you.</p>`,

  `<h2>Old Home, Smart Plan</h2>`,
  `<p>You don't have to give up an older home's charm to avoid plumbing surprises. Just go in knowing three things:</p>`,
  `<ul>` +
    `<li>The pipes may be as old as the house.</li>` +
    `<li>In Columbus, the sewer line to the street is your responsibility.</li>` +
    `<li>A camera inspection is one of the easiest ways to see what's down there.</li>` +
    `</ul>`,
  `<p>If you're buying, remodeling or dealing with slow drains or a backup, our plumbers can run a camera through your line and show you exactly what they find.</p>`,
  // (6) {{phone}}, never typed. (7) /contact → #schedule.
  `<p>When you need a plumber in Columbus, Make a Good Call. Call <strong><a href="tel:{{phone}}">{{phone}}</a></strong> or <a href="#schedule">schedule service online</a>.</p>`,
  // (4) "NEED AN EXPERT? MAKE A GOOD CALL. SCHEDULE NOW" dropped. FAQ → v2.faqs. (5) FAQ JSON-LD and (1) the implementation note not imported.
].join('\n');

const V2 = {
  dek: DEK,
  byline_name: 'J. Blanton Plumbing',
  image_alt: 'Older two-and-a-half-story home with a brick chimney and a front porch, surrounded by mature trees',
  image_caption: '',
  takeaways: [
    'Age often means clay sewer lines, cast iron drains, galvanized or lead water lines, and roots from mature trees.',
    "In Columbus, the sewer line from your house to the city's pipe is yours to maintain.",
    'A sewer camera inspection shows roots, cracks and sagging pipe early.',
    'Get one before you buy, remodel or after a backup.',
  ],
  // The Columbus office → {{phone}} = the Central Ohio phone (Brief 192) and the pinned office map at the
  // body's [[office-map]] marker (R1). No service-area list: a how-to article, not an office launch.
  office: OFFICE,
  service_area: '',
  service_area_label: '',
  faqs: [
    { q: 'Who is responsible for the sewer line in Columbus?', a: 'The City of Columbus says homeowners are responsible for maintaining their sewer lateral, the pipe that runs from the house to the city sewer. The City maintains its own part of the system. Grandview Heights is a separate city, so check its rules if you live there.' },
    { q: 'Do older Columbus homes have lead pipes?', a: "Some do. The City of Columbus says homes built before 1964 may still have a lead water service line, and homes built before 1989 may have copper pipes joined with lead solder. Homes built after 1965 don't have lead service lines, according to the City." },
    // (8) "German Village many may still have" → "German Village may still have" (Marketing-approved typo fix).
    { q: 'Should I get a sewer camera inspection before buying an older home?', a: "Yes, it's a smart step. You can't see a sewer line during a walkthrough, and older homes in Grandview Heights, Clintonville and German Village may still have their original clay lateral. A camera inspection shows roots, cracks or sagging pipe before you close." },
    { q: 'Why do tree roots get into older sewer lines?', a: 'Older laterals are often clay pipe laid in short sections. Roots grow toward moisture and can slip through the joints between sections. The City of Columbus notes that clay laterals in older homes can crack or fill with tree roots over time.' },
    { q: 'How often should an older home get a sewer camera inspection?', a: "There's no single rule. Good times to schedule one are before buying, before a remodel, after a backup or when clogs keep coming back. If your home has its original clay lateral and large trees nearby, regular checks help catch root problems early." },
  ],
  components: [],
};

/** Brief 187 slugs (kh_terms): Sewers + Central Ohio (region), no secondary topics. */
const PRIMARY_TOPIC = 'sewers';
const REGION = 'central-ohio';
/**
 * Neighbourhood location terms, added only if they already exist (never created). The brief names
 * grandview-heights / clintonville / german-village; the registry (and kh_terms) key these
 * neighbourhoods as columbus-<name>, so both spellings are tried.
 */
const NEIGHBOURHOOD_CANDIDATES = [
  'grandview-heights', 'columbus-grandview-heights',
  'clintonville', 'columbus-clintonville',
  'german-village', 'columbus-german-village',
];
/** Brief 188 hand-picks. A missing or unpublished one is skipped and reported (not a guard). */
const RELATED_WANTED = [
  'roots-in-sewer-line',
  'is-your-main-sewer-line-blocked',
  'now-serving-columbus-central-ohio',
];

function banner(lines: string[]) {
  console.log('\n' + '!'.repeat(72));
  for (const l of lines) console.log(`${SCRIPT}: ${l}`);
  console.log('!'.repeat(72) + '\n');
}

async function main() {
  console.log(`MODE: ${mode === 'commit' ? 'COMMIT' : 'DRY RUN (nothing is written)'}\n`);
  const c = await pool.connect();
  let committed = false;
  try {
    // ── Schema (a code fault → exit 1): the Brief 190 columns must exist ──
    const cols = await c.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'cms_articles' AND column_name IN ('template', 'v2')`
    );
    if (cols.rows.length !== 2) {
      throw new Error(`cms_articles is missing the Brief 190 column(s): ${['template', 'v2'].filter((k) => !cols.rows.some((r) => r.column_name === k)).join(', ')}`);
    }

    // ── Create-once ──
    const existing = await c.query<{ id: number; status: string; template: string }>(
      `SELECT id, status, template FROM cms_articles WHERE slug = $1`,
      [SLUG]
    );
    if (existing.rows[0]) {
      const r = existing.rows[0];
      console.log(`ALREADY-EXISTS: /knowledge-hub/${SLUG} (id ${r.id}, ${r.status}, template ${r.template}) — editor-owned, nothing written.`);
      verdict(SCRIPT, 'ALREADY-APPLIED', `ALREADY-EXISTS — id ${r.id} (${r.status}), left untouched`);
      return;
    }

    // ── Code fault (exit 1): Track B must be active — never seed the table silently stripped ──
    const body = sanitizeArticleBodyHtml(BODY);
    if (!/<table>/.test(body) || !/<th scope="col">/.test(body)) {
      throw new Error('the sanitized body holds no <table> — article-body table support (Brief 199 Track B) is not active');
    }

    // ── Guards: content state → report and stop, exit 0 ──
    const problems: string[] = [];
    const gs = (await c.query<{ phone: string | null; offices: unknown }>(
      `SELECT to_jsonb(g) ->> 'central_ohio_phone_display' AS phone, g.offices FROM global_settings g WHERE id = 1`
    )).rows[0];
    if (!gs) problems.push('no global_settings row (id = 1)');
    const phone = (gs?.phone ?? '').trim();
    if (gs && phone !== EXPECTED_CENTRAL_OHIO_PHONE) {
      problems.push(`Global Settings → Central Ohio phone is ${phone ? `"${phone}"` : 'BLANK'}, expected ${EXPECTED_CENTRAL_OHIO_PHONE} (this script never writes it)`);
    }
    const offices = Array.isArray(gs?.offices) ? (gs!.offices as { slug?: string; state?: string }[]) : [];
    const office = offices.find((o) => o.slug === OFFICE);
    if (gs && !office) problems.push(`no "${OFFICE}" office in Global Settings`);
    else if (office && (office.state ?? '').trim().toUpperCase() !== 'OH') problems.push(`the "${OFFICE}" office's state is "${office.state}", not OH`);

    const terms = await c.query<{ type: string; slug: string }>(
      `SELECT type, slug FROM kh_terms
        WHERE (type = 'topic' AND slug = $1) OR (type = 'location' AND slug = ANY($2::text[]))`,
      [PRIMARY_TOPIC, [REGION, ...NEIGHBOURHOOD_CANDIDATES]]
    );
    const has = (type: string, slug: string) => terms.rows.some((t) => t.type === type && t.slug === slug);
    if (!has('topic', PRIMARY_TOPIC)) problems.push(`kh_terms topic "${PRIMARY_TOPIC}" missing`);
    if (!has('location', REGION)) problems.push(`kh_terms location "${REGION}" missing`);
    const author = (await c.query<{ id: number }>(`SELECT id FROM cms_users ORDER BY id LIMIT 1`)).rows[0];
    if (!author) problems.push('no cms_users row to author Version 1');
    if (problems.length) {
      banner(['NOT APPLIED — nothing was written:', ...problems.map((p) => `  • ${p}`)]);
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', problems.join('; '));
      return;
    }

    const neighbourhoods = NEIGHBOURHOOD_CANDIDATES.filter((s) => has('location', s));
    const TERMS = { primary: PRIMARY_TOPIC, secondary: [] as string[], locations: [REGION, ...neighbourhoods] };

    // ── Related hand-picks: keep only the published ones, in the brief's order ──
    const rel = await c.query<{ slug: string; status: string }>(
      `SELECT slug, status FROM cms_articles WHERE slug = ANY($1::text[])`,
      [RELATED_WANTED]
    );
    const statusOf = new Map(rel.rows.map((r) => [r.slug, r.status]));
    const RELATED = RELATED_WANTED.filter((s) => statusOf.get(s) === 'published');
    const skipped = RELATED_WANTED.filter((s) => !RELATED.includes(s)).map((s) => `${s} (${statusOf.get(s) ?? 'missing'})`);

    // ── Build exactly what the editor saves / the publish writer stores ──
    const v2 = sanitizeArticleV2Content(V2);
    const content = {
      title: TITLE,
      excerpt: DEK,
      body,
      image: `${IMG}/older-home-hero.webp`,
      terms: TERMS,
      related: RELATED,
      template: 'article-v2',
      v2,
      metaTitle: META_TITLE,
      metaDescription: META_DESCRIPTION,
    };

    await c.query('BEGIN');
    const ins = await c.query<{ id: number }>(
      `INSERT INTO cms_articles (slug, title, excerpt, body, image, status, meta_title, meta_description, created_by, updated_by, updated_at, template, v2)
       VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $8, NOW(), 'article-v2', $9)
       RETURNING id`,
      [SLUG, TITLE, DEK, JSON.stringify({ html: body }), content.image, META_TITLE, META_DESCRIPTION, author!.id, JSON.stringify(v2)]
    );
    const id = ins.rows[0].id;
    const t = await writeArticleTerms(c, id, TERMS);
    const r = await writeArticleRelated(c, id, RELATED);
    await c.query(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, is_published, published_at)
       VALUES ('article', $1, $2, $3, $4, FALSE, NULL)`,
      [SLUG, VERSION_LABEL, JSON.stringify(content), author!.id]
    );

    // ── Verify what this run wrote (scoped to this row only) ──
    const check = await c.query<{ n_terms: string; n_rel: string; n_versions: string; n_live: string; template: string; status: string; has_table: boolean }>(
      `SELECT (SELECT count(*) FROM cms_article_terms WHERE article_id = $1)::text AS n_terms,
              (SELECT count(*) FROM cms_article_related WHERE article_id = $1)::text AS n_rel,
              (SELECT count(*) FROM page_drafts WHERE page_type = 'article' AND page_slug = $2)::text AS n_versions,
              (SELECT count(*) FROM page_drafts WHERE page_type = 'article' AND page_slug = $2 AND is_published)::text AS n_live,
              a.template, a.status, (a.body->>'html') LIKE '%<table>%' AS has_table
         FROM cms_articles a WHERE a.id = $1`,
      [id, SLUG]
    );
    const k = check.rows[0];
    console.log(`  + cms_articles id ${id}: ${k.status}, template ${k.template}, office ${v2.office}`);
    console.log(`  + tags: ${k.n_terms} (${TERMS.primary}; ${TERMS.locations.join(', ')})${t.unknown.length ? ` — unknown: ${t.unknown.join(', ')}` : ''}`);
    console.log(`  + related: ${k.n_rel} (${RELATED.join(', ')})${r.unknown.length ? ` — not found: ${r.unknown.join(', ')}` : ''}`);
    if (skipped.length) console.log(`  ! related skipped (missing or not published): ${skipped.join(', ')}`);
    console.log(`  + page_drafts "${VERSION_LABEL}": ${k.n_versions} version(s), ${k.n_live} published`);
    console.log(`  + body table: ${k.has_table ? 'yes' : 'NO'}; faqs: ${v2.faqs.length}, takeaways: ${v2.takeaways.length}`);
    if (
      k.status !== 'draft' || k.template !== 'article-v2' || k.n_versions !== '1' || k.n_live !== '0' ||
      Number(k.n_terms) !== 1 + TERMS.locations.length || !k.has_table
    ) {
      throw new Error('post-write verification failed for the row this run created');
    }

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would create /knowledge-hub/${SLUG} as a draft`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(
      SCRIPT,
      'APPLIED',
      `created /knowledge-hub/${SLUG} (id ${id}) as an UNPUBLISHED Article V2 draft — review at /review/knowledge-hub/${SLUG}` +
        `; locations: ${TERMS.locations.join(', ')}` +
        (skipped.length ? `; related skipped: ${skipped.join(', ')}` : '')
    );
  } catch (err) {
    if (!committed) await c.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}

main()
  .catch((err) => {
    console.error(err);
    verdict(SCRIPT, 'FAILED', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    // kh-taxonomy imports the app's own pool (src/lib/db); close it too so the process exits.
    const appPool = (await import('../src/lib/db')).default as unknown as { end?: () => Promise<void> };
    await appPool.end?.().catch(() => {});
  });
