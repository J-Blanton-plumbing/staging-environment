import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT slug, hero_heading FROM service_category_pages ORDER BY slug ASC`
    );
    return NextResponse.json(
      result.rows.map(r => ({ slug: r.slug as string, title: r.hero_heading as string }))
    );
  } catch (err) {
    console.error('[cms/service-categories GET]', err);
    return NextResponse.json({ error: 'Failed to fetch service categories' }, { status: 500 });
  } finally {
    client.release();
  }
}
