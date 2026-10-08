/**
 * Brief 201, review round 2 (Marketing, 2026-10-08) — drop the "$3,600" figure from the intro of the
 * UNPUBLISHED draft /knowledge-hub/hose-bib-irrigation-fall-checklist and say it generally:
 *   before: "…an easy DIY job, and it can save you from a burst pipe repair that can cost up to $3,600 in
 *            Chicago once water damage cleanup is included, according to Angi."
 *   after:  "…an easy DIY job, and it can save you thousands of dollars in repairs and water damage,
 *            according to Angi."
 * The Angi link is kept (its estimate still supports "thousands"). Nothing else changes.
 * The anchor is the text BEFORE the link only: the live row's body has been through the sanitizer,
 * which adds rel="noopener noreferrer" to the link, while the version rows hold the editor's raw HTML.
 *
 * ── SURGICAL, ONE TIME, EDITOR STATE WINS (Brief 186) ───────────────────────
 * Applied to the live row AND every version row (Version 1 too, so switching back to it can't bring the
 * figure back) in ONE transaction, and only if each row holds the old wording exactly once:
 *   • columns missing                                → FAILED, exit 1 (schema fault);
 *   • no article                                     → NOT-APPLIED (no article), exit 0;
 *   • not a draft, or a version is published         → NOT-APPLIED (not a draft), exit 0;
 *   • every row already has the new wording           → ALREADY-APPLIED, exit 0;
 *   • any row has neither wording (edited in /admin)  → NOT-APPLIED (edited in admin), exit 0.
 * Each version row gets `version = version + 1`, so an editor tab opened before the deploy gets the
 * normal "changed by someone else" conflict instead of saving the old sentence back.
 * Fresh environments: deploy.sh runs this after the Brief 198 seed and the Brief 201 steps, so they
 * end up the same way.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-201-review-2.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { OLD_SLUG, describeBoth, findHoseBibArticle } from './lib/hose-bib-article';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';

const SCRIPT = 'update-brief-201-review-2';
// Brief 202 (A1): set in main() to the slug the article has NOW (it was renamed).
let SLUG = OLD_SLUG;
const OLD = 'it can save you from a burst pipe repair that can cost up to $3,600 in Chicago once water damage cleanup is included, ';
const NEW = 'it can save you thousands of dollars in repairs and water damage, ';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

/** Round 3 (update-brief-201-review-3.ts) superseded this wording; once it has run, round 2 is done too. */
const SUPERSEDED = 'it can save you from a burst pipe repair that can cost up to thousands of dollars in Chicago once water damage cleanup is included.';

const count = (s: string, sub: string) => s.split(sub).length - 1;
const state = (html: string) =>
  count(html, OLD) === 1 && !html.includes(NEW)
    ? 'old'
    : (count(html, NEW) === 1 || count(html, SUPERSEDED) === 1) && !html.includes(OLD)
      ? 'new'
      : 'other';

