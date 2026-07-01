import pool from '../src/lib/db';

const FIXES: Array<[string, string]> = [
  ['home-repipe',           'sewer'],
  ['basement-flooding',     'drain'],
  ['commercial-water-heater', 'water-heater'],
];

async function run() {
  const client = await pool.connect();
  try {
    for (const [slug, parentSlug] of FIXES) {
      const res = await client.query(
        `UPDATE sub_service_pages SET parent_slug = $1 WHERE slug = $2 RETURNING slug`,
        [parentSlug, slug]
      );
      console.log((res.rowCount ?? 0) > 0 ? `  ✓ ${slug} → ${parentSlug}` : `  – ${slug}: not found`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
