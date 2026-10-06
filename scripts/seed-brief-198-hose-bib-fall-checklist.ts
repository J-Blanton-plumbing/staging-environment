/**
 * Brief 198 — "Shut Off Before Fall: A Homeowner's Hose Bib & Irrigation
 * Checklist", on the Article V2 template, as an UNPUBLISHED draft for manager
 * review with PLACEHOLDER images:
 *   /knowledge-hub/hose-bib-irrigation-fall-checklist          (404 until Publish)
 *   /review/knowledge-hub/hose-bib-irrigation-fall-checklist   (Basic Auth, Brief 195)
 *
 * The copy is VERBATIM from Marketing's .docx
 * (`New Pages/Hose Bib Fall Checklist/hose-bib-irrigation-fall-checklist.docx`),
 * rebuilt as CMS content the way Briefs 191/195 rebuilt theirs:
 *   • body — rich text in the shared allow-list (CMS_ALLOWED_TAGS, not widened);
 *   • v2   — subtitle, byline, hero alt/caption, key takeaways and FAQ.
 * The ONLY departures from the .docx are the brief's seven allowed changes:
 *   1. the TL;DR becomes the subtitle + key takeaways, and is not in the body;
 *   2. the first-freeze <table> (the sanitizer allows none) is a bulleted list,
 *      followed by the italic "Source:" line with its link;
 *   3. the inline "NEED AN EXPERT? … SCHEDULE NOW" band is dropped — the V2
 *      template supplies the service CTA, rail card and call bar;
 *   4. the "FAQ Schema (JSON-LD)" section is not imported (V2 emits no FAQPage;
 *      never a <script> in the body);
 *   5. the phone is `{{phone}}` (no office → the main phone), never typed;
 *   6. every https://jblantonplumbing.com/… link is relative, and "schedule
 *      service online" (/contact) is `#schedule` (the booking popup);
 *   7. the 7-step checklist stays an <ol> with its bold lead-ins.
 * The five images are "PHOTO PLACEHOLDER" graphics
 * (`scripts/make-brief-198-placeholders.ts`) that Marketing swaps in /admin
 * before publishing.
 *
 * ── CREATE-ONCE (Brief 186) ─────────────────────────────────────────────────
 * If an article with this slug exists, NOTHING is written: ALREADY-EXISTS,
 * exit 0. From then on editors own the article. Never updates or deletes.
 *
 * ── GUARDS ──────────────────────────────────────────────────────────────────
 * Content state → report NOT-APPLIED (guard tripped), write nothing, exit 0:
 *   • the `plumbing-tips` topic or the `chicagoland` location is missing;
 *   • no cms_users row to author Version 1.
 * Schema fault → exit 1: the Brief 190 `template` / `v2` columns are missing.
 * A hand-picked related article that is missing or not published is skipped
 * and reported — that is not a guard.
 *
 * ── DRAFT THROUGH THE VERSION MODEL (Brief 159/195) ─────────────────────────
 * In ONE transaction: the live `cms_articles` row (status DRAFT, template
 * article-v2), its tags and hand-picked related articles, and ONE `page_drafts`
 * row "Version 1 — for review" with is_published = FALSE whose content is the
 * payload the editor saves. The label is deliberately NOT Brief 159's
 * "Version 1 — live", so datePublished becomes the time Marketing clicks Publish.
 *
 * Needs an explicit mode (Brief 147): `commit` applies; `--dry-run` previews.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/seed-brief-198-hose-bib-fall-checklist.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeCmsHtml } from '../src/lib/cms/sanitize';
import { sanitizeArticleV2Content } from '../src/lib/cms/article-v2-sanitize';
import { writeArticleRelated, writeArticleTerms } from '../src/lib/cms/kh-taxonomy';

const SCRIPT = 'seed-brief-198-hose-bib-fall-checklist';
const mode = resolveRunMode(SCRIPT);

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

const SLUG = 'hose-bib-irrigation-fall-checklist';
const VERSION_LABEL = 'Version 1 — for review';
const IMG = '/images/knowledge-hub/hose-bib-fall-checklist';

const TITLE = "Shut Off Before Fall: A Homeowner's Hose Bib & Irrigation Checklist";
const META_TITLE = 'Hose Bib & Irrigation Fall Shutoff Checklist';
const DEK = 'Outdoor faucets (hose bibs) and lawn irrigation lines are the first pipes to freeze in Chicagoland.';
const META_DESCRIPTION =
  "Winterize outdoor faucets and sprinkler lines before Chicagoland's first freeze: a step-by-step hose bib shutoff checklist, frost-free faucet tips and more.";

/** Brief 195 in-article photo shape, plus the placeholder caption. */
const fig = (file: string, alt: string, caption: string) =>
  `<figure><img src="${IMG}/${file}" alt="${alt}" width="1100" height="654" loading="lazy"><figcaption>${caption}</figcaption></figure>`;

