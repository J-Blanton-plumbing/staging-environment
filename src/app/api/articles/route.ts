import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const PAGE_SIZE = 9;

export async function GET(request: NextRequest) {
  const pageParam = request.nextUrl.searchParams.get('page');
  const page = Math.max(0, parseInt(pageParam ?? '0', 10) || 0);
  const offset = page * PAGE_SIZE;

  const client = await pool.connect();
  try {
    const [rows, countRow] = await Promise.all([
      client.query(
        `SELECT slug, title, excerpt, image, created_at
         FROM cms_articles
         WHERE status = 'published' AND (body->>'html') IS NOT NULL AND (body->>'html') != ''
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [PAGE_SIZE, offset]
      ),
      client.query(
        `SELECT COUNT(*) FROM cms_articles
         WHERE status = 'published' AND (body->>'html') IS NOT NULL AND (body->>'html') != ''`
      ),
    ]);

    const total = parseInt(countRow.rows[0].count, 10);
    const articles = rows.rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt || '',
      image: r.image || '',
      heroImage: r.image || '',
      href: `/knowledge-hub/${r.slug}`,
      category: '',
      date: r.created_at ? new Date(r.created_at).toISOString().slice(0, 10) : '',
      body: '',
    }));

    return NextResponse.json({ articles, total, page, pageSize: PAGE_SIZE });
  } finally {
    client.release();
  }
}
