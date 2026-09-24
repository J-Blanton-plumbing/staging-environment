'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import {
  KH_MAX_SECONDARY_TOPICS,
  type ArticleTermSelection,
  type KhTerm,
} from '@/lib/cms/kh-taxonomy-types';

/**
 * Brief 187 (B1) — the article editor's Topic + Location pickers. Replaces the
 * old `CategoriesField` / hard-coded `SERVICE_CATEGORIES`, which wrote the
 * legacy `cms_articles.category` text[] that nothing on the site read.
 *
 * The term list comes from `kh_terms` (GET /api/cms/kh-terms), so a topic
 * renamed on the "Topics & Locations" screen is renamed here too. The value is
 * slugs (`ArticleTermSelection`), and it travels in the VERSION's content like
 * every other field — see the editor page for how that keeps tags behind
 * draft → publish.
 *
 * Content-state rule: no topic is NOT an error. The article saves and publishes
 * without one; this only shows a quiet hint.
 */

const FONT = 'var(--font-nunito), system-ui, sans-serif';

const LABEL: React.CSSProperties = {
  display: 'block',
  fontFamily: FONT,
  fontSize: '13px',
  fontWeight: 600,
  color: ADMIN_COLORS.onSurface,
  marginBottom: '0.25rem',
};
const HELP: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: '12px',
  color: `${ADMIN_COLORS.onSurfaceVariant}B3`,
  margin: '0.35rem 0 0',
  lineHeight: 1.5,
};
const INPUT: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem',
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
  borderRadius: '0.5rem',
  fontFamily: FONT,
  fontSize: '0.9rem',
  color: ADMIN_COLORS.onSurface,
  background: ADMIN_COLORS.surfaceContainerLow,
  boxSizing: 'border-box',
};
const pill = (active: boolean, disabled = false): React.CSSProperties => ({
  padding: '0.3rem 0.75rem',
  borderRadius: '9999px',
  border: active ? `1.5px solid ${ADMIN_COLORS.cerulean}` : `1.5px solid ${ADMIN_COLORS.outlineVariant}66`,
  background: active ? ADMIN_COLORS.cerulean : 'transparent',
  color: active ? '#fff' : disabled ? ADMIN_COLORS.outlineVariant : ADMIN_COLORS.onSurfaceVariant,
  fontFamily: FONT,
  fontSize: '12px',
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.5 : 1,
});
const CHIP: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.3rem',
  padding: '0.25rem 0.6rem',
  borderRadius: '9999px',
  background: ADMIN_COLORS.cerulean,
  color: '#fff',
  fontFamily: FONT,
  fontSize: '12px',
  fontWeight: 700,
};
const CHIP_X: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'rgba(255,255,255,0.8)',
  cursor: 'pointer',
  padding: 0,
  fontSize: '13px',
  lineHeight: 1,
};
const BOX: React.CSSProperties = {
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
  borderRadius: '0.75rem',
  overflow: 'hidden',
};
const BOX_HEAD: React.CSSProperties = {
  padding: '0.4rem 0.75rem',
  background: ADMIN_COLORS.surfaceContainer,
  fontFamily: FONT,
  fontSize: '11px',
  fontWeight: 700,
  color: ADMIN_COLORS.onSurfaceVariant,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'flex',
  justifyContent: 'space-between',
};

/** Max typeahead rows shown at once — there are ~390 locations. */
const MAX_MATCHES = 40;

