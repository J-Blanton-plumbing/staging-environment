import pool from '../src/lib/db';
async function run() {
  const client = await pool.connect();
  const res = await client.query('SELECT slug, parent_slug FROM sub_service_pages ORDER BY slug');
  console.log(`${res.rows.length} rows:`);
  res.rows.forEach(r => console.log(` ${r.slug}  |  ${r.parent_slug ?? 'NULL'}`));
  client.release();
  await pool.end();
}
run().catch(e => { console.error(e.message); process.exit(1); });
