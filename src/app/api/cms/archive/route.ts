import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import pool from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: {
    page_type: string;
    slug: string;
    template: string;
    archive_name: string;
    content_json: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { page_type, slug, template, archive_name, content_json } = body;
  if (!page_type || !slug || !template || !archive_name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO page_archives (page_type, slug, template, archive_name, content_json, archived_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [page_type, slug, template, archive_name, JSON.stringify(content_json), session.name]
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[cms/archive POST]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  } finally {
    client.release();
  }
}
