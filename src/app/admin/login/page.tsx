'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push('/admin');
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid email or password');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-admin-surface font-admin-body px-4">
      <div className="w-full max-w-[380px] rounded-admin-3xl border border-admin-outline-variant/10 bg-admin-surface-container-low p-10 shadow-2xl">
        <div className="mb-8">
          <h1 className="font-admin-headline text-2xl font-bold text-admin-on-surface">CMS Admin</h1>
          <p className="mt-1 text-sm text-admin-on-surface-variant/60">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-admin-on-surface">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full rounded-admin-xl border border-admin-outline-variant/20 bg-admin-surface-container-lowest px-3 py-2.5 text-sm text-admin-on-surface placeholder:text-admin-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-admin-primary/40"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-admin-on-surface">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-admin-xl border border-admin-outline-variant/20 bg-admin-surface-container-lowest px-3 py-2.5 text-sm text-admin-on-surface placeholder:text-admin-on-surface-variant/30 focus:outline-none focus:ring-1 focus:ring-admin-primary/40"
            />
          </div>

          {error && <p className="mb-4 text-sm text-admin-error">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-admin-3xl bg-admin-secondary-container py-3 text-sm font-bold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
