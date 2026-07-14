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
        header_phone      TEXT NOT NULL DEFAULT '773-900-8690',
        cta_primary_label TEXT NOT NULL DEFAULT 'MAKE A GOOD CALL',
        tagline_turning   TEXT NOT NULL DEFAULT 'J Blanton Plumbing - Turning Bad Calls to Good Calls',
        hours_label       TEXT NOT NULL DEFAULT '24 hours',
        ndc_price         TEXT NOT NULL DEFAULT 'All for just $29.97/month**',
        updated_at        TIMESTAMP DEFAULT NOW()
      );
    `);

    // Brief 66 — header_phone (the call-tracking number shown only in the navbar
    // header) was added after the initial table. Idempotent for existing tables.
    await client.query(`ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS header_phone TEXT`);
    await client.query(`UPDATE global_settings SET header_phone = '773-900-8690' WHERE header_phone IS NULL`);

    // Brief 66 follow-up — No Drip Club membership price. Global Settings is now the
    // single source of truth for it (the /no-drip-club page reads it from here).
    await client.query(`ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS ndc_price TEXT`);
    await client.query(`UPDATE global_settings SET ndc_price = 'All for just $29.97/month**' WHERE ndc_price IS NULL`);

    await client.query(`
      INSERT INTO global_settings (id, phone_display, phone_href, header_phone, cta_primary_label, tagline_turning, hours_label, ndc_price)
      VALUES (1, '773-724-9272', 'tel:773-724-9272', '773-900-8690', 'MAKE A GOOD CALL', 'J Blanton Plumbing - Turning Bad Calls to Good Calls', '24 hours', 'All for just $29.97/month**')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('global_settings table created and seeded (incl. header_phone, ndc_price).');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
