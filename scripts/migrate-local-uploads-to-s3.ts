/**
 * migrate-local-uploads-to-s3.ts — Brief 134 (Track C): move the CMS uploads
 * that already live on local disk into S3, and repoint every reference at the
 * CloudFront URL.
 *
 * WHY: uploads written before the Brief 134 cutover sit in `public/uploads/cms/`
 * and are served from the app server's filesystem. That directory is ephemeral
 * on cloud hosting — a redeploy wipes it and every page referencing those files
 * breaks. Once the bytes are in S3 the references have to follow, or the cutover
 * leaves dangling `/uploads/cms/...` paths behind.
 *
 * WHAT IT DOES
 *  1. Uploads every file in `public/uploads/cms/` to
 *     `s3://$S3_UPLOAD_BUCKET/$S3_UPLOAD_PREFIX<filename>`.
 *     Idempotent: a key that already exists in the bucket is skipped (HeadObject).
 *  2. Rewrites `cms_media.url` from `/uploads/cms/<file>` to the CloudFront URL.
 *  3. Rewrites EMBEDDED references to `/uploads/cms/<file>` inside the content
 *     tables (text and JSONB columns alike). Without this, a hero image whose
 *     path was copied into `city_pages.hero_image` or a `blocks` JSONB payload
 *     keeps pointing at local disk. Skip with `--skip-content`.
 *  4. Prints a summary of everything found, moved, skipped, and rewritten.
 *
 * IT NEVER DELETES THE LOCAL ORIGINALS. Removing them is a separate, manual
 * step to be taken only after the S3 copies are confirmed serving — see the
 * closing note the script prints.
 *
 * SAFETY
 *  - DRY RUN IS THE DEFAULT. Nothing is uploaded or written without `--live`.
 *  - Every value it overwrites is first copied into `brief134_upload_url_backup`,
 *    and `--rollback` restores from it.
 *  - Idempotent throughout: re-running after a completed migration finds no
 *    local-path references left to change and no missing S3 keys.
 *
 * REQUIRED ENV (see .env.local.example):
 *   S3_UPLOAD_BUCKET, S3_UPLOAD_PUBLIC_BASE_URL, S3_UPLOAD_REGION,
 *   S3_UPLOAD_PREFIX, plus AWS credentials via the standard provider chain.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-local-uploads-to-s3.ts
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-local-uploads-to-s3.ts --live
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-local-uploads-to-s3.ts --live --skip-content
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-local-uploads-to-s3.ts --rollback --live
 */

import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';
import pool from '../src/lib/db';
import { mimeForExtension } from '../src/lib/cms/media-types';
import { getS3Config, keyFor, objectExists, publicUrlFor, putObject } from '../src/lib/storage/s3';

const LOCAL_DIR = path.join(process.cwd(), 'public', 'uploads', 'cms');
const LOCAL_URL_PREFIX = '/uploads/cms/';

/**
 * Content tables that can embed a media URL. Mirrors USAGE_TABLES in
 * src/lib/cms/media.ts (the delete-safety scan) so the two never disagree about
 * where a reference can hide. History tables (archives, changelog) are
 * deliberately excluded — they are audit records of what was, and rewriting them
 * would falsify history. Their old paths keep resolving as long as the local
 * files stay in place; see the closing note.
 */
const CONTENT_TABLES = [
  'city_pages',
  'city_service_pages',
  'cms_articles',
  'emergency_plumbing_page',
  'main_pages',
  'service_category_pages',
  'sub_service_pages',
  'page_drafts',
];

const BACKUP_TABLE = 'brief134_upload_url_backup';

interface Summary {
  filesOnDisk: number;
  uploaded: number;
  alreadyInS3: number;
  uploadFailed: number;
  catalogRowsRewritten: number;
  catalogRowsMissingFile: string[];
  contentRowsRewritten: number;
  orphanFiles: string[];
}

function flag(name: string): boolean {
  return process.argv.includes(name);
}

