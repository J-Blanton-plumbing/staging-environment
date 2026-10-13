/**
 * Brief 207 — "Unclogs for Dogs in Deerfield: J. Blanton Plumbing Donates $5,000
 * and 56 Bags of Food to Orphans of the Storm", on the Article V2 template, as an
 * UNPUBLISHED draft for manager review with PLACEHOLDER images:
 *   /knowledge-hub/deerfield-animal-shelter-donation-orphans-of-the-storm          (404 until Publish)
 *   /review/knowledge-hub/deerfield-animal-shelter-donation-orphans-of-the-storm   (Basic Auth, Brief 195)
 *
 * The copy is VERBATIM from Marketing's .md
 * (`New Pages/Deerfield Orphans of the Storm Article/working-01-article-orphans-of-the-storm-deerfield.md`),
 * rebuilt as CMS content the way Briefs 195/198/199 rebuilt theirs:
 *   • body — rich text in the ARTICLE-BODY allow-list (sanitizeArticleBodyHtml,
 *     the publish writer's sanitizer);
 *   • v2   — subtitle, byline, hero alt/caption, key takeaways and FAQ.
 * The ONLY departures from the .md are the brief's seven allowed changes:
 *   1. the draft-notes blockquote ("Working article…", keywords, "CEO quotes are
 *      drafts…") is not imported;
 *   2. the TL;DR becomes the subtitle (its first sentence) + 2 key takeaways (the
 *      rest), and is not repeated in the body;
 *   3. the horizontal rules (`---`) are not imported;
 *   4. the unapproved Aizik Zimerman quote's paragraph starts with the literal
 *      "[DRAFT QUOTE] " (Brief 195) — Marketing deletes it in /admin before Publish;
 *   5. the phone is `{{phone}}` (no office → the main phone), never typed;
 *   6. every https://jblantonplumbing.com/… link is relative, and both "Schedule
 *      your service online" links (i.jblantonplumbing.com/clogs-for-dogs, a page
 *      that does not exist) are `#schedule` (the booking popup);
 *   7. the 5-item "ways to get involved" list stays a <ul> with its bold lead-ins.
 * The four images are "PHOTO PLACEHOLDER" graphics
 * (`scripts/make-brief-207-placeholders.ts`) that Marketing swaps in /admin
 * before publishing.
 *
 * ── CREATE-ONCE (Brief 186) ─────────────────────────────────────────────────
 * If an article with this slug exists, NOTHING is written: ALREADY-EXISTS,
 * exit 0. From then on editors own the article. Never updates or deletes.
 * ⚑ A later RENAME of this article must follow Brief 202 (CLAUDE.md gotcha 27):
 * this guard must then look the article up under BOTH slugs via
 * scripts/lib/renamed-article.ts, in the same deploy that renames it, or the
 * next deploy re-seeds a duplicate at the old slug.
 *
 * ── GUARDS ──────────────────────────────────────────────────────────────────
 * Content state → report NOT-APPLIED (guard tripped), write nothing, exit 0:
 *   • the `company-news` topic or the `chicagoland` location is missing;
 *   • a `deerfield` / `riverwoods` term exists but is NOT a location under
 *     `chicagoland` (a topic, a region, under Central Ohio…) — never a duplicate;
 *   • no cms_users row to author Version 1.
 * Schema fault → exit 1: the Brief 190 `template` / `v2` columns are missing.
 * A hand-picked related article that is missing or not published is skipped
 * and reported — that is not a guard.
 *
 * ── CITY TERMS (Brief 207 Track A, Marketing: tag both cities) ──────────────
 * `deerfield` and `riverwoods` already exist wherever Brief 187's migration ran
 * (both are registry cities). If one does not, it is CREATED in the same
 * transaction exactly the way Brief 187 created its city terms: a location
 * under `chicagoland`, registry name, registry_slug = slug, no intro, and
 * indexable = FALSE (the CMS "Show in Google" switch off).
 *
 * ── DRAFT THROUGH THE VERSION MODEL (Brief 159/195) ─────────────────────────
 * In ONE transaction: any missing city term, the live `cms_articles` row (status
 * DRAFT, template article-v2), its tags and hand-picked related articles, and
 * ONE `page_drafts` row "Version 1 — for review" with is_published = FALSE whose
 * content is the payload the editor saves. The label is deliberately NOT Brief
 * 159's "Version 1 — live", so datePublished becomes the time Marketing clicks
 * Publish. Never touches global_settings.
 *
 * Needs an explicit mode (Brief 147): `commit` applies; `--dry-run` previews.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/seed-brief-207-deerfield-orphans-of-the-storm.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';
import { sanitizeArticleV2Content } from '../src/lib/cms/article-v2-sanitize';
import { writeArticleRelated, writeArticleTerms } from '../src/lib/cms/kh-taxonomy';
import { CHICAGOLAND_CITIES } from '../src/lib/content/locations-regions';

const SCRIPT = 'seed-brief-207-deerfield-orphans-of-the-storm';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

export const SLUG = 'deerfield-animal-shelter-donation-orphans-of-the-storm';
export const VERSION_LABEL = 'Version 1 — for review';
export const IMG = '/images/knowledge-hub/deerfield-orphans-of-the-storm';

export const TITLE = 'Unclogs for Dogs in Deerfield: J. Blanton Plumbing Donates $5,000 and 56 Bags of Food to Orphans of the Storm';
export const META_TITLE = 'Unclogs for Dogs: Deerfield Animal Shelter Donation';
export const DEK =
  'J. Blanton Plumbing donated 56 bags of pet food and $5,000 to Orphans of the Storm, the Deerfield animal shelter that has cared for lost and abandoned pets since 1928.';
export const META_DESCRIPTION =
  "J. Blanton Plumbing donated 56 bags of pet food and $5,000 to Orphans of the Storm, Deerfield's animal shelter since 1928, through Unclogs for Dogs.";

const LAUNCH_STORY = 'unclog-your-drain-fill-a-dogs-bowl-j-blanton-plumbing-launches-unclogs-for-dogs-charity-campaign';

/** Brief 195/198 in-article photo shape, plus the placeholder caption. */
const fig = (file: string, alt: string, caption: string) =>
  `<figure><img src="${IMG}/${file}" alt="${alt}" width="1100" height="654" loading="lazy"><figcaption>${caption}</figcaption></figure>`;

