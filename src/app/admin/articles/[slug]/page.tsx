'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';

interface ArticleData {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  image: string;
  categories: string[];
  status: string;
  metaTitle: string;
  metaDescription: string;
  updatedByName?: string;
  updatedAt?: string;
  createdByName?: string;
  createdAt?: string;
}

// ── Service category taxonomy ─────────────────────────────────────────────────

interface ServiceCategory {
  name: string;
  sub: string[];
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    name: 'Plumbing',
    sub: ['Bathroom Plumbing', 'Kitchen Plumbing', 'Laundry Room Plumbing', 'Gas Lines'],
  },
  {
    name: 'Sewer',
    sub: ['Sewer Rodding', 'Sewer Repair', 'Sewer Maintenance', 'Home Repipe'],
  },
  {
    name: 'Drain',
    sub: ['Clogged Drains', 'Basement Flooding', 'Kitchen Sink Drain'],
  },
  {
    name: 'Water Heater',
    sub: ['Residential Water Heater', 'Tankless Water Heater', 'Commercial Water Heater'],
  },
  {
    name: 'Water Quality',
    sub: ['Water Filtration Systems'],
  },
  {
    name: 'Emergency Plumbing',
    sub: [],
  },
  {
    name: 'Commercial',
    sub: [
      'Commercial Jetting',
      'Commercial Drain Service',
      'Commercial Water Heater',
      'Restaurant Plumbing Service',
      'Restaurant Drain Clearing',
      'Restaurant Water Heater',
    ],
  },
];

const EMPTY: ArticleData = {
  slug: '',
  title: '',
  excerpt: '',
  body: '',
  image: '',
  categories: [],
  status: 'draft',
  metaTitle: '',
  metaDescription: '',
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontFamily: 'Nunito, sans-serif',
  fontSize: '13px',
  fontWeight: 700,
  color: '#0A1B2E',
  marginBottom: '0.25rem',
};

const INPUT: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem',
  border: '1px solid rgba(10,27,46,0.2)',
  borderRadius: '6px',
  fontFamily: 'Nunito, sans-serif',
  fontSize: '0.9rem',
  color: '#0A1B2E',
  boxSizing: 'border-box',
};

// ── Fix 1: Hero Image Uploader ───────────────────────────────────────────────

