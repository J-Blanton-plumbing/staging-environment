import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: { city: string } }
) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT city_slug, service_slug, updated_at
       FROM city_service_pages
       WHERE city_slug = $1
       ORDER BY service_slug`,
      [params.city]
    );
    return NextResponse.json(
      res.rows.map(r => ({
        city_slug: r.city_slug,
        service_slug: r.service_slug,
        updatedAt: r.updated_at,
      }))
    );
  } catch (err) {
    console.error(`[cms/city-services/${params.city} GET]`, err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}