async function ensureBackupTable(client: import('pg').PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${BACKUP_TABLE} (
      id           SERIAL PRIMARY KEY,
      source_table TEXT NOT NULL,
      source_id    INTEGER NOT NULL,
      column_name  TEXT NOT NULL,
      column_type  TEXT NOT NULL,
      old_value    TEXT NOT NULL,
      new_value    TEXT NOT NULL,
      backed_up_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
}

/** text/varchar and jsonb columns of a table — the only places a URL can hide. */
async function textishColumns(
  client: import('pg').PoolClient,
  table: string
): Promise<Array<{ name: string; type: 'text' | 'jsonb' }>> {
  const res = await client.query(
    `SELECT column_name, data_type
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
        AND data_type IN ('text', 'character varying', 'jsonb')`,
    [table]
  );
  return res.rows.map((r: { column_name: string; data_type: string }) => ({
    name: r.column_name,
    type: r.data_type === 'jsonb' ? ('jsonb' as const) : ('text' as const),
  }));
}

async function tableExists(client: import('pg').PoolClient, table: string): Promise<boolean> {
  const res = await client.query(`SELECT to_regclass($1) AS reg`, [`public.${table}`]);
  return Boolean(res.rows[0]?.reg);
}

async function migrate() {
  const live = flag('--live');
  const skipContent = flag('--skip-content');

  const config = getS3Config();
  if (!config) {
    console.error(
      'BLOCKED: S3 is not configured. Set S3_UPLOAD_BUCKET and S3_UPLOAD_PUBLIC_BASE_URL\n' +
        '(plus S3_UPLOAD_REGION / S3_UPLOAD_PREFIX and AWS credentials) and re-run.\n' +
        'See .env.local.example and the Brief 134 ops note.'
    );
    process.exit(2);
  }

  console.log(`${live ? 'LIVE RUN' : 'DRY RUN'} — bucket=${config.bucket} region=${config.region} prefix="${config.prefix}"`);
  console.log(`CDN base: ${config.publicBaseUrl}`);
  if (!live) console.log('(nothing will be uploaded or written — re-run with --live to apply)\n');

  const summary: Summary = {
    filesOnDisk: 0,
    uploaded: 0,
    alreadyInS3: 0,
    uploadFailed: 0,
    catalogRowsRewritten: 0,
    catalogRowsMissingFile: [],
    contentRowsRewritten: 0,
    orphanFiles: [],
  };

  // ── 1. Files on disk → S3 ───────────────────────────────────────────────
  let entries: string[] = [];
  try {
    entries = (await readdir(LOCAL_DIR)).filter(n => !n.startsWith('.'));
  } catch {
    console.log(`No local upload directory at ${LOCAL_DIR} — nothing to move.`);
  }

  for (const name of entries) {
    const full = path.join(LOCAL_DIR, name);
    const info = await stat(full);
    if (!info.isFile()) continue;
    summary.filesOnDisk++;

    const key = keyFor(name, config);
    try {
      // A dry run makes NO S3 calls at all, so it can be run by anyone wanting
      // to see the scope before AWS credentials are wired up. The idempotency
      // probe therefore only runs in --live, which is where it matters.
      if (!live) {
        summary.uploaded++;
        console.log(`  + ${name} → s3://${config.bucket}/${key} (${info.size} bytes) [dry run; existence not probed]`);
        continue;
      }
      if (await objectExists(key, config)) {
        summary.alreadyInS3++;
        console.log(`  = ${name} (already in s3://${config.bucket}/${key})`);
        continue;
      }
      const ext = name.split('.').pop() ?? '';
      const contentType = mimeForExtension(ext) || 'application/octet-stream';
      const body = await readFile(full);
      await putObject(name, body, contentType, config);
      summary.uploaded++;
      console.log(`  + ${name} → s3://${config.bucket}/${key} (${info.size} bytes, ${contentType})`);
    } catch (err) {
      summary.uploadFailed++;
      console.error(`  ! ${name} — upload failed:`, err instanceof Error ? err.message : err);
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (live) await ensureBackupTable(client);

    // ── 2. cms_media.url → CDN URL ────────────────────────────────────────
    const catalog = await client.query(
      `SELECT id, url FROM cms_media WHERE url LIKE $1`,
      [`${LOCAL_URL_PREFIX}%`]
    );
    console.log(`\ncms_media rows with local URLs: ${catalog.rows.length}`);

    const onDisk = new Set(entries);
    const referenced = new Set<string>();

    for (const row of catalog.rows as Array<{ id: number; url: string }>) {
      const filename = row.url.slice(LOCAL_URL_PREFIX.length);
      referenced.add(filename);
      if (!onDisk.has(filename)) summary.catalogRowsMissingFile.push(filename);

      const newUrl = publicUrlFor(filename, config);
      if (live) {
        await client.query(
          `INSERT INTO ${BACKUP_TABLE} (source_table, source_id, column_name, column_type, old_value, new_value)
           VALUES ('cms_media', $1, 'url', 'text', $2, $3)`,
          [row.id, row.url, newUrl]
        );
        await client.query(`UPDATE cms_media SET url = $1 WHERE id = $2`, [newUrl, row.id]);
      }
      summary.catalogRowsRewritten++;
      console.log(`  ~ cms_media#${row.id}: ${row.url} → ${newUrl}`);
    }

    for (const name of entries) if (!referenced.has(name)) summary.orphanFiles.push(name);

    // ── 3. Embedded references inside content tables ──────────────────────
    if (skipContent) {
      console.log('\nSkipping content-table rewrite (--skip-content).');
    } else {
      console.log('\nEmbedded /uploads/cms/ references in content tables:');
      // Drive off the union of files on disk and files named by the catalog, so a
      // reference to a file that was already deleted from disk is still repointed.
      const filenames = Array.from(new Set([...entries, ...referenced]));

      for (const table of CONTENT_TABLES) {
        if (!(await tableExists(client, table))) continue;
        const cols = await textishColumns(client, table);

        for (const col of cols) {
          for (const filename of filenames) {
            const oldRef = `${LOCAL_URL_PREFIX}${filename}`;
            const newRef = publicUrlFor(filename, config);
            const expr = col.type === 'jsonb' ? `"${col.name}"::text` : `"${col.name}"`;

            const hits = await client.query(
              `SELECT id, ${expr} AS val FROM ${table} WHERE ${expr} LIKE $1`,
              [`%${oldRef}%`]
            );
            if (hits.rows.length === 0) continue;

            for (const hit of hits.rows as Array<{ id: number; val: string }>) {
              // IDEMPOTENCY, and the reason this is a regex rather than a plain
              // string replace: the CDN URL CONTAINS the local path
              // (https://…cloudfront.net/uploads/cms/x ends with /uploads/cms/x),
              // so the SQL LIKE above still matches rows a previous run already
              // migrated. Replacing those again would nest the base URL inside
              // itself and corrupt the value. The lookbehind only matches the
              // path when it is NOT preceded by a host/path character — i.e. a
              // genuine root-relative reference (`"/uploads/…`, `(/uploads/…`,
              // start of string) and never the tail of an absolute URL.
              const escaped = oldRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const localRefOnly = new RegExp(`(?<![A-Za-z0-9_.\\-])${escaped}`, 'g');
              const updated = hit.val.replace(localRefOnly, newRef);
              if (updated === hit.val) continue; // already migrated — nothing to do
              if (live) {
                await client.query(
                  `INSERT INTO ${BACKUP_TABLE} (source_table, source_id, column_name, column_type, old_value, new_value)
                   VALUES ($1, $2, $3, $4, $5, $6)`,
                  [table, hit.id, col.name, col.type, hit.val, updated]
                );
                const cast = col.type === 'jsonb' ? '::jsonb' : '';
                await client.query(
                  `UPDATE ${table} SET "${col.name}" = $1${cast} WHERE id = $2`,
                  [updated, hit.id]
                );
              }
              summary.contentRowsRewritten++;
              console.log(`  ~ ${table}#${hit.id}.${col.name} — ${oldRef}`);
            }
          }
        }
      }
    }

    if (live) {
      await client.query('COMMIT');
    } else {
      await client.query('ROLLBACK');
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log('\n──────── SUMMARY ────────');
  console.log(`mode                       : ${live ? 'LIVE' : 'DRY RUN (no changes written)'}`);
  console.log(`files on local disk        : ${summary.filesOnDisk}`);
  console.log(`  uploaded to S3           : ${summary.uploaded}`);
  console.log(`  already in S3 (skipped)  : ${summary.alreadyInS3}`);
  console.log(`  upload failures          : ${summary.uploadFailed}`);
  console.log(`cms_media rows repointed   : ${summary.catalogRowsRewritten}`);
  console.log(`content values repointed   : ${summary.contentRowsRewritten}`);
  if (summary.catalogRowsMissingFile.length) {
    console.log(`\nWARNING — catalogued but NOT on disk (${summary.catalogRowsMissingFile.length}); these rows were repointed at S3 but nothing was uploaded for them, so verify each URL loads:`);
    for (const f of summary.catalogRowsMissingFile) console.log(`  - ${f}`);
  }
  if (summary.orphanFiles.length) {
    console.log(`\nNOTE — on disk but not in cms_media (${summary.orphanFiles.length}); uploaded anyway so any hard-coded reference keeps working:`);
    for (const f of summary.orphanFiles) console.log(`  - ${f}`);
  }
  if (summary.uploadFailed > 0) {
    console.log('\nSome uploads failed — re-run once the cause is fixed. The script is idempotent.');
    process.exitCode = 1;
  }
  if (live) {
    console.log(
      `\nLocal originals were NOT deleted. Only after confirming the CloudFront URLs serve:\n` +
        `  1. git rm -r --cached public/uploads/cms   # they are tracked in git today; .gitignore alone won't untrack them\n` +
        `  2. delete the local files\n` +
        `Backups of every overwritten value are in ${BACKUP_TABLE} (use --rollback --live to restore).`
    );
  } else {
    console.log('\nRe-run with --live to apply.');
  }
}

async function rollback() {
  const live = flag('--live');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!(await tableExists(client, BACKUP_TABLE))) {
      console.log(`No ${BACKUP_TABLE} table — nothing to roll back.`);
      await client.query('ROLLBACK');
      return;
    }
    // Newest first so a column rewritten twice lands back on its original value.
    const rows = await client.query(
      `SELECT id, source_table, source_id, column_name, column_type, old_value, new_value
         FROM ${BACKUP_TABLE} ORDER BY id DESC`
    );
    let restored = 0;
    let skipped = 0;
    for (const r of rows.rows as Array<{
      source_table: string; source_id: number; column_name: string;
      column_type: string; old_value: string; new_value: string;
    }>) {
      const expr = r.column_type === 'jsonb' ? `"${r.column_name}"::text` : `"${r.column_name}"`;
      const current = await client.query(
        `SELECT ${expr} AS val FROM ${r.source_table} WHERE id = $1`,
        [r.source_id]
      );
      if (!current.rows[0]) { skipped++; continue; }
      // Only restore values still holding exactly what the migration wrote —
      // never clobber an edit someone made after the migration.
      if (current.rows[0].val !== r.new_value) { skipped++; continue; }
      if (live) {
        const cast = r.column_type === 'jsonb' ? '::jsonb' : '';
        await client.query(
          `UPDATE ${r.source_table} SET "${r.column_name}" = $1${cast} WHERE id = $2`,
          [r.old_value, r.source_id]
        );
      }
      restored++;
    }
    if (live) await client.query('COMMIT'); else await client.query('ROLLBACK');
    console.log(`${live ? 'ROLLBACK' : 'ROLLBACK (dry run)'}: ${restored} value(s) restored, ${skipped} skipped (edited since, or row gone).`);
    if (!live) console.log('Re-run with --rollback --live to apply.');
    console.log('S3 objects are left in place — they are harmless once nothing references them.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

(async () => {
  try {
    if (flag('--rollback')) await rollback();
    else await migrate();
  } finally {
    await pool.end();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
