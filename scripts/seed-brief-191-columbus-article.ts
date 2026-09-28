/**
 * Brief 191 — publish the Columbus launch article on the Article V2 template:
 *   /knowledge-hub/now-serving-columbus-central-ohio
 *
 * The copy is VERBATIM from the approved test page (Briefs 185 + 189,
 * src/app/columbus-article-test/ColumbusArticleTestTemplate.tsx, deleted by this
 * brief), rebuilt as CMS content:
 *   • body   — rich text in the shared allow-list, with the `[[office-map]]`
 *              marker and the three Brief 192 component markers where those
 *              layouts sat on the test page;
 *   • v2     — subtitle, byline, hero alt/caption, key takeaways, office,
 *              service-area list, FAQ, and the three content components.
 * Two deliberate differences from the test page, both required by the brief:
 *   • "Grandview Heights" is plain text, never a link (Brief 191 hard rule 2 /
 *     Brief 185 A9) — the test page still linked it;
 *   • "schedule a service online" links to `#schedule` (the booking popup,
 *     Brief 192 Track C), not /contact; the phone is `{{phone}}`, never typed.
 *
 * ── CREATE-ONCE (hard rule 3, Brief 186) ────────────────────────────────────
 * If an article with this slug exists, NOTHING is written and the step reports
 * ALREADY-EXISTS and exits 0: from the first publish on, editors own the
 * article. The script never updates or deletes a row.
 *
 * ── GUARDS (content state → report, exit 0, write nothing) ─────────────────
 *   • the Central Ohio phone in Global Settings must be exactly 614-547-6516
 *     (Brief 191: "if it's blank or not 614-547-6516, stop and report") —
 *     checked HERE, on the box, because production's DB is not reachable from
 *     anywhere else;
 *   • the `columbus` office, the `company-news` topic and the `central-ohio`
 *     location must exist; a cms_users row must exist to author Version 1.
 * Non-zero only for a code/schema/SQL fault.
 *
 * ── LIVE THROUGH THE VERSION MODEL (hard rule 4, Brief 159) ─────────────────
 * In ONE transaction: the live `cms_articles` row (status published, template
 * article-v2), its tags and hand-picked related articles, and a `page_drafts`
 * row "Version 1 — live" with is_published = TRUE whose content is the same
 * payload the editor would save — so the admin shows it as the live version
 * and it is edited like any other article. Every string goes through the same
 * sanitizers as the publish writer.
 *
 * Needs an explicit mode (Brief 147): `commit` applies; `--dry-run` previews.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/seed-brief-191-columbus-article.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeCmsHtml } from '../src/lib/cms/sanitize';
import { sanitizeArticleV2Content } from '../src/lib/cms/article-v2-sanitize';
import { writeArticleRelated, writeArticleTerms } from '../src/lib/cms/kh-taxonomy';

const SCRIPT = 'seed-brief-191-columbus-article';
const mode = resolveRunMode(SCRIPT);

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

const SLUG = 'now-serving-columbus-central-ohio';
const EXPECTED_CENTRAL_OHIO_PHONE = '614-547-6516'; // the guard's expected value — never written by this script
const OFFICE = 'columbus';
const VERSION_LABEL = 'Version 1 — live'; // the Brief 159 baseline label every seeded page uses
const IMG = '/images/knowledge-hub/columbus';

const TITLE = 'J. Blanton Plumbing Is Now Serving Columbus and Central Ohio';
const DEK =
  'Our first location outside Illinois is open in Grandview Heights. Same 24/7 service, same flat-rate pricing, same promise: Make a Good Call.';
const META_DESCRIPTION =
  'J. Blanton Plumbing has opened its first Ohio location at 1387 W. Goodale Blvd in Columbus. 24/7 plumbing, drain, sewer and water heater service across 138 Central Ohio communities.';

const quote = (q: string) =>
  `<blockquote><p>${q}</p><p><img src="${IMG}/avatar-aizik-zimerman.webp" alt="" width="48" height="48"> <strong>Aizik Zimerman</strong> CEO, J. Blanton Plumbing</p></blockquote>`;

const BODY = [
  `<p>For more than 30 years, we've served homeowners across Chicago and its suburbs with one simple philosophy: when you call a plumber, Make a Good Call. Our team has raced through heat, rain, snow and hail to restore order in homes across Chicagoland. Now we're bringing that same standard of service, professionalism and care to Central Ohio.</p>`,

  `<h2>Why We're Expanding to Central Ohio</h2>`,
  `<p>Columbus is the next chapter in our growth, and it's a big one. It's the first time we've operated outside of Illinois.</p>`,
  quote(`“Expanding into Columbus is an exciting milestone for J. Blanton Plumbing. We've built our company around taking care of homeowners, doing what we say we're going to do, and creating an experience that makes people feel confident they made a good call. We're excited to bring that philosophy to Ohio and become part of the Columbus community.”`),
  `<p>That last part is the key. We didn't come to Central Ohio just to add a pin on a map. We came to put down roots.</p>`,

  `<h2>What Does “Make a Good Call” Mean?</h2>`,
  `<p>“Make a Good Call” is our promise that choosing us will feel like the right decision, from the first phone call to the final walkthrough. It means showing up when we say we will, giving you a flat rate before any work starts, and doing exactly what we said we'd do.</p>`,
  `<p>[[component:promises]]</p>`,
  `<figure><img src="${IMG}/tech-doorstep-camera-footage.webp" alt="J. Blanton Plumbing technician at a homeowner's front door, showing sewer camera footage on a tablet and explaining the options before any work begins" width="1200" height="896" loading="lazy"></figure>`,
  `<p>Want the longer version? Read <a href="/why-j-blanton">why homeowners choose us</a>.</p>`,

  `<h2>Where Is J. Blanton Plumbing Located in Columbus?</h2>`,
  `<p>Our Columbus office is at 1387 W. Goodale Blvd, Columbus, OH 43212, in the Grandview Heights area. From there, our team serves 138 cities and neighborhoods across 17 Central Ohio counties, including Franklin, Delaware, Licking, Fairfield and Union.</p>`,
  `<p>[[office-map]]</p>`,
  `<p>That covers homeowners in Grandview Heights, Upper Arlington, Clintonville, Bexley, German Village, the Short North, Dublin, Hilliard and many more. If you live in or around Columbus, there's a good chance we're already close by.</p>`,

  `<h2>What Plumbing Services Do We Offer in Central Ohio?</h2>`,
  `<p>Our Columbus team handles the full range of residential plumbing and sewer work. Emergency service is available 24/7, including nights, weekends and holidays.</p>`,
  `<figure><img src="${IMG}/tech-backyard-camera-inspection.webp" alt="J. Blanton Plumbing technician showing an older homeowner the live sewer camera inspection feed on a monitor in the backyard" width="1200" height="896" loading="lazy"></figure>`,
  `<p>[[component:services]]</p>`,

  `<h2>What Stays the Same From Chicagoland</h2>`,
  `<p>A new state doesn't mean a new standard. Columbus homeowners get the same experience our Chicagoland customers have counted on for decades.</p>`,
  `<p>[[component:stays-the-same]]</p>`,

  `<h2>More Than a New Location</h2>`,
  `<p>Opening an office is the easy part. Earning a community's trust takes longer, and we're in it for the long haul. Our plans for Central Ohio include creating local jobs, building community partnerships, supporting local organizations and developing long-term relationships with Columbus-area homeowners.</p>`,
  quote(`“Our goal isn't simply to enter a new market. We want to become part of the community. We want our customers to recognize our trucks, know our team, and feel confident that when they need us, we'll be there.”`),
  `<figure><img src="${IMG}/van-residential-street.webp" alt="A red J. Blanton Plumbing service van driving down a tree-lined residential street" width="1376" height="768" loading="lazy"></figure>`,
  `<p>Are you a plumber in the Columbus area looking for a company that does things the right way? <a href="/j-blanton-is-hiring">See open plumbing jobs</a>.</p>`,

  `<h2>Welcome to the Good Call Family, Columbus</h2>`,
  `<p>Whether it's a clogged drain, a cold shower or a sewer line you're not sure about, we're ready when you need us. Call us at <a href="tel:{{phone}}">{{phone}}</a> or <a href="#schedule">schedule a service online</a>.</p>`,
  `<p>When you need a plumber in Columbus, Make a Good Call.</p>`,
].join('\n');

const item = (o: Partial<{ title: string; text: string; checklist: string[]; link_label: string; link_url: string }>) => ({
  title: '', text: '', checklist: [] as string[], link_label: '', link_url: '', ...o,
});

const V2 = {
  dek: DEK,
  byline_name: 'J. Blanton Plumbing',
  image_alt: 'Two J. Blanton Plumbing team members in red company polos, arms crossed, in front of the downtown Columbus skyline',
  image_caption: 'Our team in Columbus. Photo: Harry Acosta Photography.',
  takeaways: [
    "We've opened our first Ohio location at 1387 W. Goodale Blvd in Columbus, in the Grandview Heights area.",
    'Homeowners across 138 communities in 17 Central Ohio counties are now covered.',
    'You get the same 24/7 plumbing, drain, sewer and water heater service Chicagoland has trusted for more than 30 years.',
    'Same flat-rate pricing, same No Drip Club, same promise: Make a Good Call.',
  ],
  office: OFFICE,
  service_area: 'columbus',
  service_area_label: 'See all 138 communities we serve in Central Ohio',
  faqs: [
    { q: 'Does J. Blanton Plumbing serve Columbus, Ohio?', a: 'Yes. We now serve Columbus and 138 cities and neighborhoods across 17 Central Ohio counties. That includes Grandview Heights, Upper Arlington, Clintonville, Bexley, Dublin, Hilliard and many more communities around the city.' },
    { q: "Where is J. Blanton Plumbing's Columbus office?", a: "Our Columbus office is at 1387 W. Goodale Blvd, Columbus, OH 43212, in the Grandview Heights area. It's our first location outside of Illinois." },
    { q: 'Does J. Blanton Plumbing offer 24/7 emergency plumbing in Columbus?', a: 'Yes. Our Columbus team offers 24/7 emergency plumbing, drain, sewer and water heater service. That includes nights, weekends and holidays.' },
    { q: 'Is the No Drip Club available in Central Ohio?', a: 'Yes. Central Ohio homeowners can join the No Drip Club, our home plumbing membership. Members get priority scheduling, a 10% discount on service and equipment, no emergency or trip charges, and two preventative maintenance visits per year.' },
    { q: 'Does J. Blanton Plumbing offer financing in Ohio?', a: 'Yes. Flexible financing options are available to Central Ohio homeowners. Get service now and pay over time, for emergency and planned repairs.' },
  ],
  components: [
    {
      name: 'promises', type: 'promises', items: [
        item({ title: 'We answer your call, 24/7.', text: "Plumbing problems don't wait for business hours, so neither do we." }),
        item({ title: 'You get a flat rate before work begins.', text: 'Our technicians walk you through your options first. No surprises on the bill.' }),
        item({ title: 'You deal with local plumbers.', text: 'Our Columbus office is staffed by plumbers who work in your area, not a call center routing you to a subcontractor.' }),
        item({ title: 'We treat your home like it matters.', text: 'Because it does.' }),
      ],
    },
    {
      name: 'services', type: 'services', items: [
        item({ title: 'Plumbing repairs', text: 'Leaks, running toilets, low water pressure, broken fixtures. The everyday problems that turn into big ones if you ignore them.' }),
        item({ title: 'Drain cleaning', text: 'Slow or clogged drains in your kitchen, bathroom, laundry room or basement. We clear the clog and help you understand what caused it.', link_label: 'Explore drain services', link_url: '/services/drain' }),
        item({ title: 'Sewer camera inspections', text: "A small camera goes down your sewer line to see what's going on inside. The fastest way to find the real problem without guessing." }),
        item({ title: 'Water heater services', text: 'Repairs, maintenance and replacements for tank and tankless units.', link_label: 'Explore water heater services', link_url: '/services/water-heater' }),
        item({ title: 'Sewer repair and advanced sewer solutions', text: "When a sewer line is damaged, we'll show you what we found and explain your repair options.", link_label: 'Explore sewer services', link_url: '/services/sewer' }),
      ],
    },
    {
      name: 'stays-the-same', type: 'cards', items: [
        item({ title: 'No Drip Club', text: 'Our home plumbing membership. The easiest way to catch small problems before they become expensive ones.', checklist: ['Priority scheduling', '10% off service and equipment', 'No emergency or trip charges', 'Two maintenance visits a year'], link_label: 'See No Drip Club benefits', link_url: '/no-drip-club' }),
        item({ title: 'Flexible financing', text: 'A failed water heater or a broken sewer line is never in the budget. Flexible financing options are available. Get service now and pay over time.', link_label: 'See financing options', link_url: '/financing' }),
      ],
    },
  ],
};

/** Brief 187 slugs (kh_terms). */
const TERMS = { primary: 'company-news', secondary: [] as string[], locations: ['central-ohio'] };
/** The three related articles the test page showed, as Brief 188 hand-picks. */
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
    // ── Create-once ──
    const existing = await c.query<{ id: number; status: string; template: string }>(
      `SELECT id, status, to_jsonb(a) ->> 'template' AS template FROM cms_articles a WHERE slug = $1`,
      [SLUG]
    );
    if (existing.rows[0]) {
      const r = existing.rows[0];
      console.log(`ALREADY-EXISTS: /knowledge-hub/${SLUG} (id ${r.id}, ${r.status}, template ${r.template}) — editor-owned, nothing written.`);
      verdict(SCRIPT, 'ALREADY-APPLIED', `ALREADY-EXISTS — id ${r.id}, left untouched`);
      return;
    }

    // ── Guards: content state → report and stop, exit 0 ──
    const gs = (await c.query<{ phone: string | null; offices: unknown }>(
      `SELECT to_jsonb(g) ->> 'central_ohio_phone_display' AS phone, g.offices FROM global_settings g WHERE id = 1`
    )).rows[0];
    const problems: string[] = [];
    if (!gs) problems.push('no global_settings row (id = 1)');
    const phone = (gs?.phone ?? '').trim();
    if (gs && phone !== EXPECTED_CENTRAL_OHIO_PHONE) {
      problems.push(`Global Settings → Central Ohio phone is ${phone ? `"${phone}"` : 'BLANK'}, expected ${EXPECTED_CENTRAL_OHIO_PHONE} (Brief 191: stop and report; this script never writes it)`);
    }
    const offices = Array.isArray(gs?.offices) ? (gs!.offices as { slug?: string; state?: string }[]) : [];
    const office = offices.find((o) => o.slug === OFFICE);
    if (gs && !office) problems.push(`no "${OFFICE}" office in Global Settings`);
    else if (office && (office.state ?? '').trim().toUpperCase() !== 'OH') problems.push(`the "${OFFICE}" office's state is "${office.state}", not OH`);
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

    // ── Build exactly what the publish writer would store ──
    const body = sanitizeCmsHtml(BODY);
    const v2 = sanitizeArticleV2Content(V2);
    const content = {
      title: TITLE,
      excerpt: DEK,
      body: BODY,
      image: `${IMG}/hero-columbus-team-skyline.webp`,
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
       VALUES ($1, $2, $3, $4, $5, 'published', $6, $7, $8, $8, NOW(), 'article-v2', $9)
       RETURNING id`,
      [SLUG, TITLE, DEK, JSON.stringify({ html: body }), content.image, TITLE, META_DESCRIPTION, author!.id, JSON.stringify(v2)]
    );
    const id = ins.rows[0].id;
    const t = await writeArticleTerms(c, id, TERMS);
    const r = await writeArticleRelated(c, id, RELATED);
    await c.query(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, is_published, published_at)
       VALUES ('article', $1, $2, $3, $4, TRUE, NOW())`,
      [SLUG, VERSION_LABEL, JSON.stringify(content), author!.id]
    );

    // ── Verify what this run wrote (scoped to this row only) ──
    const check = await c.query<{ n_terms: string; n_rel: string; n_live: string; template: string; status: string }>(
      `SELECT (SELECT count(*) FROM cms_article_terms WHERE article_id = $1)::text AS n_terms,
              (SELECT count(*) FROM cms_article_related WHERE article_id = $1)::text AS n_rel,
              (SELECT count(*) FROM page_drafts WHERE page_type = 'article' AND page_slug = $2 AND is_published)::text AS n_live,
              a.template, a.status
         FROM cms_articles a WHERE a.id = $1`,
      [id, SLUG]
    );
    const k = check.rows[0];
    console.log(`  + cms_articles id ${id}: ${k.status}, template ${k.template}`);
    console.log(`  + tags: ${k.n_terms} (${TERMS.primary}, ${TERMS.locations.join(', ')})${t.unknown.length ? ` — unknown: ${t.unknown.join(', ')}` : ''}`);
    console.log(`  + related: ${k.n_rel}${r.unknown.length ? ` — not found (skipped): ${r.unknown.join(', ')}` : ''}`);
    console.log(`  + page_drafts "${VERSION_LABEL}" live: ${k.n_live}`);
    console.log(`  + components: ${v2.components.map((x) => `${x.name} (${x.items.length})`).join(', ')}`);
    if (k.status !== 'published' || k.template !== 'article-v2' || k.n_live !== '1' || k.n_terms !== '2') {
      throw new Error('post-write verification failed for the row this run created');
    }

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would create /knowledge-hub/${SLUG}`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, 'APPLIED', `created /knowledge-hub/${SLUG} (id ${id}), published on Article V2`);
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