const BODY = [
  // (1) The TL;DR is the subtitle + key takeaways; the body starts here.
  `<p>Every spring, Chicagoland homeowners call us with the same story: the garden hose seemed a little weak, and a few days later a wet stain showed up on the basement wall. Usually, it's a hose bib that froze and split over the winter. The good news? Learning how to <strong>winterize outdoor faucets</strong> is an easy DIY job, and it can save you from a burst pipe repair that can cost up to $3,600 in Chicago once water damage cleanup is included, <a href="https://www.angi.com/articles/cost-to-repair-leaking-pipe/il/chicago">according to Angi</a>. You just need to do it before the first freeze.</p>`,
  // (2) The .docx table (Area | Average first freeze) as a list — no <table> in the CMS.
  `<ul><li><strong>Most of northern Illinois:</strong> average first freeze October 11 to 20</li><li><strong>Chicago and immediate suburbs:</strong> average first freeze October 27 to November 5</li></ul>`,
  `<p><em>Source: <a href="https://www.nbcchicago.com/weather/explainer-heres-when-the-chicago-area-typically-sees-its-first-freeze/2954436/">National Weather Service data, via NBC Chicago</a></em></p>`,

  `<h2>Why Do Outdoor Faucets Freeze and Burst?</h2>`,
  `<p>Outdoor faucets freeze because they sit on the coldest side of your house, often with little or no insulation behind them. Water expands as it freezes, and that expansion puts enormous pressure on the pipe. When water is trapped with nowhere to go, the pipe or faucet body can crack.</p>`,
  `<p>The <a href="https://www.redcross.org/get-help/how-to-prepare-for-emergencies/types-of-emergencies/winter-storm/frozen-pipes.html">American Red Cross</a> lists outdoor hose bibs, swimming pool lines and sprinkler systems among the pipes most likely to freeze. Insurance carrier <a href="https://www.travelers.com/resources/home/maintenance/how-to-prevent-frozen-pipes">Travelers</a> puts outdoor hose hookups and lawn sprinkler lines at the top of its own high-risk list.</p>`,
  `<p>Here's the tricky part. A split often happens inside the wall, where you can't see it. You won't notice anything until spring, when you turn the faucet on and water sprays into the wall cavity. If you want to know more about what's happening inside the pipe, read our guide on <a href="/knowledge-hub/what-causes-pipes-to-burst">what causes pipes to burst</a>.</p>`,

  `<h2>Your Hose Bib Shutoff Checklist</h2>`,
  `<p>Work through this list once per outdoor faucet. Most homes have two or three.</p>`,
  // (7) Stays an ordered list, bold lead-ins kept.
  `<ol>` +
    `<li><strong>Disconnect every hose.</strong> Unscrew the hose from the faucet. Don't leave anything attached, including splitters, timers or quick-connect fittings.</li>` +
    `<li><strong>Drain the hose.</strong> Stretch it out on a slope so the water runs out, then coil it and store it in the garage or basement.</li>` +
    `<li><strong>Find the indoor shutoff valve.</strong> Most older outdoor faucets have a small valve on the pipe inside the basement or crawl space, close to where the pipe goes through the wall.</li>` +
    `<li><strong>Close the indoor valve.</strong> Turn it clockwise until it stops.</li>` +
    `<li><strong>Open the outdoor faucet.</strong> This lets the water left in the line drain out. Travelers recommends leaving outdoor faucets open through the cold months.</li>` +
    `<li><strong>Check for a bleeder cap.</strong> Some indoor valves have a small cap on the side. Put a bucket under it and open it to drain the last bit of water, then close it again.</li>` +
    `<li><strong>Add an insulated faucet cover.</strong> A foam cover is cheap and adds another layer of protection against wind.</li>` +
    `</ol>`,
  fig(
    'placeholder-indoor-shutoff-valve.webp',
    'Photo placeholder: indoor shutoff valve on the pipe feeding an outdoor faucet',
    '[PHOTO PLACEHOLDER] Indoor shutoff valve near where the pipe exits the wall.'
  ),
  `<p>Can't find the indoor valve? It's worth knowing where all your valves are before winter. Our guide to <a href="/knowledge-hub/where-is-my-main-shut-off-valve">finding your main shut-off valve</a> walks you through it.</p>`,

  `<h2>Do Frost-Free Hose Bibs Need to Be Winterized?</h2>`,
  `<p>Yes, frost-free hose bibs still need attention in the fall. They're designed to shut off water deeper inside the wall, where it's warmer, but they only work if the water can drain out of the faucet. A hose left attached traps that water, and it can freeze and burst the faucet anyway.</p>`,
  `<p>A frost-free hose bib (also called a frost-proof sillcock) is a long faucet. The handle is outside, but the actual valve sits several inches back inside your home's heated space. When you close it, the water left in the long body should drain out through the spout.</p>`,
  fig('placeholder-frost-free-hose-bib.webp', 'Photo placeholder: frost-free hose bib on an exterior wall', '[PHOTO PLACEHOLDER] Frost-free hose bib.'),
  `<p>That only happens if nothing is blocking the spout. Manufacturer <a href="https://www.woodfordmfg.com/woodford/Wall_Faucet_PDF/17CATALOG.pdf">Woodford's Model 17 specification sheet</a> says it plainly: the hose must be removed in freezing weather, or the faucet may freeze and burst.</p>`,
  `<p>So even with frost-free faucets, step one on the checklist stays the same. Take the hose off.</p>`,

  `<h2>How Do You Winterize a Lawn Irrigation System?</h2>`,
  `<p>To winterize a lawn irrigation system, shut off its water supply, then remove the water from the lines. That's done either by opening manual drain valves (if your system has them) or by blowing the lines out with compressed air. Any water left in the pipes can freeze and crack them.</p>`,
  `<p>Sprinkler lines are often shallow, and they're made of plastic pipe. <a href="https://www.hunterirrigation.com/winterizing-your-irrigation-system">Hunter Industries</a>, one of the largest irrigation manufacturers, warns that even after draining, some water can remain and "freeze, expand, and crack PVC piping."</p>`,
  `<p>There are two common methods:</p>`,
  `<ul>` +
    `<li><strong>Manual drain.</strong> This only works if your system was built with drain valves at the low points and pipe ends. You shut off the supply and open the drains so gravity empties the lines.</li>` +
    `<li><strong>Blow-out.</strong> An air compressor pushes the water out, one zone at a time. Hunter says the air pressure shouldn't exceed 50 psi for polyethylene pipe or 80 psi for PVC pipe.</li>` +
    `</ul>`,
  fig(
    'placeholder-irrigation-blowout.webp',
    'Photo placeholder: technician blowing out a lawn sprinkler system with compressed air',
    '[PHOTO PLACEHOLDER] Irrigation blow-out, one zone at a time.'
  ),
  `<p>A quick safety note: Hunter also warns that compressed air can cause serious injury, including eye injuries from flying debris, and recommends hiring a professional. If you've never done a blow-out before, this is a good job to hand off to an irrigation contractor.</p>`,
  `<p>One small leak matters, too. The <a href="https://www.epa.gov/watersense/fix-leak-week">EPA's WaterSense program</a> estimates that an irrigation leak just 1/32 of an inch wide can waste about 6,300 gallons of water per month. If you noticed soggy spots in the lawn this summer, mention it when you schedule winterization. For the repair side, see our guide on <a href="/knowledge-hub/how-to-repair-a-broken-sprinkler-pipe">how to repair a broken sprinkler pipe</a>.</p>`,

  `<h2>Don't Skip the Backflow Device</h2>`,
  `<p>Most in-ground sprinkler systems have a backflow preventer. It's the brass valve assembly that usually sits above ground near the house. Its job is to keep lawn water, fertilizer and anything else in the irrigation lines from flowing back into your drinking water.</p>`,
  fig(
    'placeholder-backflow-preventer.webp',
    'Photo placeholder: brass backflow preventer assembly above ground beside a house',
    '[PHOTO PLACEHOLDER] Backflow preventer.'
  ),
  `<p>This device has water inside it too, so it needs to be drained for winter. Hunter's guide says to open the backflow device's isolation valves and test cocks after the blow-out so leftover water can escape.</p>`,
  `<p>It's also a device with rules attached. In Chicago, the <a href="https://www.chicagoplumbingcode.com/chapter-18-29/article-3/18-29-312/">Plumbing Code (Section 18-29-312.9)</a> says pressure vacuum breaker assemblies and other testable backflow assemblies must be tested at least once a year by a licensed Cross Connection Control Device Inspector. Many suburbs have similar programs. <a href="https://www.naperville.il.us/services/water-utility/maintaining-our-system/cross-connection-control-program/">Naperville</a>, for example, requires backflow devices on residential in-ground sprinkler systems and annual inspection by a certified tester. Check with your village if you're not sure what applies to you.</p>`,

  `<h2>Signs Your Outdoor Plumbing Already Has a Problem</h2>`,
  `<p>Sometimes the damage happened last winter and nobody noticed. Look for these before you shut everything down:</p>`,
  `<ul>` +
    `<li><strong>Water dripping from the faucet when it's fully closed.</strong> The valve seat may be worn.</li>` +
    `<li><strong>Water leaking from the handle or the wall around the faucet.</strong> That can point to a crack in the faucet body.</li>` +
    `<li><strong>A damp spot on the basement wall or ceiling</strong> near where the outdoor faucet goes through.</li>` +
    `<li><strong>Low pressure</strong> from one outdoor faucet but not the others.</li>` +
    `<li><strong>Soggy patches in the lawn</strong> along a sprinkler line.</li>` +
    `</ul>`,
  `<p>A small drip now is easy to fix. The same drip after a hard freeze can turn into a split pipe and water damage. The <a href="https://www.iii.org/fact-statistic/facts-statistics-homeowners-and-renters-insurance">Insurance Information Institute</a> reports that water damage and freezing claims averaged $15,400 per claim from 2019 to 2023.</p>`,

  `<h2>Shut It Down Now, Thank Yourself in Spring</h2>`,
  `<p>Winterizing your outdoor plumbing comes down to three moves: get the hoses off, drain the outdoor faucets from the inside valve, and get the irrigation lines emptied before the first freeze. Do it in early to mid-October and you're ahead of the average first freeze across most of Chicagoland.</p>`,
  `<p>If you find a leak, a stuck valve or a faucet that won't stop dripping, let a pro handle it before the cold sets in. Our plumbers give you a flat rate before any work begins, so there are no surprises. Want someone checking your whole system twice a year? The <a href="/no-drip-club">No Drip Club</a> includes two maintenance visits with a whole home plumbing tune-up.</p>`,
  // (5) {{phone}}, never typed. (6) /contact → #schedule, absolute → relative.
  `<p>When you need a plumber in Chicagoland, Make a Good Call. Call <strong><a href="tel:{{phone}}">{{phone}}</a></strong> or <a href="#schedule">schedule service online</a>. You can also learn more about our <a href="/services/plumbing">plumbing services</a>.</p>`,
  // (3) "NEED AN EXPERT? MAKE A GOOD CALL. SCHEDULE NOW" dropped. (4) FAQ JSON-LD not imported.
].join('\n');

