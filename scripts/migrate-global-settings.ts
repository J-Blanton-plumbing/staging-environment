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
// Brief 107 (Track B) — `showInFooter` added, defaulting every seeded office to
// `true` so first-install footer output is unchanged from before this field existed.
const SEED_OFFICES = [
  { slug: 'northbrook', name: 'Northbrook (Corporate)', streetAddress: '1945 Techny Road, #11', city: 'Northbrook', state: 'IL', zip: '60062', mapUrl: 'https://maps.app.goo.gl/pCmmYeescW7Mf6B2A', lat: 42.1278, lng: -87.8451, showInFooter: true },
  { slug: 'algonquin', name: 'Algonquin', streetAddress: '2390 Esplanade Dr #200f', city: 'Algonquin', state: 'IL', zip: '60102', mapUrl: 'https://maps.app.goo.gl/egVEqHQJkzFG8Qo56', lat: 42.1656, lng: -88.2942, showInFooter: true },
  { slug: 'geneva', name: 'Geneva', streetAddress: '115 Campbell St #201C', city: 'Geneva', state: 'IL', zip: '60134', mapUrl: 'https://maps.app.goo.gl/mfdpSC3BSGkQKdQ39', lat: 41.8875, lng: -88.3054, showInFooter: true },
  { slug: 'arlington-heights', name: 'Arlington Heights', streetAddress: '1204 E. Central Road, Suite 3', city: 'Arlington Heights', state: 'IL', zip: '60005', mapUrl: 'https://maps.app.goo.gl/Qq4qPYJT8bCgash26', lat: 42.0884, lng: -87.9806, showInFooter: true },
  { slug: 'chicago-lincoln-park', name: 'Chicago Lincoln Park', streetAddress: '800 W Diversey Pkwy', city: 'Chicago', state: 'IL', zip: '60614', mapUrl: 'https://maps.app.goo.gl/ninFDe3tVj7U5sYx6', lat: 41.9325, lng: -87.6437, showInFooter: true },
  { slug: 'chicago-ravenswood', name: 'Chicago Ravenswood', streetAddress: '5126 N Ravenswood Ave', city: 'Chicago', state: 'IL', zip: '60640', mapUrl: 'https://maps.app.goo.gl/k2RpBwmEiq1iir1x9', lat: 41.9745, lng: -87.6745, showInFooter: true },
  { slug: 'elgin', name: 'Elgin', streetAddress: '964 N McLean Blvd', city: 'Elgin', state: 'IL', zip: '60123-2039', mapUrl: 'https://maps.app.goo.gl/5J1K7ZVgFeNwy8VJ8', lat: 42.0354, lng: -88.2826, showInFooter: true },
  { slug: 'elmhurst', name: 'Elmhurst', streetAddress: '130 S York St', city: 'Elmhurst', state: 'IL', zip: '60126', mapUrl: '', lat: 41.8995, lng: -87.9403, showInFooter: true },
  { slug: 'evanston', name: 'Evanston', streetAddress: '1603 Orrington Ave #600-1085', city: 'Evanston', state: 'IL', zip: '60201', mapUrl: 'https://maps.app.goo.gl/rqmTxHMcicWhz1yV7', lat: 42.0451, lng: -87.6877, showInFooter: true },
  { slug: 'hinsdale', name: 'Hinsdale', streetAddress: '15 Spinning Wheel Rd #216a', city: 'Hinsdale', state: 'IL', zip: '60521', mapUrl: 'https://maps.app.goo.gl/UfWAoTRbWkAPR6WYA', lat: 41.8009, lng: -87.9370, showInFooter: true },
  { slug: 'mchenry', name: 'McHenry', streetAddress: '3406 W Elm St', city: 'Mchenry', state: 'IL', zip: '60050', mapUrl: 'https://maps.app.goo.gl/DQ4fP5QXZr7TpBJ48', lat: 42.3334, lng: -88.2670, showInFooter: true },
  { slug: 'naperville', name: 'Naperville', streetAddress: '200 S Main Street, Suite 3', city: 'Naperville', state: 'IL', zip: '60540', mapUrl: 'https://maps.app.goo.gl/9ou5MAtuAMjG6XfN8', lat: 41.7508, lng: -88.1535, showInFooter: true },
  { slug: 'skokie', name: 'Skokie', streetAddress: '8001 Lincoln Ave, Suite 301', city: 'Skokie', state: 'IL', zip: '60077-3695', mapUrl: '', lat: 42.0334, lng: -87.7334, showInFooter: true },
  { slug: 'joliet', name: 'Joliet', streetAddress: '5126 N Ravenswood Ave', city: 'Chicago', state: 'IL', zip: '60640', mapUrl: 'https://maps.app.goo.gl/k2RpBwmEiq1iir1x9', lat: null, lng: null, showInFooter: true },
  // Brief 154 — Columbus, OH: the first OUT-OF-STATE office. `mapUrl` is a Google
  // Maps SEARCH link (placeholder) — Marketing has not supplied a Google Business
  // Profile link yet; swap it in when they do. `lat`/`lng` left null per Brief 102
  // Decision 6 — the LocalBusiness JSON-LD omits `geo` entirely when either is
  // missing, and that stays valid; do not guess coordinates. This seed entry is
  // for a FRESH database only — the live box's existing `global_settings` row
  // needs the fill-gaps `scripts/add-columbus-office.ts` (this INSERT only ever
  // fires `ON CONFLICT (id) DO NOTHING` against an existing row).
  { slug: 'columbus', name: 'Columbus', streetAddress: '1387 W. Goodale Blvd', city: 'Columbus', state: 'OH', zip: '43212', mapUrl: 'https://www.google.com/maps/search/?api=1&query=1387+W.+Goodale+Blvd%2C+Columbus%2C+OH+43212', lat: null, lng: null, showInFooter: true },
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

    // Brief 107 (Track B) — backfill `showInFooter: true` onto any pre-existing
    // office record that predates this field, so no office is silently hidden
    // by the new toggle. Read-modify-write in JS (idempotent; a no-op once every
    // record has the field) since defaulting one key across a JSONB array's
    // elements isn't a single clean SQL statement.
    const existing = await client.query(`SELECT id, offices FROM global_settings WHERE offices IS NOT NULL`);
    for (const row of existing.rows) {
      const offices = row.offices as Array<Record<string, unknown>>;
      if (!Array.isArray(offices)) continue;
      const needsBackfill = offices.some(o => o.showInFooter === undefined);
      if (!needsBackfill) continue;
      const patched = offices.map(o => (o.showInFooter === undefined ? { ...o, showInFooter: true } : o));
      await client.query(`UPDATE global_settings SET offices = $1::jsonb WHERE id = $2`, [
        JSON.stringify(patched),
        row.id,
      ]);
    }

    await client.query(`
      INSERT INTO global_settings (id, phone_display, phone_href, header_phone, cta_primary_label, tagline_turning, hours_label, ndc_price)
      VALUES (1, '773-724-9272', 'tel:773-724-9272', '773-900-8690', 'MAKE A GOOD CALL', 'J Blanton Plumbing - Turning Bad Calls to Good Calls', '24 hours', 'All for just $29.97/month**')
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log('global_settings table created and seeded (incl. header_phone, ndc_price, offices, showInFooter).');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
