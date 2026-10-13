/**
 * Brief 207 follow-up 2 — Marketing's edits of 2026-10-13 to the UNPUBLISHED draft
 * /knowledge-hub/deerfield-animal-shelter-donation-orphans-of-the-storm:
 *   1. title (H1):         "Unclogs for Dogs in Deerfield: $5,000 and 56 Bags of Food for Orphans of the Storm"
 *   2. subtitle (v2.dek):  "Founded in 1928 by silent film star Irene Castle, the shelter is one of the oldest on
 *                           the North Shore. Here's why we chose it, and how you can help."
 *      excerpt (hub card): = the subtitle (the Brief 191 rule the seed follows).
 *   3. NO caption under the hero photo, and NO caption under the truck photo in "What Did J. Blanton
 *      Plumbing Donate…": both are generic Unclogs for Dogs campaign photos, not photos of this
 *      donation, and the captions (added by update-brief-207-real-photos.ts) said they were.
 * The slug, meta title, meta description, the photos and their alts, the shelter-sign caption and
 * everything else are unchanged. Straight apostrophe in "Here's", like the rest of the article
 * (Brief 198 decision 1).
 *
 * ── ONE TIME, SURGICAL, EDITOR STATE WINS (Brief 186; gotcha 27: test this script's OWN edits only) ──
 *   • version columns missing                                → FAILED, exit 1 (schema fault);
 *   • no article with the slug                               → NOT-APPLIED (no article), exit 0;
 *   • a version whose label ends LABEL_SUFFIX exists         → ALREADY-APPLIED, exit 0;
 *   • the article is not a draft                             → NOT-APPLIED (not a draft), exit 0;
 *   • the live row's OR the newest version's title / excerpt /
 *     subtitle is no longer the seeded value                 → NOT-APPLIED (edited in admin), exit 0,
 *     naming each field. Nothing is written by any guard.
 *   Captions: each is removed only where it still holds the exact text the real-photos update wrote
 *   (hero caption field; the truck figure's <figcaption>, exactly once). A caption that is already
 *   gone or was rewritten in /admin is left alone, and the verdict line says so.
 *
 * ── WHAT IT WRITES (one transaction) ───────────────────────────────────────────────────────
 *   • ONE new page_drafts row "Version N — new title, subtitle, no photo captions" (N = existing
 *     versions + 1), is_published = FALSE: the newest version's content with the edits above.
 *   • The live row (still status 'draft'): title / excerpt / v2 / body with the same edits (the
 *     /admin editor fills its form from the live row — the Brief 201 reason). Nothing else moves.
 *   Strings go through the publish writer's sanitizers. Never touches global_settings.
 * MUST run after scripts/update-brief-207-real-photos.ts: that script's guard compares the whole
 * draft (title included) against the seed payload, and it is what adds the two captions removed here.
 *
 * Needs an explicit mode (Brief 147): `commit` applies; `--dry-run` previews.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-207-title-captions.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml, sanitizeCmsPlainText } from '../src/lib/cms/sanitize';
import { sanitizeArticleV2Content } from '../src/lib/cms/article-v2-sanitize';
import { DEK as OLD_DEK, SLUG, TITLE as OLD_TITLE } from './seed-brief-207-deerfield-orphans-of-the-storm';

const SCRIPT = 'update-brief-207-title-captions';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

export const LABEL_SUFFIX = ' — new title, subtitle, no photo captions';
export const NEW_TITLE = 'Unclogs for Dogs in Deerfield: $5,000 and 56 Bags of Food for Orphans of the Storm';
export const NEW_DEK =
  "Founded in 1928 by silent film star Irene Castle, the shelter is one of the oldest on the North Shore. Here's why we chose it, and how you can help.";
/** Exactly what update-brief-207-real-photos.ts wrote — removed only while still this text. */
const OLD_HERO_CAPTION = 'The J. Blanton team with the food donation at Orphans of the Storm.';
const OLD_TRUCK_FIGCAPTION = '<figcaption>The food donation, loaded up for Orphans of the Storm.</figcaption>';

function banner(lines: string[]) {
  console.log('\n' + '!'.repeat(72));
  for (const l of lines) console.log(`${SCRIPT}: ${l}`);
  console.log('!'.repeat(72) + '\n');
}

type Obj = Record<string, unknown>;
const asObj = (x: unknown): Obj => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Obj) : {});
const count = (s: string, sub: string) => s.split(sub).length - 1;

/** Apply the caption edits to one (v2, body) pair; returns the new pair and what it did. */
function dropCaptions(v2: Obj, body: string, where: string) {
  const notes: string[] = [];
  let caption = v2.image_caption;
  if (caption === OLD_HERO_CAPTION) caption = '';
  else notes.push(`${where} hero caption ${caption ? 'rewritten in /admin — left' : 'already empty'}`);
  let html = body;
  const n = count(html, OLD_TRUCK_FIGCAPTION);
  if (n === 1) html = html.replace(OLD_TRUCK_FIGCAPTION, '');
  else notes.push(`${where} truck caption ${n === 0 ? 'not found (removed or rewritten) — left' : `found ${n}× — left`}`);
  return { v2: { ...v2, image_caption: caption }, body: html, notes };
}

