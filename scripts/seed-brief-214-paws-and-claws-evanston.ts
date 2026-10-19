/**
 * Brief 214 — "Unclogs for Dogs in Evanston: $5,000 and a Rally for Rescues
 * Sponsorship for Paws and Claws", on the Article V2 template, as an UNPUBLISHED
 * draft for manager review, with the one supplied hero photo:
 *   /knowledge-hub/evanston-animal-rescue-donation-paws-and-claws          (404 until Publish)
 *   /review/knowledge-hub/evanston-animal-rescue-donation-paws-and-claws   (Basic Auth, Brief 195)
 *
 * The copy is VERBATIM from Marketing's .md
 * (`New Pages/Paws and Claws Evanston Article/03-article-paws-and-claws-evanston.md`),
 * rebuilt as CMS content the way Brief 207 rebuilt its own:
 *   • body — rich text in the ARTICLE-BODY allow-list (sanitizeArticleBodyHtml,
 *     the publish writer's sanitizer). No images in the body;
 *   • v2   — subtitle, byline, hero alt, key takeaways and FAQ. The hero is the
 *     article `image` (public/images/knowledge-hub/paws-and-claws-evanston/hero.webp).
 * The ONLY departures from the .md are the brief's seven allowed changes:
 *   1. the draft-notes blockquote ("Working article…", keywords, "CEO quotes are
 *      drafts…") is not imported;
 *   2. the subtitle line becomes v2.dek, and the TL;DR becomes the 3 key
 *      takeaways; neither is repeated in the body;
 *   3. the horizontal rules (`---`) are not imported;
 *   4. the unapproved Aizik Zimerman quote's paragraph starts with the literal
 *      "[DRAFT QUOTE] " (Brief 195) — Marketing deletes it in /admin before Publish;
 *   5. the phone is `{{phone}}` (no office → the main phone), never typed;
 *   6. every https://jblantonplumbing.com/… link is relative (/evanston, the launch
 *      story), and both "Schedule your service online" links
 *      (i.jblantonplumbing.com/clogs-for-dogs, a page that does not exist) are
 *      `#schedule` (the booking popup);
 *   7. the 4-item "Ways to pitch in" list stays a <ul> with its bold lead-ins.
 *
 * ── CREATE-ONCE (Brief 186) ─────────────────────────────────────────────────
 * If an article with this slug exists, NOTHING is written: ALREADY-EXISTS,
 * exit 0. From then on editors own the article. Never updates or deletes.
 * ⚑ A later RENAME of this article must follow Brief 202 (CLAUDE.md gotcha 27):
 * this guard must then look the article up under BOTH slugs via
 * scripts/lib/renamed-article.ts, in the same deploy that renames it.
 *
 * ── GUARDS ──────────────────────────────────────────────────────────────────
 * Content state → report NOT-APPLIED (guard tripped), write nothing, exit 0:
 *   • the `company-news` topic or the `chicagoland` location is missing;
 *   • an `evanston` term exists but is NOT a location under `chicagoland`
 *     (a topic, a region, under Central Ohio…) — never a duplicate;
 *   • no cms_users row to author Version 1.
 * Schema fault → exit 1: the Brief 190 `template` / `v2` columns are missing.
 * A hand-picked related article that is missing or not published is skipped
 * and reported — that is not a guard.
 *
 * ── CITY TERMS (Brief 207 precedent) ────────────────────────────────────────
 * `evanston` already exists under `chicagoland` (Brief 187's migration). If it
 * does not, it is CREATED in the same transaction exactly as Brief 187 creates
 * its city terms: a location under `chicagoland`, registry name, registry_slug
 * = slug, no intro, indexable = FALSE ("Show in Google" off).
 *
 * ── DRAFT THROUGH THE VERSION MODEL (Brief 159/195) ─────────────────────────
 * In ONE transaction: any missing city term, the live `cms_articles` row (status
 * DRAFT, template article-v2), its tags and hand-picked related articles, and
 * ONE `page_drafts` row "Version 1 — for review" with is_published = FALSE whose
 * content is the payload the editor saves. datePublished becomes the time
 * Marketing clicks Publish. Never touches global_settings.
 *
 * Needs an explicit mode (Brief 147): `commit` applies; `--dry-run` previews.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/seed-brief-214-paws-and-claws-evanston.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';
import { sanitizeArticleV2Content } from '../src/lib/cms/article-v2-sanitize';
import { writeArticleRelated, writeArticleTerms } from '../src/lib/cms/kh-taxonomy';
import { CHICAGOLAND_CITIES } from '../src/lib/content/locations-regions';

const SCRIPT = 'seed-brief-214-paws-and-claws-evanston';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

export const SLUG = 'evanston-animal-rescue-donation-paws-and-claws';
export const VERSION_LABEL = 'Version 1 — for review';
export const HERO = '/images/knowledge-hub/paws-and-claws-evanston/hero.webp';

export const TITLE = 'Unclogs for Dogs in Evanston: $5,000 and a Rally for Rescues Sponsorship for Paws and Claws';
export const META_TITLE = 'Evanston Animal Rescue Donation: Paws and Claws';
export const DEK =
  "The Evanston cat rescue has saved nearly 900 at-risk cats. Here's why our dog-named campaign went all in on cats, and what happened at Baker Park.";
export const META_DESCRIPTION =
  'J. Blanton Plumbing donated $5,000 to Paws and Claws Cat Rescue in Evanston and sponsored Rally for Rescues through its Unclogs for Dogs campaign.';

const LAUNCH_STORY = 'unclog-your-drain-fill-a-dogs-bowl-j-blanton-plumbing-launches-unclogs-for-dogs-charity-campaign';
/** Brief 214 hand-pick #2. Unpublished today (Brief 207 draft) → skipped and reported. */
const DEERFIELD_STORY = 'deerfield-animal-shelter-donation-orphans-of-the-storm';

