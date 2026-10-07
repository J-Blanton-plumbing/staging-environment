/**
 * Brief 199, review round 1 (Marketing, 2026-10-07) — four edits to the UNPUBLISHED draft
 * /knowledge-hub/older-homes-plumbing-problems-grandview-clintonville-german-village,
 * which the create-once seed already created on production (deploy #130):
 *   1. key takeaway 1: "That age often means …" → "Age often means …";
 *   2. the table's lead-in "<p>Here's when most homes in each neighborhood were built:</p>" is removed;
 *   3. the clay-pipe <figure> moves from after the "Clay sewer laterals." paragraph to right after the
 *      "What Kind of Pipes…" intro paragraph (above the four material paragraphs);
 *   4. `<p>[[office-map]]</p>` is added at the end of "Neighborhood by Neighborhood" (after the German
 *      Village paragraph), so V2 renders the pinned Columbus office map there instead of after the body.
 * The seed itself now writes the same result, so a fresh environment needs no update.
 *
 * ── SURGICAL, ONE TIME, EDITOR STATE WINS (Brief 186) ───────────────────────
 * Applied to the live row AND every version row of the article in ONE transaction, and only if
 * EVERY row still has each anchor exactly once (so the move/remove/insert is unambiguous) and
 * takeaway 1 still reads exactly as seeded. Any other copy an editor changed is preserved.
 *   • article missing, published, or any version published      → NOT-APPLIED, exit 0, nothing written;
 *   • an anchor missing / not unique, or takeaway 1 edited       → NOT-APPLIED, exit 0, nothing written;
 *   • every row already shows the R1 result                      → ALREADY-APPLIED, exit 0;
 *   • the edited body would change under sanitizeArticleBodyHtml → FAILED, exit 1 (a code fault).
 * Each version row gets `version = version + 1`, like every drafts.ts writer, so an editor tab
 * opened before the deploy gets the normal "changed by someone else" conflict instead of
 * silently saving the old copy back.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-199-older-homes-review-1.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';

const SCRIPT = 'update-brief-199-older-homes-review-1';
const mode = resolveRunMode(SCRIPT);

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';
const pool = new Pool({ connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms' });

const SLUG = 'older-homes-plumbing-problems-grandview-clintonville-german-village';
const TAKEAWAY_OLD = 'That age often means clay sewer lines, cast iron drains, galvanized or lead water lines, and roots from mature trees.';
const TAKEAWAY_NEW = 'Age often means clay sewer lines, cast iron drains, galvanized or lead water lines, and roots from mature trees.';
const LEAD_IN = "\n<p>Here's when most homes in each neighborhood were built:</p>";
const FIGURE_RE = /\n<figure><img src="\/images\/knowledge-hub\/columbus-older-homes\/clay-sewer-pipe-roots\.webp"[^>]*>(?:<\/img>)?<figcaption>[\s\S]*?<\/figcaption><\/figure>/g;
const INTRO_END = 'rust inside iron and steel.</p>';
const CLAY_PARA = '<p><strong>Clay sewer laterals.</strong>';
const GV_END = 'plumbers in German Village</a>.</p>';
const MAP = '\n<p>[[office-map]]</p>';

const count = (s: string, sub: string) => s.split(sub).length - 1;

function isApplied(html: string, takeaway: unknown): boolean {
  const fig = html.search(FIGURE_RE);
  FIGURE_RE.lastIndex = 0;
  return (
    takeaway === TAKEAWAY_NEW &&
    !html.includes(LEAD_IN) &&
    count(html, '[[office-map]]') === 1 &&
    html.includes(GV_END + MAP) &&
    fig >= 0 && html.indexOf(INTRO_END) < fig && fig < html.indexOf(CLAY_PARA)
  );
}

/** The R1 edit, or the reasons it can't be applied unambiguously. */
function applyR1(html: string, takeaway: unknown): { html?: string; problems: string[] } {
  const problems: string[] = [];
  if (takeaway !== TAKEAWAY_OLD) problems.push(`takeaway 1 was edited (${JSON.stringify(takeaway)})`);
  if (count(html, LEAD_IN) !== 1) problems.push(`table lead-in found ${count(html, LEAD_IN)}×`);
  const figs = html.match(FIGURE_RE) ?? [];
  if (figs.length !== 1) problems.push(`clay-pipe figure found ${figs.length}×`);
  if (count(html, INTRO_END) !== 1) problems.push(`"What Kind of Pipes" intro end found ${count(html, INTRO_END)}×`);
  if (count(html, GV_END) !== 1) problems.push(`German Village paragraph end found ${count(html, GV_END)}×`);
  if (html.includes('[[office-map]]')) problems.push('an [[office-map]] marker is already in the body');
  if (problems.length) return { problems };
  const figure = figs[0] as string;
  let out = html.replace(LEAD_IN, '').replace(figure, '');
  out = out.replace(INTRO_END, INTRO_END + figure);
  out = out.replace(GV_END, GV_END + MAP);
  return { html: out, problems };
}

