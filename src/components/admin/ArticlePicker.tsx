'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { ADMIN_COLORS } from '@/lib/admin/theme';

const fontBody = 'var(--font-nunito), system-ui, sans-serif';
const fontHead = 'var(--font-outfit), system-ui, sans-serif';

/** The minimal article shape the picker lists (from `GET /api/cms/articles`). */
export interface PickerArticle {
  slug: string;
  title: string;
  status: string;
}

/**
 * Brief 92 — a search-by-title dropdown over existing articles (DB + static, as the
 * articles list API already merges them). The editor types to filter by title; on
 * select the block stores the article **slug** (never a raw URL), which the renderer
 * resolves to a live article. Used by Hand-pick and by category Backfill.
 */
export default function ArticlePicker({
  label,
  value,
  articles,
  onChange,
  placeholder = 'Search articles by title…',
}: {
  label?: string;
  value: string;
  articles: PickerArticle[];
  onChange: (slug: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const boxRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => articles.find((a) => a.slug === value) ?? null, [articles, value]);

  // Close on click-away.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? articles.filter((a) => a.title.toLowerCase().includes(q)) : articles).slice(0, 30),
    [articles, q]
  );

  return (
    <div ref={boxRef} style={{ position: 'relative', marginBottom: '0.6rem' }}>
      {label && (
        <label
          style={{
            display: 'block', fontFamily: fontBody, fontSize: '12px', fontWeight: 600,
            color: `${ADMIN_COLORS.onSurfaceVariant}cc`, marginBottom: '0.3rem',
          }}
        >
          {label}
        </label>
      )}

      {selected && !open ? (
        // Selected state — show the title with change/clear affordances.
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.6rem', borderRadius: '0.5rem',
            border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
            background: ADMIN_COLORS.surfaceContainerLow,
          }}
        >
          <span style={{ flex: 1, fontFamily: fontBody, fontSize: '13px', color: ADMIN_COLORS.onSurface, lineHeight: 1.3 }}>
            {selected.title}
            {selected.status !== 'published' && (
              <span style={{ marginLeft: '0.4rem', fontSize: '11px', fontWeight: 700, color: ADMIN_COLORS.error }}>
                (draft)
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => { setQuery(''); setOpen(true); }}
            style={pillBtn(ADMIN_COLORS.cerulean)}
          >
            Change
          </button>
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear selection"
            style={pillBtn(ADMIN_COLORS.error)}
          >
            Clear
          </button>
        </div>
      ) : (
        <input
          type="text"
          value={query}
          autoFocus={open}
          onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          placeholder={selected ? selected.title : placeholder}
          style={{
            display: 'block', width: '100%', padding: '0.5rem 0.6rem',
            border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
            fontFamily: fontBody, fontSize: '13px', color: ADMIN_COLORS.onSurface,
            background: ADMIN_COLORS.surfaceContainerLow, boxSizing: 'border-box',
          }}
        />
      )}

      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: '0.25rem',
            maxHeight: '240px', overflowY: 'auto',
            background: ADMIN_COLORS.surfaceContainer, border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
            borderRadius: '0.6rem', boxShadow: '0 8px 24px rgba(10,27,46,0.18)', padding: '0.35rem',
          }}
        >
          {matches.length === 0 ? (
            <p style={{ fontFamily: fontBody, fontSize: '12px', color: ADMIN_COLORS.onSurfaceVariant, margin: 0, padding: '0.5rem' }}>
              No articles match “{query}”.
            </p>
          ) : (
            matches.map((a) => (
              <button
                key={a.slug}
                type="button"
                onClick={() => { onChange(a.slug); setOpen(false); setQuery(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%', textAlign: 'left',
                  padding: '0.45rem 0.5rem', borderRadius: '0.4rem', border: 'none',
                  background: a.slug === value ? `${ADMIN_COLORS.cerulean}22` : 'transparent',
                  color: ADMIN_COLORS.onSurface, cursor: 'pointer', fontFamily: fontBody, fontSize: '13px', lineHeight: 1.3,
                }}
              >
                <span style={{ flex: 1 }}>{a.title}</span>
                {a.status !== 'published' && (
                  <span style={{ fontSize: '10px', fontWeight: 700, color: ADMIN_COLORS.error }}>draft</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function pillBtn(color: string): React.CSSProperties {
  return {
    flexShrink: 0, padding: '0.25rem 0.5rem', borderRadius: '0.4rem',
    border: `1px solid ${color}66`, background: 'transparent', color,
    fontFamily: fontHead, fontWeight: 600, fontSize: '11px', cursor: 'pointer',
  };
}
