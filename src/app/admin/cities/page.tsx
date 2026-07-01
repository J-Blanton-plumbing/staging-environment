'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CityServiceRow {
  city_slug: string;
  service_slug: string;
  parent_slug: string | null;
  updated_at: string | null;
  status: string | null;
}

interface ServiceCategory {
  slug: string;
  title: string;
}

function toDisplayName(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_DOT = (status: string | null): React.CSSProperties => ({
  display: 'inline-block',
  width: '7px',
  height: '7px',
  borderRadius: '50%',
  background: status === 'published' ? '#15803d' : '#9ca3af',
  flexShrink: 0,
});

interface GroupedSection {
  parentSlug: string | null;
  label: string;
  rows: CityServiceRow[];
}

export default function CitiesAdminPage() {
  const [cityServiceRows, setCityServiceRows] = useState<CityServiceRow[]>([]);
  const [catMap, setCatMap] = useState<Record<string, string>>({});
  const [loadStatus, setLoadStatus] = useState<'loading' | 'error' | 'done'>('loading');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/cms/cities?view=city-services').then(r => r.json()),
      fetch('/api/cms/service-categories').then(r => r.json()).catch(() => []),
    ])
      .then(([rows, cats]) => {
        setCityServiceRows(Array.isArray(rows) ? rows : []);
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

  function toggleSection(key: string) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // Filter rows by search query
  const filtered = query
    ? cityServiceRows.filter(r =>
        r.city_slug.includes(query.toLowerCase()) ||
        toDisplayName(r.city_slug).toLowerCase().includes(query.toLowerCase()) ||
        r.service_slug.includes(query.toLowerCase()) ||
        toDisplayName(r.service_slug).toLowerCase().includes(query.toLowerCase())
      )
    : cityServiceRows;

  // Build grouped sections: known categories in order, then Uncategorized
  const CATEGORY_ORDER = ['plumbing', 'sewer', 'drain', 'water-heater', 'water-quality', 'commercial'];
  const grouped: GroupedSection[] = [];

  for (const catSlug of CATEGORY_ORDER) {
    const rows = filtered.filter(r => r.parent_slug === catSlug);
    if (rows.length > 0 || (!query && cityServiceRows.some(r => r.parent_slug === catSlug))) {
      grouped.push({
        parentSlug: catSlug,
        label: catMap[catSlug] ?? toDisplayName(catSlug),
        rows,
      });
    }
  }

  // Any other assigned parent slugs not in the hardcoded order
  const extraParents = Array.from(
    new Set(filtered.map(r => r.parent_slug).filter((s): s is string => !!s && !CATEGORY_ORDER.includes(s)))
  ).sort();
  for (const slug of extraParents) {
    grouped.push({
      parentSlug: slug,
      label: catMap[slug] ?? toDisplayName(slug),
      rows: filtered.filter(r => r.parent_slug === slug),
    });
  }

  // Uncategorized
  const uncategorized = filtered.filter(r => !r.parent_slug);
  if (uncategorized.length > 0 || (!query && cityServiceRows.some(r => !r.parent_slug))) {
    grouped.push({ parentSlug: null, label: 'Uncategorized', rows: uncategorized });
  }

  const totalFiltered = filtered.length;

  const SECTION_HEAD: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1rem',
    height: '44px',
    fontFamily: 'Industry, sans-serif',
    fontWeight: 700,
    fontSize: '13px',
    color: '#0A1B2E',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    userSelect: 'none',
    cursor: 'pointer',
    background: '#F9F3EC',
    border: '1px solid rgba(10,27,46,0.12)',
    borderRadius: '6px',
    boxSizing: 'border-box',
  };

  return (
    <main style={{ padding: '2rem', maxWidth: '960px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontFamily: 'Industry, sans-serif', color: '#0A1B2E', marginBottom: '0.25rem' }}>
        City Service Pages
      </h1>
      <p style={{ color: '#5a6a7a', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
        {loadStatus === 'done' ? `${cityServiceRows.length} city-service pages · grouped by service category` : ' '}
      </p>

      <input
        type="search"
        placeholder="Search by city or service…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{
          display: 'block',
          width: '100%',
          maxWidth: '360px',
          padding: '0.5rem 0.75rem',
          border: '1px solid rgba(10,27,46,0.2)',
          borderRadius: '6px',
          fontSize: '0.9rem',
          marginBottom: '1.5rem',
          fontFamily: 'Nunito, sans-serif',
          color: '#0A1B2E',
          boxSizing: 'border-box',
        }}
      />

      {query && loadStatus === 'done' && (
        <p style={{ fontSize: '13px', color: '#5a6a7a', fontFamily: 'Nunito, sans-serif', marginBottom: '1rem' }}>
          {totalFiltered} result{totalFiltered !== 1 ? 's' : ''}
        </p>
      )}

      {loadStatus === 'loading' && <p style={{ color: '#5a6a7a' }}>Loading…</p>}
      {loadStatus === 'error' && <p style={{ color: '#BC0E0E' }}>Failed to load city service pages. Check database connection.</p>}

      {loadStatus === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {grouped.map(section => {
            const key = section.parentSlug ?? '__none__';
            const isOpen = !!openSections[key];
            const isUncategorized = section.parentSlug === null;

            return (
              <div key={key} style={{ borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(10,27,46,0.12)' }}>
                {/* Toggle header */}
                <div
                  style={{
                    ...SECTION_HEAD,
                    borderRadius: isOpen ? '6px 6px 0 0' : '6px',
                    border: 'none',
                    color: isUncategorized ? '#5a6a7a' : '#0A1B2E',
                  }}
                  onClick={() => toggleSection(key)}
                  role="button"
                  aria-expanded={isOpen}
                >
                  <span>{section.label}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontWeight: 700,
                      fontSize: '12px',
                      color: '#5a6a7a',
                      background: 'rgba(10,27,46,0.07)',
                      borderRadius: '999px',
                      padding: '2px 10px',
                      textTransform: 'none',
                      letterSpacing: 0,
                    }}>
                      {section.rows.length} page{section.rows.length !== 1 ? 's' : ''}
                    </span>
                    <span style={{ fontSize: '12px', color: '#5a6a7a' }}>{isOpen ? '▴' : '▾'}</span>
                  </span>
                </div>

                {/* Expanded items */}
                {isOpen && (
                  <div style={{ background: '#fff', borderTop: '1px solid rgba(10,27,46,0.08)' }}>
                    {section.rows.length === 0 ? (
                      <p style={{ padding: '0.75rem 1rem', fontFamily: 'Nunito, sans-serif', fontSize: '13px', color: 'rgba(10,27,46,0.4)', margin: 0 }}>
                        No pages in this category.
                      </p>
                    ) : (
                      <div>
                        {/* Column header */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 160px 90px 130px',
                          gap: '0.5rem',
                          padding: '0.35rem 1rem',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'rgba(10,27,46,0.45)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          fontFamily: 'Nunito, sans-serif',
                          borderBottom: '1px solid rgba(10,27,46,0.06)',
                          background: '#fafaf9',
                        }}>
                          <span>City — Service</span>
                          <span>Last modified</span>
                          <span>Status</span>
                          <span>Action</span>
                        </div>

                        {section.rows.map(row => (
                          <div
                            key={`${row.city_slug}/${row.service_slug}`}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 160px 90px 130px',
                              gap: '0.5rem',
                              padding: '0.6rem 1rem',
                              borderBottom: '1px solid rgba(10,27,46,0.05)',
                              alignItems: 'center',
                            }}
                          >
                            {/* City — Service */}
                            <Link
                              href={`/admin/city-service/${row.city_slug}/${row.service_slug}`}
                              style={{ fontFamily: 'Nunito, sans-serif', fontSize: '14px', fontWeight: 600, color: '#0A1B2E', textDecoration: 'none' }}
                            >
                              {toDisplayName(row.city_slug)} — {toDisplayName(row.service_slug)}
                            </Link>

                            {/* Last modified */}
                            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: '12px', color: '#5a6a7a' }}>
                              {formatDate(row.updated_at) || '—'}
                            </span>

                            {/* Status */}
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={STATUS_DOT(row.status)} />
                              <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: '12px', color: '#5a6a7a', textTransform: 'capitalize' }}>
                                {row.status ?? '—'}
                              </span>
                            </span>

                            {/* Action */}
                            <Link
                              href={`/admin/city-service/${row.city_slug}/${row.service_slug}`}
                              style={{ fontFamily: 'Nunito, sans-serif', fontSize: '13px', color: '#BC0E0E', fontWeight: 700, textDecoration: 'none' }}
                            >
                              Edit →
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {grouped.length === 0 && (
            <p style={{ color: '#5a6a7a', fontFamily: 'Nunito, sans-serif' }}>No city service pages found.</p>
          )}
        </div>
      )}
    </main>
  );
}
