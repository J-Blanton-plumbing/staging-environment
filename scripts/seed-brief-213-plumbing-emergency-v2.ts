/**
 * Brief 213 — "Plumbing Emergency" rewrite: ONE new UNPUBLISHED Article V2 version
 * on the EXISTING, PUBLISHED article
 *   /knowledge-hub/5-signs-you-need-to-call-an-emergency-plumber
 *
 * The live article DOES NOT CHANGE. The public URL keeps serving today's V1 page,
 * byte-identical, until Marketing clicks Publish in /admin (Marketing decision —
 * this script NEVER publishes: no publishDraft, no status / is_published /
 * published_at write). Marketing reviews the version with the existing /admin
 * Preview (Brief 190). The previous published version ("Version 1 — live") is the
 * rollback and is never touched.
 *
 * The copy is VERBATIM from Marketing's .md
 * (`New Pages/Plumbing Emergency Article/5-signs-plumbing-emergency.md`), rebuilt
 * as CMS content the way Briefs 198/199/207 rebuilt theirs. The ONLY departures
 * are the brief's 11 allowed changes:
 *    1. the draft-notes HTML comment is not imported;
 *    2. the H1 becomes the title field only (never repeated in the body);
 *    3. the TL;DR becomes the subtitle (its first sentence) + 3 key takeaways,
 *       and is not repeated in the body;
 *    4. the horizontal rules (`---`) are not imported;
 *    5. the two non-sign H2s lose their numbers (Marketing decision); signs 1–5
 *       keep theirs verbatim;
 *    6. the phone is `{{phone}}` in the Brief 198 format
 *       (`<strong><a href="tel:{{phone}}">{{phone}}</a></strong>`), never typed;
 *    7. "schedule service online" → `#schedule` (the sitewide booking popup,
 *       Brief 169/191/207 precedent), not /contact — Marketing decision;
 *    8. every jblantonplumbing.com link is relative;
 *    9. external links stay exactly as written (plain <a href>, no target/rel —
 *       Brief 198 decision 2: rel is added at render, never stored);
 *   10. the FAQ JSON-LD block at the bottom of the .md is not imported anywhere
 *       (hard rule 8 — V2 emits no FAQPage);
 *   11. lists stay <ul> with their bold lead-ins; the 210°F degree sign stays °.
 * The FAQ's 5 Q&As are v2.faqs (links kept), NOT body copy.
 *
 * Terms and related picks are COPIED FROM THE LIVE ROW at run time (never
 * hardcoded), so whatever Marketing has set stays exactly as it is.
 *
 * ── THE APP'S OWN PATH, NOT HAND-WRITTEN SQL ────────────────────────────────
 * The version is created by `createDraft` (src/lib/cms/drafts.ts) — what the
 * editor's "Save as new version" calls through POST /api/cms/drafts. Its content
 * is exactly the payload the editor saves (same keys, body through
 * sanitizeArticleBodyHtml, v2 through sanitizeArticleV2Content), so opening it
 * in /admin and clicking Save changes nothing. Every existing version gets
 * `version + 1` so an editor tab opened before the deploy gets the normal
 * conflict on Save instead of writing old copy over the new version.
 *
 * ── ONE TRANSACTION ─────────────────────────────────────────────────────────
 * As in Brief 210: the app pool is bound to ONE client inside an outer
 * transaction (the app's BEGIN/COMMIT become SAVEPOINT/RELEASE), so a failed
 * post-write check rolls everything back. A dry run executes the real write and
 * rolls it back.
 *
 * ── GUARDS (every one writes NOTHING; Brief 186: content state never fails
 *    a deploy — only missing schema exits 1) ─────────────────────────────────
 *   • V2 / version / tag columns missing                 → FAILED, exit 1;
 *   • no article at the slug / more than one             → NOT-APPLIED (no article) /
 *                                                          NOT-APPLIED (two articles);
 *   • the article is not published (unexpected)          → NOT-APPLIED (not published);
 *   • a "… V2 rewrite (for review)" version exists       → ALREADY-APPLIED
 *     (incl. after Marketing publishes it — every later run);
 *   • the live row is already template 'article-v2'      → NOT-APPLIED (already V2);
 *   • the newest version ≠ the live row on the fields the
 *     editor's bottom Save Article writes (pending edits
 *     in progress — never overwrite Marketing's work)    → NOT-APPLIED (pending edits), fields named;
 *   • a live term or related pick cannot be copied       → NOT-APPLIED (terms/related), detail;
 *   • no cms_users row to author the version             → NOT-APPLIED (no CMS user).
 *
 * The live row (every column), its tags, its related picks and every earlier
 * version's content are fingerprinted before and after the write and must be
 * byte-identical (hard rule 2). The payload is asserted to contain {{phone}}
 * and neither a typed 773-724-9272 nor the old FAQ's 773-724-9242.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/seed-brief-213-plumbing-emergency-v2.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import type { Pool, PoolClient } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'seed-brief-213-plumbing-emergency-v2';

export const SLUG = '5-signs-you-need-to-call-an-emergency-plumber';
/** The label is "Version N — V2 rewrite (for review)"; N is computed at run time. */
export const LABEL_SUFFIX = ' — V2 rewrite (for review)';