async function main() {
  console.log(`MODE: ${mode === 'commit' ? 'COMMIT' : 'DRY RUN (nothing is written)'}\n`);
  const c = await pool.connect();
  let committed = false;
  try {
    const live = (await c.query<{ id: number; status: string; template: string; html: string | null; takeaway: unknown }>(
      `SELECT id, status, template, body->>'html' AS html, v2->'takeaways'->0 AS takeaway FROM cms_articles WHERE slug = $1`,
      [SLUG]
    )).rows[0];
    if (!live) {
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `no article /knowledge-hub/${SLUG} (the Brief 199 seed did not create it here)`);
      return;
    }
    const versions = (await c.query<{ id: number; label: string; is_published: boolean; html: string | null; takeaway: unknown }>(
      `SELECT id, label, is_published, content->>'body' AS html, content->'v2'->'takeaways'->0 AS takeaway
         FROM page_drafts WHERE page_type = 'article' AND page_slug = $1 ORDER BY id`,
      [SLUG]
    )).rows;

    const rows = [
      { kind: 'live', id: live.id, html: live.html ?? '', takeaway: live.takeaway },
      ...versions.map((v) => ({ kind: `version ${v.id} "${v.label}"`, id: v.id, html: v.html ?? '', takeaway: v.takeaway })),
    ];
    if (rows.every((r) => isApplied(r.html, r.takeaway))) {
      verdict(SCRIPT, 'ALREADY-APPLIED', `id ${live.id}: live row + ${versions.length} version(s) already show review round 1`);
      return;
    }

    const problems: string[] = [];
    if (live.status !== 'draft') problems.push(`the article is ${live.status}, not a draft — edit it in /admin instead`);
    if (live.template !== 'article-v2') problems.push(`template is ${live.template}`);
    if (versions.some((v) => v.is_published)) problems.push('a version is published — edit it in /admin instead');
    const edits = rows.map((r) => ({ ...r, ...applyR1(r.html, r.takeaway) }));
    for (const e of edits) for (const p of e.problems) problems.push(`${e.kind}: ${p}`);
    if (problems.length) {
      console.log('\n' + '!'.repeat(72));
      for (const p of ['NOT APPLIED — nothing was written (editors own the article):', ...problems.map((p) => `  • ${p}`)]) console.log(`${SCRIPT}: ${p}`);
      console.log('!'.repeat(72) + '\n');
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', problems.join('; '));
      return;
    }
    for (const e of edits) {
      if (sanitizeArticleBodyHtml(e.html!) !== e.html) throw new Error(`${e.kind}: the edited body is not sanitizer-stable`);
    }

    await c.query('BEGIN');
    const [liveEdit, ...versionEdits] = edits;
    await c.query(
      `UPDATE cms_articles
          SET body = jsonb_build_object('html', $2::text),
              v2 = jsonb_set(v2, '{takeaways,0}', to_jsonb($3::text)),
              updated_at = NOW()
        WHERE id = $1 AND status = 'draft'`,
      [live.id, liveEdit.html, TAKEAWAY_NEW]
    );
    for (const e of versionEdits) {
      await c.query(
        `UPDATE page_drafts
            SET content = jsonb_set(jsonb_set(content, '{body}', to_jsonb($2::text)), '{v2,takeaways,0}', to_jsonb($3::text)),
                version = version + 1
          WHERE id = $1 AND NOT is_published`,
        [e.id, e.html, TAKEAWAY_NEW]
      );
    }
    // Verify what this run wrote.
    const after = (await c.query<{ html: string; takeaway: unknown }>(
      `SELECT body->>'html' AS html, v2->'takeaways'->0 AS takeaway FROM cms_articles WHERE id = $1`, [live.id]
    )).rows[0];
    const afterV = (await c.query<{ html: string; takeaway: unknown }>(
      `SELECT content->>'body' AS html, content->'v2'->'takeaways'->0 AS takeaway FROM page_drafts WHERE page_type = 'article' AND page_slug = $1`, [SLUG]
    )).rows;
    if (!isApplied(after.html, after.takeaway) || !afterV.every((v) => isApplied(v.html, v.takeaway)) || !after.html.includes('<table>')) {
      throw new Error('post-write verification failed');
    }
    console.log(`  ~ cms_articles id ${live.id}: takeaway 1, lead-in removed, figure moved, [[office-map]] added`);
    console.log(`  ~ page_drafts: ${versionEdits.length} version row(s) updated the same way (version + 1)`);

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would apply review round 1 to id ${live.id} + ${versionEdits.length} version(s)`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, 'APPLIED', `review round 1 applied to /knowledge-hub/${SLUG} (id ${live.id}, still a draft) + ${versionEdits.length} version(s)`);
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
