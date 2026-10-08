/**
 * Brief 203, review round 1 (Marketing, 2026-10-08) — removes one paragraph from the UNPUBLISHED draft
 * /knowledge-hub/old-house-plumbing-problems-grandview-worthington-german-village (Worthington subsection):
 *   "Need a plumber in Worthington? Our Columbus team can help."
 * Brief 203's update writes that paragraph; this step removes it, so a fresh environment (seed → 199 rounds
 * → 203 → this) ends in the same state as production.
 *
 * ── ONE TIME, EDITOR STATE WINS (Brief 186) ─────────────────────────────────
 * The article is found under EITHER slug (scripts/lib/older-homes-article.ts; both → NOT-APPLIED).
 * Rows that hold the paragraph are edited in ONE transaction; rows that never had it (Version 1, written
 * before Brief 203) are left byte-identical. Nothing is written unless:
 *   • the article is a draft and no version is published;
 *   • the live row AND the newest version each hold the paragraph exactly once (no row holds it twice).
 * Otherwise → NOT-APPLIED, exit 0. No row holds it any more → ALREADY-APPLIED, exit 0.
 * Each edited version row gets `version = version + 1` (like every drafts.ts writer) so an editor tab
 * opened before the deploy gets the normal conflict instead of saving the old copy back.
 * Runs after update-brief-203-older-homes-worthington.ts.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-203-older-homes-review-1.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';
import { describeBoth, findOlderHomesArticle } from './lib/older-homes-article';

const SCRIPT = 'update-brief-203-older-homes-review-1';
const mode = resolveRunMode(SCRIPT);

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

const PARA = '\n<p>Need a plumber in Worthington? Our Columbus team can help.</p>';
const PARA_TEXT = 'Need a plumber in Worthington?';

const count = (s: string, sub: string) => s.split(sub).length - 1;

async function main() {
  console.log(`MODE: ${mode === 'commit' ? 'COMMIT' : 'DRY RUN (nothing is written)'}\n`);
  const c = await pool.connect();
  let committed = false;
  try {
    const found = await findOlderHomesArticle(c);
    if (found.kind === 'both') {
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', describeBoth(found.rows));
      return;
    }
    if (found.kind === 'none') {
      verdict(SCRIPT, 'NOT-APPLIED (no article)', 'no older-homes article under either slug — nothing written');
      return;
    }
    const live = (await c.query<{ id: number; slug: string; status: string; html: string | null }>(
      `SELECT id, slug, status, body->>'html' AS html FROM cms_articles WHERE id = $1`, [found.id]
    )).rows[0];
    const versions = (await c.query<{ id: number; label: string; is_published: boolean; html: string | null }>(
      `SELECT id, label, is_published, content->>'body' AS html
         FROM page_drafts WHERE page_type = 'article' AND page_slug = $1
         ORDER BY created_at DESC, id DESC`,
      [live.slug]
    )).rows;
    const rows = [
      { kind: 'live', id: live.id, html: live.html ?? '' },
      ...versions.map((v) => ({ kind: `version ${v.id} "${v.label}"`, id: v.id, html: v.html ?? '' })),
    ];

    if (rows.every((r) => !r.html.includes(PARA_TEXT))) {
      verdict(SCRIPT, 'ALREADY-APPLIED', `id ${live.id} /${live.slug}: no row holds the "Need a plumber in Worthington?" paragraph`);
      return;
    }
    const problems: string[] = [];
    if (live.status !== 'draft') problems.push(`the article is ${live.status}, not a draft — edit it in /admin instead`);
    if (versions.some((v) => v.is_published)) problems.push('a version is published — edit it in /admin instead');
    if (count(rows[0].html, PARA) !== 1) problems.push(`live: the paragraph found ${count(rows[0].html, PARA)}×`);
    if (!versions[0] || count(versions[0].html ?? '', PARA) !== 1) problems.push(`newest version: the paragraph found ${versions[0] ? count(versions[0].html ?? '', PARA) : 0}×`);
    for (const r of rows) {
      if (r.html.includes(PARA_TEXT) && count(r.html, PARA) !== 1) problems.push(`${r.kind}: the paragraph is edited or repeated`);
    }
    if (problems.length) {
      console.log('\n' + '!'.repeat(72));
      for (const p of ['NOT APPLIED — nothing was written (editors own the article):', ...problems.map((p) => `  • ${p}`)]) console.log(`${SCRIPT}: ${p}`);
      console.log('!'.repeat(72) + '\n');
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', problems.join('; '));
      return;
    }
    const edits = rows.filter((r) => r.html.includes(PARA)).map((r) => ({ ...r, html: r.html.replace(PARA, '') }));
    for (const e of edits) if (sanitizeArticleBodyHtml(e.html) !== e.html) throw new Error(`${e.kind}: the edited body is not sanitizer-stable`);

    const untouched = async () =>
      (await c.query<{ h: string }>(
        `SELECT md5(coalesce(string_agg(id || ':' || md5(content::text) || ':' || version, ',' ORDER BY id), '')) AS h
           FROM page_drafts WHERE page_type = 'article' AND page_slug = $1 AND NOT (id = ANY($2::int[]))`,
        [live.slug, edits.filter((e) => e.kind !== 'live').map((e) => e.id)]
      )).rows[0].h;
    const before = await untouched();

    await c.query('BEGIN');
    for (const e of edits) {
      if (e.kind === 'live') {
        await c.query(`UPDATE cms_articles SET body = jsonb_build_object('html', $2::text), updated_at = NOW() WHERE id = $1 AND status = 'draft'`, [e.id, e.html]);
      } else {
        await c.query(`UPDATE page_drafts SET content = jsonb_set(content, '{body}', to_jsonb($2::text)), version = version + 1 WHERE id = $1 AND NOT is_published`, [e.id, e.html]);
      }
    }
    const after = (await c.query<{ html: string }>(
      `SELECT body->>'html' AS html FROM cms_articles WHERE id = $1
       UNION ALL SELECT content->>'body' FROM page_drafts WHERE page_type = 'article' AND page_slug = $2`,
      [live.id, live.slug]
    )).rows;
    if (after.length !== rows.length || after.some((r) => r.html.includes(PARA_TEXT) || !r.html.includes('<table>')) || (await untouched()) !== before) {
      throw new Error('post-write verification failed');
    }
    console.log(`  ~ id ${live.id} /${live.slug}: "Need a plumber in Worthington?" paragraph removed from ${edits.map((e) => e.kind).join(', ')}`);
    console.log(`  = ${rows.length - edits.length} row(s) without the paragraph left byte-identical`);

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would remove the paragraph from ${edits.length} row(s) of id ${live.id}`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, 'APPLIED', `paragraph removed from ${edits.length} row(s) of /knowledge-hub/${live.slug} (id ${live.id}, still a draft)`);
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
  .finally(() => pool.end());
