/**
 * Brief 201, review round 3 (Marketing, 2026-10-08) — two edits to the UNPUBLISHED draft
 * /knowledge-hub/hose-bib-irrigation-fall-checklist (supersedes round 2's intro wording):
 *   1. intro, 2nd sentence → "…is an easy DIY job, and it can save you from a burst pipe repair that can
 *      cost up to thousands of dollars in Chicago once water damage cleanup is included." The Angi link
 *      ("according to Angi") is dropped. Accepted starting points: round 2's wording ("thousands of dollars
 *      in repairs and water damage, according to Angi.") or the seeded one ("up to $3,600 … according to
 *      Angi."), so this is right whether or not round 2 ran first.
 *   2. "Shut It Down Now…", 2nd paragraph: the sentences "Want someone checking your whole system twice a
 *      year? The No Drip Club includes two maintenance visits with a whole home plumbing tune-up." are
 *      removed (with their No Drip Club link).
 * The live row's links carry a sanitizer-added rel="…", the version rows the editor's raw HTML, so the
 * links are matched with [^>]* after their href.
 *
 * ── SURGICAL, ONE TIME, EDITOR STATE WINS (Brief 186) ───────────────────────
 * Applied to the live row AND every version row (Version 1 included) in ONE transaction, and only if
 * every row holds each passage exactly once in a recognised form:
 *   • columns missing                                    → FAILED, exit 1 (schema fault);
 *   • no article                                         → NOT-APPLIED (no article), exit 0;
 *   • every row already shows both edits                  → ALREADY-APPLIED, exit 0;
 *   • not a draft, or a version is published             → NOT-APPLIED (not a draft), exit 0;
 *   • a passage in any row is in no recognised form      → NOT-APPLIED (edited in admin), exit 0.
 * Each version row edited gets `version = version + 1`. Runs after round 2 in deploy.sh, so fresh
 * environments end up the same way.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-201-review-3.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';

const SCRIPT = 'update-brief-201-review-3';
const SLUG = 'hose-bib-irrigation-fall-checklist';

const ANGI = '<a href="https://www\\.angi\\.com/articles/cost-to-repair-leaking-pipe/il/chicago"[^>]*>according to Angi</a>\\.';
/** Intro clause: round 2's wording or the seeded one (both end with the Angi link). */
const INTRO_OLD = new RegExp(
  `it can save you (?:thousands of dollars in repairs and water damage|from a burst pipe repair that can cost up to \\$3,600 in Chicago once water damage cleanup is included), ${ANGI}`,
  'g'
);
const INTRO_NEW = 'it can save you from a burst pipe repair that can cost up to thousands of dollars in Chicago once water damage cleanup is included.';
const NDC_OLD = / Want someone checking your whole system twice a year\? The <a href="\/no-drip-club"[^>]*>No Drip Club<\/a> includes two maintenance visits with a whole home plumbing tune-up\./g;
/** What the paragraph ends with once the NDC sentences are gone. */
const NDC_DONE = 'so there are no surprises.</p>';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

const hits = (s: string, re: RegExp) => (s.match(re) ?? []).length;
const count = (s: string, sub: string) => s.split(sub).length - 1;
type St = 'old' | 'new' | 'other';
const introState = (h: string): St =>
  hits(h, INTRO_OLD) === 1 && !h.includes(INTRO_NEW) ? 'old' : count(h, INTRO_NEW) === 1 && hits(h, INTRO_OLD) === 0 && !/according to Angi/.test(h) ? 'new' : 'other';
const ndcState = (h: string): St =>
  hits(h, NDC_OLD) === 1 ? 'old' : count(h, NDC_DONE) === 1 && !/Want someone checking your whole system/.test(h) ? 'new' : 'other';
const apply = (h: string) => h.replace(INTRO_OLD, () => INTRO_NEW).replace(NDC_OLD, () => '');

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
    ].map((r) => ({ ...r, intro: introState(r.html), ndc: ndcState(r.html) }));

    if (rows.every((r) => r.intro === 'new' && r.ndc === 'new')) {
      verdict(SCRIPT, 'ALREADY-APPLIED', `id ${live.id}: live row + ${versions.length} version(s) already show round 3`);
      return;
    }
    if (live.status !== 'draft' || versions.some((v) => v.is_published)) {
      verdict(SCRIPT, 'NOT-APPLIED (not a draft)', `id ${live.id} is ${live.status}${versions.some((v) => v.is_published) ? ' (a version is published)' : ''} — make the edits in /admin instead; nothing written`);
      return;
    }
    const problems = rows.flatMap((r) => [
      ...(r.intro === 'other' ? [`${r.kind}: the intro sentence is in no recognised form`] : []),
      ...(r.ndc === 'other' ? [`${r.kind}: the No Drip Club sentences are in no recognised form`] : []),
    ]);
    if (problems.length) {
      console.log('\n' + '!'.repeat(72));
      for (const l of ['NOT APPLIED — edited in /admin; nothing was written:', ...problems.map((x) => `  • ${x}`)]) console.log(`${SCRIPT}: ${l}`);
      console.log('!'.repeat(72) + '\n');
      verdict(SCRIPT, 'NOT-APPLIED (edited in admin)', problems.join('; '));
      return;
    }

    const todo = rows.filter((r) => r.intro === 'old' || r.ndc === 'old').map((r) => ({ ...r, next: apply(r.html) }));
    for (const r of todo) {
      if (r.kind === 'live' && sanitizeArticleBodyHtml(r.next) !== r.next) throw new Error('the edited live body is not sanitizer-stable');
      if (introState(r.next) !== 'new' || ndcState(r.next) !== 'new') throw new Error(`${r.kind}: the edit did not produce round 3`);
    }

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
    const done = (h: string) => introState(h) === 'new' && ndcState(h) === 'new';
    if (!done(afterLive.html) || afterV.length !== versions.length || !afterV.every((v) => done(v.html))) throw new Error('post-write verification failed');
    for (const r of todo) console.log(`  ~ ${r.kind}: intro ${r.intro === 'old' ? 'rewritten' : 'already done'}, No Drip Club sentences ${r.ndc === 'old' ? 'removed' : 'already gone'}`);

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would apply round 3 to ${todo.length} row(s)`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, 'APPLIED', `round 3 (intro wording, no Angi link; No Drip Club sentences removed) in ${todo.length} row(s) of /knowledge-hub/${SLUG} (id ${live.id}, still a draft)`);
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