function HeroImageField({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/cms/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Upload failed');
      }
      const { url } = await res.json();
      onChange(url);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const tabBtn = (label: string, t: 'upload' | 'url') => (
    <button
      type="button"
      onClick={() => setTab(t)}
      style={{
        padding: '0.3rem 0.9rem',
        fontSize: '12px',
        fontFamily: 'Nunito, sans-serif',
        fontWeight: 700,
        border: '1px solid rgba(10,27,46,0.2)',
        borderRadius: '4px 4px 0 0',
        borderBottom: tab === t ? '1px solid #fff' : undefined,
        background: tab === t ? '#fff' : '#f5f5f5',
        color: '#0A1B2E',
        cursor: 'pointer',
        marginRight: '2px',
        position: 'relative',
        bottom: '-1px',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>Hero Image</label>

      {/* thumbnail preview */}
      {value && (
        <div style={{ marginBottom: '0.5rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Hero preview"
            style={{ maxHeight: '120px', maxWidth: '100%', borderRadius: '6px', border: '1px solid rgba(10,27,46,0.15)' }}
          />
          <div style={{ fontSize: '11px', color: '#5a6a7a', fontFamily: 'Nunito, sans-serif', marginTop: '0.25rem', wordBreak: 'break-all' }}>
            {value}
          </div>
        </div>
      )}

      {/* tab bar */}
      <div style={{ borderBottom: '1px solid rgba(10,27,46,0.2)', marginBottom: 0 }}>
        {tabBtn('Upload', 'upload')}
        {tabBtn('URL', 'url')}
      </div>

      {/* tab panels */}
      <div style={{ border: '1px solid rgba(10,27,46,0.2)', borderTop: 'none', borderRadius: '0 4px 4px 4px', padding: '0.75rem', background: '#fff' }}>
        {tab === 'upload' ? (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ fontFamily: 'Nunito, sans-serif', fontSize: '0.875rem' }}
            />
            {uploading && (
              <span style={{ marginLeft: '0.75rem', fontSize: '12px', fontFamily: 'Nunito, sans-serif', color: '#5a6a7a' }}>
                Uploading…
              </span>
            )}
            {uploadError && (
              <div style={{ marginTop: '0.35rem', fontSize: '12px', color: '#BC0E0E', fontFamily: 'Nunito, sans-serif' }}>
                {uploadError}
              </div>
            )}
            <div style={{ marginTop: '0.4rem', fontSize: '11px', color: '#5a6a7a', fontFamily: 'Nunito, sans-serif' }}>
              JPEG, PNG, or WebP · max 10 MB
            </div>
          </div>
        ) : (
          <input
            type="url"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="https://…"
            style={{ ...INPUT, border: 'none', padding: '0', boxShadow: 'none' }}
          />
        )}
      </div>
    </div>
  );
}

// ── Fix 3: Hierarchical Category Selector ────────────────────────────────────

const MAX_SUB = 3;

function CategoriesField({
  value,
  onChange,
}: {
  value: string[];
  onChange: (cats: string[]) => void;
}) {
  const [subSearch, setSubSearch] = useState('');

  // Derive selected primary (first element whose name matches a top-level category)
  const selectedPrimary = SERVICE_CATEGORIES.find(sc => value.includes(sc.name)) ?? null;
  const selectedSubs = value.filter(v => v !== selectedPrimary?.name);

  function selectPrimary(name: string) {
    if (selectedPrimary?.name === name) {
      // Deselect primary clears everything
      onChange([]);
      setSubSearch('');
    } else {
      // Switch primary, drop any subs that don't belong to the new one
      const newCat = SERVICE_CATEGORIES.find(sc => sc.name === name)!;
      const keptSubs = selectedSubs.filter(s => newCat.sub.includes(s));
      onChange([name, ...keptSubs]);
      setSubSearch('');
    }
  }

  function toggleSub(sub: string) {
    if (selectedSubs.includes(sub)) {
      onChange([selectedPrimary!.name, ...selectedSubs.filter(s => s !== sub)]);
    } else if (selectedSubs.length < MAX_SUB) {
      onChange([selectedPrimary!.name, ...selectedSubs, sub]);
    }
  }

  function removePill(cat: string) {
    if (cat === selectedPrimary?.name) {
      onChange([]);
    } else {
      onChange(value.filter(v => v !== cat));
    }
  }

  const availableSubs = selectedPrimary
    ? selectedPrimary.sub.filter(s =>
        s.toLowerCase().includes(subSearch.toLowerCase())
      )
    : [];

  const atSubLimit = selectedSubs.length >= MAX_SUB;

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>Categories</label>

      {/* Selected pills */}
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: '0.4rem 0 0.75rem' }}>
          {value.map(cat => (
            <span
              key={cat}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.6rem',
                borderRadius: '999px',
                background: cat === selectedPrimary?.name ? '#0A1B2E' : '#BC0E0E',
                color: '#F9F3EC',
                fontFamily: 'Nunito, sans-serif',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              {cat}
              <button
                type="button"
                onClick={() => removePill(cat)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(249,243,236,0.8)',
                  cursor: 'pointer',
                  padding: '0',
                  fontSize: '13px',
                  lineHeight: 1,
                  fontWeight: 400,
                }}
                aria-label={`Remove ${cat}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Step 1: primary category */}
      <div style={{
        border: '1px solid rgba(10,27,46,0.2)',
        borderRadius: '6px',
        overflow: 'hidden',
        marginBottom: selectedPrimary && selectedPrimary.sub.length > 0 ? '0.6rem' : 0,
      }}>
        <div style={{
          padding: '0.4rem 0.75rem',
          background: '#f5f5f5',
          fontFamily: 'Nunito, sans-serif',
          fontSize: '11px',
          fontWeight: 700,
          color: '#5a6a7a',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Service Category (choose one)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.6rem 0.75rem' }}>
          {SERVICE_CATEGORIES.map(sc => {
            const active = selectedPrimary?.name === sc.name;
            return (
              <button
                key={sc.name}
                type="button"
                onClick={() => selectPrimary(sc.name)}
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '999px',
                  border: active ? '1.5px solid #0A1B2E' : '1.5px solid rgba(10,27,46,0.2)',
                  background: active ? '#0A1B2E' : '#fff',
                  color: active ? '#F9F3EC' : '#0A1B2E',
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {sc.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: sub-services (only shown when primary has subs) */}
      {selectedPrimary && selectedPrimary.sub.length > 0 && (
        <div style={{
          border: '1px solid rgba(10,27,46,0.2)',
          borderRadius: '6px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '0.4rem 0.75rem',
            background: '#f5f5f5',
            fontFamily: 'Nunito, sans-serif',
            fontSize: '11px',
            fontWeight: 700,
            color: '#5a6a7a',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>Sub-service (up to {MAX_SUB})</span>
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
              {selectedSubs.length}/{MAX_SUB} selected
            </span>
          </div>

          {/* Search bar */}
          <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(10,27,46,0.1)' }}>
            <input
              type="search"
              placeholder="Search sub-services…"
              value={subSearch}
              onChange={e => setSubSearch(e.target.value)}
              style={{
                ...INPUT,
                fontSize: '13px',
                padding: '0.35rem 0.6rem',
              }}
            />
          </div>

          {/* Sub-service list */}
          <div style={{ padding: '0.5rem 0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {availableSubs.length === 0 ? (
              <span style={{ fontSize: '12px', color: '#5a6a7a', fontFamily: 'Nunito, sans-serif', fontStyle: 'italic' }}>
                No matches
              </span>
            ) : (
              availableSubs.map(sub => {
                const selected = selectedSubs.includes(sub);
                const disabled = !selected && atSubLimit;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => toggleSub(sub)}
                    disabled={disabled}
                    style={{
                      padding: '0.3rem 0.75rem',
                      borderRadius: '999px',
                      border: selected ? '1.5px solid #BC0E0E' : '1.5px solid rgba(10,27,46,0.2)',
                      background: selected ? '#BC0E0E' : '#fff',
                      color: selected ? '#F9F3EC' : disabled ? '#aaa' : '#0A1B2E',
                      fontFamily: 'Nunito, sans-serif',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    {sub}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Fix 5: Body field with HTML / Preview toggle ──────────────────────────────

const PREVIEW_STYLES = `
  .article-preview h1 { font-size: 32px; font-weight: 700; color: #0a1b2e; margin: 0 0 20px; line-height: 1.2; }
  .article-preview h2 { font-size: 24px; font-weight: 700; color: #0a1b2e; margin: 24px 0 14px; line-height: 1.3; }
  .article-preview h3 { font-size: 20px; font-weight: 600; color: #0a1b2e; margin: 20px 0 12px; line-height: 1.4; }
  .article-preview p  { font-size: 15px; line-height: 1.65; color: #0a1b2e; margin-bottom: 14px; }
  .article-preview ul { padding-left: 22px; margin-bottom: 14px; list-style-type: disc; }
  .article-preview li { font-size: 15px; line-height: 1.65; color: #0a1b2e; margin-bottom: 6px; }
  .article-preview strong { font-weight: 700; }
  .article-preview a  { color: #1560e6; text-decoration: none; }
  .article-preview a:hover { color: #BC0E0E; text-decoration: underline; }
`;

function BodyField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [view, setView] = useState<'html' | 'preview'>('html');
  const previewRef = useRef<HTMLDivElement>(null);

  // When switching to preview, stamp the current HTML into the contentEditable div.
  // We manage innerHTML via ref (not dangerouslySetInnerHTML) so React doesn't
  // clobber user edits on re-render.
  useEffect(() => {
    if (view === 'preview' && previewRef.current) {
      previewRef.current.innerHTML =
        value || '<p style="color:#5a6a7a;font-style:italic">Nothing to preview yet — switch to HTML and add some content.</p>';
    }
  }, [view]); // intentionally omit `value` — only sync on tab switch, not on every keystroke

  function handlePreviewInput() {
    if (previewRef.current) {
      onChange(previewRef.current.innerHTML);
    }
  }

  const tabBtn = (label: string, v: 'html' | 'preview') => (
    <button
      type="button"
      onClick={() => setView(v)}
      style={{
        padding: '0.3rem 0.9rem',
        fontSize: '12px',
        fontFamily: 'Nunito, sans-serif',
        fontWeight: 700,
        border: '1px solid rgba(10,27,46,0.2)',
        borderRadius: '4px 4px 0 0',
        borderBottom: view === v ? '1px solid #fff' : undefined,
        background: view === v ? '#fff' : '#f5f5f5',
        color: '#0A1B2E',
        cursor: 'pointer',
        marginRight: '2px',
        position: 'relative',
        bottom: '-1px',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>Body</label>
      <p style={{ fontSize: '12px', color: '#5a6a7a', fontFamily: 'Nunito, sans-serif', margin: '0 0 0.35rem' }}>
        {view === 'html'
          ? 'Edit raw HTML below, or switch to Preview to edit visually.'
          : 'Editing in preview — changes sync back to HTML automatically.'}
      </p>

      <div style={{ borderBottom: '1px solid rgba(10,27,46,0.2)' }}>
        {tabBtn('HTML', 'html')}
        {tabBtn('Preview', 'preview')}
      </div>

      {view === 'html' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={16}
          style={{
            ...INPUT,
            resize: 'vertical',
            lineHeight: 1.6,
            borderTop: 'none',
            borderRadius: '0 4px 4px 4px',
          }}
        />
      ) : (
        <>
          <style>{PREVIEW_STYLES}</style>
          <div
            ref={previewRef}
            className="article-preview"
            contentEditable
            suppressContentEditableWarning
            onInput={handlePreviewInput}
            style={{
              ...INPUT,
              borderTop: 'none',
              borderRadius: '0 4px 4px 4px',
              minHeight: '300px',
              padding: '1rem',
              lineHeight: 1.6,
              fontFamily: 'Nunito, sans-serif',
              background: '#fafafa',
              overflowY: 'auto',
              outline: 'none',
              cursor: 'text',
            }}
          />
        </>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ArticleAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<ArticleData>(EMPTY);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'not-found' | 'error' | 'done'>('loading');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/cms/article/${slug}`);
      if (res.status === 404) { setLoadStatus('not-found'); return; }
      if (!res.ok) { setLoadStatus('error'); return; }
      const data = await res.json();
      setForm({
        slug: data.slug ?? slug,
        title: data.title ?? '',
        excerpt: data.excerpt ?? '',
        body: typeof data.body === 'string' ? data.body : '',
        image: data.image ?? '',
        categories: Array.isArray(data.categories) ? data.categories : [],
        status: data.status ?? 'draft',
        metaTitle: data.meta_title ?? '',
        metaDescription: data.meta_description ?? '',
        updatedByName: data.updated_by_name ?? undefined,
        updatedAt: data.updated_at ?? undefined,
        createdByName: data.created_by_name ?? undefined,
        createdAt: data.created_at ?? undefined,
      });
      setLoadStatus('done');
    } catch {
      setLoadStatus('error');
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  function set<K extends keyof ArticleData>(field: K, value: ArticleData[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaveStatus('idle');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus('saving');
    setSaveMsg('');
    try {
      const res = await fetch(`/api/cms/article/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          excerpt: form.excerpt,
          body: form.body,
          image: form.image,
          categories: form.categories,
          status: form.status,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Save failed');
      }
      setSaveStatus('saved');
      setSaveMsg('Saved');
    } catch (err: unknown) {
      setSaveStatus('error');
      setSaveMsg(err instanceof Error ? err.message : 'Save failed');
    }
  }

  if (loadStatus === 'loading') {
    return <div style={{ padding: '2rem', fontFamily: 'Nunito, sans-serif' }}>Loading…</div>;
  }

  if (loadStatus === 'not-found') {
    return (
      <div style={{ padding: '2rem', fontFamily: 'Nunito, sans-serif' }}>
        <p style={{ color: '#BC0E0E' }}>Article &ldquo;{slug}&rdquo; not found in the database. Run the Brief 45 migration first.</p>
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div style={{ padding: '2rem', fontFamily: 'Nunito, sans-serif' }}>
        <p style={{ color: '#BC0E0E' }}>Failed to load article. The cms_articles table may not exist — run the Brief 45 migration.</p>
      </div>
    );
  }

  return (
    // Fix 2: AdminPageHeader is outside the constrained wrapper so it spans full width
    <>
      <AdminPageHeader
        title={form.title || slug}
        pageType="article"
        pageSlug={slug}
        templateName="Article"
        status={form.status}
        updatedBy={form.updatedByName}
        updatedAt={form.updatedAt}
        createdBy={form.createdByName}
        createdAt={form.createdAt}
        getContent={() => ({
          title: form.title,
          excerpt: form.excerpt,
          body: form.body,
          image: form.image,
          categories: form.categories,
          status: form.status,
          metaTitle: form.metaTitle,
          metaDescription: form.metaDescription,
        })}
      />

      <div style={{ padding: '2rem', maxWidth: '800px', fontFamily: 'system-ui, sans-serif' }}>
        <form onSubmit={handleSave}>
          {/* Title */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={LABEL}>Title</label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Article title"
              style={INPUT}
            />
          </div>

          {/* Fix 1: Hero Image Uploader */}
          <HeroImageField value={form.image} onChange={url => set('image', url)} />

          {/* Fix 3: Categories */}
          <CategoriesField value={form.categories} onChange={cats => set('categories', cats)} />

          {/* Fix 4: Excerpt as resizable textarea */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={LABEL}>Excerpt</label>
            <textarea
              value={form.excerpt}
              onChange={e => set('excerpt', e.target.value)}
              placeholder="One or two sentences summarising the article"
              rows={3}
              style={{ ...INPUT, resize: 'vertical', minHeight: '80px', lineHeight: 1.5 }}
            />
          </div>

          {/* Fix 5: Body with HTML / Preview toggle */}
          <BodyField value={form.body} onChange={v => set('body', v)} />

          {/* Status */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={LABEL}>Status</label>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              style={INPUT}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <MetaSection
            metaTitle={form.metaTitle}
            metaDescription={form.metaDescription}
            onMetaTitleChange={v => set('metaTitle', v)}
            onMetaDescriptionChange={v => set('metaDescription', v)}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              type="submit"
              disabled={saveStatus === 'saving'}
              style={{
                background: '#BC0E0E', border: 'none', borderRadius: '6px',
                padding: '0.6rem 1.5rem', color: '#F9F3EC',
                fontFamily: 'Industry, sans-serif', fontWeight: 600, fontSize: '14px',
                cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                opacity: saveStatus === 'saving' ? 0.7 : 1,
              }}
            >
              {saveStatus === 'saving' ? 'Saving…' : 'Save Article'}
            </button>
            {saveMsg && (
              <span style={{
                fontFamily: 'Nunito, sans-serif',
                fontSize: '13px',
                color: saveStatus === 'error' ? '#BC0E0E' : '#15803d',
              }}>
                {saveMsg}
              </span>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
