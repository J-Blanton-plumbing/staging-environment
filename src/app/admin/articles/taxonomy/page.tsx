'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import RichTextField from '@/components/admin/RichTextField';
import { ADMIN_COLORS, ADMIN_FONTS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { khAreaHref, khTopicHref, type KhTerm } from '@/lib/cms/kh-taxonomy-types';

/**
 * Brief 187 (B2) — "Topics & Locations": /admin/articles/taxonomy.
 *
 * Deliberately NOT /admin/knowledge-hub — that is the hub PAGE editor, and the
 * two names already collide once (PROJECT-STATUS item 5).
 *
 * Per term: name, intro (RichTextField), meta title/description and the
 * "Show in Google" switch, plus its published-article count. Phase 1 limits:
 *   • slugs are read-only (a slug change needs redirects — Phase 2);
 *   • topics cannot be deleted; locations mirror CITY_REGISTRY, so there is no
 *     add or delete here at all.
 */

type Tab = 'topic' | 'location';

interface Draft {
  name: string;
  introHtml: string;
  metaTitle: string;
  metaDescription: string;
  indexable: boolean;
}

const toDraft = (t: KhTerm): Draft => ({
  name: t.name,
  introHtml: t.introHtml,
  metaTitle: t.metaTitle ?? '',
  metaDescription: t.metaDescription ?? '',
  indexable: t.indexable,
});

const FONT = ADMIN_FONTS.body;

const SECTION: React.CSSProperties = {
  background: ADMIN_COLORS.surfaceContainerLow,
  border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
  borderRadius: '1.5rem',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  boxShadow: ADMIN_SHADOWS.elegant,
};
const LABEL: React.CSSProperties = {
  display: 'block',
  fontFamily: FONT,
  fontSize: '13px',
  fontWeight: 600,
  color: ADMIN_COLORS.onSurface,
  marginBottom: '0.25rem',
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
const HELP: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: '12px',
  color: `${ADMIN_COLORS.onSurfaceVariant}B3`,
  margin: '0.35rem 0 0',
  lineHeight: 1.5,
};
const BADGE = (on: boolean): React.CSSProperties => ({
  fontFamily: FONT,
  fontSize: '11px',
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: '9999px',
  whiteSpace: 'nowrap',
  justifySelf: 'start',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: '100%',
  border: `1px solid ${on ? `${ADMIN_COLORS.cerulean}55` : `${ADMIN_COLORS.outlineVariant}55`}`,
  background: on ? `${ADMIN_COLORS.cerulean}1F` : 'transparent',
  color: on ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.onSurfaceVariant}99`,
});

/** Mirrors termMetadata() in TermListingPage: what Google is actually told. */
function robotsSummary(t: KhTerm): string {
  if (!t.indexable) return 'Hidden from Google (switch off)';
  if (t.publishedCount === 0) return 'Hidden from Google until it has a published article';
  return 'In Google + sitemap';
}

function TermEditor({ term, onSaved }: { term: KhTerm; onSaved: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(term));
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(term));
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => { setDraft((d) => ({ ...d, [k]: v })); setStatus('idle'); };

  async function save() {
    setStatus('saving');
    setMsg('');
    try {
      const res = await fetch(`/api/cms/kh-terms/${term.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `Save failed (${res.status})`);
      setStatus('saved');
      setMsg('Saved ✓');
      onSaved();
    } catch (err) {
      setStatus('error');
      setMsg(err instanceof Error ? err.message : 'Save failed');
    }
  }

  const href = term.type === 'topic' ? khTopicHref(term.slug) : khAreaHref(term.slug);
  return (
    <div style={{ padding: '1rem 1.25rem 1.5rem', borderTop: `1px solid ${ADMIN_COLORS.outlineVariant}33` }}>
      <div className="kh-term-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={LABEL}>Name</label>
          <input className="field" style={INPUT} value={draft.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label style={LABEL}>Slug (read-only)</label>
          <input style={{ ...INPUT, opacity: 0.6 }} value={term.slug} readOnly aria-readonly />
          <p style={HELP}>
            Page: <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: ADMIN_COLORS.cerulean }}>{href}</a>.
            Changing a slug needs redirects, so it&rsquo;s locked for now.
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <RichTextField
          label="Intro"
          value={draft.introHtml}
          onChange={(v) => set('introHtml', v)}
          rows={8}
          help="Shown under the page heading. Leave empty to show no intro. Aim for 150–300 words written to help readers learn, not a sales pitch."
        />
      </div>

      <div className="kh-term-2col" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <label style={LABEL}>Meta title</label>
          <input
            className="field"
            style={INPUT}
            value={draft.metaTitle}
            placeholder={`${draft.name || term.name} Articles`}
            onChange={(e) => set('metaTitle', e.target.value)}
          />
          <p style={HELP}>Blank uses &ldquo;{draft.name || term.name} Articles&rdquo;. The brand is added automatically.</p>
        </div>
        <div>
          <label style={LABEL}>Meta description</label>
          <textarea
            className="field"
            style={{ ...INPUT, resize: 'vertical', minHeight: '64px' }}
            value={draft.metaDescription}
            onChange={(e) => set('metaDescription', e.target.value)}
          />
          <p style={HELP}>Blank uses the start of the intro.</p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <button
          type="button"
          role="switch"
          aria-checked={draft.indexable}
          aria-label="Show in Google"
          onClick={() => set('indexable', !draft.indexable)}
          style={{
            flexShrink: 0,
            width: '44px',
            height: '24px',
            borderRadius: '9999px',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            background: draft.indexable ? ADMIN_COLORS.cerulean : ADMIN_COLORS.surfaceContainerHighest,
            transition: 'background 0.15s ease',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '3px',
              left: draft.indexable ? '23px' : '3px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.15s ease',
            }}
          />
        </button>
        <div>
          <span style={{ ...LABEL, marginBottom: 0 }}>Show in Google</span>
          <p style={{ ...HELP, marginTop: '0.15rem' }}>
            Turn on when this page has 5–6+ articles really about this place and its own intro copy.
          </p>
          <p style={{ ...HELP, marginTop: '0.15rem' }}>
            Even when on, a page with no published articles stays hidden from Google.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || status === 'saving'}
          style={{
            background: ADMIN_COLORS.cerulean,
            border: 'none',
            borderRadius: '9999px',
            padding: '0.55rem 1.4rem',
            color: '#fff',
            fontFamily: ADMIN_FONTS.headline,
            fontWeight: 600,
            fontSize: '14px',
            cursor: !dirty || status === 'saving' ? 'not-allowed' : 'pointer',
            opacity: !dirty || status === 'saving' ? 0.5 : 1,
          }}
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {dirty && status !== 'saving' && (
          <button
            type="button"
            onClick={() => { setDraft(toDraft(term)); setStatus('idle'); setMsg(''); }}
            style={{ background: 'transparent', border: 'none', color: ADMIN_COLORS.onSurfaceVariant, fontFamily: FONT, fontSize: '13px', cursor: 'pointer' }}
          >
            Discard changes
          </button>
        )}
        {msg && (
          <span style={{ fontFamily: FONT, fontSize: '13px', color: status === 'error' ? ADMIN_COLORS.error : ADMIN_COLORS.success }}>
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}

function TermRow({ term, open, onToggle, onSaved, indent }: {
  term: KhTerm; open: boolean; onToggle: () => void; onSaved: () => void; indent?: boolean;
}) {
  return (
    <div style={{ borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}1A` }}>
      <button
        type="button"
        className="kh-term-row"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,2fr) 110px minmax(0,1.6fr) 60px',
          gap: '0.75rem',
          alignItems: 'center',
          width: '100%',
          padding: `0.8rem 1.25rem 0.8rem ${indent ? '2.25rem' : '1.25rem'}`,
          background: open ? `${ADMIN_COLORS.surfaceContainerHigh}66` : 'transparent',
          border: 'none',
          textAlign: 'left',
          cursor: 'pointer',
          color: ADMIN_COLORS.onSurface,
          fontFamily: FONT,
        }}
      >
        <span className="kh-term-name" style={{ fontSize: '14px', fontWeight: 600, overflowWrap: 'anywhere' }}>
          {term.name}
          <span style={{ fontWeight: 400, fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, marginLeft: '0.5rem' }}>/{term.slug}</span>
        </span>
        <span className="kh-term-count" style={{ fontSize: '13px', color: ADMIN_COLORS.onSurfaceVariant }}>
          {term.publishedCount} article{term.publishedCount === 1 ? '' : 's'}
        </span>
        <span className="kh-term-badge" style={BADGE(term.indexable && term.publishedCount > 0)}>{robotsSummary(term)}</span>
        <span className="kh-term-edit" style={{ fontSize: '13px', fontWeight: 700, color: ADMIN_COLORS.primary, textAlign: 'right' }}>{open ? 'Close' : 'Edit'}</span>
      </button>
      {open && <TermEditor term={term} onSaved={onSaved} />}
    </div>
  );
}

export default function TaxonomyAdminPage() {
  const [terms, setTerms] = useState<KhTerm[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('topic');
  const [openId, setOpenId] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/cms/kh-terms');
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? `Failed to load (${res.status})`);
      setTerms(j);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const topics = useMemo(() => (terms ?? []).filter((t) => t.type === 'topic'), [terms]);
  const regions = useMemo(() => (terms ?? []).filter((t) => t.type === 'location' && t.parentId === null), [terms]);
  const q = query.trim().toLowerCase();
  const cityMatches = (t: KhTerm) => !q || t.name.toLowerCase().includes(q) || t.slug.includes(q);

  const tabBtn = (t: Tab, label: string, count: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === t}
      onClick={() => { setTab(t); setOpenId(null); }}
      style={{
        padding: '0.5rem 1.1rem',
        borderRadius: '9999px',
        border: `1px solid ${tab === t ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.outlineVariant}66`}`,
        background: tab === t ? ADMIN_COLORS.cerulean : 'transparent',
        color: tab === t ? '#fff' : ADMIN_COLORS.onSurfaceVariant,
        fontFamily: FONT,
        fontSize: '13px',
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {label} <span style={{ fontWeight: 400, opacity: 0.8 }}>({count})</span>
    </button>
  );

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Inline styles can't express breakpoints: stack each row on narrow screens. */}
      <style>{`
        @media (max-width: 760px) {
          .kh-term-row { grid-template-columns: minmax(0,1fr) auto !important; row-gap: 0.3rem !important; }
          .kh-term-row .kh-term-name { grid-column: 1; grid-row: 1; }
          .kh-term-row .kh-term-edit { grid-column: 2; grid-row: 1; }
          .kh-term-row .kh-term-count { grid-column: 1; grid-row: 2; }
          .kh-term-row .kh-term-badge { grid-column: 1 / -1; grid-row: 3; }
          .kh-term-2col { grid-template-columns: minmax(0,1fr) !important; }
        }
      `}</style>
      <p style={{ margin: '0 0 0.5rem' }}>
        <Link href="/admin/articles" style={{ fontFamily: FONT, fontSize: '13px', color: ADMIN_COLORS.primary, textDecoration: 'none', fontWeight: 700 }}>
          ← Articles
        </Link>
      </p>
      <h1 style={{ fontFamily: ADMIN_FONTS.headline, fontWeight: 700, fontSize: '1.875rem', letterSpacing: '-0.025em', color: ADMIN_COLORS.onSurface, marginBottom: '0.25rem' }}>
        Topics &amp; Locations
      </h1>
      <p style={{ fontFamily: FONT, color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontSize: '0.875rem', marginBottom: '1.25rem', maxWidth: '760px' }}>
        The labels Knowledge Hub articles are filed under. Each one has its own page on the site. Tag articles from the
        article editor; edit each page&rsquo;s name, intro and Google settings here. Article counts include published
        articles only, and a region counts its cities&rsquo; articles too.
      </p>

      {error && <p style={{ color: ADMIN_COLORS.error, fontFamily: FONT }}>{error}</p>}
      {!terms && !error && <p style={{ color: ADMIN_COLORS.onSurfaceVariant, fontFamily: FONT }}>Loading…</p>}

      {terms && (
        <>
          <div role="tablist" aria-label="Term type" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {tabBtn('topic', 'Topics', topics.length)}
            {tabBtn('location', 'Locations', (terms ?? []).length - topics.length)}
            {tab === 'location' && (
              <input
                type="search"
                placeholder="Search cities…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ ...INPUT, width: '240px', marginLeft: 'auto', fontSize: '13px' }}
              />
            )}
          </div>

          {tab === 'topic' && (
            <div style={{ ...SECTION, padding: 0, overflow: 'hidden' }}>
              <p style={{ ...HELP, padding: '1rem 1.25rem 0.75rem', margin: 0 }}>
                Topic pages are in Google by default. Topics can&rsquo;t be added or deleted in this phase.
              </p>
              {topics.map((t) => (
                <TermRow key={t.id} term={t} open={openId === t.id} onToggle={() => setOpenId(openId === t.id ? null : t.id)} onSaved={load} />
              ))}
            </div>
          )}

          {tab === 'location' && regions.map((r) => {
            const cities = (terms ?? []).filter((t) => t.parentId === r.id && cityMatches(t));
            if (q && cities.length === 0 && !cityMatches(r)) return null;
            return (
              <div key={r.id} style={{ ...SECTION, padding: 0, overflow: 'hidden' }}>
                <TermRow term={r} open={openId === r.id} onToggle={() => setOpenId(openId === r.id ? null : r.id)} onSaved={load} />
                {cities.map((c) => (
                  <TermRow key={c.id} term={c} indent open={openId === c.id} onToggle={() => setOpenId(openId === c.id ? null : c.id)} onSaved={load} />
                ))}
              </div>
            );
          })}
          {tab === 'location' && (
            <p style={HELP}>
              Locations mirror the city list the site is built from, so they&rsquo;re added and removed there, not here.
              Location pages stay out of Google until you turn on &ldquo;Show in Google&rdquo;.
            </p>
          )}
        </>
      )}
    </main>
  );
}
