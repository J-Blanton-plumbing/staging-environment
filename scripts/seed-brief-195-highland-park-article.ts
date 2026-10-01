/**
 * Brief 195 — the Highland Park office launch article, on the Article V2
 * template, as an UNPUBLISHED draft for manager review:
 *   /knowledge-hub/j-blanton-plumbing-opens-highland-park-office   (404 until Publish)
 *   /review/knowledge-hub/j-blanton-plumbing-opens-highland-park-office  (Basic Auth)
 *
 * The copy is VERBATIM from the approved package's dev source
 * (`01_article/02_dev-source/jbp-highland-park-office.dev.html`), rebuilt as CMS
 * content exactly the way Brief 191 rebuilt the Columbus article:
 *   • body — rich text in the shared allow-list, with the three Brief 192
 *            component markers where those layouts sit in the prototype;
 *   • v2   — subtitle, byline, hero alt/caption, key takeaways, FAQ and the
 *            three content components.
 * Deliberate differences from the prototype, all required by the brief:
 *   • both CEO quotes start with the literal "[DRAFT QUOTE]" (Marketing: the
 *     prototype's yellow "Draft quote" tag, made editable in the CMS);
 *   • NO [[office-map]] marker and NO Local office / service-area list: the
 *     marker only renders for an office in Global Settings → offices, and the
 *     Highland Park office must not be added there before approval (hard rule 3
 *     — it would appear in the footer, locator, schema and city routing). The
 *     prototype's "Get directions" link sits where the map was, as a plain link;
 *   • every https://jblantonplumbing.com/… link is relative; "schedule a
 *     service online" is `#schedule` (the booking popup); the phone is
 *     `{{phone}}` (no office → the main phone), never typed.
 *
 * ── CREATE-ONCE (hard rule 4, Brief 186) ────────────────────────────────────
 * If an article with this slug exists, NOTHING is written: ALREADY-EXISTS,
 * exit 0. From then on editors own the article. Never updates or deletes.
 *
 * ── GUARDS ──────────────────────────────────────────────────────────────────
 * Content state → report NOT-APPLIED (guard tripped), write nothing, exit 0:
 *   • the `company-news` topic or the `chicagoland` location is missing;
 *   • no cms_users row to author Version 1.
 * Schema fault → exit 1: the Brief 190 `template` / `v2` columns are missing.
 *
 * ── DRAFT THROUGH THE VERSION MODEL (hard rule 5, Brief 159) ────────────────
 * In ONE transaction: the live `cms_articles` row (status DRAFT, template
 * article-v2), its tags and hand-picked related articles, and ONE `page_drafts`
 * row "Version 1 — for review" with is_published = FALSE whose content is the
 * payload the editor saves. Publishing that version in /admin is then the
 * ordinary publish path (updateArticleCmsContent) — nothing special.
 * The label is deliberately NOT Brief 159's "Version 1 — live": the article
 * schema skips that label when it derives datePublished, so with this label
 * datePublished becomes the time Marketing clicks Publish.
 *
 * Needs an explicit mode (Brief 147): `commit` applies; `--dry-run` previews.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/seed-brief-195-highland-park-article.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeCmsHtml } from '../src/lib/cms/sanitize';
import { sanitizeArticleV2Content } from '../src/lib/cms/article-v2-sanitize';
import { writeArticleRelated, writeArticleTerms } from '../src/lib/cms/kh-taxonomy';

const SCRIPT = 'seed-brief-195-highland-park-article';
const mode = resolveRunMode(SCRIPT);

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

const SLUG = 'j-blanton-plumbing-opens-highland-park-office';
const VERSION_LABEL = 'Version 1 — for review';
const IMG = '/images/knowledge-hub/highland-park';
/** Byte-identical to this package's avatar (sha256 4d47b956…7ffab) — reused, not copied. */
const AVATAR = '/images/knowledge-hub/columbus/avatar-aizik-zimerman.webp';
const DIRECTIONS = 'https://www.google.com/maps/dir/?api=1&destination=1904+Green+Bay+Rd+%23B,+Highland+Park,+IL+60035';

const TITLE = 'J. Blanton Plumbing Opens a Local Office in Highland Park, IL';
const DEK =
  'After more than 30 years serving Chicagoland, we now have a home base on Green Bay Road. Same 24/7 service, same flat-rate pricing, just closer to your door.';
const META_DESCRIPTION =
  "We've opened a local office at 1904 Green Bay Rd in Highland Park, IL. Same 24/7 plumbing, drain, sewer and water heater service, now closer to North Shore homes.";

