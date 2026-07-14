import { NextRequest, NextResponse } from 'next/server';
import { createDraft, getDraftsForPage } from '@/lib/cms/drafts';
import { getSession } from '@/lib/auth/session';

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const pageType = searchParams.get('pageType');
  const pageSlug = searchParams.get('pageSlug');
  if (!pageType || !pageSlug) {
    return NextResponse.json({ error: 'pageType and pageSlug are required' }, { status: 400 });
  }

  try {
    const drafts = await getDraftsForPage({ pageType, pageSlug });
    return NextResponse.json(drafts);
  } catch (err) {
    console.error('[drafts GET]', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const { pageType, pageSlug, label, content } = body;
    if (!pageType || !pageSlug || !label || content === undefined) {
      return NextResponse.json({ error: 'pageType, pageSlug, label, and content are required' }, { status: 400 });
    }
    if (typeof label !== 'string' || label.trim().length === 0 || label.length > 60) {
      return NextResponse.json({ error: 'label must be 1–60 characters' }, { status: 400 });
    }
    // Brief 67 (Track A): record which template the draft was authored for so the
    // preview renders that template even if the live page has since switched. The
    // city editor includes `templateType` inside the content payload; other page
    // types simply omit it (stored as null).
    const templateType =
      content && typeof content === 'object' && 'templateType' in (content as Record<string, unknown>)
        ? ((content as Record<string, unknown>).templateType as string | null)
        : null;

    const draft = await createDraft({
      pageType,
      pageSlug,
      label: label.trim(),
      content,
      createdBy: session.userId,
      templateType,
    });
    return NextResponse.json(draft, { status: 201 });
  } catch (err) {
    console.error('[drafts POST]', err);
    return NextResponse.json({ error: 'Failed to create draft' }, { status: 500 });
  }
}
