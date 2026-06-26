'use client';

import { useState, useEffect } from 'react';

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
  border: '1px solid #d1d5db',
  borderRadius: '4px',
  fontSize: '0.875rem',
  width: '100%',
  boxSizing: 'border-box',
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

  useEffect(() => { loadUsers(); }, []);

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

  const onlyOne = users.length === 1;

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '3rem 2rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontWeight: 700, fontSize: '1.5rem', margin: 0, color: '#0A1B2E' }}>Manage Users</h1>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            CMS admin accounts
          </p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddError(''); }}
          style={{
            background: '#BC0E0E', color: '#fff', border: 'none',
            padding: '0.55rem 1.25rem', borderRadius: '6px',
            fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
          }}
        >
          + Add User
        </button>
      </div>

      {/* Add user form */}
      {showAdd && (
        <div style={{ background: '#f9f3ec', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem', fontWeight: 700, color: '#0A1B2E' }}>New User</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#374151' }}>Name</label>
              <input style={INPUT_STYLE} value={addState.name} onChange={e => setAddState(s => ({ ...s, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#374151' }}>Email</label>
              <input type="email" style={INPUT_STYLE} value={addState.email} onChange={e => setAddState(s => ({ ...s, email: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem', color: '#374151' }}>Password</label>
              <input type="password" style={INPUT_STYLE} value={addState.password} onChange={e => setAddState(s => ({ ...s, password: e.target.value }))} />
            </div>
          </div>
          {addError && <p style={{ color: '#BC0E0E', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>{addError}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={addUser}
              disabled={addLoading}
              style={{ background: '#BC0E0E', color: '#fff', border: 'none', padding: '0.45rem 1rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              {addLoading ? 'Creating…' : 'Create User'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '0.45rem 1rem', borderRadius: '4px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}
      {error && <p style={{ color: '#BC0E0E' }}>{error}</p>}

      {!loading && !error && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Name', 'Email', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => (
                <tr key={user.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                    {editingId === user.id ? (
                      <input style={{ ...INPUT_STYLE, width: '120px' }} value={editState.name} onChange={e => setEditState(s => ({ ...s, name: e.target.value }))} />
                    ) : (
                      <span style={{ fontWeight: 600, color: '#0A1B2E' }}>{user.name}</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151' }}>
                    {editingId === user.id ? (
                      <input type="email" style={{ ...INPUT_STYLE, width: '160px' }} value={editState.email} onChange={e => setEditState(s => ({ ...s, email: e.target.value }))} />
                    ) : (
                      user.email
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#6b7280' }}>
                    {formatDate(user.created_at)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
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
                          style={{ background: '#1560E6', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        {editError && <span style={{ color: '#BC0E0E', fontSize: '0.8rem' }}>{editError}</span>}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          onClick={() => startEdit(user)}
                          style={{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        <div title={onlyOne ? 'Cannot delete the only user' : ''}>
                          <button
                            onClick={() => deleteUser(user.id)}
                            disabled={onlyOne}
                            style={{
                              background: onlyOne ? '#f3f4f6' : 'rgba(188,14,14,0.08)',
                              color: onlyOne ? '#9ca3af' : '#BC0E0E',
                              border: 'none',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '4px',
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