export const BODY = [
  // (1) draft-notes blockquote not imported. (2) The TL;DR is the subtitle + key takeaways; the body starts here.
  `<p>Every day, our plumbers walk into homes across the North Shore. A lot of those homes have a dog at the door waiting to say hello. So when it came time to pick partners for Unclogs for Dogs, a Deerfield animal shelter donation was an easy call to make.</p>`,
  `<p>This fall, J. Blanton Plumbing gave <strong>56 bags of food and a $5,000 monetary donation</strong> to Orphans of the Storm. The shelter has been part of this community for nearly a century, and it takes in dogs and cats that have nowhere else to go.</p>`,
  `<p>The timing matters. Shelters across the country are still busy, and pets are staying longer before they find a home. Food and funding go a long way when every kennel is full.</p>`,
  `<p>Here's what we donated, why we chose Orphans of the Storm, and how Deerfield neighbors can help.</p>`,

  `<h2>What Did J. Blanton Plumbing Donate to Orphans of the Storm?</h2>`,
  `<p>J. Blanton Plumbing donated 56 bags of food and $5,000 to Orphans of the Storm in Deerfield as part of its Unclogs for Dogs campaign. The food goes straight into bowls. The money helps the shelter cover daily costs like medical care, housing, and adoption support.</p>`,
  fig(
    'placeholder-donation-handoff.webp',
    'Photo placeholder: J. Blanton Plumbing handing bags of pet food and a donation check to Orphans of the Storm staff',
    '[PHOTO PLACEHOLDER] The 56 bags of food and the $5,000 donation.'
  ),
  `<p>We wanted this donation to do two jobs at once. The food helps right now. The funding helps the shelter plan for what comes next, whether that's a vet bill or a new arrival that needs extra care.</p>`,
  // (4) Unapproved CEO quote: Brief 195's literal label leads the paragraph; the rest is verbatim.
  `<p>[DRAFT QUOTE] "Our technicians are in and out of homes every day," said Aizik Zimerman, CEO of J. Blanton Plumbing. "Orphans of the Storm has been taking care of Deerfield's animals for almost 100 years. Helping them keep bowls full is the least we can do for a neighbor like that."</p>`,

  `<h2>Who Is Orphans of the Storm?</h2>`,
  `<p>Orphans of the Storm is a Deerfield-area animal shelter founded in 1928 by silent film star Irene Castle. It takes in orphaned, abandoned, abused, and neglected dogs and cats, gives them medical care, and places them in adoptive homes. It has found homes for nearly 150,000 pets.</p>`,
  `<p>According to the <a href="https://orphansofthestorm.org/about/history">shelter's own history</a>, the main campus sits on nine wooded acres on Riverwoods Road. It has three dog wings with outdoor access, a small on-site clinic, a dog enrichment park, and a nature trail. The shelter also runs a foster program and a Pet Showcase adoption spot in Vernon Hills.</p>`,
  fig(
    'placeholder-shelter-campus.webp',
    'Photo placeholder: Orphans of the Storm shelter campus in Riverwoods',
    '[PHOTO PLACEHOLDER] Orphans of the Storm, on Riverwoods Road.'
  ),
  // (6) jblantonplumbing.com links → relative.
  `<p>That kind of history is rare. In 2023, the <a href="https://www.riverwoods.gov/rc/page/history-your-backyard-orphans-storm-prepares-celebrate-95-years">Village of Riverwoods marked the shelter's 95th anniversary</a> as a piece of local history in its own backyard. For many families in <a href="/deerfield">Deerfield</a> and <a href="/riverwoods">Riverwoods</a>, this is where their dog or cat came from.</p>`,

  `<h2>What Is Unclogs for Dogs?</h2>`,
  `<p>Unclogs for Dogs is J. Blanton Plumbing's community campaign that connects drain service to donations for local animal shelters. It launched in 2025, when every qualifying drain unclogging booked during the campaign meant 10 pounds of dog food for shelter animals.</p>`,
  `<p>You can read about the first edition in our <a href="/knowledge-hub/${LAUNCH_STORY}">Unclogs for Dogs launch story</a>. The idea is simple. We fix <a href="/services/drain">clogged drains</a> all day. Our customers help us turn that work into food and funding for animals who need it.</p>`,
  fig(
    'placeholder-unclogs-for-dogs.webp',
    "Photo placeholder: J. Blanton Plumbing technician with a customer's dog",
    '[PHOTO PLACEHOLDER] Unclogs for Dogs.'
  ),
  `<p>This year, we're putting names and faces on that promise. Instead of "local shelters," we're working with specific partners in the communities we serve. Orphans of the Storm in Deerfield is one of them.</p>`,

  `<h2>Why Do Local Animal Shelters Need Help Right Now?</h2>`,
  `<p>Shelters still take in millions of animals each year, and pets are staying longer before adoption. That means more meals, more vet care, and more space needed for every animal. Steady local support helps shelters keep up without turning animals away.</p>`,
  `<p><a href="https://www.shelteranimalscount.org/shelter-animals-count-releases-2025-annual-data-report-marking-10-years-of-national-sheltering-data/">Shelter Animals Count's 2025 report</a> found that about 5.8 million dogs and cats entered U.S. shelters and rescues in 2025. Intake dropped a little, but the report also notes that pets are staying in shelters longer.</p>`,
  `<p>There's good progress too. The <a href="https://www.aspca.org/helping-people-pets/shelter-intake-and-surrender/pet-statistics">ASPCA's shelter statistics</a> show about 2 million dogs were adopted in 2025. Progress like that depends on shelters having the food, staff, and care to get each animal ready for a new home.</p>`,

  `<h2>How Can Deerfield Neighbors Help Shelter Animals?</h2>`,
  `<p>Deerfield residents can help by adopting, fostering, volunteering, or donating directly to Orphans of the Storm. Even small gifts of food or supplies make a difference. Sharing adoptable pets on social media also helps animals find homes faster.</p>`,
  `<p>Here are a few easy ways to get involved:</p>`,
  // (7) Stays a <ul>, bold lead-ins kept. (6) i.jblantonplumbing.com/clogs-for-dogs → #schedule.
  `<ul>` +
    `<li><strong>Book an Unclogs for Dogs service.</strong> Unclog your drains for $93 and get a free sewer camera inspection. <a href="#schedule">Schedule your service online</a>.</li>` +
    `<li><strong>Visit and adopt.</strong> The shelter is open to the public Wednesday through Sunday. Check its website for current hours.</li>` +
    `<li><strong>Foster.</strong> A short stay in a home gives a shelter pet a break and frees up space.</li>` +
    `<li><strong>Donate.</strong> Food, supplies, and funding all help.</li>` +
    `<li><strong>Share.</strong> Post an adoptable pet. You never know who's looking.</li>` +
    `</ul>`,

  `<h2>Conclusion</h2>`,
  `<p>Orphans of the Storm has been looking out for Deerfield's animals since 1928. With 56 bags of food and $5,000, J. Blanton Plumbing is proud to help them keep going. This is what Unclogs for Dogs is about: doing what we do best, and giving back to the neighbors (two-legged and four-legged) who make this community home.</p>`,
  // (5) {{phone}}, never typed (Brief 198 format). (6) → #schedule.
  `<p>Want to help while you take care of your home? Unclog your drains for $93 and get a free sewer camera inspection. <a href="#schedule">Schedule your service online</a>, or call <strong><a href="tel:{{phone}}">{{phone}}</a></strong> any time, day or night. Make a Good Call.</p>`,
  // (3) Horizontal rules not imported. The FAQ is v2.faqs, not body copy.
].join('\n');

