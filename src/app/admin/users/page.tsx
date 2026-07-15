'use client';

import { useState, useEffect } from 'react';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

interface CmsUser {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

interface EditState {
  name: string;
  email: string;
  password: string;
}

const INPUT_STYLE: React.CSSProperties = {
  padding: '0.45rem 0.6rem',
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
  borderRadius: '0.5rem',
  fontSize: '0.875rem',
  width: '100%',
  boxSizing: 'border-box',
  background: ADMIN_COLORS.surfaceContainer,
  color: ADMIN_COLORS.onSurface,
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<CmsUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: '', email: '', password: '' });
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [addState, setAddState] = useState<EditState>({ name: '', email: '', password: '' });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  async function loadUsers() {
    try {
      const res = await fetch('/api/cms/users');
      if (res.ok) setUsers(await res.json());
      else setError('Failed to load users');
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    fetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(data => setCurrentUserId(data?.userId ?? null))
      .catch(() => {});
  }, []);

  function startEdit(user: CmsUser) {
    setEditingId(user.id);
    setEditState({ name: user.name, email: user.email, password: '' });
    setEditError('');
  }

  async function saveEdit(id: number) {
    setEditLoading(true);
    setEditError('');
    try {
      const body: Record<string, string> = { name: editState.name, email: editState.email };
      if (editState.password) body.password = editState.password;

      const res = await fetch(`/api/cms/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditingId(null);
        await loadUsers();
      } else {
        const data = await res.json();
        setEditError(data.error || 'Failed to save');
      }
    } catch {
      setEditError('Failed to save');
    } finally {
      setEditLoading(false);
    }
  }

  async function deleteUser(id: number) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    const res = await fetch(`/api/cms/users/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await loadUsers();
    } else {
      const data = await res.json();
      alert(data.error || 'Failed to delete user');
    }
  }

  async function addUser() {
    setAddLoading(true);
    setAddError('');
    try {
      const res = await fetch('/api/cms/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addState),
      });
      if (res.ok) {
        setShowAdd(false);
        setAddState({ name: '', email: '', password: '' });
        await loadUsers();
      } else {
        const data = await res.json();
        setAddError(data.error || 'Failed to create user');
      }
    } catch {
      setAddError('Failed to create user');
    } finally {
      setAddLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Display-only convention (no `role` column exists in cms_users): the earliest-created
  // account reads as "Owner", every other account as "Administrator" — both map to the
  // same actual DB permissions today, this is purely a label, not an access-control signal.
  const earliestId = users.length > 0 ? users.reduce((a, b) => (a.created_at < b.created_at ? a : b)).id : null;
  function userType(user: CmsUser): string {
    return user.id === earliestId ? 'Owner' : 'Administrator';
  }

  const onlyOne = users.length === 1;
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));

  return (
    <div style={{ padding: '1rem 2.5rem 2.5rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
      {/* :hover / group-hover states — inline styles can't express these */}
      <style>{`
        .admin-users-row:hover { background: ${ADMIN_COLORS.surfaceContainerHigh}66; }
        .admin-cta-btn { transition: box-shadow 0.2s ease, filter 0.2s ease; }
        .admin-cta-btn:hover { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
        .admin-pagination-pill { transition: background 0.15s ease; cursor: pointer; }
        .admin-pagination-pill:hover:not(.active) { background: ${ADMIN_COLORS.surfaceContainerHigh}; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: '1rem', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 700, fontSize: '1.875rem', letterSpacing: '-0.025em', margin: 0, color: ADMIN_COLORS.onSurface }}>Manage Users</h1>
          <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontSize: '0.875rem', marginTop: '0.5rem', maxWidth: '32rem' }}>
            Centralized administration for internal CMS accounts.
          </p>
        </div>
        <button
          className="admin-cta-btn"
          onClick={() => { setShowAdd(true); setAddError(''); }}
          style={{
            background: ADMIN_COLORS.cerulean, color: '#fff', border: 'none',
            padding: '0.875rem 2rem', borderRadius: '2rem',
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.02em',
            cursor: 'pointer', boxShadow: ADMIN_SHADOWS.xl, whiteSpace: 'nowrap',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>person_add</span>
          ADD NEW USER
        </button>
      </div>

      {/* Add user form */}
      {showAdd && (
        <div style={{ background: ADMIN_COLORS.surfaceContainerLow, border: `1px solid ${ADMIN_COLORS.outlineVariant}33`, borderRadius: '1.5rem', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontSize: '0.95rem', fontWeight: 700, color: ADMIN_COLORS.onSurface }}>New User</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: ADMIN_COLORS.onSurfaceVariant }}>Name</label>
              <input style={INPUT_STYLE} value={addState.name} onChange={e => setAddState(s => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: ADMIN_COLORS.onSurfaceVariant }}>Email</label>
              <input type="email" style={INPUT_STYLE} value={addState.email} onChange={e => setAddState(s => ({ ...s, email: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: ADMIN_COLORS.onSurfaceVariant }}>Password</label>
              <input type="password" style={INPUT_STYLE} value={addState.password} onChange={e => setAddState(s => ({ ...s, password: e.target.value }))} />
            </div>
          </div>
          {addError && <p style={{ color: ADMIN_COLORS.error, fontSize: '0.85rem', margin: '0 0 0.5rem' }}>{addError}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={addUser}
              disabled={addLoading}
              style={{ background: ADMIN_COLORS.cerulean, color: '#fff', border: 'none', padding: '0.45rem 1.1rem', borderRadius: '9999px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              {addLoading ? 'Creating…' : 'Create User'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              style={{ background: ADMIN_COLORS.surfaceContainerHighest, color: ADMIN_COLORS.onSurfaceVariant, border: 'none', padding: '0.45rem 1.1rem', borderRadius: '9999px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && <p style={{ color: ADMIN_COLORS.onSurfaceVariant }}>Loading…</p>}
      {error && <p style={{ color: ADMIN_COLORS.error }}>{error}</p>}

      {!loading && !error && (
        <div style={{ background: ADMIN_COLORS.surfaceContainerLow, border: `1px solid ${ADMIN_COLORS.outlineVariant}0D`, borderRadius: '2rem', overflow: 'hidden', boxShadow: ADMIN_SHADOWS.elegant }}>
          <div style={{ padding: '1.5rem 2rem', borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}0D` }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontSize: '0.875rem', fontWeight: 700, color: `${ADMIN_COLORS.onSurface}CC`, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Administrative Access
            </h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}33` }}>
                {['User Details', 'Email', 'Role', 'Registered', 'Settings'].map(h => (
                  <th key={h} style={{ padding: '1rem 2rem', textAlign: 'left', fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '10px', fontWeight: 700, color: `${ADMIN_COLORS.onSurfaceVariant}66`, textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => {
                const active = user.id === currentUserId;
                return (
                <tr
                  key={user.id}
                  className="admin-users-row"
                  style={{ borderBottom: i < users.length - 1 ? `1px solid ${ADMIN_COLORS.outlineVariant}1A` : 'none', transition: 'background 0.15s ease' }}
                >
                  <td style={{ padding: '1.25rem 2rem', fontSize: '0.9rem' }}>
                    {editingId === user.id ? (
                      <input style={{ ...INPUT_STYLE, width: '120px' }} value={editState.name} onChange={e => setEditState(s => ({ ...s, name: e.target.value }))} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div
                          style={{
                            width: '2.25rem', height: '2.25rem', borderRadius: '9999px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', fontWeight: 700,
                            flexShrink: 0,
                            background: active ? `${ADMIN_COLORS.secondaryContainer}1A` : ADMIN_COLORS.surfaceContainerHighest,
                            border: `1px solid ${active ? ADMIN_COLORS.secondaryContainer + '33' : ADMIN_COLORS.outlineVariant + '33'}`,
                            color: active ? ADMIN_COLORS.secondaryContainer : ADMIN_COLORS.onSurface,
                          }}
                        >
                          {initials(user.name)}
                        </div>
                        <span style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '14px', fontWeight: 600, color: ADMIN_COLORS.onSurface }}>{user.name}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1.25rem 2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>
                    {editingId === user.id ? (
                      <input type="email" style={{ ...INPUT_STYLE, width: '160px' }} value={editState.email} onChange={e => setEditState(s => ({ ...s, email: e.target.value }))} />
                    ) : (
                      user.email
                    )}
                  </td>
                  <td style={{ padding: '1.25rem 2rem' }}>
                    <span
                      style={{
                        display: 'inline-block', padding: '3px 10px', borderRadius: '9999px',
                        fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        background: active ? `${ADMIN_COLORS.secondaryContainer}1A` : ADMIN_COLORS.surfaceContainerHighest,
                        color: active ? ADMIN_COLORS.secondaryContainer : `${ADMIN_COLORS.onSurfaceVariant}CC`,
                        border: `1px solid ${active ? ADMIN_COLORS.secondaryContainer + '33' : ADMIN_COLORS.outlineVariant + '1A'}`,
                      }}
                    >
                      {userType(user)}
                    </span>
                  </td>
                  <td style={{ padding: '1.25rem 2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>
                    {formatDate(user.created_at)}
                  </td>
                  <td style={{ padding: '1.25rem 2rem', textAlign: 'left' }}>
                    {editingId === user.id ? (
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                          type="password"
                          placeholder="New password (optional)"
                          style={{ ...INPUT_STYLE, width: '180px' }}
                          value={editState.password}
                          onChange={e => setEditState(s => ({ ...s, password: e.target.value }))}
                        />
                        <button
                          onClick={() => saveEdit(user.id)}
                          disabled={editLoading}
                          style={{ background: ADMIN_COLORS.cerulean, color: '#fff', border: 'none', padding: '0.4rem 0.9rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ background: ADMIN_COLORS.surfaceContainerHighest, color: ADMIN_COLORS.onSurfaceVariant, border: 'none', padding: '0.4rem 0.9rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        {editError && <span style={{ color: ADMIN_COLORS.error, fontSize: '0.8rem' }}>{editError}</span>}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => startEdit(user)}
                          style={{ background: 'transparent', color: ADMIN_COLORS.onSurfaceVariant, border: `1px solid ${ADMIN_COLORS.outlineVariant}4D`, padding: '0.4rem 0.9rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <div title={onlyOne ? 'Cannot delete the only user' : ''}>
                          <button
                            onClick={() => deleteUser(user.id)}
                            disabled={onlyOne}
                            style={{
                              background: onlyOne ? 'transparent' : `${ADMIN_COLORS.error}14`,
                              color: onlyOne ? `${ADMIN_COLORS.onSurfaceVariant}66` : ADMIN_COLORS.error,
                              border: `1px solid ${onlyOne ? ADMIN_COLORS.outlineVariant + '33' : ADMIN_COLORS.error + '4D'}`,
                              padding: '0.4rem 0.9rem',
                              borderRadius: '9999px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: onlyOne ? 'not-allowed' : 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer / pagination */}
          <div
            style={{
              padding: '1.5rem 2rem', borderTop: `1px solid ${ADMIN_COLORS.outlineVariant}0D`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem',
              fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '10px', fontWeight: 700,
              color: `${ADMIN_COLORS.onSurfaceVariant}66`, textTransform: 'uppercase', letterSpacing: '0.1em',
            }}
          >
            <span>Showing {users.length} of {users.length} internal users</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.3 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_left</span> PREV
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {Array.from({ length: totalPages }, (_, p) => p + 1).map(p => (
                  <span
                    key={p}
                    className={`admin-pagination-pill${p === 1 ? ' active' : ''}`}
                    style={{
                      width: '1.75rem', height: '1.75rem', borderRadius: '0.5rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: p === 1 ? ADMIN_COLORS.secondaryContainer : 'transparent',
                      color: p === 1 ? '#fff' : `${ADMIN_COLORS.onSurfaceVariant}CC`,
                      boxShadow: p === 1 ? ADMIN_SHADOWS.glowCarmine : 'none',
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', opacity: totalPages > 1 ? 1 : 0.3 }}>
                NEXT <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chevron_right</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
