/**
 * Brief 220 (Track C1) — create the Homepage 2026 record and the Live homepage switch, WITHOUT
 * changing what `/` shows. Runs as a deploy step BEFORE the build swap. Fill-only and idempotent.
 *
 * ── WHAT IT DOES ─────────────────────────────────────────────────────────────
 *   1. global_settings.homepage_active: added if missing, and set to 'classic' ONLY WHEN IT IS NULL.
 *      Never written otherwise — a seed that reset it would roll the homepage back on every deploy.
 *   2. Backs up the Classic row (`main_pages` home) into `brief220_home_row_backup` (once). The Classic
 *      row, its versions and its code are NOT touched.
 *   3. The `main_pages` row `home-2026`: created if missing (content '{}', page_type 'home-2026'; status
 *      is NOT written here — publishDraft sets it, the Brief 204 rule).
 *   4. First run only (no Homepage 2026 version exists yet):
 *        • uploads the 37 Homepage 2026 images (29 job photos, 7 service-card photos, the BBB seal — the prototype's
 *          original files, committed under public/images/home-2026/) to S3 as NEW keys through the
 *          editor's own upload path (putObject + cms_media). An identical file already uploaded
 *          (same name and size) is reused; nothing is ever overwritten. Without S3 configured (a
 *          local run) the committed /images/home-2026/… paths are used instead.
 *        • builds the content = the prototype defaults (`home2026Defaults`) with those URLs, plus
 *          Classic's LIVE meta title / description (the README: keep the live meta);
 *        • GATE: refuses to write anything unless that content renders with NO fallback for any
 *          field (`resolveHome2026Content(...).fallbacks` empty, with the same image hosts the page
 *          allows);
 *        • creates "Version 1 — Homepage 2026" and publishes it through createDraft + publishDraft.
 *   Once a Homepage 2026 version exists, step 4 reports ALREADY-APPLIED: the record is Marketing's.
 *
 * Safe before the swap: the build still serving traffic has no route for `home-2026` (/home-2026 is a
 * [city] 404) and never reads the switch, so nothing visible changes. Content state is never a
 * failure (Brief 186); exit 1 only for a code / schema / config fault (e.g. the gate).
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-brief-220-home-2026.ts          # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-brief-220-home-2026.ts commit   # apply
 */
import { existsSync, readFileSync, statSync } from 'fs';
import { basename, join } from 'path';

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}

/* eslint-disable import/first */
import sharp from 'sharp';
import pool from '../src/lib/db';
import { createDraft, publishDraft } from '../src/lib/cms/drafts';
import { insertMedia } from '../src/lib/cms/media';
import { getS3Config, putObject } from '../src/lib/storage/s3';
import { sanitizeHome2026Content } from '../src/lib/cms/sanitize';
import {
  HOME_2026_PAGE_TYPE,
  HOME_2026_SLUG,
  home2026Defaults,
  resolveHome2026Content,
  type H26Job,
  type H26ServiceCard,
} from '../src/lib/cms/home-2026-content';
import { authorId } from './lib/city-pages-seed';
import { resolveRunMode, announceMode, verdict } from './lib/run-mode';

const SCRIPT = 'seed-brief-220-home-2026';
const mode = resolveRunMode(SCRIPT);
const apply = mode === 'commit';
const LABEL = 'Version 1 — Homepage 2026';
const LOCAL_PREFIX = '/images/home-2026/';

/** The https hosts next/image may load — the same list the homepage builds (ClassicHome IMAGE_HOSTS). */
function imageHosts(): string[] {
  const hosts = ['lh3.googleusercontent.com', 'd1rplazj5a80fb.cloudfront.net'];
  try {
    if (process.env.S3_UPLOAD_PUBLIC_BASE_URL) hosts.push(new URL(process.env.S3_UPLOAD_PUBLIC_BASE_URL).hostname);
  } catch {
    /* a malformed env value: the page ignores it too */
  }
  return hosts;
}

const MIME: Record<string, string> = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' };

