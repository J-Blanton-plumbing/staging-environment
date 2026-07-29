import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { inspectInviteToken, InviteKind } from '@/lib/auth/invites';

/**
 * Brief 119 — token-gated (no session) read-only check used by the approval
 * and set-password landing pages to show a friendly state BEFORE any action
 * is taken. Never consumes the token and never leaks anything beyond what the
 * emailed link's holder already knows (the name/email in the email).
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token') || '';
  const kind = req.nextUrl.searchParams.get('kind') as InviteKind;

  if (!token || (kind !== 'approval' && kind !== 'invite')) {
    return NextResponse.json({ state: 'invalid' }, { status: 400 });
  }

  try {
    const client = await pool.connect();
    try {
      const lookup = await inspectInviteToken(client, token, kind);
      if (lookup.state === 'invalid') {
        return NextResponse.json({ state: 'invalid' });
      }
      return NextResponse.json({
        state: lookup.state,
        name: lookup.name,
        email: lookup.email,
        userStatus: lookup.userStatus,
        invitedByName: lookup.invitedByName,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[auth/invite/inspect GET]', err);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
