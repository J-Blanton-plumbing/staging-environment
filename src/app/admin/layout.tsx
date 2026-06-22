'use client';

import { useState, useEffect, ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const saved = sessionStorage.getItem('cms_auth');
    if (saved) setAuthed(true);
    setChecking(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch('/api/cms/sewer', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${password}`,
      },
      // Send empty body — server will reject if password wrong
      body: JSON.stringify({ _ping: true }),
    });
    // 401 = wrong password; anything else (even 400) means auth passed
    if (res.status === 401) {
      setError('Incorrect password.');
      return;
    }
    sessionStorage.setItem('cms_auth', password);
    setAuthed(true);
  }

  if (checking) return null;

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
        <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minWidth: '320px' }}>
          <h1 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: '1rem' }}>CMS Admin</h1>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', marginBottom: '1rem', boxSizing: 'border-box' }}
            autoFocus
          />
          {error && <p style={{ color: '#dc2626', marginBottom: '0.75rem' }}>{error}</p>}
          <button type="submit" style={{ background: '#BC0E0E', color: '#fff', border: 'none', padding: '0.6rem 1.25rem', borderRadius: '4px', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