export const BODY = [
  // (1) draft-notes blockquote not imported. (2) Subtitle + TL;DR live in v2; the body starts here. (3) no <hr>.
  `<p>Our campaign is called Unclogs for Dogs. So why did our Evanston animal rescue donation go to a cat rescue?</p>`,
  `<p>Because the goal was never just dogs. The goal is local animals who need a hand, in the towns where we work. In Evanston, one of the groups doing that work best is Paws and Claws Cat Rescue.</p>`,
  `<p>This month, J. Blanton Plumbing gave <strong>$5,000</strong> to Paws and Claws and sponsored <strong>Rally for Rescues</strong>, the rescue's yearly community fundraiser. On Saturday, October 17, we joined Paws and Claws and many other local vendors at Baker Park for an afternoon of fun, food, and cats looking for homes.</p>`,
  `<p>Here's what we gave, why we picked Paws and Claws, and how Evanston neighbors can keep helping.</p>`,

  `<h2>What Did J. Blanton Plumbing Give to Paws and Claws?</h2>`,
  `<p>J. Blanton Plumbing donated $5,000 to Paws and Claws Cat Rescue in Evanston and sponsored its Rally for Rescues fundraiser as part of the Unclogs for Dogs campaign. The funds help the rescue cover vet care, food, litter, and the daily costs of caring for cats until they're adopted.</p>`,
  `<p>For a small, donor-funded rescue, a gift like this can cover a lot of exams, vaccines, and meals.</p>`,
  `<p>Paws and Claws shared its thanks on Instagram the day before the event. The post thanked J. Blanton Plumbing for sponsoring Rally for Rescues and "giving a gift in support of our mission."</p>`,
  // (4) Unapproved CEO quote: Brief 195's literal label leads the paragraph; the rest is verbatim.
  `<p>[DRAFT QUOTE] "Unclogs for Dogs has 'dogs' in the name, but it's really about the animals in our own neighborhoods," said Aizik Zimerman, CEO of J. Blanton Plumbing. "Paws and Claws saves cats that a lot of people overlook. We're proud to help them keep doing it in Evanston."</p>`,

  `<h2>What Was Rally for Rescues?</h2>`,
  `<p>Rally for Rescues is Paws and Claws Cat Rescue's annual community fundraiser at Baker Park in Evanston. The 2026 edition took place on Saturday, October 17, from 12 to 3 pm. J. Blanton Plumbing was a sponsor and joined the rescue and many other local vendors at the event.</p>`,
  `<p>The rally has become a local tradition. In past years, <a href="https://www.evanstonian.net/news/2024/10/11/annual-rally-for-rescues-event-community-kittens-and-a-worthy-cause/">The Evanstonian described</a> families gathering under tents on the lawn, live music, and kittens to meet. Entry fees go toward the cats' medical care and the rescue's foster program.</p>`,
  `<p>For us, it was a chance to meet our Evanston neighbors outside of a service call. As Paws and Claws put it in its post: "Together we are saving lives and building community."</p>`,

  `<h2>Who Is Paws and Claws Cat Rescue?</h2>`,
  `<p>Paws and Claws Cat Rescue is an Evanston nonprofit that rescues cats at risk of euthanasia, especially black cats, tabbies, and shy older cats. It started in 2020 as a foster-based program and opened an adoption center at 829 Chicago Avenue in 2023. It has rescued nearly 900 cats from six states.</p>`,
  `<p>That's according to a <a href="https://www.evanstonian.net/feature/2026/01/23/paws-and-claws-volunteers-form-cat-loving-community/">January 2026 profile in The Evanstonian</a>, which also describes the rescue's storefront window, where people walking by can see adoptable cats. The rescue was founded by executive director Ashlynn Boyce.</p>`,
  `<p>Paws and Claws is also a community hub. Volunteers sign up for feeding and cleaning shifts, and the rescue hosts events like cat yoga and craft nights.</p>`,

  `<h2>Why Is a Campaign Called Unclogs for Dogs Helping Cats?</h2>`,
  `<p>Unclogs for Dogs is J. Blanton Plumbing's campaign to support local shelter animals through its drain service. Dogs gave the campaign its name, but the mission is local animals in need. In Evanston, that need is strongest at a cat rescue, so that's where our support went.</p>`,
  `<p>The campaign launched in 2025. Back then, every qualifying drain unclogging booked during the campaign meant 10 pounds of dog food for shelters. You can read about it in our <a href="/knowledge-hub/${LAUNCH_STORY}">Unclogs for Dogs launch story</a>.</p>`,
  `<p>This year, we're naming our partners and picking the groups that do the most good in each community. Paws and Claws is our Evanston partner.</p>`,

  `<h2>Why Do Small Rescues Like Paws and Claws Need Local Support?</h2>`,
  `<p>Small rescues like Paws and Claws rely mostly on local donors, not big public budgets. When local giving drops, rescues have less room to take in at-risk animals. A steady base of community support helps them keep their doors open and their intake going.</p>`,
  `<p>The Evanstonian reported that donations to Paws and Claws fell in 2025 as many residents faced financial uncertainty. That's a tough spot for a rescue that takes in cats other shelters may not be able to keep.</p>`,
  `<p>The national picture shows why this work matters. The <a href="https://www.aspca.org/helping-people-pets/shelter-intake-and-surrender/pet-statistics">ASPCA's shelter statistics</a> estimate that about 3 million cats entered U.S. shelters and rescues in 2025. <a href="https://www.shelteranimalscount.org/shelter-animals-count-releases-2025-annual-data-report-marking-10-years-of-national-sheltering-data/">Shelter Animals Count</a> also found that non-live outcomes for cats rose 4% last year, even as they fell for dogs.</p>`,

  `<h2>How Can Evanston Neighbors Keep Helping?</h2>`,
  `<p>The easiest way to help is to book an Unclogs for Dogs service: unclog your drains for $93 and get a free sewer camera inspection. Your home gets taken care of, and you support local shelter animals at the same time. You can also visit Paws and Claws directly to adopt or volunteer.</p>`,
  `<p>Ways to pitch in:</p>`,
  // (7) Stays a <ul>, bold lead-ins kept. (6) i.jblantonplumbing.com/clogs-for-dogs → #schedule.
  `<ul>` +
    `<li><strong>Book an Unclogs for Dogs service.</strong> Unclog your drains for $93 and get a free sewer camera inspection. <a href="#schedule">Schedule your service online</a>.</li>` +
    `<li><strong>Visit and adopt.</strong> Stop by the Paws and Claws adoption center on Chicago Avenue.</li>` +
    `<li><strong>Volunteer.</strong> Volunteers 18 and older can sign up for feeding or cleaning shifts.</li>` +
    `<li><strong>Mark your calendar.</strong> Rally for Rescues happens every year at Baker Park.</li>` +
    `</ul>`,

  `<h2>Conclusion</h2>`,
  `<p>Paws and Claws gives Evanston's most overlooked cats a real shot at a home. Our $5,000 donation and Rally for Rescues sponsorship are a way to say thank you, and to help close the gap left by a tough year for local giving. Unclogs for Dogs started with dogs, but it was always about neighbors helping neighbors.</p>`,
  // (5) {{phone}}, never typed (Brief 207 format). (6) /evanston relative; → #schedule.
  `<p>Want to help while you take care of your home? Unclog your drains for $93 and get a free sewer camera inspection in <a href="/evanston">Evanston</a>. <a href="#schedule">Schedule your service online</a>, or call <strong><a href="tel:{{phone}}">{{phone}}</a></strong> any time, day or night. Make a Good Call.</p>`,
].join('\n');

