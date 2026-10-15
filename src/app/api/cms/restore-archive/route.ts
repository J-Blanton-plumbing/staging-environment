import { NextRequest, NextResponse } from 'next/server';
import { requireCmsSession } from '@/lib/auth/api-guard';
import { errorCode } from '@/lib/cms/errors';
import { restorePreTemplateArchive } from '@/lib/cms/restore-archive';

/**
 * Brief 212 (Track D3) — POST /api/cms/restore-archive { draftId, apply? }: put a City Hub or City
 * Service V2 page back exactly as it was before the new template, from its "Pre-hub archive (2026-10)"
 * / "Pre-V2 archive (2026-10)" version (see src/lib/cms/restore-archive.ts). `apply: false` returns
 * the plan without writing. Session-gated; the admin's "Restore this page" button calls it.
 */
export async function POST(req: NextRequest) {
  const auth = await requireCmsSession(req);
  if (!auth.ok) return auth.response;
  let body: { draftId?: unknown; apply?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const draftId = Number(body.draftId);
  if (!Number.isInteger(draftId) || draftId <= 0) return NextResponse.json({ error: 'draftId is required' }, { status: 400 });
  try {
    const plan = await restorePreTemplateArchive({ draftId }, auth.session.userId, body.apply !== false);
    return NextResponse.json({ ok: true, plan });
  } catch (err) {
    const code = Number(errorCode(err)) || 500;
    if (code === 500) console.error('[cms/restore-archive POST]', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Restore failed' }, { status: code });
  }
}
