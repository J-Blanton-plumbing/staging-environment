'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

interface ArticleRow {
  slug: string;
  title: string;
  excerpt: string;
  status: 'published' | 'draft';
  category: string[];
  updatedAt: string | null;
  updatedByName: string | null;
  href?: string;
}

type TaxonomyMap = Record<string, string>;

function humanize(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const PILL_BASE: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: '9999px',
  fontSize: '11px',
  fontWeight: 700,
  lineHeight: '1.6',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  whiteSpace: 'nowrap',
};

const SELECT_CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23c4c6cd'/%3E%3C/svg%3E")`;

export default function ArticlesAdminPage() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [taxonomy, setTaxonomy] = useState<TaxonomyMap>({});
  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [loadStatus, setLoadStatus] = useState<'loading' | 'error' | 'done'>('loading');
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      fetch('/api/cms/articles').then(r => r.json()),
      fetch('/api/cms/service-categories').then(r => r.json()).catch(() => []),
    ])
      .then(([arts, cats]) => {
        setArticles(Array.isArray(arts) ? arts : []);
        const map: TaxonomyMap = {};
        if (Array.isArray(cats)) {
          for (const c of cats) {
            map[c.slug] = c.name ?? c.title ?? humanize(c.slug);
          }
        }
        setTaxonomy(map);
        setLoadStatus('done');
      })
      .catch(() => setLoadStatus('error'));
  }, []);

  // Derive filter option lists from loaded data
  const allUsers = Array.from(
    new Set(articles.map(a => a.updatedByName).filter(Boolean) as string[])
  ).sort();

  const allCategories = Array.from(
    new Set(articles.flatMap(a => a.category ?? []))
  ).sort();

  const hasActiveFilter = query || filterStatus || filterUser || filterCategory || filterDateFrom || filterDateTo;

  const filtered = articles.filter(a => {
    const q = query.toLowerCase();
    if (q && !(
      a.title.toLowerCase().includes(q) ||
      a.slug.toLowerCase().includes(q) ||
      (a.category ?? []).some(c => c.toLowerCase().includes(q))
    )) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (filterUser && a.updatedByName !== filterUser) return false;
    if (filterCategory && !(a.category ?? []).includes(filterCategory)) return false;
    if (filterDateFrom || filterDateTo) {
      const ts = a.updatedAt ? new Date(a.updatedAt).getTime() : null;
      if (!ts) return false;
      if (filterDateFrom && ts < new Date(filterDateFrom).getTime()) return false;
      if (filterDateTo) {
        // treat "to" date as end-of-day
        const to = new Date(filterDateTo);
        to.setHours(23, 59, 59, 999);
        if (ts > to.getTime()) return false;
      }
    }
    return true;
  });

  function clearFilters() {
    setQuery('');
    setFilterStatus('');
    setFilterUser('');
    setFilterCategory('');
    setFilterDateFrom('');
    setFilterDateTo('');
  }

  function setRowError(slug: string, msg: string) {
    setRowErrors(prev => ({ ...prev, [slug]: msg }));
    setTimeout(() => setRowErrors(prev => { const n = { ...prev }; delete n[slug]; return n; }), 4000);
  }

  async function handleStatusChange(article: ArticleRow, newStatus: 'published' | 'draft') {
    try {
      const res = await fetch(`/api/cms/article/${article.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Request failed');
      setArticles(prev =>
        prev.map(a => a.slug === article.slug ? { ...a, status: newStatus } : a)
      );
    } catch {
      setRowError(article.slug, 'Failed to update status.');
    }
  }

  async function handleDelete(article: ArticleRow) {
    if (!confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/cms/article/${article.slug}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 204) throw new Error('Request failed');
      setArticles(prev => prev.filter(a => a.slug !== article.slug));
    } catch {
      setRowError(article.slug, 'Failed to delete article.');
    }
  }

  const gridCols = '2fr 120px 160px 120px 110px 160px';

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', fontFamily: 'system-ui, sans-serif' }}>
      {/* row hover (inline styles can't express :hover) */}
      <style>{`
        .admin-articles-row:hover { background: ${ADMIN_COLORS.surfaceContainerHigh}66; }
      `}</style>

      <h1 style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 700, fontSize: '1.875rem', letterSpacing: '-0.025em', color: ADMIN_COLORS.onSurface, marginBottom: '0.25rem' }}>
        Articles
      </h1>
      <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
        {loadStatus === 'done' ? `${articles.length} articles` : ' '}
      </p>

      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        {/* Search */}
        <input
          type="search"
          placeholder="Search title, slug, category…"
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
            width: '260px',
            boxSizing: 'border-box',
          }}
        />

        {/* Status */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: '0.45rem 2rem 0.45rem 0.75rem',
            border: `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-nunito), system-ui, sans-serif',
            color: filterStatus ? ADMIN_COLORS.onSurface : ADMIN_COLORS.onSurfaceVariant,
            background: ADMIN_COLORS.surfaceContainer,
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: SELECT_CHEVRON,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
        >
          <option value="">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        {/* Author */}
        <select
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          style={{
            padding: '0.45rem 2rem 0.45rem 0.75rem',
            border: `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-nunito), system-ui, sans-serif',
            color: filterUser ? ADMIN_COLORS.onSurface : ADMIN_COLORS.onSurfaceVariant,
            background: ADMIN_COLORS.surfaceContainer,
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: SELECT_CHEVRON,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
        >
          <option value="">All authors</option>
          {allUsers.map(u => <option key={u} value={u}>{u}</option>)}
        </select>

        {/* Category */}
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          style={{
            padding: '0.45rem 2rem 0.45rem 0.75rem',
            border: `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            fontFamily: 'var(--font-nunito), system-ui, sans-serif',
            color: filterCategory ? ADMIN_COLORS.onSurface : ADMIN_COLORS.onSurfaceVariant,
            background: ADMIN_COLORS.surfaceContainer,
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: SELECT_CHEVRON,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 8px center',
          }}
        >
          <option value="">All categories</option>
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Date range */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            title="Modified from"
            style={{
              padding: '0.45rem 0.5rem',
              border: `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-nunito), system-ui, sans-serif',
              color: filterDateFrom ? ADMIN_COLORS.onSurface : ADMIN_COLORS.onSurfaceVariant,
              background: ADMIN_COLORS.surfaceContainer,
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '12px', color: ADMIN_COLORS.onSurfaceVariant, fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>to</span>
          <input
            type="date"
            value={filterDateTo}
            min={filterDateFrom || undefined}
            onChange={e => setFilterDateTo(e.target.value)}
            title="Modified to"
            style={{
              padding: '0.45rem 0.5rem',
              border: `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
              borderRadius: '0.75rem',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-nunito), system-ui, sans-serif',
              color: filterDateTo ? ADMIN_COLORS.onSurface : ADMIN_COLORS.onSurfaceVariant,
              background: ADMIN_COLORS.surfaceContainer,
              cursor: 'pointer',
            }}
          />
        </div>

        {/* Clear */}
        {hasActiveFilter && (
          <button
            onClick={clearFilters}
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

        {/* Result count when filtered */}
        {hasActiveFilter && loadStatus === 'done' && (
          <span style={{ fontSize: '13px', color: ADMIN_COLORS.onSurfaceVariant, fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
            {filtered.length} of {articles.length}
          </span>
        )}
      </div>

      {loadStatus === 'loading' && <p style={{ color: ADMIN_COLORS.onSurfaceVariant }}>Loading articles…</p>}
      {loadStatus === 'error' && <p style={{ color: ADMIN_COLORS.error }}>Failed to load articles. Please refresh.</p>}

      {loadStatus === 'done' && (
        <div style={{ background: ADMIN_COLORS.surfaceContainerLow, border: `1px solid ${ADMIN_COLORS.outlineVariant}1A`, borderRadius: '2rem', overflowX: 'auto', boxShadow: ADMIN_SHADOWS.elegant }}>
          {/* Header */}
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
            minWidth: '780px',
          }}>
            <span>Title</span>
            <span>Status</span>
            <span>Categories</span>
            <span>Author</span>
            <span>Last Modified</span>
            <span>Actions</span>
          </div>

          {filtered.length === 0 && (
            <p style={{ color: ADMIN_COLORS.onSurfaceVariant, padding: '1rem 1.25rem' }}>No articles found.</p>
          )}

          {filtered.map((article, i) => (
            <div key={article.slug}>
              <div
                className="admin-articles-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  gap: '0.75rem',
                  padding: '0.9rem 1.25rem',
                  borderBottom: i < filtered.length - 1 ? `1px solid ${ADMIN_COLORS.outlineVariant}1A` : 'none',
                  alignItems: 'center',
                  minWidth: '780px',
                  transition: 'background 0.15s ease',
                }}
              >
                {/* Title */}
                <Link
                  href={`/admin/articles/${article.slug}`}
                  style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '14px', fontWeight: 600, color: ADMIN_COLORS.onSurface, textDecoration: 'none' }}
                >
                  {article.title}
                </Link>

                {/* Status dropdown */}
                <select
                  value={article.status}
                  onChange={e => handleStatusChange(article, e.target.value as 'published' | 'draft')}
                  style={{
                    fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 6px',
                    borderRadius: '9999px',
                    border: article.status === 'published' ? `1px solid ${ADMIN_COLORS.outlineVariant}1A` : `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
                    cursor: 'pointer',
                    background: article.status === 'published' ? ADMIN_COLORS.surfaceContainerHighest : 'transparent',
                    color: article.status === 'published' ? `${ADMIN_COLORS.onSurfaceVariant}CC` : ADMIN_COLORS.onSurfaceVariant,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    width: '100%',
                    maxWidth: '110px',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23c4c6cd'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 7px center',
                    paddingRight: '22px',
                  }}
                >
                  <option value="published" style={{ background: ADMIN_COLORS.surfaceContainer, color: ADMIN_COLORS.onSurface }}>Published</option>
                  <option value="draft" style={{ background: ADMIN_COLORS.surfaceContainer, color: ADMIN_COLORS.onSurface }}>Draft</option>
                </select>

                {/* Categories */}
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(article.category ?? []).length === 0 ? (
                    <span style={{ color: ADMIN_COLORS.onSurfaceVariant, fontSize: '13px' }}>—</span>
                  ) : (
                    (article.category ?? []).map(slug => (
                      <span key={slug} style={{
                        ...PILL_BASE,
                        border: `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
                        color: ADMIN_COLORS.onSurfaceVariant,
                        background: ADMIN_COLORS.surfaceContainerHighest,
                      }}>
                        {taxonomy[slug] ?? humanize(slug)}
                      </span>
                    ))
                  )}
                </span>

                {/* Author */}
                <span style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>
                  {article.updatedByName ?? '—'}
                </span>

                {/* Last Modified */}
                <span style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>
                  {formatDate(article.updatedAt)}
                </span>

                {/* Actions */}
                <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href={`/admin/articles/${article.slug}`}
                    style={{ fontSize: '13px', color: ADMIN_COLORS.primary, fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}
                  >
                    Edit
                  </Link>
                  <a
                    href={`/knowledge-hub/${article.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '13px', color: ADMIN_COLORS.cerulean, fontWeight: 700, textDecoration: 'none', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}
                  >
                    Preview
                  </a>
                  <button
                    onClick={() => handleDelete(article)}
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      border: `1px solid ${ADMIN_COLORS.error}4D`,
                      cursor: 'pointer',
                      background: 'transparent',
                      color: ADMIN_COLORS.error,
                    }}
                  >
                    Delete
                  </button>
                </span>
              </div>

              {rowErrors[article.slug] && (
                <div style={{ padding: '0.25rem 1.25rem', fontSize: '12px', color: ADMIN_COLORS.error, fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
                  {rowErrors[article.slug]}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
