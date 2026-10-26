/**
 * Brief 219 (Track A3) — finish Brief 218's image swaps WITHOUT AWS console work (Marketing decision
 * 1): every DATABASE reference to an old copy of the preventative / flood-control photos is repointed
 * at the new file. Nothing in AWS is overwritten or deleted; the old objects stay, unused.
 *
 * ── THE NEW PREVENTATIVE IMAGE ───────────────────────────────────────────────
 * On the box (S3 configured): uploaded through the SAME two calls an /admin upload makes —
 * `putObject` (src/lib/storage/s3, a NEW `<timestamp>-preventative.webp` key, so no overwrite and no
 * cache problem) then `insertMedia` (its normal `cms_media` row, so the media library shows it). The
 * bytes are the committed `public/images/preventative.webp` (Brief 218 E1, 1345×898).
 * Idempotent: a `cms_media` row with that original name and that exact size is reused, not re-uploaded.
 * Without S3 (local dev) or if the upload fails: the fallback target is `/images/preventative.webp`,
 * the committed file — reported in the verdict, never a silent local-disk write.
 *
 * ── WHAT IS REPOINTED ────────────────────────────────────────────────────────
 *   • the 7 `jbp-cms-media` copies `uploads/cms/<id>-preventative.webp` (CloudFront URL or a bare
 *     `/uploads/cms/…` path) and the legacy `https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp`
 *     → the new preventative URL;
 *   • `…/images/Flood+Control+copy.webp` in any spelling (`+`, `%20`, `%2B`, space) → `/images/flood-control.webp`.
 * In every text / JSON column of every content table with an `id` (live rows AND `page_drafts`, so
 * republishing an older version can't bring the old photo back). Never touched: `cms_media` (the old
 * media rows stay, as decided), `page_changelog` (history) and backup / log tables.
 *
 * ── SAFETY ───────────────────────────────────────────────────────────────────
 * Dry run unless `commit` (scripts/lib/run-mode.ts refuses to guess in CI). Every changed column value
 * is copied into `brief219_row_backup` first; a changed row's `version` is bumped (an editor open on
 * the old value gets a conflict). Idempotent: a second run finds nothing. `--changed-file <path>`
 * appends the cities of any City Hub / City Service V2 row it changed, so the CITY PAGES LIVE CHECK
 * expects their markup to change. Exit 1 only for a code/schema fault (Brief 186).
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/repoint-brief-219-images.ts          # dry run
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/repoint-brief-219-images.ts commit   # apply
 */
import { appendFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}

/* eslint-disable import/first */
import pool from '../src/lib/db';
import { insertMedia } from '../src/lib/cms/media';
import { getS3Config, putObject } from '../src/lib/storage/s3';
import { authorId } from './lib/city-pages-seed';
import { resolveRunMode, announceMode, verdict } from './lib/run-mode';

const SCRIPT = 'repoint-brief-219-images';
const argv = process.argv.slice(2);
const mode = resolveRunMode(SCRIPT, argv);
const changedFileIdx = argv.indexOf('--changed-file');
const changedFile = changedFileIdx >= 0 ? argv[changedFileIdx + 1] : null;

const NEW_FILE = join(process.cwd(), 'public', 'images', 'preventative.webp');
const FALLBACK_PREVENTATIVE = '/images/preventative.webp';
const FLOOD_TARGET = '/images/flood-control.webp';
const OLD_CMS_IDS = ['1782924951488', '1782925575770', '1782926767913', '1782926966550', '1782928138688', '1782928331807', '1782932405995'];

