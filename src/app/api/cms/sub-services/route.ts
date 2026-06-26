import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const client = await pool.connect();
  try {
    // Distinct sub-services from the subcategories table, slug derived from href
    const result = await client.query(`
      SELECT DISTINCT ON (href)
        label,
        TRIM(BOTH '/' FROM href) AS slug
      FROM service_subcategories
      WHERE href IS NOT NULL AND href != ''
      ORDER BY href, label
    `);

    const services = result.rows
      .map((r: { label: string; slug: string }) => ({ slug: r.slug, title: r.label }))
      .sort((a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title));

    return NextResponse.json(services);
  } catch (err) {
    console.error('[cms/sub-services GET]', err);
    return NextResponse.json({ error: 'Failed to fetch sub-services' }, { status: 500 });
  } finally {
    client.release();
  }
}