export const V2 = {
  dek: DEK,
  byline_name: 'J. Blanton Plumbing',
  // The one image on the article. No caption (Brief 213 precedent).
  image_alt: 'J. Blanton Plumbing team presenting a $5,000 donation check to Paws and Claws Cat Rescue staff at the Evanston adoption center',
  image_caption: '',
  // (2) The TL;DR, split into 3, verbatim.
  takeaways: [
    'J. Blanton Plumbing donated $5,000 to Paws and Claws Cat Rescue, an Evanston nonprofit that has saved nearly 900 at-risk cats.',
    "We also sponsored Rally for Rescues, the rescue's annual fundraiser at Baker Park on October 17.",
    "It's all part of Unclogs for Dogs, our campaign that turns drain service into support for local shelter animals. Yes, the name says dogs. In Evanston, the animals who need us are cats.",
  ],
  // No office and no service-area list ([[office-map]] is deliberately not placed).
  office: '',
  service_area: '',
  service_area_label: '',
  faqs: [
    { q: 'What did J. Blanton Plumbing give to Paws and Claws?', a: "J. Blanton Plumbing donated $5,000 to Paws and Claws Cat Rescue in Evanston and sponsored its Rally for Rescues fundraiser. Both are part of the company's Unclogs for Dogs campaign, which supports local animal shelters and rescues." },
    { q: 'What is Rally for Rescues?', a: "Rally for Rescues is Paws and Claws Cat Rescue's annual fundraiser at Baker Park in Evanston. The 2026 event took place on Saturday, October 17, from 12 to 3 pm, with J. Blanton Plumbing as a sponsor." },
    { q: 'Why is Unclogs for Dogs supporting a cat rescue?', a: 'The campaign is named for dogs, but its goal is helping local animals in need in the communities J. Blanton Plumbing serves. In Evanston, Paws and Claws Cat Rescue does that work for at-risk cats.' },
    { q: 'Where is Paws and Claws Cat Rescue located?', a: 'Paws and Claws runs an adoption center at 829 Chicago Avenue in southeast Evanston. The rescue started as a foster program in 2020 and opened the center in 2023.' },
    { q: 'How can I support Unclogs for Dogs?', a: 'Book an Unclogs for Dogs service with J. Blanton Plumbing: unclog your drains for $93 and get a free sewer camera inspection. You can schedule online or call <strong><a href="tel:{{phone}}">{{phone}}</a></strong> any time.' },
  ],
  components: [],
};