/** Brief 190 attribution convention (same markup as Brief 191); Marketing's draft label leads the text. */
const quote = (q: string) =>
  `<blockquote><p>[DRAFT QUOTE] ${q}</p><p><img src="${AVATAR}" alt="" width="48" height="48"> <strong>Aizik Zimerman</strong> CEO, J. Blanton Plumbing</p></blockquote>`;
const fig = (file: string, w: number, h: number, alt: string) =>
  `<figure><img src="${IMG}/${file}" alt="${alt}" width="${w}" height="${h}" loading="lazy"></figure>`;

const BODY = [
  `<p>For more than 30 years, we've helped homeowners across Chicago and its suburbs with one simple philosophy: when you call a plumber, Make a Good Call. Highland Park has been part of that story for a long time. Now it has its own office.</p>`,
  `<p>Our new Highland Park office sits on Green Bay Road, right in the middle of the North Shore. Nothing about how we work is changing. The only difference is distance. When your basement is taking on water at 2 a.m., a plumber who's already nearby makes all the difference.</p>`,

  `<h2>Why Did We Open an Office in Highland Park?</h2>`,
  `<p>We opened a Highland Park office to get to North Shore homes faster. Our plumbers have served this area for years from other Chicagoland offices. A local base on Green Bay Road keeps them closer, so a burst pipe or sewer backup gets a quicker response, with the same 24/7 service and flat-rate pricing.</p>`,
  `<p>Highland Park and its neighbors call us for a lot of the same things: sewer lines, sump pumps, water heaters and frozen pipes. Many of those calls can't wait. Being down the street, not across the county, is the most practical way we can help.</p>`,
  quote(`“Highland Park homeowners have trusted us for years, and they deserve a plumber who's close by when something goes wrong. Opening an office here lets us keep the same promise we've always made, just faster. We want to be part of this community, not just a truck that drives in from somewhere else.”`),
  `<p>That's the real goal. A new office is a pin on a map. Being the plumber your neighbors recommend takes more than that.</p>`,

  `<h2>What Does “Make a Good Call” Mean?</h2>`,
  `<p>“Make a Good Call” is our promise that calling us will feel like the right decision, from the first phone call to the final walkthrough. It means showing up when we say we will, giving you a flat rate before any work starts, and doing exactly what we said we'd do.</p>`,
  `<p>[[component:promises]]</p>`,
  fig('camera-inspection-results-homeowner.webp', 1600, 1195, 'J. Blanton Plumbing technician at the front door of a brick home, showing a camera inspection feed on a tablet to a homeowner'),
  `<p>Want the longer version? Read <a href="/why-j-blanton">why homeowners choose us</a>.</p>`,

  `<h2>Where Is J. Blanton Plumbing's Highland Park Office?</h2>`,
  `<p>Our Highland Park office is at 1904 Green Bay Rd #B, Highland Park, IL 60035, in Lake County. From there, our plumbers serve Highland Park and the surrounding North Shore communities, with a phone line that's open 24 hours a day, seven days a week.</p>`,
  // Where the prototype's map sits. No [[office-map]]: it needs a Global Settings office (see header).
  `<p><a href="${DIRECTIONS}" target="_blank" rel="noopener">Get directions</a></p>`,
  `<p>That puts us close to homeowners in <a href="/highwood">Highwood</a>, <a href="/fort-sheridan">Fort Sheridan</a>, <a href="/deerfield">Deerfield</a>, <a href="/bannockburn">Bannockburn</a>, <a href="/riverwoods">Riverwoods</a>, <a href="/lake-forest">Lake Forest</a>, <a href="/lake-bluff">Lake Bluff</a> and <a href="/glencoe">Glencoe</a>. If you live on the North Shore, there's a good chance we're already close by.</p>`,
  `<p>See everything we do locally on our <a href="/highland-park">Highland Park plumbing page</a>.</p>`,

  `<h2>What Do Highland Park Homes Need From a Plumber?</h2>`,
  `<p>Highland Park homes tend to be older, surrounded by mature trees and hit by long Lake County winters. That mix leads to the same few problems: tree roots in aging sewer lines, basement backups after heavy rain, and pipes that freeze and split. A local plumber who knows these homes can spot them early.</p>`,
  `<h3>Older homes, older pipes</h3>`,
  `<p>The <a href="https://censusreporter.org/profiles/16000US1734722-highland-park-il/">median Highland Park home was built in 1963</a>, and <a href="https://www.point2homes.com/US/Neighborhood/IL/Lake-County/Highland-Park-Demographics.html">about 45% went up before 1960</a>. Homes from those years often have clay sewer pipe, cast iron drains and galvanized water lines. They wear out slowly, until a <a href="/highland-park/leak-repairs">small leak</a> becomes a bigger repair.</p>`,
  `<h3>Ravines, trees and your sewer line</h3>`,
  `<p>Highland Park has <a href="https://www.pdhp.org/ravine-project/">more ravines than any other North Shore community</a>, plus streets lined with old trees. Roots grow toward moisture and slip into older pipe through the joints. In Highland Park, <a href="https://www.cityhpil.com/government/city_departments/public_works/operations_division/sewer_section/index.php">the homeowner owns the private sewer line</a> from the house to the city main, so a <a href="/highland-park/video-camera-sewer-inspections">sewer camera inspection</a> is the best way to know where yours stands.</p>`,
  fig('hydro-jetting-sewer-cleanout.webp', 1600, 1195, 'J. Blanton Plumbing technician kneeling on a residential driveway, feeding a hydro jet hose into a sewer cleanout, with a branded service truck parked at the curb behind him'),
  `<h3>Heavy rain and basement backups</h3>`,
  `<p>The city's <a href="https://www.cityhpil.com/government/city_departments/public_works/operations_division/sewer_section/flood_mitigation_preparation_tips.php">flood preparation tips</a> tell homeowners to check backflow preventers, sump pumps and battery backups, and to have a licensed plumber inspect their lines for roots and debris. We can help with all of it, from a <a href="/highland-park/sump-pumps">sump pump with a battery backup</a> to an <a href="/highland-park/overhead-sewer-systems">overhead sewer system</a> for homes with repeat backups.</p>`,
  `<h3>Hard freezes and burst pipes</h3>`,
  `<p>Lake County winters bring long stretches below freezing. Pipes in exterior walls, crawl spaces and outdoor spigot lines freeze first. If one splits, shut off your main water valve and call us. Our <a href="/highland-park/burst-pipe-repair">burst pipe repair</a> team is on call 24/7.</p>`,

  `<h2>Plumbing Services From Our Highland Park Office</h2>`,
  `<p>Our Highland Park team handles the full range of residential plumbing and sewer work. Emergency service is available 24/7, including nights, weekends and holidays.</p>`,
  fig('sewer-camera-inspection-backyard.webp', 1600, 1200, 'Two J. Blanton plumbers watching the monitor of a sewer camera during a backyard sewer line inspection'),
  `<p>[[component:services]]</p>`,

  `<h2>What Stays the Same</h2>`,
  `<p>A new office doesn't mean a new standard. Highland Park homeowners get the same experience our Chicagoland customers have counted on since 1993.</p>`,
  `<p>[[component:stays-the-same]]</p>`,

  `<h2>Putting Down Roots on the North Shore</h2>`,
  `<p>Opening an office is the easy part. Earning a community's trust takes longer, and we're here for the long haul. Our plans for Highland Park include creating local jobs, supporting local organizations and building long-term relationships with North Shore homeowners.</p>`,
  quote(`“We want Highland Park to recognize our trucks and know our plumbers by name. When a neighbor asks who to call, we want the answer to be easy.”`),
  fig('plumbers-sewer-camera-setup.webp', 1400, 933, 'J. Blanton plumbers setting up sewer camera inspection equipment on a job site'),
  `<p>Are you a plumber on the North Shore looking for a company that does things the right way? <a href="/j-blanton-is-hiring">See open plumbing jobs</a>.</p>`,

  `<h2>Make a Good Call, Highland Park</h2>`,
  `<p>Whether it's a slow drain, a cold shower or a sewer line you're not sure about, we're close by and ready when you need us. Call us at <a href="tel:{{phone}}">{{phone}}</a> or <a href="#schedule">schedule a service online</a>.</p>`,
  `<p>When you need a plumber in Highland Park, Make a Good Call.</p>`,
].join('\n');