export const TITLE = "5 Signs You're Dealing with a Plumbing Emergency";
export const META_TITLE = '5 Signs of a Plumbing Emergency';
export const META_DESCRIPTION =
  'A plumbing emergency damages your home, risks your health or cuts off your water. Learn the 5 signs, what to do while you wait, and what can wait.';
/** (3) The TL;DR's first sentence. Also the excerpt (Brief 191 rule). */
export const DEK =
  'A plumbing emergency is any problem that damages your property, puts your health at risk or leaves you without water for a long stretch, and it usually gets worse by the hour.';
/** (3) The rest of the TL;DR, verbatim, bold dropped. */
export const TAKEAWAYS = [
  "The biggest signs: 1) water you can't shut off, 2) sewage backing up system-wide, 3) a sewer or gas smell, 4) frozen pipes or no water, and 5) a leaking water heater.",
  'Important: if you smell natural gas, leave first and call your gas utility or 911.',
  'Slow drains and low pressure can usually wait.',
];

export const HERO = '/images/knowledge-hub/plumbing-emergency/plumbing-emergency-hero.webp';
export const HERO_ALT =
  'J. Blanton Plumbing plumber in a red hoodie working on the pipes above a water heater in a basement';

export const BODY = [
  // (1) draft notes not imported. (2) H1 → title field. (3) TL;DR → subtitle + takeaways. (4) no `---`.
  `<p>Some plumbing emergencies are easy to spot. If you wake up at 2 a.m. with water around your ankles, we're pretty sure you'll be on the phone instead of googling warning signs. Others are more subtle: a water heater making a strange noise, a drain gurgling after dinner or a faint sewer smell in the basement. Knowing when these signs point to a real emergency, and when they can wait, protects your home, your health and your wallet.</p>`,
  // (9) External links exactly as written.
  `<p>The <a href="https://www.iii.org/fact-statistic/facts-statistics-homeowners-and-renters-insurance">Insurance Information Institute</a> reports that water damage and freezing claims averaged $15,400 per claim from 2019 to 2023, and they make up about 1 in 4 homeowners property damage claims. The longer water sits, the more it soaks into drywall, floors and insulation, and the bigger the bill gets.</p>`,
  `<p>So here's the rule of thumb: if a problem is causing damage to your property, putting your health at risk or leaving you without water, it's an emergency, and it'll only get worse if you wait. Below are 5 signs to help you spot one:</p>`,

  // (5) Signs 1–5 keep their numbers verbatim.
  `<h2>1. Water You Can't Shut Off</h2>`,
  `<p>A burst pipe, a split supply line or a fitting that gives way can release a lot of water in minutes. If water is spraying, pouring or pooling and you can't stop it at the fixture, it's a plumbing emergency.</p>`,
  `<p>Start by shutting off your main water valve. In most homes it's in the basement or utility area, near where the water line comes through the wall, often by the water meter. Turn it clockwise until it stops.</p>`,
  `<p>Then call a plumber. Shutting off the water stops the flow, but the pipe still needs to be repaired and the area needs to dry. The <a href="https://www.epa.gov/mold/brief-guide-mold-moisture-and-your-home">EPA recommends drying water-damaged areas within 24 to 48 hours</a> to prevent mold, so the clock starts as soon as the water hits the floor.</p>`,
  // (8) Internal links relative.
  `<p>Pipes rarely burst out of nowhere. Freezing, high water pressure, corrosion and age are common causes. Here's more on <a href="/knowledge-hub/what-causes-pipes-to-burst">what causes pipes to burst</a>.</p>`,

  `<h2>2. Is Sewage Backing Up Into More Than One Drain?</h2>`,
  `<p>Yes, sewage backing up into more than one drain is a plumbing emergency. When toilets, tubs and floor drains back up at the same time, the problem is usually a blockage in your main sewer line. Every flush or load of laundry can push more wastewater into your home, so stop using water and call a plumber.</p>`,
  `<p>One slow sink is usually just a local clog. The real warning sign is when the backup is system-wide and several fixtures act up together. Watch for:</p>`,
  `<ul>` +
    `<li>Water coming up in the tub or shower when you flush the toilet.</li>` +
    `<li>Gurgling sounds from drains or toilets.</li>` +
    `<li>Water or sewage coming up through a basement floor drain.</li>` +
    `<li>A sewage smell that hangs around near drains.</li>` +
    `</ul>`,
  `<p>All of these point to a <a href="/knowledge-hub/is-your-main-sewer-line-blocked">blocked main sewer line</a>. Tree roots, grease, "flushable" wipes and older pipes that have cracked or sagged are common causes.</p>`,
  `<p>A backup isn't just messy. According to the <a href="https://vdh.virginia.gov/content/uploads/sites/196/2024/07/Sewage_Backup_Fact_Sheet.pdf">Virginia Department of Health</a>, sewage carries bacteria, viruses and other germs that can cause stomach illness and skin infections. Keep kids and pets away from the area, and never touch sewage with bare hands.</p>`,
  `<p>Until help arrives, stop using water. Chemical drain cleaners won't clear a main line blockage, and they make the water dangerous for anyone who has to work in it.</p>`,

  `<h2>3. Is a Sewer or Gas Smell an Emergency?</h2>`,
  `<p>Yes, both can be. A strong sewer smell that won't go away needs a plumber quickly. A natural gas smell is more serious: leave the house first, then call your gas utility or 911 from outside. Both can smell like rotten eggs, so if you're not sure which one it is, treat it as gas.</p>`,
  // (11) Bold lead-ins kept.
  `<p><strong>If it's sewer gas.</strong> The <a href="https://dph.illinois.gov/topics-services/environmental-health-protection/toxicology/indoor-air-quality-healthy-homes/hydrogen-sulfide-gas.html">Illinois Department of Public Health</a> points to drains with dry traps as a common way for sewer gas to get into homes. A trap is the curved pipe under a drain that holds water to block gas from the sewer.</p>`,
  `<p>Start with a quick check. Run water for a minute in drains you rarely use, like a basement floor drain or a guest bathroom shower. If the smell fades, a dry trap was likely the cause. If it comes back or stays strong, call a plumber. It could be a cracked pipe, a bad seal or a blocked vent.</p>`,
  `<p>Don't just live with it. IDPH notes that lower exposure can irritate your eyes and throat, and longer exposure may cause headaches, fatigue and dizziness.</p>`,
  `<p><strong>If it's natural gas.</strong> This is the one time a plumber isn't your first call. <a href="https://ready.illinois.gov/plan/gas.html">Ready Illinois</a> advises:</p>`,
  `<ul>` +
    `<li>Don't try to find the leak.</li>` +
    `<li>Don't light anything or use light switches, phones or other electronics inside.</li>` +
    `<li>Open windows and doors only if it's quick and easy.</li>` +
    `<li>Get everyone out, pets included.</li>` +
    `<li>Once you're somewhere you can't smell gas, call your gas utility. Call 911 if there's immediate danger.</li>` +
    `</ul>`,
  `<p>Once the utility has made the home safe, a licensed plumber can repair or replace the damaged <a href="/gas-lines">gas line</a>.</p>`,

  `<h2>4. Frozen Pipes or No Water at All</h2>`,
  `<p>If you turn on a faucet in winter and get nothing, or just a trickle, a pipe has probably frozen. That alone is a problem, but the bigger risk comes next. Ice expands inside the pipe, and a pipe that cracks while frozen can start leaking the moment it thaws.</p>`,
  `<p>Frozen pipes are one of the most expensive winter problems a homeowner can face. <a href="https://newsroom.statefarm.com/frozen-pipes-not-so-nice-beat-winter-water-woes-before-they-strike/">State Farm paid more than $628 million in frozen pipe claims</a> from 2024 through mid-2025, with an average claim of more than $30,000. Illinois topped the list of states with the highest claim costs.</p>`,
  `<p>If the pipe you suspect is easy to reach, the <a href="https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/winter-storm/frozen-pipes.html">American Red Cross</a> suggests:</p>`,
  `<ul>` +
    `<li>Keep the faucet open so water can flow as the ice melts.</li>` +
    `<li>Warm the pipe gently with a hair dryer, a heating pad or towels soaked in hot water.</li>` +
    `<li>Never use a blowtorch, propane heater or any other open flame.</li>` +
    `<li>Check your other faucets, since more than one pipe may be frozen.</li>` +
    `</ul>`,
  `<p>Call a plumber if you can't find the frozen section, can't reach it or can't thaw it. Call right away if you see water, bulging or cracks once it starts to thaw.</p>`,
  `<p>No water in warmer months is a different story. Check with a neighbor or your water utility first, since it could be a main break or planned work on the street. If it's only your home, call a plumber. You can't cook, clean or flush without water, and the cause could be a failed valve or a leak in your service line.</p>`,

  `<h2>5. A Leaking, Hissing or Rumbling Water Heater</h2>`,
  `<p>A water heater holds gallons of very hot water under pressure. When something goes wrong, it can flood a basement or, in rare cases, fail in a dangerous way. These are the signs to act on:</p>`,
  // (11) <ul> with bold lead-ins; the 210°F degree sign stays °.
  `<ul>` +
    `<li><strong>Water pooling around the base.</strong> If the tank itself is leaking, it's usually failing and can't be repaired. The leak will only get worse.</li>` +
    `<li><strong>Water or steam coming from the relief valve pipe.</strong> The temperature and pressure (T&amp;P) relief valve is a safety part that opens when the tank gets too hot or the pressure gets too high. According to <a href="https://www.thisoldhouse.com/plumbing/how-and-why-to-maintain-a-temperature-and-pressure-valve">This Old House</a>, it opens at 210°F or 150 psi to keep the tank from bursting. If it's discharging, something in the system needs attention. Never cap or plug that pipe.</li>` +
    `<li><strong>Hissing or popping on a gas water heater, along with a gas smell.</strong> Treat it as a gas leak and follow the steps in sign 3.</li>` +
    `<li><strong>No hot water along with a leak or a burning smell.</strong> Shut the unit down and call for help.</li>` +
    `</ul>`,
  `<p>If you see a leak, follow these <a href="/knowledge-hub/emergency-shutdown-instructions-water-heater">water heater shutdown steps</a>: turn off the power or gas, then close the cold water supply valve on top of the tank.</p>`,
  `<p>A rumbling or popping sound on its own is usually sediment built up at the bottom of the tank. It's not an emergency, but it's a sign the heater needs to be flushed or checked soon.</p>`,

  // (5) The two non-sign H2s lose their numbers (Marketing decision).
  `<h2>What Should You Do in a Plumbing Emergency While You Wait?</h2>`,
  `<p>In a plumbing emergency, stop the water first, then make the area safe. Shut off the main water valve or the fixture's supply valve, keep away from water near electricity, and stop using your drains. Then move valuables, take photos for insurance, and keep kids and pets out until the plumber arrives.</p>`,
  `<p>Here's a quick checklist:</p>`,
  `<ul>` +
    `<li><strong>Stop the source.</strong> Close the shutoff valve under the sink or behind the toilet. If you can't find one, or it doesn't work, close the main water valve.</li>` +
    `<li><strong>Stay safe around electricity.</strong> The <a href="https://vdh.virginia.gov/content/uploads/sites/196/2024/07/Sewage_Backup_Fact_Sheet.pdf">Virginia Department of Health</a> advises turning off power if there's standing water or wiring may be wet, but only if you can reach the breaker from a dry spot.</li>` +
    `<li><strong>Stop using water.</strong> Don't flush, run the dishwasher or do laundry until the problem is fixed.</li>` +
    `<li><strong>Skip the chemical drain cleaners.</strong> They rarely fix serious clogs and can damage pipes.</li>` +
    `<li><strong>Move what you can.</strong> Get rugs, boxes, electronics and furniture out of the wet area.</li>` +
    `<li><strong>Soak up clean water.</strong> Towels, a mop or a wet/dry vacuum help slow the damage. Leave sewage to the pros.</li>` +
    `<li><strong>Document everything.</strong> Take photos and videos before cleanup, and call your insurance company. Some insurers can help arrange cleanup.</li>` +
    `</ul>`,

  `<h2>Which Plumbing Problems Can Wait for a Scheduled Visit?</h2>`,
  `<p>Problems that aren't causing damage, a health risk or a loss of water can usually wait for a scheduled visit. That includes one slow drain, a dripping faucet, a running toilet, low pressure at a single fixture or a water bill that's crept up. Book them soon, though. Small problems tend to grow.</p>`,
  `<p><strong>One slow drain or an occasional clog.</strong> If just one sink or toilet is slow, the clog is likely in that fixture's line, not the main sewer. If several drains slow down together, go back to sign 2.</p>`,
  `<p><strong>A dripping faucet or running toilet.</strong> These aren't urgent, but they add up. The <a href="https://www.epa.gov/watersense/fix-leak-week">EPA</a> says a faucet dripping once per second wastes more than 3,000 gallons a year, and the average home's leaks waste more than 9,300 gallons a year.</p>`,
  `<p><strong>Low water pressure at one fixture.</strong> This is often a clogged aerator or showerhead. If the pressure drops suddenly across the whole house, call sooner, since it can point to a leak.</p>`,
  `<p><strong>A higher water bill with no clear cause.</strong> This often means a hidden leak, sometimes in a spot you can't see. Here's <a href="/knowledge-hub/how-to-tell-if-you-have-a-water-leak-underground">how to tell if you have a water leak underground</a>. Schedule a visit before the leak causes damage.</p>`,

  `<h2>When in Doubt, Make a Good Call</h2>`,
  `<p>Most plumbing emergencies have one thing in common: they get worse, and more expensive, the longer they wait. When the problem is causing damage, risking your health or leaving you without water, act fast. Slow drains and dripping faucets can wait for a scheduled visit, as long as you don't ignore them.</p>`,
  `<p>If you're not sure which one you're dealing with, call us. Our <a href="/emergency-plumbing">24/7 emergency plumbing</a> team is ready day or night, and our plumbers give you a flat rate before any work begins.</p>`,
  // (6) {{phone}}, Brief 198 format. (7) "schedule service online" → #schedule (booking popup), Marketing decision.
  `<p>Make a Good Call. Call <strong><a href="tel:{{phone}}">{{phone}}</a></strong> or <a href="#schedule">schedule service online</a>.</p>`,
  // (10) The .md's FAQ JSON-LD block is NOT imported anywhere. The FAQ is v2.faqs, not body copy.
].join('\n');

