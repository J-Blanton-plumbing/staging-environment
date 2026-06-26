/**
 * Creates the global_settings table and seeds the initial row with defaults.
 * Run once: npx ts-node --project tsconfig.scripts.json scripts/migrate-global-settings.ts
 */

import pool from '../src/lib/db';

async function run() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS global_settings (
        id                SERIAL PRIMARY KEY,
        phone_display     TEXT NOT NULL DEFAULT '773-724-9272',
        phone_href        TEXT NOT NULL DEFAULT 'tel:773-724-9272',
        cta_primary_label TEXT NOT NULL DEFAULT 'MAKE A GOOD CALL',
        tagline_turning   TEXT NOT NULL DEFAULT 'J Blanton Plumbing - Turning Bad Calls to Good Calls',
        hours_label       TEXT NOT NULL DEFAULT '24 hours',
        updated_at        TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO global_settings (id, phone_display, phone_href, cta_primary_label, tagline_turning, hours_label)
      VALUES (1, '773-724-9272', 'tel:773-724-9272', 'MAKE A GOOD CALL', 'J Blanton Plumbing - Turning Bad Calls to Good Calls', '24 hours')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('global_settings table created and seeded.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