async function main(pool: Pool) {
  const mode = resolveRunMode(SCRIPT);
  console.log(`MODE: ${mode === 'commit' ? 'COMMIT' : 'DRY RUN (nothing is written)'}\n`);
  const title = sanitizeCmsPlainText(NEW_TITLE);
  const dek = sanitizeCmsPlainText(NEW_DEK);
  if (title !== NEW_TITLE || dek !== NEW_DEK) throw new Error('the sanitizer changed the new title or subtitle');

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
      await c.query<{ id: number; status: string; title: string; excerpt: string | null; v2: unknown; html: string | null }>(
        `SELECT id, status, title, excerpt, v2, body->>'html' AS html FROM cms_articles WHERE slug = $1`,
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
      banner([`NOT APPLIED — the article is ${live.status}, not a draft. Make these edits in /admin.`]);
      verdict(SCRIPT, 'NOT-APPLIED (not a draft)', `id ${live.id} is ${live.status} — nothing written`);
      return;
    }

    // ── The title/subtitle must still be the seeded values on the live row and the newest version ──
    const latest = versions[0];
    const lc = asObj(latest?.content);
    const diffs: string[] = [];
    if (!latest) diffs.push('no version row');
    if (latest?.is_published) diffs.push(`version "${latest.label}" is published`);
    if (live.title !== OLD_TITLE) diffs.push('live.title');
    if (live.excerpt !== OLD_DEK) diffs.push('live.excerpt');
    if (asObj(live.v2).dek !== OLD_DEK) diffs.push('live.v2.dek');
    if (latest) {
      if (lc.title !== OLD_TITLE) diffs.push(`version "${latest.label}".title`);
      if (lc.excerpt !== OLD_DEK) diffs.push(`version "${latest.label}".excerpt`);
      if (asObj(lc.v2).dek !== OLD_DEK) diffs.push(`version "${latest.label}".v2.dek`);
    }
    if (diffs.length) {
      banner(['NOT APPLIED — the title/subtitle were changed since the seed (edited in /admin). Nothing was written. Differs:', ...diffs.map((d) => `  • ${d}`)]);
      verdict(SCRIPT, 'NOT-APPLIED (edited in admin)', `differs: ${diffs.join(', ')}`);
      return;
    }

    const ver = dropCaptions(asObj(lc.v2), typeof lc.body === 'string' ? lc.body : '', 'version');
    const liv = dropCaptions(asObj(live.v2), live.html ?? '', 'live');
    const label = `Version ${versions.length + 1}${LABEL_SUFFIX}`;
    const content = {
      ...lc,
      title,
      excerpt: dek,
      body: sanitizeArticleBodyHtml(ver.body),
      v2: sanitizeArticleV2Content({ ...ver.v2, dek }),
    };
    const liveV2 = sanitizeArticleV2Content({ ...liv.v2, dek });
    const liveBody = sanitizeArticleBodyHtml(liv.body);
    const before = versions.map((v) => `${v.id}:${JSON.stringify(v.content)}:${v.is_published}`).join('|');

    await c.query('BEGIN');
    const ins = await c.query<{ id: number }>(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, is_published, published_at)
       VALUES ('article', $1, $2, $3, $4, FALSE, NULL) RETURNING id`,
      [SLUG, label, JSON.stringify(content), latest.created_by]
    );
    const upd = await c.query(
      `UPDATE cms_articles SET title = $2, excerpt = $3, v2 = $4::jsonb, body = $5::jsonb, updated_at = NOW()
        WHERE id = $1 AND status = 'draft'`,
      [live.id, title, dek, JSON.stringify(liveV2), JSON.stringify({ html: liveBody })]
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
    const row = (await c.query<{ status: string; title: string; excerpt: string; dek: string; html: string }>(
      `SELECT status, title, excerpt, v2->>'dek' AS dek, body->>'html' AS html FROM cms_articles WHERE id = $1`,
      [live.id]
    )).rows[0];
    const newest = asObj(after[0]?.content);
    if (
      after.length !== versions.length + 1 || after[0].id !== ins.rows[0].id || after[0].is_published || others !== before ||
      row.status !== 'draft' || row.title !== NEW_TITLE || row.excerpt !== NEW_DEK || row.dek !== NEW_DEK ||
      newest.title !== NEW_TITLE || asObj(newest.v2).dek !== NEW_DEK || newest.image !== lc.image ||
      count(row.html, '<figure>') !== count(live.html ?? '', '<figure>') || count(String(newest.body), '<figure>') !== count(String(lc.body), '<figure>')
    ) {
      throw new Error('post-write verification failed');
    }
    const notes = [...ver.notes, ...liv.notes];
    console.log(`  + page_drafts "${label}" (id ${ins.rows[0].id}), unpublished — the newest version, so the review link shows it`);
    console.log(`  ~ cms_articles id ${live.id}: title / excerpt / subtitle updated; captions removed where still as written (status still draft)`);
    for (const n of notes) console.log(`  ! ${n}`);
    console.log(`  = ${versions.length} earlier version(s) unchanged; photos, alts, FAQ, tags, meta untouched`);

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would add "${label}" to id ${live.id}`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, 'APPLIED', `"${label}" added to /knowledge-hub/${SLUG} (id ${live.id}, still a draft)${notes.length ? `; ${notes.join('; ')}` : ''}`);
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
