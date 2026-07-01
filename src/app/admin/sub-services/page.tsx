'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SubServiceRow {
  slug: string;
  title: string;
  status: 'published' | 'draft';
  parent_slug: string | null;
  updated_at: string | null;
  updated_by_name: string | null;
}

interface ServiceCategory {
  slug: string;
  title: string;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_STYLE = (status: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 700,
  fontFamily: 'Nunito, sans-serif',
  whiteSpace: 'nowrap',
  background: status === 'published' ? '#1560E6' : '#0A1B2E',
  color: '#F9F3EC',
});

export default function SubServicesAdminPage() {
  const [rows, setRows] = useState<SubServiceRow[]>([]);
  const [catMap, setCatMap] = useState<Record<string, string>>({});
  const [loadStatus, setLoadStatus] = useState<'loading' | 'error' | 'done'>('loading');
  const [query, setQuery] = useState('');
  const [filterParent, setFilterParent] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/cms/sub-service-pages').then(r => r.json()),
      fetch('/api/cms/service-categories').then(r => r.json()).catch(() => []),
    ])
      .then(([pages, cats]) => {
        setRows(Array.isArray(pages) ? pages : []);
        const map: Record<string, string> = {};
        if (Array.isArray(cats)) {
          for (const c of cats as ServiceCategory[]) {
            map[c.slug] = c.title;
          }
        }
        setCatMap(map);
        setLoadStatus('done');
      })
      .catch(() => setLoadStatus('error'));
  }, []);

  const allParents = Array.from(new Set(rows.map(r => r.parent_slug).filter(Boolean) as string[])).sort();

  const filtered = rows.filter(r => {
    const q = query.toLowerCase();
    if (q && !(r.title.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q))) return false;
    if (filterParent === '__none__' && r.parent_slug !== null) return false;
    if (filterParent && filterParent !== '__none__' && r.parent_slug !== filterParent) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  const hasActiveFilter = query || filterParent || filterStatus;

  const SELECT_STYLE: React.CSSProperties = {
    padding: '0.45rem 2rem 0.45rem 0.75rem',
    border: '1px solid rgba(10,27,46,0.2)',
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontFamily: 'Nunito, sans-serif',
    background: '#fff',
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a6a7a'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
  };

  const gridCols = '2fr 160px 120px 140px 120px';

  return (
    <main style={{ padding: '2rem', maxWidth: '1100px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontFamily: 'Industry, sans-serif', color: '#0A1B2E', marginBottom: '0.25rem' }}>
        Sub-Service Pages
      </h1>
      <p style={{ color: '#5a6a7a', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
        {loadStatus === 'done' ? `${rows.length} sub-service pages` : ' '}
      </p>

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <input
          type="search"
          placeholder="Search title or slug…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            padding: '0.45rem 0.75rem',
            border: '1px solid rgba(10,27,46,0.2)',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontFamily: 'Nunito, sans-serif',
            color: '#0A1B2E',
            width: '240px',
            boxSizing: 'border-box',
          }}
        />

        <select value={filterParent} onChange={e => setFilterParent(e.target.value)}
          style={{ ...SELECT_STYLE, color: filterParent ? '#0A1B2E' : '#5a6a7a' }}>
          <option value="">All parent pages</option>
          {allParents.map(p => (
            <option key={p} value={p}>{catMap[p] ?? p}</option>
          ))}
          <option value="__none__">No parent assigned</option>
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ ...SELECT_STYLE, color: filterStatus ? '#0A1B2E' : '#5a6a7a' }}>
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        {hasActiveFilter && (
          <button
            onClick={() => { setQuery(''); setFilterParent(''); setFilterStatus(''); }}
            style={{
              padding: '0.45rem 0.9rem',
              border: '1px solid rgba(10,27,46,0.2)',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 700,
              color: '#BC0E0E',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            Clear filters
          </button>
        )}
        {hasActiveFilter && loadStatus === 'done' && (
          <span style={{ fontSize: '13px', color: '#5a6a7a', fontFamily: 'Nunito, sans-serif' }}>
            {filtered.length} of {rows.length}
          </span>
        )}
      </div>

      {loadStatus === 'loading' && <p style={{ color: '#0A1B2E' }}>Loading…</p>}
      {loadStatus === 'error' && <p style={{ color: '#BC0E0E' }}>Failed to load sub-service pages. Please refresh.</p>}

      {loadStatus === 'done' && (
        <div style={{ overflowX: 'auto' }}>
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: gridCols,
            gap: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderBottom: '2px solid rgba(10,27,46,0.12)',
            fontSize: '12px',
            fontWeight: 700,
            color: 'rgba(10,27,46,0.6)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            fontFamily: 'Nunito, sans-serif',
            minWidth: '700px',
          }}>
            <span>Title</span>
            <span>Parent Page</span>
            <span>Status</span>
            <span>Last Modified</span>
            <span>Actions</span>
          </div>

          {filtered.length === 0 && (
            <p style={{ color: '#5a6a7a', padding: '1rem 0.75rem' }}>No sub-service pages found.</p>
          )}

          {filtered.map(row => (
            <div
              key={row.slug}
              style={{
                display: 'grid',
                gridTemplateColumns: gridCols,
                gap: '0.75rem',
                padding: '0.75rem',
                borderBottom: '1px solid rgba(10,27,46,0.08)',
                alignItems: 'center',
                minWidth: '700px',
              }}
            >
              {/* Title */}
              <Link
                href={`/admin/sub-service/${row.slug}`}
                style={{ fontFamily: 'Nunito, sans-serif', fontSize: '14px', fontWeight: 600, color: '#0A1B2E', textDecoration: 'none' }}
              >
                {row.title || row.slug}
              </Link>

              {/* Parent Page */}
              <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: '13px', color: row.parent_slug ? '#0A1B2E' : 'rgba(10,27,46,0.4)' }}>
                {row.parent_slug ? (catMap[row.parent_slug] ?? row.parent_slug) : '—'}
              </span>

              {/* Status */}
              <span style={STATUS_STYLE(row.status)}>
                {row.status === 'published' ? 'Published' : 'Draft'}
              </span>

              {/* Last Modified */}
              <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: '13px', color: '#5a6a7a' }}>
                {formatDate(row.updated_at)}
                {row.updated_by_name && (
                  <span style={{ display: 'block', fontSize: '11px', marginTop: '1px' }}>{row.updated_by_name}</span>
                )}
              </span>

              {/* Actions */}
              <span>
                <Link
                  href={`/admin/sub-service/${row.slug}`}
                  style={{ fontSize: '13px', color: '#BC0E0E', fontWeight: 700, textDecoration: 'none', fontFamily: 'Nunito, sans-serif' }}
                >
                  Edit
                </Link>
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
