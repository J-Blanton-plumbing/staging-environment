'use client';

/**
 * Brief 119 — approval landing page for marketing@ (token-gated, login-exempt).
 *
 * The emailed Approve/Decline links both point here with the same signed
 * single-use token; the link itself has NO side effect (email scanners
 * prefetch URLs) — the account only moves when the confirm button below
 * POSTs to /api/auth/invite/approve, which consumes the token.
 */

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { ADMIN_COLORS } from '@/lib/admin/theme';

type ViewState =
  | { phase: 'loading' }
  | { phase: 'bad-token'; state: 'invalid' | 'expired' | 'used' }
  | { phase: 'ready'; name: string; email: string; invitedByName: string | null }
  | { phase: 'submitting'; action: 'approve' | 'decline' }
  | { phase: 'done'; state: 'approved' | 'declined'; name: string; email: string; emailError?: string }
  | { phase: 'error'; message: string };

const BAD_TOKEN_COPY: Record<'invalid' | 'expired' | 'used', { title: string; body: string }> = {
  invalid: {
    title: 'This link is no longer valid',
    body: 'It may have been superseded by a newer request. Check for a more recent approval email, or ask an admin to re-send the request from the Manage Users page.',
  },
  expired: {
    title: 'This approval link has expired',
    body: 'Approval links are valid for 72 hours. Ask an admin to hit "Resend" on the pending account at /admin/users — you will receive a fresh link.',
  },
  used: {
    title: 'This request was already handled',
    body: 'The approve/decline decision for this account has already been recorded. Nothing more to do here.',
  },
};

function ApproveUserInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const intent = searchParams.get('intent') === 'decline' ? 'decline' : 'approve';
  const [view, setView] = useState<ViewState>({ phase: 'loading' });

  useEffect(() => {
    if (!token) {
      setView({ phase: 'bad-token', state: 'invalid' });
      return;
    }
    fetch(`/api/auth/invite/inspect?token=${encodeURIComponent(token)}&kind=approval`)
      .then(r => r.json())
      .then(data => {
        if (data.state === 'valid' && data.userStatus === 'pending_approval') {
          setView({ phase: 'ready', name: data.name, email: data.email, invitedByName: data.invitedByName });
        } else if (data.state === 'expired' || data.state === 'used') {
          setView({ phase: 'bad-token', state: data.state });
        } else {
          setView({ phase: 'bad-token', state: 'invalid' });
        }
      })
      .catch(() => setView({ phase: 'error', message: 'Could not check this link. Please try again.' }));
  }, [token]);

  async function act(action: 'approve' | 'decline', name: string, email: string) {
    setView({ phase: 'submitting', action });
    try {
      const res = await fetch('/api/auth/invite/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setView({
          phase: 'done',
          state: data.state === 'approved' ? 'approved' : 'declined',
          name,
          email,
          emailError: data.emailSent === false ? data.emailError : undefined,
        });
      } else if (res.status === 410) {
        setView({ phase: 'bad-token', state: data.state === 'expired' || data.state === 'used' ? data.state : 'invalid' });
      } else {
        setView({ phase: 'error', message: data.error || 'Something went wrong. Please try again.' });
      }
    } catch {
      setView({ phase: 'error', message: 'Something went wrong. Please try again.' });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-surface font-admin-body px-4">
      <div className="w-full max-w-[440px] rounded-admin-3xl border border-admin-outline-variant/10 bg-admin-surface-container-low p-10 shadow-2xl">
        <Image
          src="/images/admin/cms-admin-logo.png"
          alt="J. Blanton CMS Admin"
          width={600}
          height={388}
          className="h-20 w-auto"
          priority
        />

        {view.phase === 'loading' && (
          <p className="mt-6 text-sm text-admin-on-surface-variant/70">Checking this approval link…</p>
        )}

        {view.phase === 'bad-token' && (
          <div className="mt-6">
            <h1 className="text-lg font-bold text-admin-on-surface">{BAD_TOKEN_COPY[view.state].title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-admin-on-surface-variant/80">{BAD_TOKEN_COPY[view.state].body}</p>
          </div>
        )}

        {view.phase === 'error' && (
          <p className="mt-6 text-sm text-admin-error">{view.message}</p>
        )}

        {(view.phase === 'ready' || view.phase === 'submitting') && (
          <div className="mt-6">
            <h1 className="text-lg font-bold text-admin-on-surface">New CMS account request</h1>
            <p className="mt-2 text-sm leading-relaxed text-admin-on-surface-variant/80">
              Approving sends the person below an email link to set their own password. Declining records the refusal — no account becomes usable.
            </p>
            {view.phase === 'ready' && (
              <div className="mt-4 rounded-admin-xl border border-admin-outline-variant/20 bg-admin-surface-container p-4 text-sm text-admin-on-surface">
                <p><span className="font-bold">Name:</span> {view.name}</p>
                <p className="mt-1"><span className="font-bold">Email:</span> {view.email}</p>
                {view.invitedByName && (
                  <p className="mt-1"><span className="font-bold">Requested by:</span> {view.invitedByName}</p>
                )}
              </div>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => view.phase === 'ready' && act('approve', view.name, view.email)}
                disabled={view.phase === 'submitting'}
                className="rounded-admin-3xl bg-admin-secondary-container px-7 py-3 text-sm font-bold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                style={intent === 'approve' ? { outline: `2px solid ${ADMIN_COLORS.cerulean}`, outlineOffset: '2px' } : undefined}
              >
                {view.phase === 'submitting' && view.action === 'approve' ? 'Approving…' : 'Approve account'}
              </button>
              <button
                onClick={() => view.phase === 'ready' && act('decline', view.name, view.email)}
                disabled={view.phase === 'submitting'}
                className="rounded-admin-3xl border border-admin-outline-variant/40 px-7 py-3 text-sm font-bold text-admin-on-surface-variant transition-all hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-60"
                style={intent === 'decline' ? { outline: `2px solid ${ADMIN_COLORS.cerulean}`, outlineOffset: '2px' } : undefined}
              >
                {view.phase === 'submitting' && view.action === 'decline' ? 'Declining…' : 'Decline'}
              </button>
            </div>
          </div>
        )}

        {view.phase === 'done' && (
          <div className="mt-6">
            {view.state === 'approved' ? (
              <>
                <h1 className="text-lg font-bold" style={{ color: ADMIN_COLORS.success }}>
                  Account for {view.name} approved
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-admin-on-surface-variant/80">
                  {view.emailError
                    ? `The approval was recorded, but the invitation email could not be sent: ${view.emailError}`
                    : `An invitation email has been sent to ${view.email} with a link to set their password. The account activates once they do.`}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-lg font-bold text-admin-on-surface">
                  Account for {view.name} declined
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-admin-on-surface-variant/80">
                  No account was activated. An admin can re-initiate the request from /admin/users if this changes.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApproveUserPage() {
  return (
    <Suspense fallback={null}>
      <ApproveUserInner />
    </Suspense>
  );
}