async function main(pool: Pool) {
  const mode = resolveRunMode(SCRIPT);
  console.log(`MODE: ${mode === 'commit' ? 'COMMIT' : 'DRY RUN (nothing is written)'}\n`);
  const c = await pool.connect();
  let committed = false;
  try {
    const cols = await c.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM information_schema.columns
        WHERE (table_name = 'cms_articles' AND column_name = 'body')
           OR (table_name = 'page_drafts' AND column_name IN ('content', 'version', 'is_published'))`
    );
    if (cols.rows[0].n !== '4') throw new Error('missing column(s): cms_articles.body / page_drafts.content, version, is_published');
    // Brief 202 (A1): the article may be under its new slug; resolve which one it has now.
    const found = await findHoseBibArticle(c);
    if (found.kind === 'both') {
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', describeBoth(found.rows));
      return;
    }
    if (found.kind === 'one') SLUG = found.slug;

    const live = (await c.query<{ id: number; status: string; html: string | null }>(
      `SELECT id, status, body->>'html' AS html FROM cms_articles WHERE slug = $1`, [SLUG]
    )).rows[0];
    if (!live) {
      verdict(SCRIPT, 'NOT-APPLIED (no article)', `no article /knowledge-hub/${SLUG} — nothing written`);
      return;
    }
    const versions = (await c.query<{ id: number; label: string; is_published: boolean; html: string | null }>(
      `SELECT id, label, is_published, content->>'body' AS html FROM page_drafts
        WHERE page_type = 'article' AND page_slug = $1 ORDER BY id`, [SLUG]
    )).rows;
    const rows = [
      { kind: 'live', id: live.id, html: live.html ?? '' },
      ...versions.map((v) => ({ kind: `version ${v.id} "${v.label}"`, id: v.id, html: v.html ?? '' })),
    ].map((r) => ({ ...r, state: state(r.html) }));

    if (rows.every((r) => r.state === 'new')) {
      verdict(SCRIPT, 'ALREADY-APPLIED', `id ${live.id}: live row + ${versions.length} version(s) already say "thousands of dollars"`);
      return;
    }
    if (live.status !== 'draft' || versions.some((v) => v.is_published)) {
      verdict(SCRIPT, 'NOT-APPLIED (not a draft)', `id ${live.id} is ${live.status}${versions.some((v) => v.is_published) ? ' (a version is published)' : ''} — edit the intro in /admin instead; nothing written`);
      return;
    }
    const edited = rows.filter((r) => r.state === 'other');
    if (edited.length) {
      const list = edited.map((r) => `${r.kind}: the intro sentence no longer reads as seeded`);
      console.log('\n' + '!'.repeat(72));
      for (const l of ['NOT APPLIED — the intro was edited in /admin; nothing was written:', ...list.map((x) => `  • ${x}`)]) console.log(`${SCRIPT}: ${l}`);
      console.log('!'.repeat(72) + '\n');
      verdict(SCRIPT, 'NOT-APPLIED (edited in admin)', list.join('; '));
      return;
    }

    const todo = rows.filter((r) => r.state === 'old').map((r) => ({ ...r, next: r.html.replace(OLD, () => NEW) }));
    const liveTodo = todo.find((r) => r.kind === 'live');
    if (liveTodo && sanitizeArticleBodyHtml(liveTodo.next) !== liveTodo.next) throw new Error('the edited live body is not sanitizer-stable');
    for (const r of todo) if (!sanitizeArticleBodyHtml(r.next).includes(NEW.trim())) throw new Error(`${r.kind}: the new wording does not survive the sanitizer`);

    await c.query('BEGIN');
    for (const r of todo) {
      if (r.kind === 'live') {
        await c.query(`UPDATE cms_articles SET body = jsonb_build_object('html', $2::text), updated_at = NOW() WHERE id = $1 AND status = 'draft'`, [r.id, r.next]);
      } else {
        await c.query(`UPDATE page_drafts SET content = jsonb_set(content, '{body}', to_jsonb($2::text)), version = version + 1 WHERE id = $1 AND NOT is_published`, [r.id, r.next]);
      }
    }
    const afterLive = (await c.query<{ html: string }>(`SELECT body->>'html' AS html FROM cms_articles WHERE id = $1`, [live.id])).rows[0];
    const afterV = (await c.query<{ html: string }>(`SELECT content->>'body' AS html FROM page_drafts WHERE page_type = 'article' AND page_slug = $1`, [SLUG])).rows;
    if (state(afterLive.html) !== 'new' || afterV.length !== versions.length || !afterV.every((v) => state(v.html) === 'new')) {
      throw new Error('post-write verification failed');
    }
    for (const r of todo) console.log(`  ~ ${r.kind}: intro now says "thousands of dollars"`);

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would update the intro in ${todo.length} row(s)`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, 'APPLIED', `intro updated ("thousands of dollars", no $3,600) in ${todo.length} row(s) of /knowledge-hub/${SLUG} (id ${live.id}, still a draft)`);
  } catch (err) {
    if (!committed) await c.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}

const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });
main(pool)
  .catch((err) => {
    console.error(err);
    verdict(SCRIPT, 'FAILED', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
