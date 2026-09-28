'use client';

import { useEffect, useState } from 'react';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { KNOWLEDGE_HUB } from '@/lib/content/knowledge-hub';

/**
 * Brief 193 — the Knowledge Hub "Featured article" picker.
 *
 * A plain <select> of published articles (title, then slug) plus a Clear
 * control. Brief 188's ArticleRelatedField was not reused: it is a multi-pick
 * with ordering buttons and article-editor copy baked in, and a single-select
 * mode would mean forking most of it. The value is a slug and travels in the
 * page content like every other hub field (live Save, or version Save →
 * Publish). Blank = the static default (`KNOWLEDGE_HUB.featuredArticleSlug`).
 * The public card fails closed, so a slug that is later unpublished simply
 * shows no card — it is kept here, labelled, rather than silently dropped.
 */

const FONT = 'var(--font-nunito), system-ui, sans-serif';

interface ArticleOption { slug: string; title: string }

export default function FeaturedArticleField({ value, onChange }: { value: string; onChange: (slug: string) => void }) {
  const [options, setOptions] = useState<ArticleOption[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/cms/articles')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((rows: Array<{ slug: string; title: string; status: string }>) => {
        if (!active) return;
        setOptions(
          (Array.isArray(rows) ? rows : [])
            .filter((a) => a.status === 'published')
            .map((a) => ({ slug: a.slug, title: a.title }))
            .sort((a, b) => a.title.localeCompare(b.title))
        );
      })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, []);

  const known = !value || (options ?? []).some((o) => o.slug === value);
  const defaultTitle = options?.find((o) => o.slug === KNOWLEDGE_HUB.featuredArticleSlug)?.title ?? KNOWLEDGE_HUB.featuredArticleSlug;

  const lbl: React.CSSProperties = { display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.8125rem', color: ADMIN_COLORS.onSurface, fontFamily: FONT };
  const help: React.CSSProperties = { fontFamily: FONT, fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}B3`, margin: '0.35rem 0 0', lineHeight: 1.5 };
  const select: React.CSSProperties = {
    width: '100%', minWidth: 0, padding: '0.5rem 0.65rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
    fontFamily: 'inherit', fontSize: '0.9rem', background: ADMIN_COLORS.surfaceContainerLow, color: ADMIN_COLORS.onSurface,
  };

  return (
    <div style={{ marginBottom: '1rem' }}>
      <label htmlFor="kh-featured-article" style={lbl}>Featured article</label>
      {/* A grid, not flex: a <select> is as wide as its longest option, and that
          min-content width pushed the whole admin shell past the viewport. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '0.5rem', alignItems: 'center' }}>
        <select
          id="kh-featured-article"
          className="admin-field"
          style={select}
          value={value}
          disabled={!options && !loadError}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">{options ? `Default — ${defaultTitle}` : loadError ? 'Default' : 'Loading articles…'}</option>
          {!known && <option value={value}>{options ? `${value} — not published; no card will show` : value}</option>}
          {(options ?? []).map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.title} ({o.slug})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onChange('')}
          disabled={!value}
          style={{
            background: 'none', border: `1px solid ${ADMIN_COLORS.outlineVariant}99`, color: ADMIN_COLORS.onSurface,
            borderRadius: '9999px', padding: '0.45rem 1rem', fontSize: '0.8125rem', fontWeight: 600, fontFamily: FONT,
            cursor: value ? 'pointer' : 'not-allowed', opacity: value ? 1 : 0.5, boxShadow: ADMIN_SHADOWS.sm,
          }}
        >
          Clear
        </button>
      </div>
      {loadError && (
        <p style={{ ...help, color: ADMIN_COLORS.error }}>Articles couldn&rsquo;t be loaded; the current pick is unchanged. Reload to try again.</p>
      )}
      <p style={help}>
        Shown as a large card above the article grid on the Knowledge Hub (page 1). Leave blank to use the default. Only published articles appear on the site.
      </p>
    </div>
  );
}