/** The 5 Q&As under "Frequently Asked Questions", verbatim, links kept. */
export const FAQS = [
  {
    q: 'When should I call an emergency plumber instead of waiting?',
    a: 'Call right away if the problem is causing damage, putting your health at risk or leaving you without water, and it will get worse if you wait. That includes water you can\'t shut off, sewage backing up into several drains, a sewer smell that won\'t clear, frozen pipes and a leaking water heater. A single slow drain or dripping faucet can usually wait for a scheduled visit.',
  },
  {
    q: 'Is a clogged toilet a plumbing emergency?',
    a: 'Usually not. If only one toilet is clogged and a plunger clears it, you can handle it yourself or book a visit. It becomes an emergency when the toilet keeps overflowing or other drains back up at the same time, since that points to a blocked main sewer line.',
  },
  {
    q: 'Does emergency plumbing cost more?',
    a: 'After-hours service often costs more than a scheduled visit. Waiting can cost far more, though. The <a href="https://www.iii.org/fact-statistic/facts-statistics-homeowners-and-renters-insurance">Insurance Information Institute</a> reports that water damage and freezing claims averaged $15,400 from 2019 to 2023. At J. Blanton Plumbing, you get a flat rate before any work begins.',
  },
  {
    q: 'Should I call a plumber or the gas company if I smell gas?',
    a: 'Call the gas company first. <a href="https://ready.illinois.gov/plan/gas.html">Ready Illinois</a> advises leaving the house right away and calling your gas utility from a spot where you can\'t smell gas, or calling 911 if there\'s immediate danger. Once the utility has made your home safe, a licensed plumber can repair the gas line.',
  },
  {
    q: 'How do I find my main water shutoff valve?',
    a: 'It\'s usually where the water line enters your home, often in the basement, a utility room or near the water meter. Some homes have it in a crawlspace or near the water heater. Turn it clockwise to shut it off, and find it before you need it.',
  },
];

