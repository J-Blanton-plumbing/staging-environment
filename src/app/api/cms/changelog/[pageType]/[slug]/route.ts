import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth/session';

export async function GET(
  req: NextRequest,
  { params }: { params: { pageType: string; slug: string } }
) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT
           c.id,
           c.page_type,
           c.page_slug,
           c.changed_at,
           c.snapshot,
           u.name AS changed_by_name
         FROM page_changelog c
         LEFT JOIN cms_users u ON u.id = c.changed_by
         WHERE c.page_type = $1 AND c.page_slug = $2
         ORDER BY c.changed_at DESC`,
        [params.pageType, params.slug]
      );
      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[cms/changelog GET]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
