/**
 * Creates the global_settings table and seeds the initial row with defaults.
 * Run once: npx ts-node --project tsconfig.scripts.json scripts/migrate-global-settings.ts
 */

import pool from '../src/lib/db';

// Brief 102 (Track C) — seed values, migrated verbatim from the hard-coded
// OFFICES/FOOTER_OFFICES/CONTACT.offices/LOCATIONS data this brief replaces
// (src/lib/content/cities/index.ts, src/lib/content/contact.ts, src/lib/locations.ts).
// See the CmsOffice FALLBACK in src/lib/cms/global-settings.ts for the same list —
// kept in sync by hand since this script has no import access to that module's types
// without a build step.
const SEED_OFFICES = [
  { slug: 'northbrook', name: 'Northbrook (Corporate)', streetAddress: '1945 Techny Road, #11', city: 'Northbrook', state: 'IL', zip: '60062', mapUrl: 'https://maps.app.goo.gl/pCmmYeescW7Mf6B2A', lat: 42.1278, lng: -87.8451 },
  { slug: 'algonquin', name: 'Algonquin', streetAddress: '2390 Esplanade Dr #200f', city: 'Algonquin', state: 'IL', zip: '60102', mapUrl: 'https://maps.app.goo.gl/egVEqHQJkzFG8Qo56', lat: 42.1656, lng: -88.2942 },
  { slug: 'geneva', name: 'Geneva', streetAddress: '115 Campbell St #201C', city: 'Geneva', state: 'IL', zip: '60134', mapUrl: 'https://maps.app.goo.gl/mfdpSC3BSGkQKdQ39', lat: 41.8875, lng: -88.3054 },
  { slug: 'arlington-heights', name: 'Arlington Heights', streetAddress: '1204 E. Central Road, Suite 3', city: 'Arlington Heights', state: 'IL', zip: '60005', mapUrl: 'https://maps.app.goo.gl/Qq4qPYJT8bCgash26', lat: 42.0884, lng: -87.9806 },
  { slug: 'chicago-lincoln-park', name: 'Chicago Lincoln Park', streetAddress: '800 W Diversey Pkwy', city: 'Chicago', state: 'IL', zip: '60614', mapUrl: 'https://maps.app.goo.gl/ninFDe3tVj7U5sYx6', lat: 41.9325, lng: -87.6437 },
  { slug: 'chicago-ravenswood', name: 'Chicago Ravenswood', streetAddress: '5126 N Ravenswood Ave', city: 'Chicago', state: 'IL', zip: '60640', mapUrl: 'https://maps.app.goo.gl/k2RpBwmEiq1iir1x9', lat: 41.9745, lng: -87.6745 },
  { slug: 'elgin', name: 'Elgin', streetAddress: '964 N McLean Blvd', city: 'Elgin', state: 'IL', zip: '60123-2039', mapUrl: 'https://maps.app.goo.gl/5J1K7ZVgFeNwy8VJ8', lat: 42.0354, lng: -88.2826 },
  { slug: 'elmhurst', name: 'Elmhurst', streetAddress: '130 S York St', city: 'Elmhurst', state: 'IL', zip: '60126', mapUrl: '', lat: 41.8995, lng: -87.9403 },
  { slug: 'evanston', name: 'Evanston', streetAddress: '1603 Orrington Ave #600-1085', city: 'Evanston', state: 'IL', zip: '60201', mapUrl: 'https://maps.app.goo.gl/rqmTxHMcicWhz1yV7', lat: 42.0451, lng: -87.6877 },
  { slug: 'hinsdale', name: 'Hinsdale', streetAddress: '15 Spinning Wheel Rd #216a', city: 'Hinsdale', state: 'IL', zip: '60521', mapUrl: 'https://maps.app.goo.gl/UfWAoTRbWkAPR6WYA', lat: 41.8009, lng: -87.9370 },
  { slug: 'mchenry', name: 'McHenry', streetAddress: '3406 W Elm St', city: 'Mchenry', state: 'IL', zip: '60050', mapUrl: 'https://maps.app.goo.gl/DQ4fP5QXZr7TpBJ48', lat: 42.3334, lng: -88.2670 },
  { slug: 'naperville', name: 'Naperville', streetAddress: '200 S Main Street, Suite 3', city: 'Naperville', state: 'IL', zip: '60540', mapUrl: 'https://maps.app.goo.gl/9ou5MAtuAMjG6XfN8', lat: 41.7508, lng: -88.1535 },
  { slug: 'skokie', name: 'Skokie', streetAddress: '8001 Lincoln Ave, Suite 301', city: 'Skokie', state: 'IL', zip: '60077-3695', mapUrl: '', lat: 42.0334, lng: -87.7334 },
  { slug: 'joliet', name: 'Joliet', streetAddress: '5126 N Ravenswood Ave', city: 'Chicago', state: 'IL', zip: '60640', mapUrl: 'https://maps.app.goo.gl/k2RpBwmEiq1iir1x9', lat: null, lng: null },
];

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

    // Brief 102 (Track C) — office addresses, single source of truth for the
    // footer, contact page, locations page, and every city template's NAP block.
    // Seeded verbatim from the hard-coded data it replaces; see SEED_OFFICES above.
    await client.query(`ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS offices JSONB`);
    await client.query(`UPDATE global_settings SET offices = $1::jsonb WHERE offices IS NULL`, [
      JSON.stringify(SEED_OFFICES),
    ]);

    await client.query(`
      INSERT INTO global_settings (id, phone_display, phone_href, header_phone, cta_primary_label, tagline_turning, hours_label, ndc_price)
      VALUES (1, '773-724-9272', 'tel:773-724-9272', '773-900-8690', 'MAKE A GOOD CALL', 'J Blanton Plumbing - Turning Bad Calls to Good Calls', '24 hours', 'All for just $29.97/month**')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('global_settings table created and seeded (incl. header_phone, ndc_price, offices).');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