type Content = Record<string, unknown>;
interface TermSelection { primary: string | null; secondary: string[]; locations: string[] }

/**
 * The version content — exactly the payload the editor saves (same keys, same
 * order as the article editor's useDraftVersions content builder). Terms and
 * related come from the LIVE row at run time.
 */
export function buildVersionContent(
  terms: TermSelection,
  related: string[],
  sanitizeBody: (s: string) => string,
  sanitizeV2: (x: unknown) => unknown,
): Content {
  return {
    title: TITLE,
    excerpt: DEK, // Brief 191 rule: hub-card excerpt = the subtitle
    body: sanitizeBody(BODY),
    image: HERO,
    terms,
    related,
    template: 'article-v2',
    v2: sanitizeV2({
      dek: DEK,
      byline_name: 'J. Blanton Plumbing', // the default byline
      image_alt: HERO_ALT,
      image_caption: '', // deliberately empty (brief Track A)
      takeaways: TAKEAWAYS,
      // Geo-neutral article: no office, no service area, no [[office-map]].
      office: '',
      service_area: '',
      service_area_label: '',
      faqs: FAQS,
      components: [],
    }),
    metaTitle: META_TITLE,
    metaDescription: META_DESCRIPTION,
  };
}

// src/lib/db builds its Pool from process.env.DATABASE_URL when first imported,
// so the env must be set BEFORE any src module loads (imported dynamically in main()).
const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    (env.match(/^DATABASE_URL=(.*)$/m) || [])[1]?.trim() || 'postgresql://postgres:jbp@localhost:5432/jbp_cms';
}

