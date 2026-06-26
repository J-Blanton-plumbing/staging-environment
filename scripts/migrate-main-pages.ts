import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS main_pages (
        id               SERIAL PRIMARY KEY,
        slug             TEXT UNIQUE NOT NULL,
        content          JSONB NOT NULL DEFAULT '{}',
        meta_title       TEXT,
        meta_description TEXT,
        updated_by       TEXT,
        updated_at       TIMESTAMPTZ DEFAULT NOW(),
        created_at       TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('main_pages table ready.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
