/**
 * Brief 33 — CMS User Management migration
 *
 * Creates:
 *   - cms_users table
 *   - page_changelog table
 *   - updated_by / updated_at columns on all CMS content tables
 *   - Seeds one default admin user
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-cms-users.ts
 *
 * The temporary password is printed to the console below.
 * Change it immediately after first login via /admin/users.
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const TEMP_PASSWORD = 'JBP-Admin-2026!';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── cms_users ──────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS cms_users (
        id            SERIAL PRIMARY KEY,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── page_changelog ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS page_changelog (
        id          SERIAL PRIMARY KEY,
        page_type   TEXT NOT NULL,
        page_slug   TEXT NOT NULL,
        changed_by  INTEGER REFERENCES cms_users(id),
        changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        snapshot    JSONB NOT NULL
      )
    `);

    // ── Add updated_by / updated_at to all CMS content tables ──────────────
    const contentTables = [
      'city_pages',
      'emergency_plumbing_page',
      'service_category_pages',
    ];

    for (const table of contentTables) {
      await client.query(`
        ALTER TABLE ${table}
          ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES cms_users(id),
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
      `);
    }

    // ── Seed default admin user ────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(TEMP_PASSWORD, 12);
    await client.query(
      `INSERT INTO cms_users (name, email, password_hash)
       VALUES ('Admin', 'marketing@jblantonplumbing.com', $1)
       ON CONFLICT (email) DO NOTHING`,
      [passwordHash]
    );

    await client.query('COMMIT');

    console.log('\n✅ Brief 33 migration complete.\n');
    console.log('Tables created / updated:');
    console.log('  • cms_users');
    console.log('  • page_changelog');
    console.log('  • city_pages (added updated_by, updated_at)');
    console.log('  • emergency_plumbing_page (added updated_by, updated_at)');
    console.log('  • service_category_pages (added updated_by, updated_at)');
    console.log('\nDefault admin account:');
    console.log('  Email:    marketing@jblantonplumbing.com');
    console.log(`  Password: ${TEMP_PASSWORD}`);
    console.log('\n⚠️  Change this password immediately after first login via /admin/users\n');
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
