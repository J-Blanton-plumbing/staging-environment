import { NextRequest, NextResponse } from 'next/server';
import { getTerm, listHubArticles, listTermArticles, type KhArticlePage } from '@/lib/cms/kh-taxonomy';
import { KH_PAGE_SIZE } from '@/lib/cms/kh-taxonomy-types';

const PAGE_SIZE = KH_PAGE_SIZE;

// Brief 108 (Group D1): this handler reads query params and hits the DB per
// request — force it dynamic so it is never statically evaluated/cached at build
// time (cf. the CMS admin GET-route caching fix), which would otherwise serve a
// stale/empty payload and leave the Knowledge Hub grid blank.
export const dynamic = 'force-dynamic';

/**
 * GET /api/articles?page=0[&topic={slug}|&location={slug}]
 *
 * `page` is 0-based here, as it always was (the public pages use 1-based
 * `?page=n` URLs — Brief 187 C3). Brief 187 moved the query itself into
 * `src/lib/cms/kh-taxonomy.ts` so this endpoint and the server-rendered hub,
 * topic and area pages share ONE definition of "published" and ONE order
 * (Brief 122: created_at DESC, wp_post_id DESC NULLS LAST, id DESC).
 *
 * `category` is now the article's real primary topic — `{ name, slug }`, or
 * `null` when the article has none — instead of the hardcoded `''`.
 *
 * `topic` / `location` filter to one term (a region includes its cities'
 * articles). An unknown slug is a 404 with the usual well-formed empty payload.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(0, parseInt(params.get('page') ?? '0', 10) || 0);
  const topic = params.get('topic');
  const location = params.get('location');
  const empty = (status: number, error: string) =>
    NextResponse.json({ articles: [], total: 0, page, pageSize: PAGE_SIZE, error }, { status });

  try {
    let result: KhArticlePage;
    if (topic || location) {
      const term = await getTerm(topic ? 'topic' : 'location', (topic ?? location)!);
      if (!term) return empty(404, 'unknown_term');
      result = await listTermArticles(term, page + 1);
    } else {
      result = await listHubArticles(page + 1);
    }

    const articles = result.articles.map((a) => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      image: a.image,
      heroImage: a.image,
      href: a.href,
      category: a.topic,
      // Brief 187 hard rule: no article dates. All 812 imported articles share a
      // publish timestamp inside a 33-second window (Brief 122), so any date here
      // would be wrong on every card. Kept as '' for payload-shape compatibility.
      date: '',
      body: '',
    }));

    return NextResponse.json({ articles, total: result.total, page, pageSize: PAGE_SIZE });
  } catch (err) {
    // Never surface a non-JSON 500 to a client that parses the body as JSON
    // (OC-08): return a well-formed empty payload with a 500 status instead.
    console.error('GET /api/articles failed:', err);
    return empty(500, 'articles_unavailable');
  }
}