const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function cdnHosts(): string[] {
  const hosts = new Set(['d1ze053a37fps5.cloudfront.net']);
  try {
    if (process.env.S3_UPLOAD_PUBLIC_BASE_URL) hosts.add(new URL(process.env.S3_UPLOAD_PUBLIC_BASE_URL).hostname);
  } catch {
    /* ignore a malformed env value */
  }
  return [...hosts];
}
/** Postgres (ARE) patterns → replacement. Order matters only for readability; they don't overlap. */
function patterns(preventativeUrl: string): Array<{ re: string; to: string; what: string }> {
  return [
    {
      re: `(https://(${cdnHosts().map(reEsc).join('|')}))?/uploads/cms/(${OLD_CMS_IDS.join('|')})-preventative\\.webp`,
      to: preventativeUrl,
      what: 'jbp-cms-media preventative copies',
    },
    { re: 'https://d1rplazj5a80fb\\.cloudfront\\.net/images/preventative\\.webp', to: preventativeUrl, what: 'legacy CloudFront preventative' },
    {
      re: 'https://d1rplazj5a80fb\\.cloudfront\\.net/images/Flood(\\+|%20|%2[Bb]| )Control(\\+|%20|%2[Bb]| )copy\\.webp',
      to: FLOOD_TARGET,
      what: 'legacy CloudFront flood-control',
    },
  ];
}

/** The new preventative image's URL: the existing upload, a fresh S3 upload, or the committed fallback. */
async function newPreventativeUrl(apply: boolean): Promise<{ url: string; how: string }> {
  const bytes = readFileSync(NEW_FILE);
  const existing = (
    await pool.query<{ url: string }>(
      `SELECT url FROM cms_media WHERE original_filename = 'preventative.webp' AND file_size = $1 ORDER BY id DESC LIMIT 1`,
      [bytes.length]
    )
  ).rows[0];
  if (existing) return { url: existing.url, how: `existing upload ${existing.url}` };
  const s3 = getS3Config();
  if (!s3) return { url: FALLBACK_PREVENTATIVE, how: 'S3 not configured here — fallback to the committed /images/preventative.webp' };
  const filename = `${Date.now()}-preventative.webp`;
  if (!apply) return { url: `${s3.publicBaseUrl ?? '(uploads CDN)'}/…/${filename}`, how: 'would upload a new key to S3 (dry run)' };
  try {
    const put = await putObject(filename, bytes, 'image/webp', s3);
    const client = await pool.connect();
    try {
      await insertMedia(client, {
        filename,
        originalFilename: 'preventative.webp',
        url: put.url,
        mimeType: 'image/webp',
        fileSize: bytes.length,
        width: 1345,
        height: 898,
        uploadedBy: await authorId(),
      });
    } finally {
      client.release();
    }
    return { url: put.url, how: `uploaded ${put.key}` };
  } catch (e) {
    console.error('upload failed — using the committed fallback instead:', e instanceof Error ? e.message : e);
    return { url: FALLBACK_PREVENTATIVE, how: 'S3 upload FAILED — fallback to the committed /images/preventative.webp' };
  }
}

