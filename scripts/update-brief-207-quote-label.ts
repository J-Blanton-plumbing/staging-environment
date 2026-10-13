/**
 * Brief 207 follow-up 4 — remove the "[DRAFT QUOTE] " label (Marketing, 2026-10-13) from the CEO quote in
 * "What Did J. Blanton Plumbing Donate…" of the UNPUBLISHED draft
 * /knowledge-hub/deerfield-animal-shelter-donation-orphans-of-the-storm. This is Brief 207 Track F step 2;
 * the quote's own words are unchanged. Nothing else moves.
 *
 * ── ONE TIME, SURGICAL, EDITOR STATE WINS (Brief 186; gotcha 27: test this script's OWN edit only) ──
 *   • version columns missing                                → FAILED, exit 1 (schema fault);
 *   • no article with the slug                               → NOT-APPLIED (no article), exit 0;
 *   • a version whose label ends LABEL_SUFFIX exists         → ALREADY-APPLIED, exit 0;
 *   • the article is not a draft                             → NOT-APPLIED (not a draft), exit 0;
 *   • the label is already gone from BOTH the live row and the
 *     newest version (deleted by hand in /admin)             → ALREADY-APPLIED (removed in admin), exit 0;
 *   • the live row OR the newest version does not hold the
 *     labelled quote paragraph opening exactly once          → NOT-APPLIED (edited in admin), exit 0,
 *     naming each. Nothing is written by any guard.
 *
 * ── WHAT IT WRITES (one transaction) ───────────────────────────────────────────────────────
 *   • ONE new page_drafts row "Version N — draft-quote label removed" (N = existing versions + 1),
 *     unpublished: the newest version's content with the label removed.
 *   • The live row (still status 'draft'): body with the label removed.
 *   Body: sanitizeArticleBodyHtml. Never touches global_settings.
 * Keep it AFTER scripts/update-brief-207-event-photos.ts in deploy.sh (that script's guard reads the
 * figures, not this paragraph, so order does not matter for correctness — it keeps the chain readable).
 *
 * Needs an explicit mode (Brief 147): `commit` applies; `--dry-run` previews.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-207-quote-label.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';
import { SLUG } from './seed-brief-207-deerfield-orphans-of-the-storm';

const SCRIPT = 'update-brief-207-quote-label';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

export const LABEL_SUFFIX = ' — draft-quote label removed';
/** The labelled paragraph's opening as the seed wrote it (after sanitizing), and what it becomes. */
const OLD = '<p>[DRAFT QUOTE] "Our technicians are in and out of homes every day,"';
const NEW = '<p>"Our technicians are in and out of homes every day,"';
const LABEL = '[DRAFT QUOTE]';

function banner(lines: string[]) {
  console.log('\n' + '!'.repeat(72));
  for (const l of lines) console.log(`${SCRIPT}: ${l}`);
  console.log('!'.repeat(72) + '\n');
}

type Obj = Record<string, unknown>;
const asObj = (x: unknown): Obj => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Obj) : {});
const count = (s: string, sub: string) => s.split(sub).length - 1;

