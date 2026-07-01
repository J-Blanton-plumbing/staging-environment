import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT s.slug, s.title, s.status, s.parent_slug,
             s.updated_at, u.name AS updated_by_name
        FROM sub_service_pages s
        LEFT JOIN cms_users u ON u.id = s.updated_by
       ORDER BY s.title ASC
    `);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('[cms/sub-service-pages GET]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}
