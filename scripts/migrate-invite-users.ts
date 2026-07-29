/**
 * Brief 119 — Invite-based user creation migration
 *
 * Extends the Brief 33 auth schema for the invite → approve → set-password flow:
 *   - cms_users gains an account `status` lifecycle column
 *     ('pending_approval' → 'invited' → 'active', plus 'declined' / 'disabled')
 *     and audit columns (invited_by, approved_by, approved_at, activated_at,
 *     declined_at).
 *   - cms_users.password_hash becomes nullable — pending/invited accounts have
 *     no password until the new user sets their own.
 *   - New cms_user_invites table stores SHA-256 hashes of the signed single-use
 *     tokens (never the raw token) with expiry + used_at for single-use
 *     enforcement.
 *
 * Idempotent: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS / DROP NOT
 * NULL is a no-op once applied. Existing rows backfill to status 'active'
 * (every pre-Brief-119 user was created with a working password).
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-invite-users.ts
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── cms_users: status lifecycle + audit trail ──────────────────────────
    // DEFAULT 'active' so every existing row (all created with a password)
    // backfills to a working state. Application code always sets status
    // explicitly on INSERT, so new pending accounts never rely on the default.
    await client.query(`
      ALTER TABLE cms_users
        ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
        ADD COLUMN IF NOT EXISTS invited_by INTEGER,
        ADD COLUMN IF NOT EXISTS approved_by TEXT,
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ
    `);

    // Pending/invited accounts have no password until the user sets one.
    await client.query(`ALTER TABLE cms_users ALTER COLUMN password_hash DROP NOT NULL`);

    // ── cms_user_invites: hashed single-use tokens ─────────────────────────
    // kind 'approval' = the marketing@ approve/decline link (72h)
    // kind 'invite'   = the new user's set-password link (24h)
    await client.query(`
      CREATE TABLE IF NOT EXISTS cms_user_invites (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER NOT NULL REFERENCES cms_users(id) ON DELETE CASCADE,
        kind        TEXT NOT NULL CHECK (kind IN ('approval', 'invite')),
        token_hash  TEXT NOT NULL,
        expires_at  TIMESTAMPTZ NOT NULL,
        used_at     TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cms_user_invites_user_kind
        ON cms_user_invites (user_id, kind)
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_user_invites_token_hash
        ON cms_user_invites (token_hash)
    `);

    await client.query('COMMIT');

    console.log('✅ Brief 119 migration complete.');
    console.log('  • cms_users: status / invited_by / approved_by / approved_at / activated_at / declined_at');
    console.log('  • cms_users.password_hash is now nullable');
    console.log('  • cms_user_invites table (hashed single-use tokens)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