async function main(pool: Pool) {
  const mode = resolveRunMode(SCRIPT);
  console.log(`MODE: ${mode === 'commit' ? 'COMMIT' : 'DRY RUN (nothing is written)'}\n`);
  const c = await pool.connect();
  let committed = false;
  try {
    const cols = await c.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE (table_name = 'cms_articles' AND column_name IN ('template', 'v2'))
           OR (table_name = 'page_drafts' AND column_name IN ('label', 'content', 'is_published'))`
    );
    if (cols.rows.length !== 5) throw new Error('missing Brief 190 / version column(s)');

    const live = (
      await c.query<{ id: number; status: string; html: string | null }>(
        `SELECT id, status, body->>'html' AS html FROM cms_articles WHERE slug = $1`,
        [SLUG]
      )
    ).rows[0];
    if (!live) {
      verdict(SCRIPT, 'NOT-APPLIED (no article)', `no article /knowledge-hub/${SLUG} — nothing written`);
      return;
    }
    const versions = (
      await c.query<{ id: number; label: string; is_published: boolean; created_by: number; content: unknown }>(
        `SELECT id, label, is_published, created_by, content FROM page_drafts
          WHERE page_type = 'article' AND page_slug = $1 ORDER BY created_at DESC, id DESC`,
        [SLUG]
      )
    ).rows;
    const mine = versions.find((v) => v.label.endsWith(LABEL_SUFFIX));
    if (mine) {
      verdict(SCRIPT, 'ALREADY-APPLIED', `id ${live.id} (${live.status}) already has "${mine.label}" (version id ${mine.id}) — nothing written`);
      return;
    }
    if (live.status !== 'draft') {
      banner([`NOT APPLIED — the article is ${live.status}, not a draft. Remove "${LABEL}" in /admin if it is still there.`]);
      verdict(SCRIPT, 'NOT-APPLIED (not a draft)', `id ${live.id} is ${live.status} — nothing written`);
      return;
    }

    const latest = versions[0];
    const lc = asObj(latest?.content);
    const liveHtml = live.html ?? '';
    const verHtml = typeof lc.body === 'string' ? lc.body : '';
    if (latest && !liveHtml.includes(LABEL) && !verHtml.includes(LABEL)) {
      verdict(SCRIPT, 'ALREADY-APPLIED', `"${LABEL}" already removed (in /admin) from id ${live.id} — nothing written`);
      return;
    }
    const diffs: string[] = [];
    if (!latest) diffs.push('no version row');
    if (latest?.is_published) diffs.push(`version "${latest.label}" is published`);
    if (count(liveHtml, OLD) !== 1 || count(liveHtml, LABEL) !== 1) diffs.push('live.body');
    if (latest && (count(verHtml, OLD) !== 1 || count(verHtml, LABEL) !== 1)) diffs.push(`version "${latest.label}".body`);
    if (diffs.length) {
      banner(['NOT APPLIED — the quote paragraph is not as seeded (edited in /admin). Nothing was written; remove the label by hand. Differs:', ...diffs.map((d) => `  • ${d}`)]);
      verdict(SCRIPT, 'NOT-APPLIED (edited in admin)', `differs: ${diffs.join(', ')}`);
      return;
    }

    const label = `Version ${versions.length + 1}${LABEL_SUFFIX}`;
    const content = { ...lc, body: sanitizeArticleBodyHtml(verHtml.replace(OLD, NEW)) };
    const liveBody = sanitizeArticleBodyHtml(liveHtml.replace(OLD, NEW));
    const before = versions.map((v) => `${v.id}:${JSON.stringify(v.content)}:${v.is_published}`).join('|');

    await c.query('BEGIN');
    const ins = await c.query<{ id: number }>(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, is_published, published_at)
       VALUES ('article', $1, $2, $3, $4, FALSE, NULL) RETURNING id`,
      [SLUG, label, JSON.stringify(content), latest.created_by]
    );
    const upd = await c.query(
      `UPDATE cms_articles SET body = $2::jsonb, updated_at = NOW() WHERE id = $1 AND status = 'draft'`,
      [live.id, JSON.stringify({ html: liveBody })]
    );
    if (upd.rowCount !== 1) throw new Error('the live row was not updated');

    const after = (
      await c.query<{ id: number; is_published: boolean; content: unknown }>(
        `SELECT id, is_published, content FROM page_drafts
          WHERE page_type = 'article' AND page_slug = $1 ORDER BY created_at DESC, id DESC`,
        [SLUG]
      )
    ).rows;
    const others = after.filter((v) => v.id !== ins.rows[0].id).map((v) => `${v.id}:${JSON.stringify(v.content)}:${v.is_published}`).join('|');
    const row = (await c.query<{ status: string; html: string }>(`SELECT status, body->>'html' AS html FROM cms_articles WHERE id = $1`, [live.id])).rows[0];
    const newest = String(asObj(after[0]?.content).body);
    if (
      after.length !== versions.length + 1 || after[0].id !== ins.rows[0].id || after[0].is_published || others !== before ||
      row.status !== 'draft' || row.html.includes(LABEL) || newest.includes(LABEL) ||
      count(row.html, NEW) !== 1 || count(newest, NEW) !== 1 ||
      row.html.length !== liveHtml.length - (LABEL.length + 1) || newest.length !== verHtml.length - (LABEL.length + 1)
    ) {
      throw new Error('post-write verification failed');
    }
    console.log(`  + page_drafts "${label}" (id ${ins.rows[0].id}), unpublished — the newest version, so the review link shows it`);
    console.log(`  ~ cms_articles id ${live.id}: "${LABEL} " removed from the CEO quote (status still draft)`);
    console.log(`  = ${versions.length} earlier version(s) unchanged; nothing else in the article moved`);

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would add "${label}" to id ${live.id}`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, 'APPLIED', `"${label}" added to /knowledge-hub/${SLUG} (id ${live.id}, still a draft)`);
  } catch (err) {
    if (!committed) await c.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}

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
      // The seed module imports kh-taxonomy, which opens the app's own pool (src/lib/db); close it too.
      const appPool = (await import('../src/lib/db')).default as unknown as { end?: () => Promise<void> };
      await appPool.end?.().catch(() => {});
    });
}