const canon = (x: unknown): string =>
  Array.isArray(x)
    ? `[${x.map(canon).join(',')}]`
    : x && typeof x === 'object'
      ? `{${Object.keys(x as object).sort().map((k) => `${JSON.stringify(k)}:${canon((x as Record<string, unknown>)[k])}`).join(',')}}`
      : JSON.stringify(x === undefined ? null : x);

const str = (x: unknown) => (typeof x === 'string' ? x : x == null ? '' : String(x));

/** The fields the editor's bottom "Save Article" PUT writes straight to the live row. */
const SAVE_ARTICLE_FIELDS = ['body', 'title', 'excerpt', 'image', 'metaTitle', 'metaDescription'] as const;

/**
 * Point the app pool (src/lib/db) at ONE client inside our transaction (Brief 210):
 * the app's own BEGIN / COMMIT / ROLLBACK become SAVEPOINT / RELEASE / ROLLBACK TO.
 */
function bindAppPoolToTransaction(appPool: Pool, client: PoolClient): () => void {
  let depth = 0;
  const run = (text: unknown, values?: unknown) =>
    (client.query as (t: unknown, v?: unknown) => Promise<unknown>).call(client, text, values);
  const query = async (text: unknown, values?: unknown) => {
    const verb = typeof text === 'string' ? text.trim().toUpperCase() : '';
    if (verb === 'BEGIN') {
      depth++;
      return run(`SAVEPOINT b213_${depth}`);
    }
    if (verb === 'COMMIT') {
      if (depth < 1) throw new Error('COMMIT without BEGIN inside the bound transaction');
      return run(`RELEASE SAVEPOINT b213_${depth--}`);
    }
    if (verb === 'ROLLBACK') {
      if (depth < 1) return { rows: [], rowCount: 0 };
      await run(`ROLLBACK TO SAVEPOINT b213_${depth}`);
      return run(`RELEASE SAVEPOINT b213_${depth--}`);
    }
    return run(text, values);
  };
  const bound = { query, release: () => {} };
  const p = appPool as unknown as Record<string, unknown>;
  const had = { connect: Object.prototype.hasOwnProperty.call(p, 'connect'), query: Object.prototype.hasOwnProperty.call(p, 'query') };
  const orig = { connect: p.connect, query: p.query };
  p.connect = async () => bound;
  p.query = (text: unknown, values?: unknown) => run(text, values);
  return () => {
    if (had.connect) p.connect = orig.connect; else delete p.connect;
    if (had.query) p.query = orig.query; else delete p.query;
  };
}

function banner(lines: string[]) {
  console.log('\n' + '!'.repeat(72));
  for (const l of lines) console.log(`${SCRIPT}: ${l}`);
  console.log('!'.repeat(72) + '\n');
}

interface LiveRow {
  id: number;
  slug: string;
  status: string;
  template: string;
  title: string | null;
  excerpt: string | null;
  image: string | null;
  meta_title: string | null;
  meta_description: string | null;
  html: string | null;
}
interface VersionRow {
  id: number;
  label: string;
  is_published: boolean;
  version: number;
  content: Content | null;
}

