/**
 * Brief 201, review round 1 (Marketing, 2026-10-07) — remove the caption under the frost-free
 * diagram on the UNPUBLISHED draft /knowledge-hub/hose-bib-irrigation-fall-checklist:
 *   "The valve sits back inside the warm wall, so the faucet body has to drain through the spout."
 * The paragraph beside the diagram already says it. Nothing else changes.
 * update-brief-201-hose-bib-images.ts now writes no caption, so a fresh environment needs no update.
 *
 * ── SURGICAL, ONE TIME, EDITOR STATE WINS (Brief 186) ───────────────────────
 * Touches only `components[frost-free].media.image_caption`, on the live row AND every version row
 * that carries the frost-free Image + text component (Version 1 has none and is not touched), in ONE
 * transaction, and only if every such row still holds exactly that caption:
 *   • Brief 190 / version columns missing                         → FAILED, exit 1 (schema fault);
 *   • no article                                                  → NOT-APPLIED (no article), exit 0;
 *   • the article is not a draft                                  → NOT-APPLIED (not a draft), exit 0;
 *   • the live row has no frost-free Image + text component        → NOT-APPLIED (guard tripped), exit 0;
 *   • every row carrying it already has no caption                 → ALREADY-APPLIED, exit 0;
 *   • any row carrying it has a different caption (edited in admin) → NOT-APPLIED (edited in admin), exit 0.
 * Each version row edited gets `version = version + 1` (like every drafts.ts writer), so an editor tab
 * opened before the deploy gets the normal "changed by someone else" conflict instead of saving the
 * old caption back.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-201-review-1.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool, type PoolClient } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'update-brief-201-review-1';
const SLUG = 'hose-bib-irrigation-fall-checklist';
const COMPONENT = 'frost-free';
const OLD_CAPTION = 'The valve sits back inside the warm wall, so the faucet body has to drain through the spout.';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

interface Target {
  kind: string;
  /** cms_articles.id for the live row, page_drafts.id for a version. */
  id: number;
  /** Index of the frost-free component in v2.components, or -1. */
  index: number;
  caption: unknown;
}

/** Where the frost-free Image + text component sits in a v2 object, and its caption. */
function locate(v2: unknown): { index: number; caption: unknown } {
  const list = v2 && typeof v2 === 'object' ? (v2 as { components?: unknown }).components : undefined;
  if (!Array.isArray(list)) return { index: -1, caption: undefined };
  const index = list.findIndex((c) => c && typeof c === 'object' && (c as { name?: unknown }).name === COMPONENT && (c as { type?: unknown }).type === 'media-text');
  if (index < 0) return { index, caption: undefined };
  return { index, caption: ((list[index] as { media?: { image_caption?: unknown } }).media ?? {}).image_caption };
}

async function readTargets(c: PoolClient, articleId: number): Promise<Target[]> {
  const live = (await c.query<{ v2: unknown }>('SELECT v2 FROM cms_articles WHERE id = $1', [articleId])).rows[0];
  const versions = (await c.query<{ id: number; label: string; v2: unknown }>(
    `SELECT id, label, content->'v2' AS v2 FROM page_drafts WHERE page_type = 'article' AND page_slug = $1 ORDER BY id`,
    [SLUG]
  )).rows;
  return [
    { kind: 'live', id: articleId, ...locate(live.v2) },
    ...versions.map((v) => ({ kind: `version ${v.id} "${v.label}"`, id: v.id, ...locate(v.v2) })),
  ];
}

async function main(pool: Pool) {
  const mode = resolveRunMode(SCRIPT);
  console.log(`MODE: ${mode === 'commit' ? 'COMMIT' : 'DRY RUN (nothing is written)'}\n`);
  const c = await pool.connect();
  let committed = false;
  try {
    const cols = await c.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM information_schema.columns
        WHERE (table_name = 'cms_articles' AND column_name = 'v2')
           OR (table_name = 'page_drafts' AND column_name IN ('content', 'version'))`
    );
    if (cols.rows[0].n !== '3') throw new Error('missing column(s): cms_articles.v2 / page_drafts.content / page_drafts.version');

    const art = (await c.query<{ id: number; status: string }>('SELECT id, status FROM cms_articles WHERE slug = $1', [SLUG])).rows[0];
    if (!art) {
      verdict(SCRIPT, 'NOT-APPLIED (no article)', `no article /knowledge-hub/${SLUG} — nothing written`);
      return;
    }
    if (art.status !== 'draft') {
      verdict(SCRIPT, 'NOT-APPLIED (not a draft)', `id ${art.id} is ${art.status} — remove the caption in /admin instead; nothing written`);
      return;
    }
    const targets = await readTargets(c, art.id);
    const carrying = targets.filter((t) => t.index >= 0);
    if (targets[0].index < 0) {
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `the live row has no "${COMPONENT}" Image + text component (Brief 201 not applied here?) — nothing written`);
      return;
    }
    if (carrying.every((t) => t.caption === '')) {
      verdict(SCRIPT, 'ALREADY-APPLIED', `id ${art.id}: ${carrying.length} row(s) already show no caption under the diagram`);
      return;
    }
    const edited = carrying.filter((t) => t.caption !== OLD_CAPTION && t.caption !== '');
    if (edited.length) {
      const list = edited.map((t) => `${t.kind}: ${JSON.stringify(t.caption)}`);
      console.log('\n' + '!'.repeat(72));
      for (const l of ['NOT APPLIED — the diagram caption was edited in /admin; nothing was written:', ...list.map((x) => `  • ${x}`)]) console.log(`${SCRIPT}: ${l}`);
      console.log('!'.repeat(72) + '\n');
      verdict(SCRIPT, 'NOT-APPLIED (edited in admin)', list.join('; '));
      return;
    }

    const todo = carrying.filter((t) => t.caption === OLD_CAPTION);
    await c.query('BEGIN');
    for (const t of todo) {
      const path = `{components,${t.index},media,image_caption}`;
      if (t.kind === 'live') {
        await c.query(`UPDATE cms_articles SET v2 = jsonb_set(v2, $2::text[], '""'::jsonb), updated_at = NOW() WHERE id = $1 AND status = 'draft'`, [t.id, path]);
      } else {
        await c.query(
          `UPDATE page_drafts SET content = jsonb_set(content, $2::text[], '""'::jsonb), version = version + 1 WHERE id = $1 AND NOT is_published`,
          [t.id, `{v2,${path.slice(1)}`]
        );
      }
    }
    const after = await readTargets(c, art.id);
    if (after.length !== targets.length || after.some((t, i) => t.index !== targets[i].index) || after.some((t) => t.index >= 0 && t.caption !== '')) {
      throw new Error('post-write verification failed');
    }
    for (const t of todo) console.log(`  ~ ${t.kind}: diagram caption removed`);

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would remove the diagram caption from ${todo.length} row(s)`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, 'APPLIED', `diagram caption removed from ${todo.length} row(s) of /knowledge-hub/${SLUG} (id ${art.id}, still a draft)`);
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
