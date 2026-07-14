/**
 * Brief 75 — Draft & Publish data-loss safety (audit DP-1, DP-2, DP-4).
 *
 * Adds optimistic-concurrency + staleness columns:
 *   • page_drafts.version       — the draft's own save version (DP-1). Every save
 *                                 must send the version it last read; the writer
 *                                 rejects on mismatch and increments on success.
 *   • page_drafts.base_version  — the live content row's `version` captured at the
 *                                 moment the draft was created (DP-2). Publish
 *                                 compares it to the live row's current version and
 *                                 blocks if the live page moved on.
 *   • <content table>.version   — an integer bumped on every successful write to a
 *                                 content table editors touch, so drafts and
 *                                 direct-edits can detect a concurrent change.
 *
 * Fully idempotent (`ADD COLUMN IF NOT EXISTS` throughout) — safe to re-run.
 * Coordinate with Brief 74: take a DB backup before running against production.
 *
 * Run with:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-draft-publish-safety.ts
 */

import pool from '../src/lib/db';

// Every content table an editor can write to (draft-publish path + direct edit).
const CONTENT_TABLES = [
  'city_pages',
  'service_category_pages',
  'emergency_plumbing_page',
  'city_service_pages',
  'sub_service_pages',
  'main_pages',
];

async function run() {
  const client = await pool.connect();
  try {
    // ── page_drafts: optimistic-concurrency + staleness columns ──────────────
    await client.query(
      `ALTER TABLE page_drafts ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0`
    );
    await client.query(
      `ALTER TABLE page_drafts ADD COLUMN IF NOT EXISTS base_version INTEGER`
    );
    console.log('✓ page_drafts.version / base_version ensured.');

    // ── content tables: version counter ──────────────────────────────────────
    for (const table of CONTENT_TABLES) {
      await client.query(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0`
      );
      console.log(`✓ ${table}.version ensured.`);
    }

    // ── CQ-1 backfill: reclassify existing sub-service drafts ─────────────────
    // Sub-service drafts were saved with page_type 'service' (the bug). Now that
    // sub-service pages have their own 'sub-service' page_type + writer, flip any
    // existing 'service' draft whose slug is a sub-service (and NOT a real service
    // category) so it keeps previewing/publishing correctly. Idempotent.
    const reclass = await client.query(
      `UPDATE page_drafts
          SET page_type = 'sub-service'
        WHERE page_type = 'service'
          AND page_slug IN (SELECT slug FROM sub_service_pages)
          AND page_slug NOT IN (SELECT slug FROM service_category_pages)`
    );
    console.log(`✓ reclassified ${reclass.rowCount} sub-service draft(s) from 'service' to 'sub-service'.`);

    console.log('\nBrief 75 migration complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
