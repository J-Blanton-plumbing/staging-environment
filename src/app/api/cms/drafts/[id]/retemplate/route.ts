import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { retemplateDraft, VALID_CITY_TEMPLATES } from '@/lib/cms/template-switching';
import { errorCode } from '@/lib/cms/errors';

/**
 * Brief 116 (Track A) — re-stamp an existing draft to a new template and migrate
 * its content, so it becomes publishable against a live page that has switched
 * templates (the DP-4 guard in publishDraft). Mirrors the auth + error handling
 * of /api/cms/template-switch.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const id = parseInt(params.id, 10);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const body = await req.json();
    const { toTemplate } = body as { toTemplate?: string };

    if (!toTemplate) {
      return NextResponse.json({ error: 'toTemplate is required' }, { status: 400 });
    }
    if (!VALID_CITY_TEMPLATES.includes(toTemplate as (typeof VALID_CITY_TEMPLATES)[number])) {
      return NextResponse.json(
        { error: `Invalid template "${toTemplate}". Valid values: ${VALID_CITY_TEMPLATES.join(', ')}` },
        { status: 400 }
      );
    }

    const result = await retemplateDraft({
      draftId: id,
      toTemplate,
      switchedBy: session.userId ?? null,
    });

    return NextResponse.json({
      success: true,
      missingFields: result.missing,
      orphanedFields: result.orphaned,
      restoredFields: result.restored,
      version: result.version,
      templateType: result.templateType,
    });
  } catch (err) {
    const code = errorCode(err);
    if (code === '404') {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }
    if (code === '409') {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : 'Conflict' },
        { status: 409 }
      );
    }
    console.error(`[cms/drafts/${id}/retemplate POST]`, err);
    const msg = err instanceof Error ? err.message : 'Failed to re-template draft';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
