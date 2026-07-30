import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

const PAGE_SIZE = 9;

// Brief 108 (Group D1): this handler reads query params and hits the DB per
// request — force it dynamic so it is never statically evaluated/cached at build
// time (cf. the CMS admin GET-route caching fix), which would otherwise serve a
// stale/empty payload and leave the Knowledge Hub grid blank.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const pageParam = request.nextUrl.searchParams.get('page');
  const page = Math.max(0, parseInt(pageParam ?? '0', 10) || 0);
  const offset = page * PAGE_SIZE;

  let client;
  try {
    client = await pool.connect();
    const [rows, countRow] = await Promise.all([
      client.query(
        // Brief 122: created_at alone can't reproduce the live site's order —
        // the WP import left all 812 articles' post_dates inside a ~33-second
        // window, so nearly every row ties and Postgres returned them in
        // arbitrary (even request-to-request unstable) order. The live site
        // breaks those ties by WP post ID, so we do too (wp_post_id, backfilled
        // by scripts/backfill-article-wp-ids.ts; NULL for CMS-created articles,
        // whose genuinely-newer created_at already places them first). id DESC
        // is the final tiebreaker so pagination is always deterministic.
        `SELECT slug, title, excerpt, image, created_at
         FROM cms_articles
         WHERE status = 'published' AND (body->>'html') IS NOT NULL AND (body->>'html') != ''
         ORDER BY created_at DESC, wp_post_id DESC NULLS LAST, id DESC
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
  } catch (err) {
    // Never surface a non-JSON 500 to the client: the fetch in ArticlesSection
    // parses the body as JSON, and a raw error page would reject the promise and
    // hang the "Loading…" state (OC-08). Return a well-formed empty payload with
    // a 500 status so the client can show its retryable error state cleanly.
    console.error('GET /api/articles failed:', err);
    return NextResponse.json(
      { articles: [], total: 0, page, pageSize: PAGE_SIZE, error: 'articles_unavailable' },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