const item = (o: Partial<{ title: string; text: string; checklist: string[]; link_label: string; link_url: string }>) => ({
  title: '', text: '', checklist: [] as string[], link_label: '', link_url: '', ...o,
});

const V2 = {
  dek: DEK,
  byline_name: 'J. Blanton Plumbing',
  image_alt: 'J. Blanton Plumbing van parked on a residential street in front of a two-story home',
  image_caption: 'On call 24/7 for Highland Park and the North Shore.',
  takeaways: [
    "We've opened a local office at 1904 Green Bay Rd #B in Highland Park, IL.",
    'A home base on the North Shore means shorter drives and faster help when something goes wrong.',
    'You get the same 24/7 plumbing, drain, sewer and water heater service Chicagoland has trusted since 1993.',
    'Same flat-rate pricing, same No Drip Club, same promise: Make a Good Call.',
  ],
  // Marketing decision: no Global Settings office yet, so no office and no list.
  office: '',
  service_area: '',
  service_area_label: '',
  faqs: [
    { q: "Where is J. Blanton Plumbing's Highland Park office?", a: 'Our Highland Park office is at 1904 Green Bay Rd #B, Highland Park, IL 60035. Our phone line is open 24/7, and the office puts our plumbers closer to homes across Highland Park and the North Shore.' },
    { q: 'Does J. Blanton Plumbing offer 24/7 emergency plumbing in Highland Park?', a: 'Yes. Call us any time, day or night, including weekends and holidays. Burst pipes, sewer backups and no hot water are treated as a priority, and we work to get a plumber to your home as soon as we can.' },
    { q: 'Which North Shore communities does the Highland Park office serve?', a: 'Along with Highland Park, the office serves Highwood, Fort Sheridan, Deerfield, Bannockburn, Riverwoods, Lake Forest, Lake Bluff, Glencoe and more. The phone line is open 24/7 for all of them.' },
    { q: 'Who is responsible for the sewer line in Highland Park?', a: 'In Highland Park, the homeowner owns and maintains the private sewer line (the lateral) that runs from the house to the city main. The city maintains the main. If roots or a crack cause a backup in your lateral, the repair is yours, so a camera inspection is a smart first step.' },
    { q: 'Is the No Drip Club available in Highland Park?', a: 'Yes. Highland Park homeowners can join the No Drip Club, our annual plumbing protection plan. Members get two free maintenance visits a year, 10% off general plumbing and sewer services, a 5-year parts and labor warranty on approved projects, and priority scheduling.' },
  ],
  components: [
    {
      name: 'promises', type: 'promises', items: [
        item({ title: 'We answer your call, 24/7.', text: "Plumbing problems don't keep business hours, so neither do we." }),
        item({ title: 'You get a flat rate before work begins.', text: 'The price we quote is the price you pay. No surprise add-ons when the job is done.' }),
        item({ title: 'You get options, not a sales pitch.', text: 'Our plumber explains the problem in plain English first. Then you decide.' }),
        item({ title: 'We treat your home like it matters.', text: 'Shoe covers on, questions answered, no pressure.' }),
      ],
    },
    {
      name: 'services', type: 'services', items: [
        item({ title: 'Emergency plumbing', text: 'Burst pipes, sewer backups and no hot water, any time of day or night.', link_label: 'Emergency plumbing in Highland Park', link_url: '/highland-park/emergency-plumbing' }),
        item({ title: 'Drain cleaning', text: 'Slow, gurgling or backed-up drains in kitchens, bathrooms and basements. We clear the clog and show you what caused it.', link_label: 'Drain cleaning in Highland Park', link_url: '/highland-park/drain-cleaning' }),
        item({ title: 'Sewer repair', text: 'Tree roots, cracked clay pipe and repeat backups in the line from your house to the street. We show you what we found before we talk about fixes.', link_label: 'Sewer repair in Highland Park', link_url: '/highland-park/sewer-repair' }),
        item({ title: 'Water heaters', text: 'Repair and replacement for tank and tankless water heaters that leak, make noise or run out of hot water too fast.', link_label: 'Water heater repair in Highland Park', link_url: '/highland-park/water-heater-repair' }),
        item({ title: 'Sump pumps and flood protection', text: 'Sump pump repair, replacement and battery backups to keep your basement dry through heavy rain and snowmelt.', link_label: 'Basement flooding help', link_url: '/highland-park/basement-flooding' }),
        item({ title: 'Gas lines and fireplaces', text: 'Gas line repair, leak detection and gas fireplace service, handled by licensed plumbers.', link_label: 'Gas line repair in Highland Park', link_url: '/highland-park/gas-line-repair' }),
      ],
    },
    {
      name: 'stays-the-same', type: 'cards', items: [
        item({ title: 'No Drip Club', text: 'Our annual protection plan. A plumber visits your home for regular maintenance, so small problems get caught early.', checklist: ['Two free maintenance visits a year', '10% off plumbing and sewer services', '5-year parts and labor warranty on approved projects', 'VIP priority scheduling'], link_label: 'See No Drip Club benefits', link_url: '/no-drip-club' }),
        item({ title: 'Flexible financing', text: 'A failed water heater or a broken sewer line is never in the budget. Flexible financing options are available. Get service now and pay over time.', link_label: 'See financing options', link_url: '/financing' }),
      ],
    },
  ],
};

