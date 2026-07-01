'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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
  borderRadius: '999px',
  fontSize: '11px',
  fontWeight: 700,
  lineHeight: '1.6',
  fontFamily: 'Nunito, sans-serif',
  whiteSpace: 'nowrap',
};

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
      <h1 style={{ fontFamily: 'Industry, sans-serif', color: '#0A1B2E', marginBottom: '0.25rem' }}>
        Articles
      </h1>
      <p style={{ color: '#5a6a7a', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
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
            border: '1px solid rgba(10,27,46,0.2)',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontFamily: 'Nunito, sans-serif',
            color: '#0A1B2E',
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
            border: '1px solid rgba(10,27,46,0.2)',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontFamily: 'Nunito, sans-serif',
            color: filterStatus ? '#0A1B2E' : '#5a6a7a',
            background: '#fff',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a6a7a'/%3E%3C/svg%3E")`,
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
            border: '1px solid rgba(10,27,46,0.2)',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontFamily: 'Nunito, sans-serif',
            color: filterUser ? '#0A1B2E' : '#5a6a7a',
            background: '#fff',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a6a7a'/%3E%3C/svg%3E")`,
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
            border: '1px solid rgba(10,27,46,0.2)',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontFamily: 'Nunito, sans-serif',
            color: filterCategory ? '#0A1B2E' : '#5a6a7a',
            background: '#fff',
            cursor: 'pointer',
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a6a7a'/%3E%3C/svg%3E")`,
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
              border: '1px solid rgba(10,27,46,0.2)',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontFamily: 'Nunito, sans-serif',
              color: filterDateFrom ? '#0A1B2E' : '#5a6a7a',
              background: '#fff',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '12px', color: '#5a6a7a', fontFamily: 'Nunito, sans-serif' }}>to</span>
          <input
            type="date"
            value={filterDateTo}
            min={filterDateFrom || undefined}
            onChange={e => setFilterDateTo(e.target.value)}
            title="Modified to"
            style={{
              padding: '0.45rem 0.5rem',
              border: '1px solid rgba(10,27,46,0.2)',
              borderRadius: '6px',
              fontSize: '0.875rem',
              fontFamily: 'Nunito, sans-serif',
              color: filterDateTo ? '#0A1B2E' : '#5a6a7a',
              background: '#fff',
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

        {/* Result count when filtered */}
        {hasActiveFilter && loadStatus === 'done' && (
          <span style={{ fontSize: '13px', color: '#5a6a7a', fontFamily: 'Nunito, sans-serif' }}>
            {filtered.length} of {articles.length}
          </span>
        )}
      </div>

      {loadStatus === 'loading' && <p style={{ color: '#0A1B2E' }}>Loading articles…</p>}
      {loadStatus === 'error' && <p style={{ color: '#BC0E0E' }}>Failed to load articles. Please refresh.</p>}

      {loadStatus === 'done' && (
        <div style={{ overflowX: 'auto' }}>
          {/* Header */}
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
            <p style={{ color: '#5a6a7a', padding: '1rem 0.75rem' }}>No articles found.</p>
          )}

          {filtered.map(article => (
            <div key={article.slug}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: gridCols,
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderBottom: '1px solid rgba(10,27,46,0.08)',
                  alignItems: 'center',
                  minWidth: '780px',
                }}
              >
                {/* Title */}
                <Link
                  href={`/admin/articles/${article.slug}`}
                  style={{ fontFamily: 'Nunito, sans-serif', fontSize: '14px', fontWeight: 600, color: '#0A1B2E', textDecoration: 'none' }}
                >
                  {article.title}
                </Link>

                {/* Status dropdown */}
                <select
                  value={article.status}
                  onChange={e => handleStatusChange(article, e.target.value as 'published' | 'draft')}
                  style={{
                    fontFamily: 'Nunito, sans-serif',
                    fontSize: '12px',
                    fontWeight: 700,
                    padding: '3px 6px',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: article.status === 'published' ? '#1560E6' : '#0A1B2E',
                    color: article.status === 'published' ? '#fff' : '#F9F3EC',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    width: '100%',
                    maxWidth: '110px',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='white'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 7px center',
                    paddingRight: '22px',
                  }}
                >
                  <option value="published" style={{ background: '#1560E6', color: '#fff' }}>Published</option>
                  <option value="draft" style={{ background: '#0A1B2E', color: '#F9F3EC' }}>Draft</option>
                </select>

                {/* Categories */}
                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(article.category ?? []).length === 0 ? (
                    <span style={{ color: '#5a6a7a', fontSize: '13px' }}>—</span>
                  ) : (
                    (article.category ?? []).map(slug => (
                      <span key={slug} style={{
                        ...PILL_BASE,
                        border: '1.5px solid #BC0E0E',
                        color: '#BC0E0E',
                        background: 'transparent',
                      }}>
                        {taxonomy[slug] ?? humanize(slug)}
                      </span>
                    ))
                  )}
                </span>

                {/* Author */}
                <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: '13px', color: '#5a6a7a' }}>
                  {article.updatedByName ?? '—'}
                </span>

                {/* Last Modified */}
                <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: '13px', color: '#5a6a7a' }}>
                  {formatDate(article.updatedAt)}
                </span>

                {/* Actions */}
                <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <Link
                    href={`/admin/articles/${article.slug}`}
                    style={{ fontSize: '13px', color: '#BC0E0E', fontWeight: 700, textDecoration: 'none', fontFamily: 'Nunito, sans-serif' }}
                  >
                    Edit
                  </Link>
                  <a
                    href={`/knowledge-hub/${article.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '13px', color: '#1560E6', fontWeight: 700, textDecoration: 'none', fontFamily: 'Nunito, sans-serif' }}
                  >
                    Preview
                  </a>
                  <button
                    onClick={() => handleDelete(article)}
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      fontFamily: 'Nunito, sans-serif',
                      padding: '3px 10px',
                      borderRadius: '4px',
                      border: '1.5px solid #BC0E0E',
                      cursor: 'pointer',
                      background: 'transparent',
                      color: '#BC0E0E',
                    }}
                  >
                    Delete
                  </button>
                </span>
              </div>

              {rowErrors[article.slug] && (
                <div style={{ padding: '0.25rem 0.75rem', fontSize: '12px', color: '#BC0E0E', fontFamily: 'Nunito, sans-serif' }}>
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
