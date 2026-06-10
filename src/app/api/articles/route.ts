import { NextRequest, NextResponse } from 'next/server';
import { ARTICLES } from '@/lib/articles';

const PAGE_SIZE = 9;

export async function GET(request: NextRequest) {
  const pageParam = request.nextUrl.searchParams.get('page');
  const page = Math.max(0, parseInt(pageParam ?? '0', 10) || 0);
  const start = page * PAGE_SIZE;
  const articles = ARTICLES.slice(start, start + PAGE_SIZE);
  return NextResponse.json({ articles, total: ARTICLES.length, page, pageSize: PAGE_SIZE });
}