/** Brief 187 slugs (kh_terms). Marketing decision: Company News + Chicagoland (region). */
const TERMS = { primary: 'company-news', secondary: [] as string[], locations: ['chicagoland'] };
/** The prototype's three related articles, as Brief 188 hand-picks. */
const RELATED = [
  'prepare-your-home-plumbing-for-the-chicago-cold-snap',
  'sewer-replacement-old-homes-chicagoland',
  'unclogs-for-dogs-campaign-making-bigger-impact',
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

    // ── Guards: content state → report and stop, exit 0 ──
    const problems: string[] = [];
    const terms = await c.query<{ type: string; slug: string }>(
      `SELECT type, slug FROM kh_terms WHERE (type = 'topic' AND slug = $1) OR (type = 'location' AND slug = $2)`,
      [TERMS.primary, TERMS.locations[0]]
    );
    for (const [type, slug] of [['topic', TERMS.primary], ['location', TERMS.locations[0]]]) {
      if (!terms.rows.some((t) => t.type === type && t.slug === slug)) problems.push(`kh_terms ${type} "${slug}" missing`);
    }
    const author = (await c.query<{ id: number }>(`SELECT id FROM cms_users ORDER BY id LIMIT 1`)).rows[0];
    if (!author) problems.push('no cms_users row to author Version 1');
    if (problems.length) {
      banner(['NOT APPLIED — nothing was written:', ...problems.map((p) => `  • ${p}`)]);
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', problems.join('; '));
      return;
    }

    // ── Build exactly what the editor saves / the publish writer stores ──
    const body = sanitizeCmsHtml(BODY);
    const v2 = sanitizeArticleV2Content(V2);
    const content = {
      title: TITLE,
      excerpt: DEK,
      body: BODY,
      image: `${IMG}/jbp-van-residential-street-1100.webp`,
      terms: TERMS,
      related: RELATED,
      template: 'article-v2',
      v2,
      metaTitle: TITLE,
      metaDescription: META_DESCRIPTION,
    };

    await c.query('BEGIN');
    const ins = await c.query<{ id: number }>(
      `INSERT INTO cms_articles (slug, title, excerpt, body, image, status, meta_title, meta_description, created_by, updated_by, updated_at, template, v2)
       VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $8, NOW(), 'article-v2', $9)
       RETURNING id`,
      [SLUG, TITLE, DEK, JSON.stringify({ html: body }), content.image, TITLE, META_DESCRIPTION, author!.id, JSON.stringify(v2)]
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
    const check = await c.query<{ n_terms: string; n_rel: string; n_versions: string; n_live: string; template: string; status: string }>(
      `SELECT (SELECT count(*) FROM cms_article_terms WHERE article_id = $1)::text AS n_terms,
              (SELECT count(*) FROM cms_article_related WHERE article_id = $1)::text AS n_rel,
              (SELECT count(*) FROM page_drafts WHERE page_type = 'article' AND page_slug = $2)::text AS n_versions,
              (SELECT count(*) FROM page_drafts WHERE page_type = 'article' AND page_slug = $2 AND is_published)::text AS n_live,
              a.template, a.status
         FROM cms_articles a WHERE a.id = $1`,
      [id, SLUG]
    );
    const k = check.rows[0];
    console.log(`  + cms_articles id ${id}: ${k.status}, template ${k.template}`);
    console.log(`  + tags: ${k.n_terms} (${TERMS.primary}, ${TERMS.locations.join(', ')})${t.unknown.length ? ` — unknown: ${t.unknown.join(', ')}` : ''}`);
    console.log(`  + related: ${k.n_rel}${r.unknown.length ? ` — not found (skipped): ${r.unknown.join(', ')}` : ''}`);
    console.log(`  + page_drafts "${VERSION_LABEL}": ${k.n_versions} version(s), ${k.n_live} published`);
    console.log(`  + components: ${v2.components.map((x) => `${x.name} (${x.items.length})`).join(', ')}`);
    if (k.status !== 'draft' || k.template !== 'article-v2' || k.n_versions !== '1' || k.n_live !== '0' || k.n_terms !== '2') {
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
    verdict(SCRIPT, 'APPLIED', `created /knowledge-hub/${SLUG} (id ${id}) as an UNPUBLISHED Article V2 draft — review at /review/knowledge-hub/${SLUG}`);
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