async function main() {
  announceMode(SCRIPT, mode);
  const apply = mode === 'commit';
  const target = await newPreventativeUrl(apply);
  console.log(`new preventative image: ${target.url} (${target.how})`);
  const pats = patterns(target.url);

  const cols = (
    await pool.query<{ t: string; c: string; dt: string }>(
      `SELECT c.table_name AS t, c.column_name AS c, c.data_type AS dt
         FROM information_schema.columns c
         JOIN information_schema.tables tb ON tb.table_name = c.table_name AND tb.table_schema = c.table_schema AND tb.table_type = 'BASE TABLE'
        WHERE c.table_schema = 'public' AND c.data_type IN ('text', 'character varying', 'jsonb', 'json')`
    )
  ).rows.filter(({ t }) => !/backup|changelog|archive|_log$|applied|^cms_media$/.test(t));
  const tableCols = new Map<string, string[]>();
  for (const { t, c } of (await pool.query<{ t: string; c: string }>(`SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = 'public'`)).rows) {
    tableCols.set(t, [...(tableCols.get(t) ?? []), c]);
  }

  const anyRe = pats.map((p) => `(${p.re})`).join('|');
  const changes: Array<{ table: string; column: string; id: number; key: string }> = [];
  const skipped: string[] = [];
  if (apply) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS brief219_row_backup (
        id            SERIAL PRIMARY KEY,
        source_table  TEXT NOT NULL,
        source_key    TEXT NOT NULL,
        reason        TEXT NOT NULL,
        row_json      JSONB NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
  }

  for (const { t, c, dt } of cols) {
    const has = tableCols.get(t) ?? [];
    const hits = await pool.query<{ id: number | null; key: string | null; v: string }>(
      `SELECT ${has.includes('id') ? 'id' : 'NULL::int AS id'},
              ${has.includes('city_slug') && has.includes('service_slug') ? `city_slug || '/' || service_slug` : has.includes('city_slug') ? 'city_slug' : has.includes('page_slug') && has.includes('page_type') ? `page_type || ':' || page_slug` : has.includes('page_slug') ? 'page_slug' : has.includes('slug') ? 'slug' : 'NULL::text'} AS key,
              "${c}"::text AS v
         FROM "${t}" WHERE "${c}"::text ~ $1`,
      [anyRe]
    );
    for (const h of hits.rows) {
      if (h.id == null) {
        skipped.push(`${t}.${c} (no id column — not changed, report it)`);
        continue;
      }
      changes.push({ table: t, column: c, id: h.id, key: h.key ?? String(h.id) });
      if (!apply) continue;
      let expr = `"${c}"::text`;
      const params: unknown[] = [];
      for (const p of pats) {
        params.push(p.re, p.to);
        expr = `regexp_replace(${expr}, $${params.length - 1}, $${params.length}, 'g')`;
      }
      const cast = dt === 'jsonb' ? '::jsonb' : dt === 'json' ? '::json' : '';
      await pool.query('BEGIN');
      try {
        await pool.query(
          `INSERT INTO brief219_row_backup (source_table, source_key, reason, row_json) VALUES ($1, $2, $3, $4)`,
          [t, `${h.id}:${c}`, 'image reference before the Brief 219 repoint (Track A3)', JSON.stringify({ id: h.id, column: c, value: h.v })]
        );
        const bump = has.includes('version') && t !== 'page_drafts' ? ', version = version + 1' : '';
        await pool.query(`UPDATE "${t}" SET "${c}" = (${expr})${cast}${bump} WHERE id = $${params.length + 1}`, [...params, h.id]);
        await pool.query('COMMIT');
      } catch (e) {
        await pool.query('ROLLBACK');
        throw e;
      }
    }
  }

  for (const ch of changes) console.log(`  ${apply ? 'repointed' : 'would repoint'} ${ch.table}.${ch.column} #${ch.id} (${ch.key})`);
  for (const s of [...new Set(skipped)]) console.log(`  SKIPPED ${s}`);

  if (apply) {
    let left = 0;
    for (const { t, c } of cols) left += Number((await pool.query<{ n: string }>(`SELECT count(*) AS n FROM "${t}" WHERE "${c}"::text ~ $1`, [anyRe])).rows[0].n);
    if (left - skipped.length > 0) throw new Error(`verify failed: ${left} old image reference(s) remain after the repoint.`);
    const cities = [...new Set(changes.filter((x) => x.table === 'city_pages' || x.table === 'city_service_pages').map((x) => x.key.split('/')[0]))];
    if (changedFile && cities.length) appendFileSync(changedFile, cities.join('\n') + '\n');
    if (cities.length) console.log(`city pages changed: ${cities.join(', ')}`);
  }

  if (!changes.length) {
    verdict(SCRIPT, 'ALREADY-APPLIED', `no old image references in the database; preventative → ${target.url}`);
    return;
  }
  if (!apply) {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${changes.length} reference(s) would be repointed`);
    return;
  }
  verdict(SCRIPT, 'APPLIED', `${changes.length} reference(s) repointed; preventative → ${target.url} (${target.how})`);
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
