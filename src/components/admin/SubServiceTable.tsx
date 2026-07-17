'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

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
  borderRadius: '9999px',
  fontSize: '11px',
  fontWeight: 700,
  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  whiteSpace: 'nowrap',
  background: ADMIN_COLORS.surfaceContainerHighest,
  color: `${ADMIN_COLORS.onSurfaceVariant}CC`,
  border: `1px solid ${ADMIN_COLORS.outlineVariant}1A`,
});

const SELECT_CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23c4c6cd'/%3E%3C/svg%3E")`;

/**
 * Search + filter + table for sub-service pages. Extracted from the former standalone
 * `/admin/sub-services` route (Brief 53/57) so it can be embedded under the category
 * cards on `/admin/service-pages` (Brief 83) without duplicating the fetch/filter logic.
 */
export default function SubServiceTable() {
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
    border: `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
    borderRadius: '0.75rem',
    fontSize: '0.875rem',
    fontFamily: 'var(--font-nunito), system-ui, sans-serif',
    background: ADMIN_COLORS.surfaceContainer,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: SELECT_CHEVRON,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 8px center',
  };

  const gridCols = '2fr 160px 120px 140px 120px';

  return (
    <section>
      {/* row hover (inline styles can't express :hover) */}
      <style>{`
        .admin-subservices-row:hover { background: ${ADMIN_COLORS.surfaceContainerHigh}66; }
      `}</style>

      <h2 style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.025em', color: ADMIN_COLORS.onSurface, marginBottom: '0.25rem' }}>
        Service pages
      </h2>
      <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontSize: '0.875rem', marginBottom: '1.25rem' }}>
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
            border: `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-nunito), system-ui, sans-serif',
            color: ADMIN_COLORS.onSurface,
            background: ADMIN_COLORS.surfaceContainer,
            width: '240px',
            boxSizing: 'border-box',
          }}
        />

        <select value={filterParent} onChange={e => setFilterParent(e.target.value)}
          style={{ ...SELECT_STYLE, color: filterParent ? ADMIN_COLORS.onSurface : ADMIN_COLORS.onSurfaceVariant }}>
          <option value="">All parent pages</option>
          {allParents.map(p => (
            <option key={p} value={p}>{catMap[p] ?? p}</option>
          ))}
          <option value="__none__">No parent assigned</option>
        </select>

        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ ...SELECT_STYLE, color: filterStatus ? ADMIN_COLORS.onSurface : ADMIN_COLORS.onSurfaceVariant }}>
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        {hasActiveFilter && (
          <button
            onClick={() => { setQuery(''); setFilterParent(''); setFilterStatus(''); }}
            style={{
              padding: '0.45rem 0.9rem',
              border: `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
              borderRadius: '9999px',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-nunito), system-ui, sans-serif',
              fontWeight: 700,
              color: ADMIN_COLORS.onSurfaceVariant,
              background: 'transparent',
              cursor: 'pointer',
            }}
          >
            Clear filters
          </button>
        )}
        {hasActiveFilter && loadStatus === 'done' && (
          <span style={{ fontSize: '13px', color: ADMIN_COLORS.onSurfaceVariant, fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
            {filtered.length} of {rows.length}
          </span>
        )}
      </div>

      {loadStatus === 'loading' && <p style={{ color: ADMIN_COLORS.onSurfaceVariant }}>Loading…</p>}
      {loadStatus === 'error' && <p style={{ color: ADMIN_COLORS.error }}>Failed to load sub-service pages. Please refresh.</p>}

      {loadStatus === 'done' && (
        <div style={{ background: ADMIN_COLORS.surfaceContainerLow, border: `1px solid ${ADMIN_COLORS.outlineVariant}1A`, borderRadius: '2rem', overflowX: 'auto', boxShadow: ADMIN_SHADOWS.elegant }}>
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: gridCols,
            gap: '0.75rem',
            padding: '0.9rem 1.25rem',
            borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
            fontSize: '10px',
            fontWeight: 700,
            color: `${ADMIN_COLORS.onSurfaceVariant}66`,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            fontFamily: 'var(--font-nunito), system-ui, sans-serif',
            minWidth: '700px',
          }}>
            <span>Title</span>
            <span>Parent Page</span>
            <span>Status</span>
            <span>Last Modified</span>
            <span>Actions</span>
          </div>

          {filtered.length === 0 && (
            <p style={{ color: ADMIN_COLORS.onSurfaceVariant, padding: '1rem 1.25rem' }}>No sub-service pages found.</p>
          )}

          {filtered.map((row, i) => (
            <div
              key={row.slug}
              className="admin-subservices-row"
              style={{
                display: 'grid',
                gridTemplateColumns: gridCols,
                gap: '0.75rem',
                padding: '0.9rem 1.25rem',
                borderBottom: i < filtered.length - 1 ? `1px solid ${ADMIN_COLORS.outlineVariant}1A` : 'none',
                alignItems: 'center',
                minWidth: '700px',
                transition: 'background 0.15s ease',
              }}
            >
              {/* Title */}
              <Link
                href={`/admin/sub-service/${row.slug}`}
                style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '14px', fontWeight: 600, color: ADMIN_COLORS.onSurface, textDecoration: 'none' }}
              >
                {row.title || row.slug}
              </Link>

              {/* Parent Page */}
              <span style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: row.parent_slug ? `${ADMIN_COLORS.onSurfaceVariant}99` : `${ADMIN_COLORS.onSurfaceVariant}66` }}>
                {row.parent_slug ? (catMap[row.parent_slug] ?? row.parent_slug) : '—'}
              </span>

              {/* Status */}
              <span style={STATUS_STYLE(row.status)}>
                {row.status === 'published' ? 'Published' : 'Draft'}
              </span>

              {/* Last Modified */}
              <span style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>
                {formatDate(row.updated_at)}
                {row.updated_by_name && (
                  <span style={{ display: 'block', fontSize: '11px', marginTop: '1px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>{row.updated_by_name}</span>
                )}
              </span>

              {/* Actions */}
              <span>
                <Link
                  href={`/admin/sub-service/${row.slug}`}
                  style={{ fontSize: '13px', color: ADMIN_COLORS.primary, fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}
                >
                  Edit
                </Link>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