export const V2 = {
  dek: DEK,
  byline_name: 'J. Blanton Plumbing',
  image_alt: 'Photo placeholder: J. Blanton Plumbing team delivering bags of pet food to Orphans of the Storm',
  image_caption: '[PHOTO PLACEHOLDER] Hero: J. Blanton team with the food donation at Orphans of the Storm.',
  // (2) The TL;DR's remaining sentences, verbatim.
  takeaways: [
    'The donation is part of Unclogs for Dogs, our campaign that turns everyday drain work into support for local shelter animals.',
    'Want to help too? Unclog your drains for $93, get a free sewer camera inspection, and support local shelter animals.',
  ],
  // No office in Deerfield and no service-area list ([[office-map]] is deliberately not placed).
  office: '',
  service_area: '',
  service_area_label: '',
  faqs: [
    { q: 'What did J. Blanton Plumbing donate to Orphans of the Storm?', a: "J. Blanton Plumbing donated 56 bags of food and $5,000 to Orphans of the Storm in Deerfield. The donation is part of the company's Unclogs for Dogs campaign, which supports local animal shelters across Chicagoland." },
    { q: 'Where is Orphans of the Storm located?', a: 'Orphans of the Storm is at 2200 Riverwoods Road in the Deerfield area (Riverwoods), about a mile and a half off I-94. It also has a Pet Showcase adoption location in Vernon Hills.' },
    { q: 'How old is Orphans of the Storm?', a: 'The shelter was founded in 1928 by silent film star Irene Castle. It has helped nearly 150,000 pets find homes since then.' },
    { q: 'What is Unclogs for Dogs?', a: "Unclogs for Dogs is J. Blanton Plumbing's community campaign that connects drain service to donations for local animal shelters. It launched in 2025 and now supports named partner shelters in the communities the company serves." },
    { q: 'How can I help Orphans of the Storm?', a: "You can adopt, foster, volunteer, or donate directly through the shelter's website. Sharing adoptable pets online also helps animals find homes faster." },
  ],
  components: [],
};

/** Brief 187 slugs (kh_terms): Company News (the Brief 195 topic) + Chicagoland (region) + both cities. */
export const PRIMARY_TOPIC = 'company-news';
export const REGION = 'chicagoland';
export const CITIES = ['deerfield', 'riverwoods'] as const;
export const TERMS = { primary: PRIMARY_TOPIC, secondary: [] as string[], locations: [REGION, ...CITIES] };
/** Brief 188 hand-picks. A missing or unpublished one is skipped and reported (not a guard). */
export const RELATED_WANTED = [LAUNCH_STORY];
/** Name fallback for a city missing from the registry list (it is in it today). */
const CITY_NAME_FALLBACK: Record<(typeof CITIES)[number], string> = { deerfield: 'Deerfield', riverwoods: 'Riverwoods' };

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
    image: `${IMG}/placeholder-hero.webp`,
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

    // Missing city terms: Brief 187's convention (registry name, registry_slug = slug, no intro,
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

// Run only as a script (a later update script may import buildSeedContent and the constants, as Brief 203 does for 199).
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