/** Brief 187 slugs (kh_terms): Company News (the Brief 195 topic) + Chicagoland (region) + the city. */
export const PRIMARY_TOPIC = 'company-news';
export const REGION = 'chicagoland';
export const CITIES = ['evanston'] as const;
export const TERMS = { primary: PRIMARY_TOPIC, secondary: [] as string[], locations: [REGION, ...CITIES] };
/** Brief 188 hand-picks, in the brief's order. A missing or unpublished one is skipped and reported (not a guard). */
export const RELATED_WANTED = [LAUNCH_STORY, DEERFIELD_STORY];
/** Name fallback for a city missing from the registry list (it is in it today). */
const CITY_NAME_FALLBACK: Record<(typeof CITIES)[number], string> = { evanston: 'Evanston' };

/**
 * The version content the seed writes for "Version 1 — for review" (key order
 * included), i.e. exactly the payload the editor saves: sanitized body,
 * sanitized v2. `related` is the hand-picks that survived the published-only filter.
 */
export function buildSeedContent(related: string[]) {
  return {
    title: TITLE,
    excerpt: DEK,
    body: sanitizeArticleBodyHtml(BODY),
    image: HERO,
    terms: TERMS,
    related,
    template: 'article-v2',
    v2: sanitizeArticleV2Content(V2),
    metaTitle: META_TITLE,
    metaDescription: META_DESCRIPTION,
  };
}