/** Exit code: 0 for every content-state outcome, 1 only for a schema/code fault. */
async function main(): Promise<number> {
  const mode = resolveRunMode(SCRIPT);
  console.log(`MODE: ${mode === 'commit' ? 'COMMIT' : 'DRY RUN (the write runs, then everything is rolled back)'}\n`);

  const appPool = (await import('../src/lib/db')).default as unknown as Pool;
  const { sanitizeArticleBodyHtml } = await import('../src/lib/cms/sanitize');
  const { sanitizeArticleV2Content } = await import('../src/lib/cms/article-v2-sanitize');
  const { createDraft } = await import('../src/lib/cms/drafts');

  const c = await appPool.connect();
  let unbind: (() => void) | null = null;
  try {
    // ── Schema (a code fault → exit 1) ──
    const cols = await c.query<{ t: string }>(
      `SELECT table_name || '.' || column_name AS t FROM information_schema.columns
        WHERE (table_name = 'cms_articles' AND column_name IN ('id', 'slug', 'status', 'template', 'v2', 'body', 'title', 'excerpt', 'image', 'meta_title', 'meta_description'))
           OR (table_name = 'page_drafts' AND column_name IN ('page_type', 'page_slug', 'label', 'content', 'is_published', 'published_at', 'version', 'created_by'))
           OR (table_name = 'cms_article_terms' AND column_name IN ('article_id', 'term_id', 'is_primary'))
           OR (table_name = 'cms_article_related' AND column_name IN ('article_id', 'related_article_id', 'position'))
           OR (table_name = 'kh_terms' AND column_name IN ('id', 'type', 'slug'))
           OR (table_name = 'cms_users' AND column_name = 'id')`
    );
    const need = [
      'cms_articles.id', 'cms_articles.slug', 'cms_articles.status', 'cms_articles.template', 'cms_articles.v2', 'cms_articles.body',
      'cms_articles.title', 'cms_articles.excerpt', 'cms_articles.image', 'cms_articles.meta_title', 'cms_articles.meta_description',
      'page_drafts.page_type', 'page_drafts.page_slug', 'page_drafts.label', 'page_drafts.content', 'page_drafts.is_published',
      'page_drafts.published_at', 'page_drafts.version', 'page_drafts.created_by',
      'cms_article_terms.article_id', 'cms_article_terms.term_id', 'cms_article_terms.is_primary',
      'cms_article_related.article_id', 'cms_article_related.related_article_id', 'cms_article_related.position',
      'kh_terms.id', 'kh_terms.type', 'kh_terms.slug', 'cms_users.id',
    ];
    const missingCols = need.filter((n) => !cols.rows.some((r) => r.t === n));
    if (missingCols.length) {
      verdict(SCRIPT, 'FAILED', `missing column(s): ${missingCols.join(', ')} — schema fault, nothing written`);
      return 1;
    }

    // ── The article ──
    const arts = await c.query<LiveRow>(
      `SELECT id, slug, status, template, title, excerpt, image, meta_title, meta_description, body->>'html' AS html
         FROM cms_articles WHERE slug = $1 ORDER BY id`, [SLUG]
    );
    if (arts.rows.length === 0) {
      verdict(SCRIPT, 'NOT-APPLIED (no article)', `no article at /knowledge-hub/${SLUG} — nothing written`);
      return 0;
    }
    if (arts.rows.length > 1) {
      verdict(SCRIPT, 'NOT-APPLIED (two articles)', `${arts.rows.length} articles share the slug (ids ${arts.rows.map((r) => r.id).join(', ')}) — nothing written`);
      return 0;
    }
    const live = arts.rows[0];
    const versions = (await c.query<VersionRow>(
      `SELECT id, label, is_published, version, content FROM page_drafts
        WHERE page_type = 'article' AND page_slug = $1
        ORDER BY created_at DESC, id DESC`, [SLUG]
    )).rows;

    // ── ALREADY-APPLIED: the version exists (incl. after Marketing publishes it) ──
    const mine = versions.find((v) => v.label.endsWith(LABEL_SUFFIX));
    if (mine) {
      verdict(SCRIPT, 'ALREADY-APPLIED', `id ${live.id} /${live.slug} already has "${mine.label}" (version id ${mine.id}${mine.is_published ? ', PUBLISHED by Marketing' : ', unpublished'}) — nothing written`);
      return 0;
    }

    // ── The article must be published (it is the live, ranking page) ──
    if (live.status !== 'published') {
      banner([`NOT APPLIED — the article is ${live.status}, not published (unexpected: the brief targets the LIVE, ranking page). Nothing was written.`]);
      verdict(SCRIPT, 'NOT-APPLIED (not published)', `id ${live.id} status ${live.status} — nothing written`);
      return 0;
    }

    // ── Already V2? Someone converted it another way; report and stop ──
    if (live.template === 'article-v2') {
      banner(['NOT APPLIED — the live row is already template article-v2 (converted outside this brief). Nothing was written.']);
      verdict(SCRIPT, 'NOT-APPLIED (already V2)', `id ${live.id} template is already article-v2 — nothing written`);
      return 0;
    }

    // ── Pending edits: the newest version must equal the live row on what Save Article writes ──
    const newest = versions[0];
    if (newest && newest.content && typeof newest.content === 'object') {
      const nc = newest.content;
      const liveFields: Record<(typeof SAVE_ARTICLE_FIELDS)[number], string> = {
        body: sanitizeArticleBodyHtml(live.html ?? ''),
        title: str(live.title),
        excerpt: str(live.excerpt),
        image: str(live.image),
        metaTitle: str(live.meta_title),
        metaDescription: str(live.meta_description),
      };
      const forked = SAVE_ARTICLE_FIELDS.filter((k) =>
        k === 'body' ? sanitizeArticleBodyHtml(str(nc.body)) !== liveFields.body : str(nc[k]) !== liveFields[k]
      );
      if (forked.length) {
        banner([
          `NOT APPLIED — the newest version "${newest.label}" and the live row differ (unsaved/unpublished edits in progress). Nothing was written; never overwrite Marketing's work.`,
          ...forked.map((k) => `  • ${k}: live ${JSON.stringify(liveFields[k]).slice(0, 120)} vs version ${JSON.stringify(str(nc[k])).slice(0, 120)}`),
        ]);
        verdict(SCRIPT, 'NOT-APPLIED (pending edits)', `newest version "${newest.label}" ≠ live row on: ${forked.join(', ')} — nothing written`);
        return 0;
      }
    }

    // ── Copy the live article's terms and related picks exactly (never hardcoded) ──
    const termRows = (await c.query<{ slug: string; type: string; is_primary: boolean }>(
      `SELECT t.slug, t.type, at.is_primary
         FROM cms_article_terms at JOIN kh_terms t ON t.id = at.term_id
        WHERE at.article_id = $1 ORDER BY t.type, t.slug`, [live.id]
    )).rows;
    const termProblems: string[] = [];
    const primaries = termRows.filter((t) => t.is_primary);
    if (primaries.length > 1) termProblems.push(`${primaries.length} primary terms (${primaries.map((t) => t.slug).join(', ')})`);
    for (const t of termRows) {
      if (t.type !== 'topic' && t.type !== 'location') termProblems.push(`term "${t.slug}" has unknown type "${t.type}"`);
      if (t.is_primary && t.type !== 'topic') termProblems.push(`primary term "${t.slug}" is a ${t.type}, not a topic`);
    }
    const relRows = (await c.query<{ slug: string | null; position: number }>(
      `SELECT a.slug, r.position
         FROM cms_article_related r LEFT JOIN cms_articles a ON a.id = r.related_article_id
        WHERE r.article_id = $1 ORDER BY r.position, r.related_article_id`, [live.id]
    )).rows;
    for (const r of relRows) if (!r.slug) termProblems.push(`a related pick at position ${r.position} points at a missing article`);
    if (termProblems.length) {
      banner(['NOT APPLIED — the live tags / related picks cannot be copied exactly:', ...termProblems.map((p) => `  • ${p}`)]);
      verdict(SCRIPT, 'NOT-APPLIED (terms/related)', termProblems.join('; '));
      return 0;
    }
    const terms: TermSelection = {
      primary: primaries[0]?.slug ?? null,
      secondary: termRows.filter((t) => t.type === 'topic' && !t.is_primary).map((t) => t.slug),
      locations: termRows.filter((t) => t.type === 'location').map((t) => t.slug),
    };
    const related = relRows.map((r) => r.slug as string);
    console.log(`Live terms copied: ${JSON.stringify(terms)}`);
    console.log(`Live related picks copied: ${JSON.stringify(related)}${related.length ? '' : ' (page auto-fills its related cards)'}`);

    const author = (await c.query<{ id: number }>(`SELECT id FROM cms_users ORDER BY id LIMIT 1`)).rows[0];
    if (!author) {
      verdict(SCRIPT, 'NOT-APPLIED (no CMS user)', 'no cms_users row to author the version — nothing written');
      return 0;
    }

    // ── Build the payload and assert the phone rules (hard rule 7) ──
    const content = buildVersionContent(terms, related, sanitizeArticleBodyHtml, sanitizeArticleV2Content);
    const flat = JSON.stringify(content);
    if (flat.includes('9242')) throw new Error('the old FAQ phone 773-724-9242 is in the payload');
    if (flat.includes('724-9272')) throw new Error('a typed phone number is in the payload — it must be the {{phone}} token');
    if (!str(content.body).includes('tel:{{phone}}')) throw new Error('the {{phone}} tel link is missing from the body');
    if (sanitizeArticleBodyHtml(str(content.body)) !== str(content.body)) {
      throw new Error('the body is not sanitizer-stable — opening it in /admin and saving would change it');
    }
    const h1s = (str(content.body).match(/<h1[\s>]/gi) || []).length;
    if (h1s !== 0) throw new Error(`the body contains ${h1s} <h1> element(s) — hard rule 6`);

    // ── Fingerprints (hard rule 2): the live row, tags, related and every version ──
    const fingerprint = async () =>
      (await c.query<{ h: string }>(
        `SELECT md5(
           (SELECT md5((a.*)::text) FROM cms_articles a WHERE a.id = $1)
           || ':' || (SELECT coalesce(string_agg(at.term_id || ':' || at.is_primary, ',' ORDER BY at.term_id), '') FROM cms_article_terms at WHERE at.article_id = $1)
           || ':' || (SELECT coalesce(string_agg(r.related_article_id || ':' || r.position, ',' ORDER BY r.position, r.related_article_id), '') FROM cms_article_related r WHERE r.article_id = $1)
         ) AS h`, [live.id]
      )).rows[0].h;
    const hashVersions = async () =>
      (await c.query<{ h: string }>(
        `SELECT md5(coalesce(string_agg(id || ':' || md5(content::text) || ':' || label || ':' || is_published, ',' ORDER BY id), '')) AS h
           FROM page_drafts WHERE page_type = 'article' AND page_slug = $1 AND label NOT LIKE '%' || $2`,
        [SLUG, LABEL_SUFFIX]
      )).rows[0].h;
    const rowBefore = await fingerprint();
    const versionsBefore = await hashVersions();

    const label = `Version ${versions.length + 1}${LABEL_SUFFIX}`;

    // ── Write: one transaction; the app's own createDraft runs inside it ──
    await c.query('BEGIN');
    unbind = bindAppPoolToTransaction(appPool, c);
    try {
      // An editor tab holding an older version must get the normal conflict on Save.
      const bumped = await c.query(
        `UPDATE page_drafts SET version = version + 1 WHERE page_type = 'article' AND page_slug = $1`, [SLUG]
      );
      const draft = await createDraft({
        pageType: 'article',
        pageSlug: SLUG,
        label,
        content,
        createdBy: author.id,
      });

      // ── Verify what this run wrote, before committing ──
      const rowAfter = await fingerprint();
      const versionsAfter = await hashVersions();
      const stored = (await c.query<{ label: string; is_published: boolean; published_at: Date | null; content: Content }>(
        `SELECT label, is_published, published_at, content FROM page_drafts WHERE id = $1`, [draft.id]
      )).rows[0];
      const all = (await c.query<{ n: string; pub: string }>(
        `SELECT count(*)::text AS n, count(*) FILTER (WHERE is_published)::text AS pub
           FROM page_drafts WHERE page_type = 'article' AND page_slug = $1`, [SLUG]
      )).rows[0];
      const problems: string[] = [];
      if (rowAfter !== rowBefore) problems.push('the live row / tags / related changed');
      if (versionsAfter !== versionsBefore) problems.push("an earlier version's content changed");
      if (bumped.rowCount !== versions.length) problems.push('not every earlier version was bumped');
      if (!stored || stored.label !== label) problems.push('the version row is missing or mislabelled');
      if (stored && (stored.is_published || stored.published_at)) problems.push('the new version is published — it must not be');
      if (stored && canon(stored.content) !== canon(content)) problems.push('stored content ≠ the editor payload');
      if (all.n !== String(versions.length + 1)) problems.push(`version count ${all.n}, expected ${versions.length + 1}`);
      if (all.pub !== '1') problems.push(`${all.pub} published versions, expected 1 (the existing live one)`);
      if (problems.length) throw new Error(`post-write verification failed: ${problems.join('; ')}`);

      console.log(`  ~ ${bumped.rowCount} earlier version(s): version + 1 (content unchanged: hash ${versionsBefore === versionsAfter ? 'identical' : 'CHANGED'})`);
      console.log(`  + page_drafts "${label}" (id ${draft.id}), is_published = false, via createDraft`);
      console.log(`  = live row, tags and related picks: fingerprint ${rowBefore === rowAfter ? 'identical' : 'CHANGED'} — the public page is untouched`);
      console.log(`  = faqs: ${(content.v2 as { faqs: unknown[] }).faqs.length}, takeaways: ${(content.v2 as { takeaways: unknown[] }).takeaways.length}`);

      unbind();
      unbind = null;
      if (mode !== 'commit') {
        await c.query('ROLLBACK');
        console.log('\n  (dry run — the version rolled back)');
        verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would add "${label}" (unpublished) to id ${live.id} /knowledge-hub/${SLUG}`);
        return 0;
      }
      await c.query('COMMIT');
      verdict(SCRIPT, 'APPLIED', `"${label}" (id ${draft.id}) added UNPUBLISHED to id ${live.id} — the live /knowledge-hub/${SLUG} page is unchanged until Marketing publishes it in /admin`);
      return 0;
    } catch (err) {
      if (unbind) { unbind(); unbind = null; }
      await c.query('ROLLBACK').catch(() => {});
      const msg = err instanceof Error ? err.message : String(err);
      console.error(err);
      banner([`FAILED while writing — everything this run wrote was rolled back.`, `error: ${msg}`]);
      // Content state never fails a deploy (Brief 186): exit 0, name the error.
      verdict(SCRIPT, 'FAILED (publish)', `${msg} — rolled back, nothing written`);
      return 0;
    }
  } finally {
    if (unbind) unbind();
    c.release();
  }
}

if (require.main === module) {
  main()
    .then((code) => { process.exitCode = code; })
    .catch((err) => {
      console.error(err);
      verdict(SCRIPT, 'FAILED', err instanceof Error ? err.message : String(err));
      process.exitCode = 1;
    })
    .finally(async () => {
      const appPool = (await import('../src/lib/db')).default as unknown as { end?: () => Promise<void> };
      await appPool.end?.().catch(() => {});
    });
}
