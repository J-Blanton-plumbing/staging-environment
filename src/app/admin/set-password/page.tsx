'use client';

/**
 * Brief 119 — set-password / activation page for invited users
 * (token-gated, login-exempt). The user chooses their own password
 * (policy-enforced client-side for UX, server-side for real); on success the
 * account becomes active and they're pointed at /admin/login.
 */

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import { checkPassword, PASSWORD_RULES } from '@/lib/auth/password-policy';

type ViewState =
  | { phase: 'loading' }
  | { phase: 'bad-token'; state: 'invalid' | 'expired' | 'used' }
  | { phase: 'ready'; name: string; email: string }
  | { phase: 'done'; email: string };

const BAD_TOKEN_COPY: Record<'invalid' | 'expired' | 'used', { title: string; body: string }> = {
  invalid: {
    title: 'This link is no longer valid',
    body: 'It may have been superseded by a newer invite. Check for a more recent email, or ask an admin to hit "Resend" on your account at the Manage Users page.',
  },
  expired: {
    title: 'This invite link has expired',
    body: 'Set-password links are valid for 24 hours. Ask an admin to hit "Resend" on your account — you will get a fresh link by email.',
  },
  used: {
    title: 'This link was already used',
    body: 'If you already set your password, just sign in below. Otherwise ask an admin to resend your invite.',
  },
};

function SetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [view, setView] = useState<ViewState>({ phase: 'loading' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setView({ phase: 'bad-token', state: 'invalid' });
      return;
    }
    fetch(`/api/auth/invite/inspect?token=${encodeURIComponent(token)}&kind=invite`)
      .then(r => r.json())
      .then(data => {
        if (data.state === 'valid' && data.userStatus === 'invited') {
          setView({ phase: 'ready', name: data.name, email: data.email });
        } else if (data.state === 'expired' || data.state === 'used') {
          setView({ phase: 'bad-token', state: data.state });
        } else {
          setView({ phase: 'bad-token', state: 'invalid' });
        }
      })
      .catch(() => setView({ phase: 'bad-token', state: 'invalid' }));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (view.phase !== 'ready') return;
    setError('');

    const policy = checkPassword(password, [view.name, view.email.split('@')[0]]);
    if (!policy.ok) {
      setError(`Password needs: ${policy.errors.join(' · ')}`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/invite/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setView({ phase: 'done', email: view.email });
        setTimeout(() => router.push('/admin/login'), 2500);
      } else if (res.status === 410) {
        setView({ phase: 'bad-token', state: data.state === 'expired' || data.state === 'used' ? data.state : 'invalid' });
      } else if (res.status === 422) {
        setError(`Password needs: ${(data.details || []).join(' · ')}`);
      } else {
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-admin-xl border border-admin-outline-variant/20 bg-admin-surface-container-lowest px-3 py-2.5 text-sm text-admin-on-surface placeholder:text-admin-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-admin-primary/40';

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-surface font-admin-body px-4">
      <div className="w-full max-w-[400px] rounded-admin-3xl border border-admin-outline-variant/10 bg-admin-surface-container-low p-10 shadow-2xl">
        <Image
          src="/images/admin/cms-admin-logo.png"
          alt="J. Blanton CMS Admin"
          width={600}
          height={388}
          className="h-20 w-auto"
          priority
        />

        {view.phase === 'loading' && (
          <p className="mt-6 text-sm text-admin-on-surface-variant/70">Checking your invite link…</p>
        )}

        {view.phase === 'bad-token' && (
          <div className="mt-6">
            <h1 className="text-lg font-bold text-admin-on-surface">{BAD_TOKEN_COPY[view.state].title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-admin-on-surface-variant/80">{BAD_TOKEN_COPY[view.state].body}</p>
            <Link
              href="/admin/login"
              className="mt-5 inline-block rounded-admin-3xl bg-admin-secondary-container px-6 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110"
            >
              Go to sign in
            </Link>
          </div>
        )}

        {view.phase === 'ready' && (
          <form onSubmit={handleSubmit} className="mt-6">
            <h1 className="text-lg font-bold text-admin-on-surface">Welcome, {view.name}</h1>
            <p className="mt-1 text-sm text-admin-on-surface-variant/70">
              Set a password for <span className="font-semibold">{view.email}</span> to activate your account.
            </p>

            <ul className="mt-4 rounded-admin-xl border border-admin-outline-variant/20 bg-admin-surface-container p-3 text-xs leading-relaxed text-admin-on-surface-variant/80">
              {PASSWORD_RULES.map(rule => (
                <li key={rule}>• {rule}</li>
              ))}
            </ul>

            <div className="mt-4">
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-admin-on-surface">
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoFocus
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            <div className="mt-4">
              <label htmlFor="confirm" className="mb-1.5 block text-sm font-semibold text-admin-on-surface">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className={inputClass}
              />
            </div>

            {error && <p className="mt-4 text-sm text-admin-error">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-5 w-full rounded-admin-3xl bg-admin-secondary-container py-3 text-sm font-bold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Activating…' : 'Set password & activate'}
            </button>
          </form>
        )}

        {view.phase === 'done' && (
          <div className="mt-6">
            <h1 className="text-lg font-bold" style={{ color: ADMIN_COLORS.success }}>
              Your account is active
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-admin-on-surface-variant/80">
              You can now sign in as <span className="font-semibold">{view.email}</span>. Redirecting you to the sign-in page…
            </p>
            <Link
              href="/admin/login"
              className="mt-5 inline-block rounded-admin-3xl bg-admin-secondary-container px-6 py-2.5 text-sm font-bold text-white transition-all hover:brightness-110"
            >
              Sign in now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordInner />
    </Suspense>
  );
}