const V2 = {
  dek: DEK,
  byline_name: 'J. Blanton Plumbing',
  image_alt: 'Photo placeholder: outdoor hose bib on a brick wall with the garden hose disconnected',
  image_caption: '[PHOTO PLACEHOLDER] Hero: outdoor hose bib, hose disconnected, fall setting.',
  takeaways: [
    'Disconnect and drain every hose before the first freeze.',
    'Shut off the indoor valve that feeds each outdoor faucet, then open the faucet to drain it.',
    'Get your sprinkler system drained or blown out.',
    'It takes about an hour and helps you avoid a split pipe and a soaked basement wall next spring.',
  ],
  // No office and no service-area list ([[office-map]] renders nothing without one).
  office: '',
  service_area: '',
  service_area_label: '',
  faqs: [
    { q: 'When should I shut off my outdoor faucets in Chicago?', a: 'Aim for early to mid-October. The National Weather Service data reported by NBC Chicago puts the average first freeze for most of northern Illinois between October 11 and 20, and between October 27 and November 5 in Chicago and the immediate suburbs.' },
    { q: 'Can I leave my hose connected to a frost-free faucet?', a: 'No. A frost-free faucet needs to drain after you close it, and an attached hose traps water in the faucet. Woodford, a major manufacturer, states the hose must be removed in freezing weather or the faucet may freeze and burst.' },
    { q: 'Should I leave my outdoor faucet open or closed for winter?', a: 'Close the indoor valve that supplies the faucet, then leave the outdoor faucet open. That lets any water left in the line drain out instead of freezing. Travelers Insurance recommends keeping outdoor faucets open during the cold months.' },
    { q: 'Do I need to blow out my sprinkler system?', a: "If your system doesn't have manual drain valves, yes, a compressed-air blow-out is the usual way to clear the lines. Hunter Industries notes that leftover water can freeze and crack PVC pipe. Because compressed air can cause injury, it recommends hiring a professional." },
    { q: 'How do I know if my hose bib froze last winter?', a: 'Turn the faucet on and check inside. Water on the basement wall, a damp ceiling near the faucet or water leaking from the handle are common signs of a split. Low flow from just one faucet can also point to damage.' },
  ],
  components: [],
};

