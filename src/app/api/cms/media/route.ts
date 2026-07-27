import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { listMedia } from '@/lib/cms/media';
import type { MediaType } from '@/lib/cms/media-types';

// GET /api/cms/media?type=image|video|all&search=&page=1&limit=60
// Paginated media catalog for the library grid. Newest first.
export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const rawType = sp.get('type');
  const type: MediaType | 'all' = rawType === 'image' || rawType === 'video' ? rawType : 'all';
  const search = sp.get('search') ?? '';
  const page = parseInt(sp.get('page') ?? '1', 10) || 1;
  const limit = parseInt(sp.get('limit') ?? '60', 10) || 60;

  try {
    const result = await listMedia({ type, search, page, limit });
    return NextResponse.json(result);
  } catch (err) {
    // If the table doesn't exist yet (migration not run), degrade to empty.
    if ((err as { code?: string })?.code === '42P01') {
      return NextResponse.json({ items: [], total: 0, page: 1, limit, hasMore: false });
    }
    console.error('[cms/media GET]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
