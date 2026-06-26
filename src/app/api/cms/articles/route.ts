import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import pool from '@/lib/db';
import { ARTICLES } from '@/lib/articles';

export async function GET() {
  const client = await pool.connect();
  try {
    // Return DB articles first, then append any static articles not yet migrated
    let dbArticles: Array<{
      slug: string; title: string; excerpt: string; status: string;
      category: string[]; updated_at: string | null; updated_by_name: string | null;
    }> = [];
    try {
      const res = await client.query(
        `SELECT a.slug, a.title, a.excerpt, a.status,
                COALESCE(a.category, '{}') AS category,
                a.updated_at,
                u.name AS updated_by_name
           FROM cms_articles a
           LEFT JOIN cms_users u ON u.id = a.updated_by
          ORDER BY a.created_at DESC`
      );
      dbArticles = res.rows;
    } catch {
      // cms_articles table may not exist yet (migration not run) — fall through to static
    }

    const dbSlugs = new Set(dbArticles.map(a => a.slug));
    const staticArticles = ARTICLES
      .filter(a => !dbSlugs.has(a.slug))
      .map(a => ({
        slug: a.slug,
        title: a.title,
        excerpt: a.excerpt,
        image: a.image,
        href: a.href,
        status: 'published',
        category: [] as string[],
        updatedAt: null,
        updatedByName: null,
      }));

    const normalizedDb = dbArticles.map(a => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      status: a.status,
      category: a.category ?? [],
      updatedAt: a.updated_at ?? null,
      updatedByName: a.updated_by_name ?? null,
    }));

    return NextResponse.json([...normalizedDb, ...staticArticles]);
  } finally {
    client.release();
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { slug?: string; title?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { slug, title } = body;
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Invalid slug.' }, { status: 400 });
  }
  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const existing = await client.query(
      `SELECT 1 FROM cms_articles WHERE slug = $1 LIMIT 1`,
      [slug]
    );
    if ((existing.rowCount ?? 0) > 0) {
      return NextResponse.json({ error: `Slug "${slug}" is already taken.` }, { status: 409 });
    }

    await client.query(
      `INSERT INTO cms_articles (slug, title, created_by) VALUES ($1, $2, $3)`,
      [slug, title.trim(), session.userId]
    );
    return NextResponse.json({ success: true, redirectUrl: `/admin/articles/${slug}` });
  } catch (err) {
    console.error('[cms/articles POST]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}
