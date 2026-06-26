import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS city_service_pages (
        id                       SERIAL PRIMARY KEY,
        city_slug                VARCHAR(100)  NOT NULL,
        service_slug             VARCHAR(100)  NOT NULL,
        service_intro_heading    TEXT NOT NULL DEFAULT '',
        service_intro_paragraphs JSONB NOT NULL DEFAULT '[]',
        service_intro_image      TEXT NOT NULL DEFAULT '',
        secondary_heading        TEXT NOT NULL DEFAULT '',
        secondary_paragraphs     JSONB NOT NULL DEFAULT '[]',
        secondary_image          TEXT NOT NULL DEFAULT '',
        faqs                     JSONB NOT NULL DEFAULT '[]',
        updated_at               TIMESTAMP DEFAULT NOW(),
        UNIQUE (city_slug, service_slug)
      )
    `);
    console.log('city_service_pages table created (or already exists).');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