function banner(lines: string[]) {
  console.log('\n' + '!'.repeat(72));
  for (const l of lines) console.log(`${SCRIPT}: ${l}`);
  console.log('!'.repeat(72) + '\n');
}

async function main(pool: Pool) {
  const mode = resolveRunMode(SCRIPT);
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
    const existing = await c.query<{ id: number; slug: string; status: string; template: string }>(
      `SELECT id, slug, status, template FROM cms_articles WHERE slug = $1 ORDER BY id`,
      [SLUG]
    );
    if (existing.rows[0]) {
      const r = existing.rows[0];
      console.log(`ALREADY-EXISTS: id ${r.id} /${r.slug} (${r.status}, template ${r.template}) — editor-owned, nothing written.`);
      verdict(SCRIPT, 'ALREADY-APPLIED', `ALREADY-EXISTS — id ${r.id} /${r.slug} (${r.status}), left untouched`);
      return;
    }

    // ── Guards: content state → report and stop, exit 0 ──
    const problems: string[] = [];
    const base = await c.query<{ id: number; type: string; slug: string; parent_id: number | null }>(
      `SELECT id, type, slug, parent_id FROM kh_terms WHERE (type = 'topic' AND slug = $1) OR (type = 'location' AND slug = $2)`,
      [PRIMARY_TOPIC, REGION]
    );
    if (!base.rows.some((t) => t.type === 'topic' && t.slug === PRIMARY_TOPIC)) problems.push(`kh_terms topic "${PRIMARY_TOPIC}" missing`);
    const region = base.rows.find((t) => t.type === 'location' && t.slug === REGION);
    if (!region) problems.push(`kh_terms location "${REGION}" missing`);

    // Every term carrying a city slug, of ANY type (UNIQUE is per (type, slug), so a topic can share it).
    const cityRows = await c.query<{ id: number; type: string; slug: string; parent_id: number | null; parent_slug: string | null }>(
      `SELECT t.id, t.type, t.slug, t.parent_id, p.slug AS parent_slug
         FROM kh_terms t LEFT JOIN kh_terms p ON p.id = t.parent_id
        WHERE t.slug = ANY($1::text[]) ORDER BY t.id`,
      [[...CITIES]]
    );
    const toCreate: string[] = [];
    const cityState: string[] = [];
    for (const slug of CITIES) {
      const rows = cityRows.rows.filter((r) => r.slug === slug);
      const wrong = rows.filter((r) => !(r.type === 'location' && region && r.parent_id === region.id));
      if (wrong.length) {
        for (const w of wrong) {
          problems.push(`kh_terms "${slug}" (id ${w.id}) is a ${w.type}${w.parent_slug ? ` under "${w.parent_slug}"` : ' with no parent'}, not a location under "${REGION}" — not creating a duplicate`);
        }
      } else if (rows.length) {
        cityState.push(`${slug} (existing, id ${rows[0].id})`);
      } else {
        toCreate.push(slug);
      }
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
    const content = buildSeedContent(RELATED);
    const body = content.body;
    const v2 = content.v2;

    await c.query('BEGIN');

    // Missing city term: Brief 187's convention (registry name, registry_slug = slug, no intro,
    // indexable = FALSE i.e. "Show in Google" off, sort_order = position in the region's city list).
    for (const slug of toCreate) {
      const idx = CHICAGOLAND_CITIES.findIndex((x) => x.slug === slug);
      const name = idx >= 0 ? CHICAGOLAND_CITIES[idx].name : CITY_NAME_FALLBACK[slug as (typeof CITIES)[number]];
      const sortOrder =
        idx >= 0
          ? idx + 1
          : Number((await c.query<{ n: number }>(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM kh_terms WHERE parent_id = $1`, [region!.id])).rows[0].n);
      const ins = await c.query<{ id: number }>(
        `INSERT INTO kh_terms (type, slug, name, parent_id, registry_slug, indexable, sort_order)
         VALUES ('location', $1, $2, $3, $1, FALSE, $4) RETURNING id`,
        [slug, name, region!.id, sortOrder]
      );
      cityState.push(`${slug} (CREATED, id ${ins.rows[0].id}, "${name}", Show in Google off)`);
    }

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
    console.log(`  + cms_articles id ${id}: ${k.status}, template ${k.template}, no office`);
    console.log(`  + city terms: ${cityState.join('; ')}`);
    console.log(`  + tags: ${k.n_terms} (${TERMS.primary}; ${TERMS.locations.join(', ')})${t.unknown.length ? ` — unknown: ${t.unknown.join(', ')}` : ''}`);
    console.log(`  + related: ${k.n_rel} (${RELATED.join(', ') || 'none'})${r.unknown.length ? ` — not found: ${r.unknown.join(', ')}` : ''}`);
    if (skipped.length) console.log(`  ! related skipped (missing or not published): ${skipped.join(', ')}`);
    console.log(`  + page_drafts "${VERSION_LABEL}": ${k.n_versions} version(s), ${k.n_live} published`);
    console.log(`  + faqs: ${v2.faqs.length}, takeaways: ${v2.takeaways.length}`);
    if (
      k.status !== 'draft' || k.template !== 'article-v2' || k.n_versions !== '1' || k.n_live !== '0' ||
      Number(k.n_terms) !== 1 + TERMS.locations.length || t.unknown.length > 0
    ) {
      throw new Error('post-write verification failed for the row this run created');
    }

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would create /knowledge-hub/${SLUG} as a draft; city terms: ${cityState.join('; ')}`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(
      SCRIPT,
      'APPLIED',
      `created /knowledge-hub/${SLUG} (id ${id}) as an UNPUBLISHED Article V2 draft — review at /review/knowledge-hub/${SLUG}` +
        `; city terms: ${cityState.join('; ')}` +
        (skipped.length ? `; related skipped: ${skipped.join(', ')}` : '')
    );
  } catch (err) {
    if (!committed) await c.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}

// Run only as a script.
if (require.main === module) {
  const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });
  main(pool)
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
}