/** A committed /images/home-2026/… file → its S3 URL (existing identical upload, or a new key). */
async function uploadOne(sitePath: string, by: number): Promise<{ url: string; how: 'reused' | 'uploaded' | 'local' | 'would-upload' }> {
  const file = join(process.cwd(), 'public', sitePath);
  const bytes = readFileSync(file);
  const name = basename(file);
  const existing = (
    await pool.query<{ url: string }>(`SELECT url FROM cms_media WHERE original_filename = $1 AND file_size = $2 ORDER BY id DESC LIMIT 1`, [name, bytes.length])
  ).rows[0];
  if (existing && /^https:\/\//.test(existing.url)) return { url: existing.url, how: 'reused' };
  const s3 = getS3Config();
  if (!s3) return { url: sitePath, how: 'local' };
  if (!apply) return { url: sitePath, how: 'would-upload' };
  const filename = `${Date.now()}-${name}`;
  const ext = name.split('.').pop()!.toLowerCase();
  const put = await putObject(filename, bytes, MIME[ext] ?? 'application/octet-stream', s3);
  const meta = await sharp(bytes).metadata().catch(() => ({ width: null, height: null }) as { width: number | null; height: number | null });
  const client = await pool.connect();
  try {
    await insertMedia(client, {
      filename,
      originalFilename: name,
      url: put.url,
      mimeType: MIME[ext] ?? 'application/octet-stream',
      fileSize: statSync(file).size,
      width: meta.width ?? null,
      height: meta.height ?? null,
      uploadedBy: by,
    });
  } finally {
    client.release();
  }
  return { url: put.url, how: 'uploaded' };
}

async function main() {
  announceMode(SCRIPT, mode);
  const notes: string[] = [];

  // ── 1. The switch: create as 'classic' only when missing. ────────────────────────────────────
  if (apply) await pool.query(`ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS homepage_active TEXT`);
  const sw = (await pool.query<{ active: string | null; has_row: boolean }>(
    `SELECT (SELECT to_jsonb(g) ->> 'homepage_active' FROM global_settings g WHERE id = 1) AS active,
            EXISTS (SELECT 1 FROM global_settings WHERE id = 1) AS has_row`
  )).rows[0];
  if (!sw.has_row) {
    notes.push('switch: no global_settings row — `/` renders Classic (the default) until one exists');
  } else if (sw.active === null) {
    if (apply) {
      const r = await pool.query(`UPDATE global_settings SET homepage_active = 'classic' WHERE id = 1 AND homepage_active IS NULL`);
      notes.push(`switch: created homepage_active = 'classic' (${r.rowCount} row)`);
    } else notes.push(`switch: would create homepage_active = 'classic'`);
  } else {
    notes.push(`switch: already '${sw.active}' — left exactly as it is`);
  }

  // ── 2. Backup of the Classic row (never changed). ─────────────────────────────────────────────
  const classic = (await pool.query<{ id: number; version: number; status: string | null; content: Record<string, unknown>; meta_title: string | null; meta_description: string | null }>(
    `SELECT id, version, status, content, meta_title, meta_description FROM main_pages WHERE slug = 'home'`
  )).rows[0];
  if (apply) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS brief220_home_row_backup (
        id            SERIAL PRIMARY KEY,
        source_table  TEXT NOT NULL,
        source_key    TEXT NOT NULL,
        reason        TEXT NOT NULL,
        row_json      JSONB NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    const had = Number((await pool.query<{ n: string }>(`SELECT count(*) AS n FROM brief220_home_row_backup WHERE source_key = 'home'`)).rows[0].n);
    if (!had && classic) {
      await pool.query(`INSERT INTO brief220_home_row_backup (source_table, source_key, reason, row_json) VALUES ('main_pages', 'home', $1, $2)`, [
        'Classic homepage row at the Brief 220 deploy (not changed by it; kept for the record)',
        JSON.stringify(classic),
      ]);
      notes.push(`backup: Classic row (id ${classic.id}, version ${classic.version}) → brief220_home_row_backup`);
    }
  }

  // ── 3/4. The Homepage 2026 record. ───────────────────────────────────────────────────────────
  const versions = Number(
    (await pool.query<{ n: string }>(`SELECT count(*) AS n FROM page_drafts WHERE page_type = $1 AND page_slug = $2`, [HOME_2026_PAGE_TYPE, HOME_2026_SLUG])).rows[0].n
  );
  if (versions > 0) {
    for (const n of notes) console.log(`  - ${n}`);
    verdict(SCRIPT, 'ALREADY-APPLIED', `Homepage 2026 has ${versions} version(s) — the record is edited in /admin/home; nothing written to it`);
    return;
  }

  const by = await authorId().catch(() => null);
  if (by === null) {
    for (const n of notes) console.log(`  - ${n}`);
    verdict(SCRIPT, 'NOT-APPLIED (no CMS user)', 'no cms_users row to author Version 1');
    return;
  }

  // Content: the prototype defaults with every committed photo swapped for its upload.
  const content = home2026Defaults() as Record<string, unknown> & { services_cards: H26ServiceCard[]; jobs: H26Job[] };
  const counts: Record<string, number> = {};
  const swap = async (path: string): Promise<string> => {
    if (!path.startsWith(LOCAL_PREFIX)) return path;
    const r = await uploadOne(path, by);
    counts[r.how] = (counts[r.how] ?? 0) + 1;
    return r.url;
  };
  for (const card of content.services_cards) card.image = await swap(card.image);
  for (const job of content.jobs) for (const p of job.photos) p.image = await swap(p.image);
  content.bbb_seal = await swap(String(content.bbb_seal));
  notes.push(`photos: ${Object.entries(counts).map(([k, n]) => `${n} ${k}`).join(', ')}`);

  const full = { ...content, meta_title: classic?.meta_title ?? null, meta_description: classic?.meta_description ?? null };

  // GATE: the seeded record must render with no fallback for any field.
  const resolved = resolveHome2026Content(sanitizeHome2026Content(full), imageHosts());
  if (resolved.fallbacks.length) {
    for (const n of notes) console.log(`  - ${n}`);
    console.error(`GATE: the seeded Homepage 2026 would fall back on: ${resolved.fallbacks.join(', ')} — nothing written to the record.`);
    verdict(SCRIPT, 'FAILED', `gate: fallback on ${resolved.fallbacks.join(', ')}`);
    process.exitCode = 1;
    return;
  }
  notes.push(`gate: 0 fallbacks (${resolved.reviews.jobs.length} jobs, ${resolved.reviews.jobs.reduce((n, j) => n + j.photos.length, 0)} job photos, ${resolved.services.cards.length} cards)`);

  if (!apply) {
    for (const n of notes) console.log(`  - ${n}`);
    console.log('\nNo changes were written to the Homepage 2026 record. Re-run with `commit` to apply.');
    verdict(SCRIPT, 'NOT-APPLIED (dry run)');
    return;
  }

  // The row: created if missing. Status is left to publishDraft (one writer of the render gate).
  await pool.query(`INSERT INTO main_pages (slug, content, page_type) VALUES ($1, '{}'::jsonb, $2) ON CONFLICT (slug) DO NOTHING`, [HOME_2026_SLUG, HOME_2026_PAGE_TYPE]);
  const draft = await createDraft({ pageType: HOME_2026_PAGE_TYPE, pageSlug: HOME_2026_SLUG, label: LABEL, content: full, createdBy: by });
  await publishDraft(draft.id, by);

  // Verify what landed.
  const after = (await pool.query<{ content: Record<string, unknown>; status: string; meta_title: string | null; meta_description: string | null }>(
    `SELECT content, status, meta_title, meta_description FROM main_pages WHERE slug = $1`,
    [HOME_2026_SLUG]
  )).rows[0];
  const check = resolveHome2026Content(after.content, imageHosts());
  if (after.status !== 'published' || check.fallbacks.length) throw new Error(`verify failed: status ${after.status}, fallbacks ${check.fallbacks.join(', ') || 'none'}`);
  if (after.meta_title !== (classic?.meta_title ?? null) || after.meta_description !== (classic?.meta_description ?? null)) throw new Error('verify failed: meta differs from Classic');
  const sw2 = (await pool.query<{ active: string | null }>(`SELECT to_jsonb(g) ->> 'homepage_active' AS active FROM global_settings g WHERE id = 1`)).rows[0];
  notes.push(`published version #${draft.id}; record status ${after.status}; switch still '${sw2?.active ?? 'NULL (= classic)'}'`);
  for (const n of notes) console.log(`  - ${n}`);
  verdict(SCRIPT, 'APPLIED', `Homepage 2026 Version 1 published (#${draft.id}); the switch was not changed`);
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    verdict(SCRIPT, 'FAILED', e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  })
  .finally(() => pool.end());
