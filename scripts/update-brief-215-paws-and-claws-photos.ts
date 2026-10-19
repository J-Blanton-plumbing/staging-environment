/**
 * Brief 215 — the Paws and Claws Evanston draft gets its sharper hero and 2 body photos,
 * as "Version 2 — photos", on the UNPUBLISHED draft /knowledge-hub/evanston-animal-rescue-donation-paws-and-claws:
 *   • hero → hero-v2.webp (1600 × 1067, same scene, same alt, caption still empty);
 *   • C1: a full-width <figure> (team with the pumpkin truck) after "What Was Rally for Rescues?"'s
 *     first paragraph;
 *   • C2: the "Who Is Paws and Claws Cat Rescue?" first paragraph becomes an Image + text component
 *     named `kittens` (image right, paragraphs), its text the paragraph verbatim; `[[component:kittens]]`
 *     replaces it in the body.
 * The copy is NOT changed. The base is the LATEST version's content (not the Brief 214 seed payload), so
 * anything Marketing saved in /admin — e.g. removing "[DRAFT QUOTE] " — survives into Version 2.
 * Version 1 is never touched. The article stays a draft; nothing public changes.
 *
 * ── ONE TIME, GUARDED (Brief 201 pattern) ───────────────────────────────────
 * Verdicts (all exit 0 except a code/schema fault):
 *   • Brief 190 / component columns missing ........................ FAILED, exit 1
 *   • no article with this slug ..................................... NOT-APPLIED (no article)
 *   • the live row is not a draft ................................... NOT-APPLIED (not a draft)
 *   • a "Version 2 — photos" version already exists ................. ALREADY-APPLIED
 *   • the body already has the pumpkin figure, [[component:kittens]] or a `kittens` component
 *                                                                    → ALREADY-APPLIED (photos present)
 *   • C1 or C2 anchor paragraph not found EXACTLY ONCE in the latest body
 *                                                                    → NOT-APPLIED (anchor missing: C1|C2)
 * Nothing is written on any NOT-APPLIED / ALREADY-APPLIED verdict.
 *
 * ── WRITES (one transaction) ────────────────────────────────────────────────
 *   • one NEW page_drafts row "Version 2 — photos", is_published = false, content = the payload the
 *     editor saves (sanitized body via sanitizeArticleBodyHtml, v2 via sanitizeArticleV2Content);
 *   • the live cms_articles row: body / image / v2 = Version 2 (status stays 'draft'), so /review shows it.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/update-brief-215-paws-and-claws-photos.ts commit
 */
import { existsSync, readFileSync } from 'fs';
import { Pool, type PoolClient } from 'pg';
import { resolveRunMode, verdict } from './lib/run-mode';
import { sanitizeArticleBodyHtml } from '../src/lib/cms/sanitize';
import { sanitizeArticleV2Content } from '../src/lib/cms/article-v2-sanitize';
import type { ArticleV2Component } from '../src/lib/cms/article-v2';

const SCRIPT = 'update-brief-215-paws-and-claws-photos';
export const SLUG = 'evanston-animal-rescue-donation-paws-and-claws';
export const VERSION_LABEL = 'Version 2 — photos';
const IMG = '/images/knowledge-hub/paws-and-claws-evanston';
export const HERO_V2 = `${IMG}/hero-v2.webp`;
const PUMPKIN_SRC = `${IMG}/paws-and-claws-team-pumpkins.webp`;
const KITTENS_SRC = `${IMG}/kittens.webp`;
const COMPONENT = 'kittens';

// Alt / caption text from Brief 215 Tracks B, C1, C2 (verbatim).
const HERO_ALT = 'J. Blanton Plumbing team presenting a $5,000 donation check to Paws and Claws Cat Rescue staff at the Evanston adoption center';
const PUMPKIN_ALT = 'Three Paws and Claws Cat Rescue team members smiling beside a moving truck loaded with pumpkins, mums and hay bales';
const PUMPKIN_CAPTION = 'The Paws and Claws team getting ready for Rally for Rescues.';
const KITTENS_ALT = 'Four black and black-and-white kittens sitting together on a fluffy white cat bed';
const KITTENS_CAPTION = 'Kittens in the care of Paws and Claws Cat Rescue.';

