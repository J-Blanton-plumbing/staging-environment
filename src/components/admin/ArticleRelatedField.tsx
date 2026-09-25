'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import { KH_MAX_RELATED } from '@/lib/cms/kh-taxonomy-types';

/**
 * Brief 188 (Track B2) — hand-picked related articles for the article editor.
 *
 * Up to KH_MAX_RELATED published articles, chosen with a title typeahead,
 * shown as ordered removable chips with up / down buttons. The value is a list
 * of SLUGS and travels in the version content exactly like the Brief 187 tags:
 * it reaches `cms_article_related` only when the version is PUBLISHED.
 *
 * Empty is the normal state — the public block fills every slot automatically.
 */

const FONT = 'var(--font-nunito), system-ui, sans-serif';
const LABEL: React.CSSProperties = {
  display: 'block', fontFamily: FONT, fontSize: '13px', fontWeight: 600,
  color: ADMIN_COLORS.onSurface, marginBottom: '0.25rem',
};
const HELP: React.CSSProperties = {
  fontFamily: FONT, fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}B3`,
  margin: '0.35rem 0 0', lineHeight: 1.5,
};
const INPUT: React.CSSProperties = {
  display: 'block', width: '100%', padding: '0.35rem 0.6rem',
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
  fontFamily: FONT, fontSize: '13px', color: ADMIN_COLORS.onSurface,
  background: ADMIN_COLORS.surfaceContainerLow, boxSizing: 'border-box',
};
const SMALL_BTN: React.CSSProperties = {
  background: 'none', border: `1px solid rgba(255,255,255,0.35)`, borderRadius: '0.3rem',
  color: '#fff', cursor: 'pointer', padding: '0 0.3rem', fontSize: '11px', lineHeight: '16px',
};

interface ArticleOption { slug: string; title: string }

export default function ArticleRelatedField({
  selfSlug,
  value,
  onChange,
}: {
  selfSlug: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [options, setOptions] = useState<ArticleOption[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/cms/articles')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((rows: Array<{ slug: string; title: string; status: string }>) => {
        if (!active) return;
        setOptions(
          (Array.isArray(rows) ? rows : [])
            .filter((a) => a.status === 'published' && a.slug !== selfSlug)
            .map((a) => ({ slug: a.slug, title: a.title }))
        );
      })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, [selfSlug]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const titleOf = useMemo(() => new Map((options ?? []).map((o) => [o.slug, o.title])), [options]);
  const full = value.length >= KH_MAX_RELATED;
  const q = query.trim().toLowerCase();
  const matches = (options ?? [])
    .filter((o) => !value.includes(o.slug) && (!q || o.title.toLowerCase().includes(q)))
    .slice(0, 25);

  const add = (slug: string) => {
    if (!full && !value.includes(slug)) onChange([...value, slug]);
    setQuery('');
    setOpen(false);
  };
  const remove = (slug: string) => onChange(value.filter((s) => s !== slug));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>Related articles</label>

      {value.length > 0 && (
        <ol style={{ listStyle: 'none', padding: 0, margin: '0.4rem 0 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {value.map((slug, i) => (
            <li
              key={slug}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem',
                borderRadius: '0.6rem', background: ADMIN_COLORS.cerulean, color: '#fff',
                fontFamily: FONT, fontSize: '12px', fontWeight: 700,
              }}
            >
              <span style={{ opacity: 0.8 }}>{i + 1}.</span>
              <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere' }}>
                {titleOf.get(slug) ?? slug}
                {options && !titleOf.has(slug) && (
                  <em style={{ fontWeight: 400, opacity: 0.85 }}> — not published; it will be skipped</em>
                )}
              </span>
              <button type="button" style={SMALL_BTN} onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${titleOf.get(slug) ?? slug} up`}>↑</button>
              <button type="button" style={SMALL_BTN} onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label={`Move ${titleOf.get(slug) ?? slug} down`}>↓</button>
              <button
                type="button"
                onClick={() => remove(slug)}
                aria-label={`Remove ${titleOf.get(slug) ?? slug}`}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1 }}
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      {loadError ? (
        <p style={{ ...HELP, color: ADMIN_COLORS.error }}>Articles couldn&rsquo;t be loaded; the current picks are unchanged. Reload to try again.</p>
      ) : (
        <div ref={boxRef} style={{ position: 'relative' }}>
          <input
            className="field"
            type="search"
            placeholder={full ? `${KH_MAX_RELATED} picked — remove one to add another` : options ? 'Search published articles by title…' : 'Loading articles…'}
            value={query}
            disabled={full || !options}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter') { e.preventDefault(); if (matches[0]) add(matches[0].slug); }
            }}
            role="combobox"
            aria-expanded={open}
            aria-controls="kh-related-options"
            style={INPUT}
          />
          {open && !full && options && q && (
            <div
              id="kh-related-options"
              role="listbox"
              style={{
                marginTop: '0.35rem', maxHeight: '240px', overflowY: 'auto',
                border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
                background: ADMIN_COLORS.surfaceContainerHigh,
              }}
            >
              {matches.length === 0 && (
                <p style={{ ...HELP, padding: '0.5rem 0.75rem', margin: 0, fontStyle: 'italic' }}>No published article matches</p>
              )}
              {matches.map((o) => (
                <button
                  key={o.slug}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => add(o.slug)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '0.4rem 0.75rem',
                    background: 'transparent', border: 'none', color: ADMIN_COLORS.onSurface,
                    fontFamily: FONT, fontSize: '13px', cursor: 'pointer',
                  }}
                >
                  {o.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <p style={HELP}>
        Optional. Hand-picked articles always show first. Empty slots fill automatically from the same topic and location.
      </p>
      <p style={HELP}>
        Like tags, picks are saved with the version (<strong>Save</strong>, top right) and go live when that version is{' '}
        <strong>published</strong>. The <em>Save Article</em> button at the bottom does not change them.
      </p>
    </div>
  );
}
