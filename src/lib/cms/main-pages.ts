import pool from '@/lib/db';

export async function getMainPageContent(slug: string): Promise<Record<string, string> | null> {
  const client = await pool.connect();
  try {
    const res = await client.query(
      'SELECT content, meta_title, meta_description FROM main_pages WHERE slug = $1',
      [slug]
    );
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      ...(row.content as Record<string, string>),
      meta_title: row.meta_title ?? '',
      meta_description: row.meta_description ?? '',
    };
  } finally {
    client.release();
  }
}
