'use client';

import { useMemo, useState } from 'react';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import ArticlePicker from '@/components/admin/ArticlePicker';
import {
  readRelatedArticlesConfig,
  articleMatchesCategory,
  type ResolvableArticle,
} from '@/lib/cms/related-articles';

const fontBody = 'var(--font-nunito), system-ui, sans-serif';

interface ServiceCategory {
  slug: string;
  title: string;
}

const HINT: React.CSSProperties = {
  fontFamily: fontBody, fontSize: '13px', color: `${ADMIN_COLORS.onSurfaceVariant}cc`,
  margin: '0.25rem 0 0', lineHeight: 1.5,
};
const SUBLABEL: React.CSSProperties = {
  display: 'block', fontFamily: fontBody, fontSize: '12px', fontWeight: 600,
  color: `${ADMIN_COLORS.onSurfaceVariant}cc`, margin: '0 0 0.4rem',
};

/**
 * Brief 92 (Track B) — the Related Articles block's own in-box inputs, rendered
 * BELOW the block heading in the main editor column. Which inputs appear depends on
 * the `mode` chosen in the sidebar Block tab (Track A):
 *   • newest   → a helper line only.
 *   • category → a category multi-select + optional backfill pickers for empty slots.
 *   • handpick → exactly `count` article pickers, in order.
 * All article references are stored as SLUGS (never URLs). Structural choices
 * (mode/count) live in the sidebar; only the mode-specific inputs live here.
 */
export default function RelatedArticlesBlockFields({
  data,
  serviceCategories,
  articles,
  onChange,
}: {
  data: Record<string, unknown>;
  serviceCategories: ServiceCategory[];
  articles: ResolvableArticle[];
  onChange: (key: string, value: unknown) => void;
}) {
  const config = readRelatedArticlesConfig(data);
  const { mode, count, categories, handpicked, backfill } = config;

  if (mode === 'newest') {
    return <p style={HINT}>Showing the {count} newest published articles.</p>;
  }

  if (mode === 'handpick') {
    // Exactly `count` picker fields, in order. Empty fields are skipped on render.
    const slots = Array.from({ length: count }, (_, i) => handpicked[i] ?? '');
    const setSlot = (i: number, slug: string) => {
      const next = [...slots];
      next[i] = slug;
      onChange('handpicked', next);
    };
    return (
      <div>
        <span style={SUBLABEL}>Choose up to {count} articles (shown in this order)</span>
        {slots.map((slug, i) => (
          <ArticlePicker
            key={i}
            label={`Article ${i + 1}`}
            value={slug}
            articles={articles}
            onChange={(s) => setSlot(i, s)}
          />
        ))}
        <p style={HINT}>Empty slots are skipped — the row simply shows fewer cards.</p>
      </div>
    );
  }

  // mode === 'category'
  const published = articles.filter((a) => a.status === 'published');
  const matchedCount = categories.length
    ? published.filter((a) => articleMatchesCategory(a, categories)).length
    : 0;
  const emptySlots = Math.max(0, count - matchedCount);

  const setBackfill = (i: number, slug: string) => {
    const next = Array.from({ length: emptySlots }, (_, k) => backfill[k] ?? '');
    next[i] = slug;
    onChange('backfill', next);
  };

  return (
    <div>
      <CategoryMultiSelect
        options={serviceCategories}
        selected={categories}
        onChange={(next) => onChange('categories', next)}
      />
      <p style={HINT}>
        {categories.length === 0
          ? 'Select one or more categories to filter the articles shown.'
          : `${Math.min(matchedCount, count)} of ${count} slots filled by matching articles${
              matchedCount > count ? ' (newest kept)' : ''
            }.`}
      </p>

      {categories.length > 0 && emptySlots > 0 && (
        <div style={{ marginTop: '0.9rem' }}>
          <span style={SUBLABEL}>
            Backfill {emptySlots} empty slot{emptySlots === 1 ? '' : 's'} (optional)
          </span>
          {Array.from({ length: emptySlots }, (_, i) => (
            <ArticlePicker
              key={i}
              label={`Fill slot ${matchedCount + i + 1} (optional)`}
              value={backfill[i] ?? ''}
              articles={articles}
              onChange={(s) => setBackfill(i, s)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Category multi-select (searchable; pills for the selection) ──────────────────

function CategoryMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: ServiceCategory[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const bySlug = useMemo(() => new Map(options.map((o) => [o.slug, o])), [options]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () => (q ? options.filter((o) => o.title.toLowerCase().includes(q) || o.slug.includes(q)) : options).slice(0, 40),
    [options, q]
  );

  const toggle = (slug: string) => {
    onChange(selected.includes(slug) ? selected.filter((s) => s !== slug) : [...selected, slug]);
  };

  return (
    <div>
      <span style={SUBLABEL}>Categories</span>

      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: '0 0 0.6rem' }}>
          {selected.map((slug) => (
            <span
              key={slug}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.25rem 0.6rem', borderRadius: '9999px',
                background: ADMIN_COLORS.cerulean, color: '#fff',
                fontFamily: fontBody, fontSize: '12px', fontWeight: 700,
              }}
            >
              {bySlug.get(slug)?.title ?? slug}
              <button
                type="button"
                onClick={() => toggle(slug)}
                aria-label={`Remove ${bySlug.get(slug)?.title ?? slug}`}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.85)', cursor: 'pointer', padding: 0, fontSize: '13px', lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search categories…"
        style={{
          display: 'block', width: '100%', padding: '0.5rem 0.6rem',
          border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
          fontFamily: fontBody, fontSize: '13px', color: ADMIN_COLORS.onSurface,
          background: ADMIN_COLORS.surfaceContainerLow, boxSizing: 'border-box', marginBottom: '0.4rem',
        }}
      />
      <div
        style={{
          maxHeight: '180px', overflowY: 'auto',
          border: `1px solid ${ADMIN_COLORS.outlineVariant}44`, borderRadius: '0.5rem', padding: '0.3rem',
        }}
      >
        {filtered.length === 0 ? (
          <p style={{ fontFamily: fontBody, fontSize: '12px', color: ADMIN_COLORS.onSurfaceVariant, margin: 0, padding: '0.4rem' }}>
            No categories match “{search}”.
          </p>
        ) : (
          filtered.map((o) => {
            const active = selected.includes(o.slug);
            return (
              <button
                key={o.slug}
                type="button"
                onClick={() => toggle(o.slug)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', textAlign: 'left',
                  padding: '0.4rem 0.5rem', borderRadius: '0.4rem', border: 'none',
                  background: active ? `${ADMIN_COLORS.cerulean}22` : 'transparent',
                  color: ADMIN_COLORS.onSurface, cursor: 'pointer', fontFamily: fontBody, fontSize: '13px',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: '15px', height: '15px', borderRadius: '0.25rem', flexShrink: 0,
                    border: `1.5px solid ${active ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.outlineVariant}88`}`,
                    background: active ? ADMIN_COLORS.cerulean : 'transparent',
                    color: '#fff', fontSize: '11px', lineHeight: '13px', textAlign: 'center',
                  }}
                >
                  {active ? '✓' : ''}
                </span>
                {o.title}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
