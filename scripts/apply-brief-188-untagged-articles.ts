/**
 * Brief 188 (Track G1) — give the 7 "No signal" articles a primary topic of
 * Plumbing Tips (Marketing decision 2026-09-24).
 *
 * These are the seven "choosing / hiring a plumber" guides the Brief 187 Stop 1
 * proposals could not topic (the approved CSV's 7 blank-decision rows).
 *
 * ── RULES ───────────────────────────────────────────────────────────────────
 *   • Only when the article STILL has no primary topic — an editor may have
 *     tagged it since; that choice wins and the row is reported SKIPPED.
 *   • Its existing secondary topics and locations are kept; only the primary is
 *     set (and dropped from the secondaries if it was one).
 *   • APPLY-ONCE: every decision (applied, or skipped because it already had a
 *     topic) is recorded in `brief188_applied` as `untagged-plumbing-tips:{slug}`
 *     and never revisited, so a later retag in /admin survives every deploy. An
 *     article missing from THIS database is not recorded (it may appear later).
 *   • Same transaction as the tag write: the article's PUBLISHED version row gets
 *     the same `content.terms` (article content lives in two places — Brief 187
 *     Stop 2 did exactly this).
 *   • Content state never fails a deploy (Brief 186): exit 0 on everything but a
 *     schema / SQL fault. `brief188_applied` is created by the Brief 188
 *     migration, which deploy.sh runs first; it is also created here if absent.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/apply-brief-188-untagged-articles.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { announceMode, resolveRunMode, verdict } from './lib/run-mode';
import { getArticleTermSelectionTx, writeArticleTerms } from '../src/lib/cms/kh-taxonomy';

const SCRIPT = 'apply-brief-188-untagged-articles';
const mode = resolveRunMode(SCRIPT);
announceMode(SCRIPT, mode);

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

const TOPIC = 'plumbing-tips';

/** The 7 blank-decision rows of scripts/data/brief-187-article-tags-approved.csv. */
const SLUGS = [
  '45527-naperville-homeowners-follow-these-steps-to-select-the-best-plumber-company-in-your-area',
  '45509-why-elgin-homeowners-should-hire-licensed-plumbing-contractors-for-home-projects',
  '45469-top-5-qualities-to-look-for-in-reliable-plumbing-contractors-in-naperville',
  'how-to-hire-the-best-plumber-near-me',
  'tips-for-choosing-the-right-plumber',
  'what-to-expect-from-your-local-plumbing-company',
  'contractor-checklist',
];

async function main() {
  const c = await pool.connect();
  const report: string[] = [];
  let applied = 0, already = 0, skipped = 0;
  try {
    await c.query('BEGIN');
    await c.query(`CREATE TABLE IF NOT EXISTS brief188_applied (
      key TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), detail JSONB NOT NULL DEFAULT '{}'::jsonb)`);
    const topic = await c.query(`SELECT 1 FROM kh_terms WHERE type = 'topic' AND slug = $1`, [TOPIC]);
    if (!topic.rowCount) {
      // Editor-controlled? No — topics can't be deleted in the CMS. A missing
      // seed row means the Brief 187 migration has not run: report, don't fail.
      await c.query('ROLLBACK');
      console.log(`  !!!! topic "${TOPIC}" not found — has scripts/migrate-brief-187-kh-taxonomy.ts run?`);
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `topic ${TOPIC} missing`);
      return;
    }

    for (const slug of SLUGS) {
      const key = `untagged-plumbing-tips:${slug}`;
      if ((await c.query(`SELECT 1 FROM brief188_applied WHERE key = $1`, [key])).rowCount) {
        already++; report.push(`  = ALREADY-APPLIED  ${slug}`); continue;
      }
      const a = await c.query<{ id: number }>(`SELECT id FROM cms_articles WHERE slug = $1`, [slug]);
      if (!a.rows[0]) { skipped++; report.push(`  - SKIPPED  ${slug} — no such article in this database (not recorded)`); continue; }
      const current = await getArticleTermSelectionTx(c, a.rows[0].id);
      if (current.primary) {
        skipped++;
        report.push(`  - SKIPPED  ${slug} — already has primary topic "${current.primary}" (recorded; never revisited)`);
        await c.query(`INSERT INTO brief188_applied (key, detail) VALUES ($1, $2)`, [key, JSON.stringify({ skipped: 'has-primary', primary: current.primary })]);
        continue;
      }
      const next = { primary: TOPIC, secondary: current.secondary.filter((s) => s !== TOPIC), locations: current.locations };
      if (mode === 'commit') {
        const { unknown } = await writeArticleTerms(c, a.rows[0].id, next);
        if (unknown.length) throw new Error(`unknown term(s) for ${slug}: ${unknown.join(', ')}`);
        await c.query(
          `UPDATE page_drafts SET content = jsonb_set(COALESCE(content, '{}'::jsonb), '{terms}', $1::jsonb, true)
            WHERE page_type = 'article' AND page_slug = $2 AND is_published`,
          [JSON.stringify(next), slug]
        );
        await c.query(`INSERT INTO brief188_applied (key, detail) VALUES ($1, $2)`, [key, JSON.stringify({ before: current, after: next })]);
      }
      applied++;
      report.push(`  + ${mode === 'commit' ? 'APPLIED' : 'WOULD APPLY'}  ${slug} → primary ${TOPIC}` +
        (next.locations.length ? ` (kept locations: ${next.locations.join(', ')})` : ''));
    }

    if (mode === 'commit') await c.query('COMMIT'); else await c.query('ROLLBACK');
  } catch (err) {
    await c.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    c.release();
  }

  console.log(`── Brief 188 Track G1: the 7 untagged articles → ${TOPIC}\n${report.join('\n')}`);
  const detail = `${applied} applied, ${already} already applied, ${skipped} skipped`;
  if (mode === 'dry') verdict(SCRIPT, 'NOT-APPLIED (dry run)', detail);
  else verdict(SCRIPT, applied > 0 ? 'APPLIED' : 'ALREADY-APPLIED', detail);
}

main()
  .catch((err) => {
    console.error(err);
    verdict(SCRIPT, 'FAILED', err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