export default function ArticleTermsField({
  value,
  onChange,
}: {
  value: ArticleTermSelection;
  onChange: (next: ArticleTermSelection) => void;
}) {
  const [terms, setTerms] = useState<KhTerm[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/cms/kh-terms')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((rows: KhTerm[]) => { if (active) setTerms(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, []);

  // Close the typeahead on an outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const topics = useMemo(() => (terms ?? []).filter((t) => t.type === 'topic'), [terms]);
  const locations = useMemo(() => (terms ?? []).filter((t) => t.type === 'location'), [terms]);
  const regions = useMemo(() => locations.filter((t) => t.parentId === null), [locations]);
  const bySlug = useMemo(() => new Map(locations.map((t) => [t.slug, t])), [locations]);

  if (loadError) {
    return (
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={LABEL}>Topics &amp; Locations</label>
        <p style={{ ...HELP, color: ADMIN_COLORS.error }}>
          Topics &amp; Locations couldn&rsquo;t be loaded. The article&rsquo;s tags are unchanged; reload to try again.
        </p>
      </div>
    );
  }
  if (!terms) {
    return (
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={LABEL}>Topics &amp; Locations</label>
        <p style={HELP}>Loading…</p>
      </div>
    );
  }

  const setPrimary = (slug: string) => {
    const primary = slug || null;
    onChange({ ...value, primary, secondary: value.secondary.filter((s) => s !== primary) });
  };
  const toggleSecondary = (slug: string) => {
    if (value.secondary.includes(slug)) onChange({ ...value, secondary: value.secondary.filter((s) => s !== slug) });
    else if (value.secondary.length < KH_MAX_SECONDARY_TOPICS) onChange({ ...value, secondary: [...value.secondary, slug] });
  };
  const addLocation = (slug: string) => {
    if (!value.locations.includes(slug)) onChange({ ...value, locations: [...value.locations, slug] });
    setQuery('');
  };
  const removeLocation = (slug: string) => onChange({ ...value, locations: value.locations.filter((s) => s !== slug) });

  // Typeahead: grouped by region, regions themselves listed first in their group.
  const q = query.trim().toLowerCase();
  const matches = locations.filter((t) => !value.locations.includes(t.slug) && (!q || t.name.toLowerCase().includes(q)));
  const groups = regions
    .map((r) => ({ region: r, items: matches.filter((t) => t.id === r.id || t.parentId === r.id) }))
    .filter((g) => g.items.length > 0);
  let shown = 0;

  // "Also appears under {Region}" — one line per region implied by selected cities.
  const impliedRegions = Array.from(
    new Set(
      value.locations
        .map((s) => bySlug.get(s))
        .filter((t): t is KhTerm => !!t && t.parentId !== null && !value.locations.includes(t.parentSlug ?? ''))
        .map((t) => t.parentName ?? '')
        .filter(Boolean)
    )
  );
  const atSecondaryLimit = value.secondary.length >= KH_MAX_SECONDARY_TOPICS;

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      {/* Primary topic */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={LABEL} htmlFor="kh-primary-topic">Primary topic</label>
        <select
          id="kh-primary-topic"
          className="field"
          value={value.primary ?? ''}
          onChange={(e) => setPrimary(e.target.value)}
          style={{ ...INPUT, cursor: 'pointer' }}
        >
          <option value="">— No topic —</option>
          {topics.map((t) => (
            <option key={t.slug} value={t.slug}>{t.name}</option>
          ))}
        </select>
        {!value.primary && (
          <p style={HELP}>No topic selected. This article won&rsquo;t appear on any topic page.</p>
        )}
      </div>

      {/* Secondary topics */}
      <div style={{ ...BOX, marginBottom: '1rem' }}>
        <div style={BOX_HEAD}>
          <span>Secondary topics (optional, up to {KH_MAX_SECONDARY_TOPICS})</span>
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            {value.secondary.length}/{KH_MAX_SECONDARY_TOPICS} selected
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.6rem 0.75rem' }}>
          {topics.filter((t) => t.slug !== value.primary).map((t) => {
            const selected = value.secondary.includes(t.slug);
            const disabled = !selected && atSecondaryLimit;
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => toggleSecondary(t.slug)}
                disabled={disabled}
                aria-pressed={selected}
                style={pill(selected, disabled)}
              >
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Locations */}
      <div ref={boxRef} style={BOX}>
        <div style={BOX_HEAD}>
          <span>Locations (optional)</span>
          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
            {value.locations.length} selected
          </span>
        </div>
        {value.locations.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', padding: '0.6rem 0.75rem 0' }}>
            {value.locations.map((slug) => {
              const t = bySlug.get(slug);
              return (
                <span key={slug} style={CHIP} title={t?.parentName ? `Also appears under ${t.parentName}.` : undefined}>
                  {t?.name ?? slug}
                  <button type="button" onClick={() => removeLocation(slug)} style={CHIP_X} aria-label={`Remove ${t?.name ?? slug}`}>
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
        {impliedRegions.length > 0 && (
          <p style={{ ...HELP, padding: '0 0.75rem' }}>
            {impliedRegions.map((r) => `Also appears under ${r}.`).join(' ')}
          </p>
        )}
        <div style={{ padding: '0.5rem 0.75rem', position: 'relative' }}>
          <input
            className="field"
            type="search"
            placeholder="Search regions and cities…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false);
              if (e.key === 'Enter') {
                e.preventDefault();
                const first = groups[0]?.items[0];
                if (first) addLocation(first.slug);
              }
            }}
            role="combobox"
            aria-expanded={open}
            aria-controls="kh-location-options"
            style={{ ...INPUT, fontSize: '13px', padding: '0.35rem 0.6rem' }}
          />
          {open && (
            <div
              id="kh-location-options"
              role="listbox"
              style={{
                marginTop: '0.35rem',
                maxHeight: '260px',
                overflowY: 'auto',
                border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
                borderRadius: '0.5rem',
                background: ADMIN_COLORS.surfaceContainerHigh,
              }}
            >
              {groups.length === 0 && (
                <p style={{ ...HELP, padding: '0.5rem 0.75rem', margin: 0, fontStyle: 'italic' }}>No matches</p>
              )}
              {groups.map((g) => {
                if (shown >= MAX_MATCHES) return null;
                const items = g.items.slice(0, MAX_MATCHES - shown);
                shown += items.length;
                return (
                  <div key={g.region.slug}>
                    <div style={{ ...BOX_HEAD, background: ADMIN_COLORS.surfaceContainer, position: 'sticky', top: 0 }}>
                      {g.region.name}
                    </div>
                    {items.map((t) => (
                      <button
                        key={t.slug}
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => addLocation(t.slug)}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '0.35rem 0.75rem',
                          background: 'transparent',
                          border: 'none',
                          color: ADMIN_COLORS.onSurface,
                          fontFamily: FONT,
                          fontSize: '13px',
                          fontWeight: t.parentId === null ? 700 : 400,
                          cursor: 'pointer',
                        }}
                      >
                        {t.parentId === null ? `${t.name} (whole region)` : t.name}
                      </button>
                    ))}
                  </div>
                );
              })}
              {matches.length > MAX_MATCHES && (
                <p style={{ ...HELP, padding: '0.4rem 0.75rem', margin: 0 }}>
                  Showing {MAX_MATCHES} of {matches.length}. Keep typing to narrow the list.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <p style={HELP}>
        Tags are saved with the version (<strong>Save</strong>, top right) and go live on the site when that
        version is <strong>published</strong>. The <em>Save Article</em> button at the bottom does not change tags.
      </p>
    </div>
  );
}