/** Opening words of the two anchor paragraphs (C1, C2), matched on normalized text. */
const ANCHOR_C1 = "Rally for Rescues is Paws and Claws Cat Rescue's annual community fundraiser at Baker Park";
const ANCHOR_C2 = 'Paws and Claws Cat Rescue is an Evanston nonprofit that rescues cats at risk of euthanasia';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) =>
  process.env[k] || (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

/** Tags stripped, entities decoded, whitespace collapsed — how an anchor is compared. */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every <p>…</p> in the body with its span, so an anchor can be located exactly once. */
function paragraphs(body: string): { html: string; start: number; end: number; text: string }[] {
  const out: { html: string; start: number; end: number; text: string }[] = [];
  const re = /<p>[\s\S]*?<\/p>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out.push({ html: m[0], start: m.index, end: m.index + m[0].length, text: plainText(m[0]) });
  return out;
}

/** The single paragraph whose text starts with `opening`, or the count found (≠ 1 → NOT-APPLIED). */
export function findAnchor(body: string, opening: string): { ok: true; para: { html: string; start: number; end: number } } | { ok: false; count: number } {
  const hits = paragraphs(body).filter((p) => p.text.startsWith(opening));
  if (hits.length !== 1) return { ok: false, count: hits.length };
  return { ok: true, para: hits[0] };
}

const figure = (src: string, width: number, height: number, alt: string, caption: string) =>
  `<figure><img src="${src}" alt="${alt}" width="${width}" height="${height}" loading="lazy"><figcaption>${caption}</figcaption></figure>`;

/** Brief 215 body edits on the latest version's body. Returns null when an anchor is not unique. */
export function buildBody(latestBody: string): { body: string; kittensText: string } | { missing: 'C1' | 'C2' } {
  const c1 = findAnchor(latestBody, ANCHOR_C1);
  if (!c1.ok) return { missing: 'C1' };
  const c2 = findAnchor(latestBody, ANCHOR_C2);
  if (!c2.ok) return { missing: 'C2' };
  const edits = [
    { at: c1.para.end, del: 0, ins: figure(PUMPKIN_SRC, 1200, 900, PUMPKIN_ALT, PUMPKIN_CAPTION) },
    { at: c2.para.start, del: c2.para.end - c2.para.start, ins: '<p>[[component:kittens]]</p>' },
  ].sort((a, b) => b.at - a.at);
  let body = latestBody;
  for (const e of edits) body = body.slice(0, e.at) + e.ins + body.slice(e.at + e.del);
  // The item text is the anchor paragraph's inner HTML, verbatim (inline formatting kept).
  const kittensText = c2.para.html.slice('<p>'.length, -'</p>'.length);
  return { body, kittensText };
}

/** The new Image + text component (Brief 201 shape). */
export function kittensComponent(kittensText: string): ArticleV2Component {
  return {
    name: COMPONENT,
    type: 'media-text',
    items: [{ title: '', text: kittensText, checklist: [], link_label: '', link_url: '' }],
    media: {
      image_url: KITTENS_SRC,
      image_width: 800,
      image_height: 800,
      image_alt: KITTENS_ALT,
      image_caption: KITTENS_CAPTION,
      image_side: 'right',
      text_style: 'paragraphs',
    },
  } as unknown as ArticleV2Component;
}

function banner(lines: string[]) {
  console.log('\n' + '!'.repeat(72));
  for (const l of lines) console.log(`${SCRIPT}: ${l}`);
  console.log('!'.repeat(72) + '\n');
}

async function main(pool: Pool) {
  const mode = resolveRunMode(SCRIPT);
  console.log(`MODE: ${mode === 'commit' ? 'COMMIT' : 'DRY RUN (nothing is written)'}\n`);
  const c: PoolClient = await pool.connect();
  let committed = false;
  try {
    // ── Schema (a code fault → exit 1) ──
    const cols = await c.query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'cms_articles' AND column_name IN ('template', 'v2', 'body', 'image', 'status')`
    );
    if (cols.rows.length !== 5) {
      throw new Error(`cms_articles is missing column(s): ${['template', 'v2', 'body', 'image', 'status'].filter((k) => !cols.rows.some((r) => r.column_name === k)).join(', ')}`);
    }

    // ── Guard: article exists ──
    const live = (
      await c.query<{ id: number; status: string; body: { html?: string } | null; image: string; v2: { components?: unknown[] } | null }>(
        `SELECT id, status, body, image, v2 FROM cms_articles WHERE slug = $1 ORDER BY id LIMIT 1`,
        [SLUG]
      )
    ).rows[0];
    if (!live) {
      verdict(SCRIPT, 'NOT-APPLIED (no article)', `no cms_articles row with slug ${SLUG} — nothing written`);
      return;
    }

    // ── Guard: draft ──
    if (live.status !== 'draft') {
      banner([`NOT APPLIED — the article is ${live.status}, not a draft. Nothing was written.`]);
      verdict(SCRIPT, 'NOT-APPLIED (not a draft)', `id ${live.id} is ${live.status} — nothing written`);
      return;
    }

    const versions = (
      await c.query<{ id: number; label: string; is_published: boolean; created_by: number; content: { body?: string; v2?: { components?: { name?: string }[] } } }>(
        `SELECT id, label, is_published, created_by, content FROM page_drafts
          WHERE page_type = 'article' AND page_slug = $1
          ORDER BY created_at DESC, id DESC`,
        [SLUG]
      )
    ).rows;

    // ── Guard: already applied ──
    if (versions.some((v) => v.label === VERSION_LABEL)) {
      verdict(SCRIPT, 'ALREADY-APPLIED', `"${VERSION_LABEL}" already exists on id ${live.id} — nothing written`);
      return;
    }
    const latest = versions[0];
    if (!latest) {
      verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', `id ${live.id} has no page_drafts version to build on — nothing written`);
      return;
    }
    const latestBody: string = latest.content.body ?? '';
    const latestComponents = (latest.content.v2?.components ?? []) as { name?: string }[];
    const liveComponents = (live.v2?.components ?? []) as { name?: string }[];
    const hasPhotos =
      latestBody.includes('paws-and-claws-team-pumpkins') ||
      latestBody.includes('[[component:kittens]]') ||
      latestComponents.some((k) => k.name === COMPONENT) ||
      liveComponents.some((k) => k.name === COMPONENT);
    if (hasPhotos) {
      verdict(SCRIPT, 'ALREADY-APPLIED', `photos present — the latest body or components already carry the Brief 215 photos — nothing written`);
      return;
    }

    // ── Guard: anchors exactly once in the latest body ──
    const built = buildBody(latestBody);
    if ('missing' in built) {
      const which = built.missing;
      const why = which === 'C1' ? ANCHOR_C1 : ANCHOR_C2;
      banner([`NOT APPLIED — anchor ${which} not found exactly once in the latest version. Nothing was written.`, `  anchor starts: "${why}"`]);
      verdict(SCRIPT, 'NOT-APPLIED (anchor missing)', `anchor ${which} not found exactly once in the latest body — nothing written`);
      return;
    }

    // ── Build Version 2 from the latest version's payload ──
    const base = latest.content as Record<string, unknown> & { v2: { components?: ArticleV2Component[] } & Record<string, unknown> };
    const v2Base = { ...base.v2, components: [...(base.v2.components ?? []), kittensComponent(built.kittensText)] };
    const bodyHtml = sanitizeArticleBodyHtml(built.body);
    const content = {
      ...base,
      body: bodyHtml,
      image: HERO_V2,
      v2: sanitizeArticleV2Content(v2Base),
    };
    const v2 = content.v2 as unknown as { components: { name: string; media?: { image_url?: string } }[] };
    const compNames = v2.components.map((k) => k.name);
    if (!bodyHtml.includes('[[component:kittens]]') || !bodyHtml.includes('paws-and-claws-team-pumpkins') || !compNames.includes(COMPONENT)) {
      throw new Error('Version 2 did not survive sanitizing (photo marker, pumpkin figure or kittens component missing)');
    }
    if (/placeholder|PHOTO PLACEHOLDER/i.test(bodyHtml + JSON.stringify(v2))) throw new Error('Version 2 still references a placeholder');

    const v1Before = versions.map((v) => `${v.id}:${JSON.stringify(v.content)}:${v.is_published}`).join('|');

    await c.query('BEGIN');
    const ins = await c.query<{ id: number }>(
      `INSERT INTO page_drafts (page_type, page_slug, label, content, created_by, is_published, published_at)
       VALUES ('article', $1, $2, $3, $4, FALSE, NULL) RETURNING id`,
      [SLUG, VERSION_LABEL, JSON.stringify(content), latest.created_by]
    );
    const upd = await c.query(
      `UPDATE cms_articles SET body = $2::jsonb, image = $3, v2 = $4::jsonb, updated_at = NOW()
        WHERE id = $1 AND status = 'draft'`,
      [live.id, JSON.stringify({ html: bodyHtml }), HERO_V2, JSON.stringify(v2)]
    );
    if (upd.rowCount !== 1) throw new Error('the live row was not updated');

    // ── Verify what this run wrote (and that Version 1 did not move) ──
    const after = (
      await c.query<{ id: number; label: string; is_published: boolean; content: unknown }>(
        `SELECT id, label, is_published, content FROM page_drafts
          WHERE page_type = 'article' AND page_slug = $1 ORDER BY created_at DESC, id DESC`,
        [SLUG]
      )
    ).rows;
    const others = after.filter((v) => v.id !== ins.rows[0].id).map((v) => `${v.id}:${JSON.stringify(v.content)}:${v.is_published}`).join('|');
    const row = (await c.query<{ status: string; image: string; html: string; n: number }>(
      `SELECT status, image, body->>'html' AS html, jsonb_array_length(v2->'components') AS n FROM cms_articles WHERE id = $1`,
      [live.id]
    )).rows[0];
    if (
      after.length !== versions.length + 1 ||
      after[0].id !== ins.rows[0].id ||
      after[0].is_published ||
      others !== v1Before ||
      row.status !== 'draft' ||
      row.image !== HERO_V2 ||
      row.n !== liveComponents.length + 1 ||
      !row.html.includes('[[component:kittens]]')
    ) {
      throw new Error('post-write verification failed');
    }
    console.log(`  + page_drafts "${VERSION_LABEL}" (id ${ins.rows[0].id}), unpublished — the newest version, so the review link shows it`);
    console.log(`  ~ cms_articles id ${live.id}: body / hero / v2 = Version 2 (status still draft)`);
    console.log(`  = ${versions.length} earlier version(s) unchanged`);

    if (mode !== 'commit') {
      await c.query('ROLLBACK');
      console.log('\n  (dry run — rolled back)');
      verdict(SCRIPT, 'NOT-APPLIED (dry run)', `would add "${VERSION_LABEL}" to id ${live.id}`);
      return;
    }
    await c.query('COMMIT');
    committed = true;
    verdict(SCRIPT, 'APPLIED', `"${VERSION_LABEL}" added to /knowledge-hub/${SLUG} (id ${live.id}, still a draft) — review at /review/knowledge-hub/${SLUG}`);
  } catch (err) {
    if (!committed) await c.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    c.release();
  }
}

// Run only as a script.
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
      const appPool = (await import('../src/lib/db')).default as unknown as { end?: () => Promise<void> };
      await appPool.end?.().catch(() => {});
    });
}
