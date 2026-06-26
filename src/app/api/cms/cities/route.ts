import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT city_slug, city_type FROM city_pages ORDER BY city_slug ASC`
    );
    return NextResponse.json(
      result.rows.map(r => ({ slug: r.city_slug as string, cityType: r.city_type as string }))
    );
  } catch (err) {
    console.error('GET /api/cms/cities error:', err);
    return NextResponse.json({ error: 'Failed to fetch cities' }, { status: 500 });
  } finally {
    client.release();
  }
}
