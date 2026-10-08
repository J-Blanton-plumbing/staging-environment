/**
 * Brief 199, review round 2 (Marketing, 2026-10-07) — two edits to the UNPUBLISHED draft
 * /knowledge-hub/older-homes-plumbing-problems-grandview-clintonville-german-village:
 *   1. key takeaways 3 and 4 become one bullet:
 *      "A sewer camera inspection shows roots, cracks and sagging pipe early. Get one before you buy,
 *       remodel or after a backup."
 *   2. the intro's third paragraph is removed:
 *      "If you own, or are thinking of buying, a house in these areas, here's what you'll likely find
 *       underneath, the warning signs to watch for and when a sewer camera inspection can save you
 *       from a surprise repair bill."
 * The seed now writes the same result, so a fresh environment needs no update.
 *
 * ── ONE TIME, EDITOR STATE WINS (Brief 186) ─────────────────────────────────
 * Applied to the live row AND every version row in ONE transaction, and only if every row's
 * takeaways are still exactly the 4 left by review round 1 AND every body still holds that
 * paragraph exactly once. Otherwise nothing is written:
 *   • article missing, published, or any version published → NOT-APPLIED, exit 0;
 *   • takeaways edited / paragraph missing or repeated      → NOT-APPLIED, exit 0;
 *   • every row already shows both edits                    → ALREADY-APPLIED, exit 0.
 * Each version row gets `version = version + 1` (like every drafts.ts writer) so an editor tab
 * opened before the deploy gets the normal conflict instead of saving the old copy back.
 * MUST run after update-brief-199-older-homes-review-1.ts.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-199-older-homes-review-2.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';
import { OLD_SLUG, describeBoth, findOlderHomesArticle } from './lib/older-homes-article';

const SCRIPT = 'update-brief-199-older-homes-review-2';
const mode = resolveRunMode(SCRIPT);

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

// Brief 203 (A1): SLUG is resolved in main() under EITHER slug (scripts/lib/older-homes-article.ts).
const T1 = 'Age often means clay sewer lines, cast iron drains, galvanized or lead water lines, and roots from mature trees.';
const T2 = "In Columbus, the sewer line from your house to the city's pipe is yours to maintain.";
const T3 = 'A sewer camera inspection shows roots, cracks and sagging pipe early.';
const T4 = 'Get one before you buy, remodel or after a backup.';
const BEFORE = [T1, T2, T3, T4];
const AFTER = [T1, T2, `${T3} ${T4}`];
const INTRO_P3 =
  "\n<p>If you own, or are thinking of buying, a house in these areas, here's what you'll likely find underneath, the warning signs to watch for and when a sewer camera inspection can save you from a surprise repair bill.</p>";
const P3_TEXT = 'If you own, or are thinking of buying, a house in these areas';

const same = (a: unknown, b: string[]) => JSON.stringify(a) === JSON.stringify(b);
const count = (s: string, sub: string) => s.split(sub).length - 1;
// Round 2's OWN edit is present: 3 takeaways, the 3rd the merged bullet, no "If you own…" paragraph.
// (Not the whole takeaways list: Brief 203 later rewrites takeaway 2, and that must still read as applied.)
const isApplied = (r: { takeaways: unknown; html: string }) =>
  Array.isArray(r.takeaways) && r.takeaways.length === AFTER.length && r.takeaways[2] === AFTER[2] && !r.html.includes(P3_TEXT);

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
    const live = (await c.query<{ id: number; status: string; takeaways: unknown; html: string | null }>(
      `SELECT id, status, v2->'takeaways' AS takeaways, body->>'html' AS html FROM cms_articles WHERE slug = $1`,
      [SLUG]
    )).rows[0];
    if (!live) {
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `no article /knowledge-hub/${SLUG} (the Brief 199 seed did not create it here)`);
      return;
    }
    const versions = (await c.query<{ id: number; label: string; is_published: boolean; takeaways: unknown; html: string | null }>(
      `SELECT id, label, is_published, content->'v2'->'takeaways' AS takeaways, content->>'body' AS html
         FROM page_drafts WHERE page_type = 'article' AND page_slug = $1 ORDER BY id`,
      [SLUG]
    )).rows;
    const rows = [
      { kind: 'live', id: live.id, takeaways: live.takeaways, html: live.html ?? '' },
      ...versions.map((v) => ({ kind: `version ${v.id} "${v.label}"`, id: v.id, takeaways: v.takeaways, html: v.html ?? '' })),
    ];

    if (rows.every(isApplied)) {
      verdict(SCRIPT, 'ALREADY-APPLIED', `id ${live.id}: live row + ${versions.length} version(s) already show review round 2`);
      return;
    }
    const problems: string[] = [];
    if (live.status !== 'draft') problems.push(`the article is ${live.status}, not a draft — edit it in /admin instead`);
    if (versions.some((v) => v.is_published)) problems.push('a version is published — edit it in /admin instead');
    for (const r of rows) {
      if (!same(r.takeaways, BEFORE)) problems.push(`${r.kind}: takeaways are not the 4 left by review round 1 (${JSON.stringify(r.takeaways)})`);
      if (count(r.html, INTRO_P3) !== 1) problems.push(`${r.kind}: the "If you own…" intro paragraph found ${count(r.html, INTRO_P3)}×`);
    }
    if (problems.length) {
      console.log('\n' + '!'.repeat(72));
      for (const p of ['NOT APPLIED — nothing was written (editors own the article):', ...problems.map((p) => `  • ${p}`)]) console.log(`${SCRIPT}: ${p}`);
      console.log('!'.repeat(72) + '\n');
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', problems.join('; '));
      return;
    }
    const edits = rows.map((r) => ({ ...r, html: r.html.replace(INTRO_P3, '') }));
    for (const e of edits) if (sanitizeArticleBodyHtml(e.html) !== e.html) throw new Error(`${e.kind}: the edited body is not sanitizer-stable`);

    await c.query('BEGIN');
    const [liveEdit, ...versionEdits] = edits;
    await c.query(
      `UPDATE cms_articles
          SET v2 = jsonb_set(v2, '{takeaways}', $2::jsonb), body = jsonb_build_object('html', $3::text), updated_at = NOW()
        WHERE id = $1 AND status = 'draft'`,
      [live.id, JSON.stringify(AFTER), liveEdit.html]
    );
    for (const e of versionEdits) {
      await c.query(
        `UPDATE page_drafts
            SET content = jsonb_set(jsonb_set(content, '{v2,takeaways}', $2::jsonb), '{body}', to_jsonb($3::text)), version = version + 1
          WHERE id = $1 AND NOT is_published`,
        [e.id, JSON.stringify(AFTER), e.html]
      );
    }
    const after = (await c.query<{ takeaways: unknown; html: string }>(
      `SELECT v2->'takeaways' AS takeaways, body->>'html' AS html FROM cms_articles WHERE id = $1
       UNION ALL SELECT content->'v2'->'takeaways', content->>'body' FROM page_drafts WHERE page_type = 'article' AND page_slug = $2`,
      [live.id, SLUG]
    )).rows;
    if (after.length !== rows.length || !after.every(isApplied) || !after.every((r) => r.html.includes('<table>'))) {
      throw new Error('post-write verification failed');
    }
    console.log(`  ~ id ${live.id} + ${versionEdits.length} version(s): takeaways 3 + 4 merged; "If you own…" intro paragraph removed`);

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would apply review round 2 to id ${live.id} + ${versionEdits.length} version(s)`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, 'APPLIED', `review round 2 applied to /knowledge-hub/${SLUG} (id ${live.id}, still a draft) + ${versionEdits.length} version(s)`);
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
