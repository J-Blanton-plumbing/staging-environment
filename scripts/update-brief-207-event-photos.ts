/**
 * Brief 207 follow-up 3 — PHOTOS FROM THE ACTUAL EVENT (Marketing, 2026-10-13) for the UNPUBLISHED draft
 * /knowledge-hub/deerfield-animal-shelter-donation-orphans-of-the-storm. They replace the generic
 * Unclogs for Dogs campaign photos that update-brief-207-real-photos.ts put in:
 *   1. hero → donation-check-orphans-of-the-storm-hero.webp (the $5,000 check handover at the shelter),
 *      new alt, and the hero caption follow-up 2 removed is BACK (it is now true of the photo);
 *   2. "What Did J. Blanton Plumbing Donate…": the generic truck figure → TWO figures, unloading the food
 *      (Photo 1) then the food being wheeled in (Photo 2); the food-donation caption follow-up 2 removed
 *      is BACK, under the second photo so it reads for the pair;
 *   3. "Who Is Orphans of the Storm?": the sign photo → the team at the shelter's welcome sign (Photo 3).
 *      Only its <img> changes; its caption stays as it is.
 * Everything else (title, subtitle, copy, [DRAFT QUOTE], the Unclogs for Dogs logo, FAQ, tags, meta)
 * is unchanged. Each photo has its own alt, written from what is in that photo.
 *
 * ── ONE TIME, SURGICAL, EDITOR STATE WINS (Brief 186; gotcha 27: test this script's OWN fields only) ──
 *   • version columns missing                                → FAILED, exit 1 (schema fault);
 *   • no article with the slug                               → NOT-APPLIED (no article), exit 0;
 *   • a version whose label ends LABEL_SUFFIX exists         → ALREADY-APPLIED, exit 0;
 *   • the article is not a draft                             → NOT-APPLIED (not a draft), exit 0;
 *   • on the live row OR the newest version: the hero is not
 *     the generic team photo, the hero caption is not empty,
 *     the generic truck figure (no caption) or the sign <img>
 *     is not there exactly once — i.e. edited in /admin, or
 *     follow-ups 1–2 did not run                             → NOT-APPLIED (edited in admin), exit 0,
 *     naming each field. Nothing is written by any guard.
 *
 * ── WHAT IT WRITES (one transaction) ───────────────────────────────────────────────────────
 *   • ONE new page_drafts row "Version N — event photos" (N = existing versions + 1), unpublished:
 *     the newest version's content with the edits above.
 *   • The live row (still status 'draft'): image / v2 / body with the same edits.
 *   Body: sanitizeArticleBodyHtml; v2: sanitizeArticleV2Content. Never touches global_settings.
 * MUST run after scripts/update-brief-207-title-captions.ts (it expects the empty hero caption and the
 * caption-less truck figure that step leaves).
 *
 * Needs an explicit mode (Brief 147): `commit` applies; `--dry-run` previews.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-207-event-photos.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';
import { sanitizeArticleV2Content } from '../src/lib/cms/article-v2-sanitize';
import { IMG, SLUG } from './seed-brief-207-deerfield-orphans-of-the-storm';

const SCRIPT = 'update-brief-207-event-photos';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

export const LABEL_SUFFIX = ' — event photos';

// ── What follow-ups 1–2 left (the guard) ──────────────────────────────────────────────────
const OLD_HERO = `${IMG}/team-food-donation-hero.webp`;
const OLD_TRUCK_FIG = sanitizeArticleBodyHtml(
  `<figure><img src="${IMG}/dog-food-donation-truck.webp" alt="Pickup truck bed filled with bags of donated dog food" width="1100" height="733" loading="lazy"></figure>`
);
const OLD_SIGN_IMG = /<img src="\/images\/knowledge-hub\/deerfield-orphans-of-the-storm\/orphans-of-the-storm-sign\.webp"[^>]*>/g;

// ── The event photos (public/images/knowledge-hub/deerfield-orphans-of-the-storm/, all 3:2) ──
export const HERO = `${IMG}/donation-check-orphans-of-the-storm-hero.webp`; // 1200 × 800
export const HERO_ALT =
  'J. Blanton Plumbing and Orphans of the Storm staff holding a $5,000 donation check in front of a J. Blanton Plumbing van';
/** The hero caption follow-up 2 removed, restored word for word. */
export const HERO_CAPTION = 'The J. Blanton team with the food donation at Orphans of the Storm.';
const figure = (file: string, alt: string, caption: string) =>
  `<figure><img src="${IMG}/${file}" alt="${alt}" width="1100" height="733" loading="lazy">${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
export const FIGS_DONATION = sanitizeArticleBodyHtml(
  figure(
    'unloading-dog-food-donation.webp',
    'J. Blanton Plumbing team member unloading bags of dog food from a J. Blanton Plumbing van into a cart',
    ''
  ) +
    '\n' +
    figure(
      'dog-food-delivered-orphans-of-the-storm.webp',
      'Orphans of the Storm staff member wheeling a cart of donated dog food past the J. Blanton Plumbing van',
      // The truck-photo caption follow-up 2 removed, restored word for word, under the pair's second photo.
      'The food donation, loaded up for Orphans of the Storm.'
    )
);
export const SIGN_IMG = sanitizeArticleBodyHtml(
  `<img src="${IMG}/team-at-orphans-of-the-storm-welcome-sign.webp" alt="J. Blanton Plumbing and Orphans of the Storm team members at the shelter's welcome sign" width="1100" height="733" loading="lazy">`
);

function banner(lines: string[]) {
  console.log('\n' + '!'.repeat(72));
  for (const l of lines) console.log(`${SCRIPT}: ${l}`);
  console.log('!'.repeat(72) + '\n');
}

type Obj = Record<string, unknown>;
const asObj = (x: unknown): Obj => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Obj) : {});
const count = (s: string, sub: string) => s.split(sub).length - 1;

/** This script's own fields, on one (image, v2, body) triple. */
function check(where: string, image: unknown, v2: Obj, body: string): string[] {
  const out: string[] = [];
  if (image !== OLD_HERO) out.push(`${where}.image`);
  if ((v2.image_caption ?? '') !== '') out.push(`${where}.v2.image_caption`);
  if (count(body, OLD_TRUCK_FIG) !== 1) out.push(`${where}.body (truck figure)`);
  if ((body.match(OLD_SIGN_IMG) ?? []).length !== 1) out.push(`${where}.body (sign photo)`);
  return out;
}
function edit(v2: Obj, body: string) {
  return {
    v2: sanitizeArticleV2Content({ ...v2, image_alt: HERO_ALT, image_caption: HERO_CAPTION }),
    body: sanitizeArticleBodyHtml(body.replace(OLD_TRUCK_FIG, FIGS_DONATION).replace(OLD_SIGN_IMG, SIGN_IMG)),
  };
}

async function main(pool: Pool) {
  const mode = resolveRunMode(SCRIPT);
  console.log(`MODE: ${mode === 'commit' ? 'COMMIT' : 'DRY RUN (nothing is written)'}\n`);
  if (!OLD_TRUCK_FIG.includes('dog-food-donation-truck.webp') || count(FIGS_DONATION, '<figure>') !== 2 || !SIGN_IMG.startsWith('<img ')) {
    throw new Error('the sanitizer changed the figure markup this script relies on');
  }
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
      await c.query<{ id: number; status: string; image: string | null; v2: unknown; html: string | null }>(
        `SELECT id, status, image, v2, body->>'html' AS html FROM cms_articles WHERE slug = $1`,
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
      banner([`NOT APPLIED — the article is ${live.status}, not a draft. Swap the photos in /admin.`]);
      verdict(SCRIPT, 'NOT-APPLIED (not a draft)', `id ${live.id} is ${live.status} — nothing written`);
      return;
    }

    const latest = versions[0];
    const lc = asObj(latest?.content);
    const diffs: string[] = [];
    if (!latest) diffs.push('no version row');
    if (latest?.is_published) diffs.push(`version "${latest.label}" is published`);
    diffs.push(...check('live', live.image, asObj(live.v2), live.html ?? ''));
    if (latest) diffs.push(...check(`version "${latest.label}"`, lc.image, asObj(lc.v2), typeof lc.body === 'string' ? lc.body : ''));
    if (diffs.length) {
      banner(['NOT APPLIED — the photos/captions are not as follow-ups 1–2 left them (edited in /admin?). Nothing was written. Differs:', ...diffs.map((d) => `  • ${d}`)]);
      verdict(SCRIPT, 'NOT-APPLIED (edited in admin)', `differs: ${diffs.join(', ')}`);
      return;
    }

    const ver = edit(asObj(lc.v2), lc.body as string);
    const liv = edit(asObj(live.v2), live.html ?? '');
    const label = `Version ${versions.length + 1}${LABEL_SUFFIX}`;
    const content = { ...lc, image: HERO, body: ver.body, v2: ver.v2 };
    const before = versions.map((v) => `${v.id}:${JSON.stringify(v.content)}:${v.is_published}`).join('|');

    await c.query('BEGIN');
    const ins = await c.query<{ id: number }>(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, is_published, published_at)
       VALUES ('article', $1, $2, $3, $4, FALSE, NULL) RETURNING id`,
      [SLUG, label, JSON.stringify(content), latest.created_by]
    );
    const upd = await c.query(
      `UPDATE cms_articles SET image = $2, v2 = $3::jsonb, body = $4::jsonb, updated_at = NOW() WHERE id = $1 AND status = 'draft'`,
      [live.id, HERO, JSON.stringify(liv.v2), JSON.stringify({ html: liv.body })]
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
    const row = (await c.query<{ status: string; image: string; cap: string; html: string }>(
      `SELECT status, image, v2->>'image_caption' AS cap, body->>'html' AS html FROM cms_articles WHERE id = $1`,
      [live.id]
    )).rows[0];
    const newest = asObj(after[0]?.content);
    const generic = /team-food-donation-hero|dog-food-donation-truck|orphans-of-the-storm-sign\.webp/;
    if (
      after.length !== versions.length + 1 || after[0].id !== ins.rows[0].id || after[0].is_published || others !== before ||
      row.status !== 'draft' || row.image !== HERO || row.cap !== HERO_CAPTION ||
      generic.test(row.html) || generic.test(String(newest.body)) || newest.image !== HERO ||
      count(row.html, '<figure>') !== count(live.html ?? '', '<figure>') + 1 ||
      !row.html.includes('team-at-orphans-of-the-storm-welcome-sign.webp') || !row.html.includes('unclogs-for-dogs-logo.webp')
    ) {
      throw new Error('post-write verification failed');
    }
    console.log(`  + page_drafts "${label}" (id ${ins.rows[0].id}), unpublished — the newest version, so the review link shows it`);
    console.log(`  ~ cms_articles id ${live.id}: hero + caption, 2 donation photos + caption, welcome-sign photo (status still draft)`);
    console.log(`  = ${versions.length} earlier version(s) unchanged; title, subtitle, copy, logo, FAQ, tags, meta untouched`);

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
