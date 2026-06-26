import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { switchTemplate, VALID_CITY_TEMPLATES } from '@/lib/cms/template-switching';

const VALID_TEMPLATES_BY_PAGE_TYPE: Record<string, string[]> = {
  city: VALID_CITY_TEMPLATES,
};

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  const authHeader = req.headers.get('authorization');
  const legacyAuth = authHeader === `Bearer ${process.env.CMS_ADMIN_PASSWORD}`;

  if (!session && !legacyAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { pageType, pageSlug, toTemplate } = body as {
      pageType: string;
      pageSlug: string;
      toTemplate: string;
    };

    if (!pageType || !pageSlug || !toTemplate) {
      return NextResponse.json(
        { error: 'pageType, pageSlug, and toTemplate are required' },
        { status: 400 }
      );
    }

    const validTemplates = VALID_TEMPLATES_BY_PAGE_TYPE[pageType];
    if (!validTemplates) {
      return NextResponse.json({ error: `Unknown page type: ${pageType}` }, { status: 400 });
    }
    if (!validTemplates.includes(toTemplate)) {
      return NextResponse.json(
        { error: `Invalid template "${toTemplate}" for page type "${pageType}"` },
        { status: 400 }
      );
    }

    const { missing } = await switchTemplate({
      pageType: pageType as 'city',
      pageSlug,
      toTemplate,
      switchedBy: session?.userId ?? null,
    });

    return NextResponse.json({ success: true, missingFields: missing });
  } catch (err) {
    console.error('[cms/template-switch POST]', err);
    const msg = err instanceof Error ? err.message : 'Failed to switch template';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
