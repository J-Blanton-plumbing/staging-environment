/**
 * Brief 199, review round 3 (Marketing, 2026-10-07) — removes one paragraph from the UNPUBLISHED draft
 * /knowledge-hub/older-homes-plumbing-problems-grandview-clintonville-german-village
 * ("What Does a Sewer Camera Inspection Show?"):
 *   "On older homes, we pay close attention to the joints between pipe sections. That's where roots
 *    and small cracks usually show up first."
 * The seed now writes the same result, so a fresh environment needs no update.
 *
 * ── ONE TIME, EDITOR STATE WINS (Brief 186) ─────────────────────────────────
 * Applied to the live row AND every version row in ONE transaction, and only if every body still
 * holds that paragraph exactly once. Otherwise nothing is written:
 *   • article missing, published, or any version published → NOT-APPLIED, exit 0;
 *   • the paragraph missing or repeated in some row         → NOT-APPLIED, exit 0;
 *   • no row holds it any more                              → ALREADY-APPLIED, exit 0.
 * Each version row gets `version = version + 1` (like every drafts.ts writer) so an editor tab
 * opened before the deploy gets the normal conflict instead of saving the old copy back.
 * Runs after update-brief-199-older-homes-review-2.ts.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-199-older-homes-review-3.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';
import { OLD_SLUG, describeBoth, findOlderHomesArticle } from './lib/older-homes-article';

const SCRIPT = 'update-brief-199-older-homes-review-3';
const mode = resolveRunMode(SCRIPT);

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

// Brief 203 (A1): SLUG is resolved in main() under EITHER slug (scripts/lib/older-homes-article.ts).
const PARA =
  "\n<p>On older homes, we pay close attention to the joints between pipe sections. That's where roots and small cracks usually show up first.</p>";
const PARA_TEXT = 'we pay close attention to the joints between pipe sections';

const count = (s: string, sub: string) => s.split(sub).length - 1;

async function main() {
  console.log(`MODE: ${mode === 'commit' ? 'COMMIT' : 'DRY RUN (nothing is written)'}\n`);
  const c = await pool.connect();
  let committed = false;
  try {
    // Brief 203 (A1): the article may have been renamed — find it under either slug; versions follow its slug.
    const found = await findOlderHomesArticle(c);
    if (found.kind === 'both') {
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', describeBoth(found.rows));
      return;
    }
    const SLUG = found.kind === 'one' ? found.slug : OLD_SLUG;
    const live = (await c.query<{ id: number; status: string; html: string | null }>(
      `SELECT id, status, body->>'html' AS html FROM cms_articles WHERE slug = $1`,
      [SLUG]
    )).rows[0];
    if (!live) {
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `no article /knowledge-hub/${SLUG} (the Brief 199 seed did not create it here)`);
      return;
    }
    const versions = (await c.query<{ id: number; label: string; is_published: boolean; html: string | null }>(
      `SELECT id, label, is_published, content->>'body' AS html
         FROM page_drafts WHERE page_type = 'article' AND page_slug = $1 ORDER BY id`,
      [SLUG]
    )).rows;
    const rows = [
      { kind: 'live', id: live.id, html: live.html ?? '' },
      ...versions.map((v) => ({ kind: `version ${v.id} "${v.label}"`, id: v.id, html: v.html ?? '' })),
    ];

    if (rows.every((r) => !r.html.includes(PARA_TEXT))) {
      verdict(SCRIPT, 'ALREADY-APPLIED', `id ${live.id}: live row + ${versions.length} version(s) no longer hold the paragraph`);
      return;
    }
    const problems: string[] = [];
    if (live.status !== 'draft') problems.push(`the article is ${live.status}, not a draft — edit it in /admin instead`);
    if (versions.some((v) => v.is_published)) problems.push('a version is published — edit it in /admin instead');
    for (const r of rows) if (count(r.html, PARA) !== 1) problems.push(`${r.kind}: the "On older homes…" paragraph found ${count(r.html, PARA)}×`);
    if (problems.length) {
      console.log('\n' + '!'.repeat(72));
      for (const p of ['NOT APPLIED — nothing was written (editors own the article):', ...problems.map((p) => `  • ${p}`)]) console.log(`${SCRIPT}: ${p}`);
      console.log('!'.repeat(72) + '\n');
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', problems.join('; '));
      return;
    }
    const edits = rows.map((r) => ({ ...r, html: r.html.replace(PARA, '') }));
    for (const e of edits) if (sanitizeArticleBodyHtml(e.html) !== e.html) throw new Error(`${e.kind}: the edited body is not sanitizer-stable`);

    await c.query('BEGIN');
    const [liveEdit, ...versionEdits] = edits;
    await c.query(
      `UPDATE cms_articles SET body = jsonb_build_object('html', $2::text), updated_at = NOW() WHERE id = $1 AND status = 'draft'`,
      [live.id, liveEdit.html]
    );
    for (const e of versionEdits) {
      await c.query(
        `UPDATE page_drafts SET content = jsonb_set(content, '{body}', to_jsonb($2::text)), version = version + 1 WHERE id = $1 AND NOT is_published`,
        [e.id, e.html]
      );
    }
    const after = (await c.query<{ html: string }>(
      `SELECT body->>'html' AS html FROM cms_articles WHERE id = $1
       UNION ALL SELECT content->>'body' FROM page_drafts WHERE page_type = 'article' AND page_slug = $2`,
      [live.id, SLUG]
    )).rows;
    if (after.length !== rows.length || !after.every((r) => !r.html.includes(PARA_TEXT) && r.html.includes('<table>'))) {
      throw new Error('post-write verification failed');
    }
    console.log(`  ~ id ${live.id} + ${versionEdits.length} version(s): "On older homes…" paragraph removed`);

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would apply review round 3 to id ${live.id} + ${versionEdits.length} version(s)`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, 'APPLIED', `review round 3 applied to /knowledge-hub/${SLUG} (id ${live.id}, still a draft) + ${versionEdits.length} version(s)`);
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