/** Brief 187 slugs (kh_terms): Plumbing Tips + Chicagoland (region), no secondary topics. */
const TERMS = { primary: 'plumbing-tips', secondary: [] as string[], locations: ['chicagoland'] };
/** Brief 188 hand-picks. A missing or unpublished one is skipped and reported (not a guard). */
const RELATED_WANTED = [
  'what-causes-pipes-to-burst',
  'prepare-your-home-plumbing-for-the-chicago-cold-snap',
  'how-to-repair-a-broken-sprinkler-pipe',
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

    // ── Related hand-picks: keep only the published ones, in the brief's order ──
    const rel = await c.query<{ slug: string; status: string }>(
      `SELECT slug, status FROM cms_articles WHERE slug = ANY($1::text[])`,
      [RELATED_WANTED]
    );
    const statusOf = new Map(rel.rows.map((r) => [r.slug, r.status]));
    const RELATED = RELATED_WANTED.filter((s) => statusOf.get(s) === 'published');
    const skipped = RELATED_WANTED.filter((s) => !RELATED.includes(s)).map((s) => `${s} (${statusOf.get(s) ?? 'missing'})`);

    // ── Build exactly what the editor saves / the publish writer stores ──
    const body = sanitizeCmsHtml(BODY);
    const v2 = sanitizeArticleV2Content(V2);
    const content = {
      title: TITLE,
      excerpt: DEK,
      body: BODY,
      image: `${IMG}/placeholder-hero.webp`,
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
    console.log(`  + related: ${k.n_rel} (${RELATED.join(', ')})${r.unknown.length ? ` — not found: ${r.unknown.join(', ')}` : ''}`);
    if (skipped.length) console.log(`  ! related skipped (missing or not published): ${skipped.join(', ')}`);
    console.log(`  + page_drafts "${VERSION_LABEL}": ${k.n_versions} version(s), ${k.n_live} published`);
    console.log(`  + faqs: ${v2.faqs.length}, takeaways: ${v2.takeaways.length}`);
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
    verdict(
      SCRIPT,
      'APPLIED',
      `created /knowledge-hub/${SLUG} (id ${id}) as an UNPUBLISHED Article V2 draft — review at /review/knowledge-hub/${SLUG}` +
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
