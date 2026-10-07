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
import { writeArticleRelated, writeArticleTerms } from '../src/lib/cms/kh-taxonomy';
// Brief 201: the copy and constants moved, byte for byte, to scripts/lib/ so the
// Brief 201 update script can rebuild this exact payload. Behaviour unchanged.
import {
  SLUG,
  VERSION_LABEL,
  TITLE,
  META_TITLE,
  DEK,
  META_DESCRIPTION,
  BODY,
  TERMS,
  RELATED_WANTED,
  seedVersionContent,
} from './lib/brief-198-hose-bib-content';

const SCRIPT = 'seed-brief-198-hose-bib-fall-checklist';
const mode = resolveRunMode(SCRIPT);

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

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
    const content = seedVersionContent(RELATED);
    const v2 = content.v2;

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
