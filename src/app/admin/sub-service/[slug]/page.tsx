'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

interface ServiceCategory {
  slug: string;
  title: string;
}

interface SubServiceData {
  title: string;
  heroHeading: string;
  heroIntro: string;
  heroImage: string;
  introHeading: string;
  introBody: string;
  fImage: string;
  problemsHeading: string;
  problemsItems: string;
  ctaHeading: string;
  ctaBody: string;
  f3Image: string;
  ndcTitle: string;
  ndcBody: string;
  status: string;
  metaTitle: string;
  metaDescription: string;
  parentSlug: string | null;
  version: number;
  updatedByName?: string;
  updatedAt?: string;
  createdByName?: string;
  createdAt?: string;
}

const EMPTY: SubServiceData = {
  title: '', heroHeading: '', heroIntro: '', heroImage: '',
  introHeading: '', introBody: '', fImage: '',
  problemsHeading: '', problemsItems: '',
  ctaHeading: '', ctaBody: '', f3Image: '',
  ndcTitle: '', ndcBody: '',
  status: 'draft', metaTitle: '', metaDescription: '',
  parentSlug: null, version: 0,
};

const LABEL: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  fontSize: '13px', fontWeight: 600, color: ADMIN_COLORS.onSurface, marginBottom: '0.25rem',
};
const INPUT: React.CSSProperties = {
  display: 'block', width: '100%', padding: '0.5rem',
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '0.9rem', color: ADMIN_COLORS.onSurface,
  background: ADMIN_COLORS.surfaceContainerLow,
  boxSizing: 'border-box',
};
const SECTION: React.CSSProperties = {
  background: ADMIN_COLORS.surfaceContainerLow,
  border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
  borderRadius: '1.5rem',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  boxShadow: ADMIN_SHADOWS.elegant,
};
const SECTION_HEADING: React.CSSProperties = {
  fontFamily: 'var(--font-outfit), system-ui, sans-serif', color: ADMIN_COLORS.onSurface,
  fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
  margin: '0 0 1rem',
};

// ── Hero Image Uploader (matches article editor pattern) ──────────────────────

function HeroImageField({
  value,
  onChange,
  label = 'Hero Image',
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
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
        fontFamily: 'var(--font-nunito), system-ui, sans-serif',
        fontWeight: 700,
        border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
        borderRadius: '0.5rem 0.5rem 0 0',
        borderBottom: tab === t ? `2px solid ${ADMIN_COLORS.cerulean}` : undefined,
        background: tab === t ? ADMIN_COLORS.surfaceContainerHigh : ADMIN_COLORS.surfaceContainer,
        color: tab === t ? ADMIN_COLORS.cerulean : ADMIN_COLORS.onSurfaceVariant,
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
      <label style={LABEL}>{label}</label>

      {value && (
        <div style={{ marginBottom: '0.5rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Hero preview"
            style={{ maxHeight: '120px', maxWidth: '100%', borderRadius: '0.75rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}66` }}
          />
          <div style={{ fontSize: '11px', color: ADMIN_COLORS.onSurfaceVariant, fontFamily: 'var(--font-nunito), system-ui, sans-serif', marginTop: '0.25rem', wordBreak: 'break-all' }}>
            {value}
          </div>
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              marginTop: '0.3rem',
              background: 'none',
              border: 'none',
              color: ADMIN_COLORS.error,
              fontFamily: 'var(--font-nunito), system-ui, sans-serif',
              fontSize: '12px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Remove image
          </button>
        </div>
      )}

      <div style={{ borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}66`, marginBottom: 0 }}>
        {tabBtn('Upload', 'upload')}
        {tabBtn('URL', 'url')}
      </div>

      <div style={{ border: `1px dashed ${ADMIN_COLORS.outlineVariant}66`, borderTop: 'none', borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.75rem', background: ADMIN_COLORS.surfaceContainer }}>
        {tab === 'upload' ? (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={uploading}
              style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '0.875rem' }}
            />
            {uploading && (
              <span style={{ marginLeft: '0.75rem', fontSize: '12px', fontFamily: 'var(--font-nunito), system-ui, sans-serif', color: ADMIN_COLORS.onSurfaceVariant }}>
                Uploading…
              </span>
            )}
            {uploadError && (
              <div style={{ marginTop: '0.35rem', fontSize: '12px', color: ADMIN_COLORS.error, fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
                {uploadError}
              </div>
            )}
            <div style={{ marginTop: '0.4rem', fontSize: '11px', color: ADMIN_COLORS.onSurfaceVariant, fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
              JPEG, PNG, or WebP · max 10 MB
            </div>
          </div>
        ) : (
          <input
            className="field"
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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SubServiceAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<SubServiceData>(EMPTY);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'not-found' | 'error' | 'done'>('loading');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [publishBusy, setPublishBusy] = useState(false);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);

  const load = useCallback(async () => {
    try {
      const [pageRes, catsRes] = await Promise.all([
        fetch(`/api/cms/sub-service/${slug}`),
        fetch('/api/cms/service-categories'),
      ]);
      if (pageRes.status === 404) { setLoadStatus('not-found'); return; }
      if (!pageRes.ok) { setLoadStatus('error'); return; }
      const d = await pageRes.json();
      const cats = catsRes.ok ? await catsRes.json() : [];
      setServiceCategories(Array.isArray(cats) ? cats : []);
      setForm({
        title: d.title ?? '',
        heroHeading: d.hero_heading ?? '',
        heroIntro: d.hero_intro ?? '',
        heroImage: d.hero_image ?? '',
        introHeading: d.intro_heading ?? '',
        introBody: d.intro_body ?? '',
        fImage: d.f_image ?? '',
        problemsHeading: d.problems_heading ?? '',
        problemsItems: Array.isArray(d.problems_items)
          ? d.problems_items.join('\n')
          : '',
        ctaHeading: d.cta_heading ?? '',
        ctaBody: d.cta_body ?? '',
        f3Image: d.f3_image ?? '',
        ndcTitle: d.ndc_title ?? '',
        ndcBody: d.ndc_body ?? '',
        status: d.status ?? 'draft',
        metaTitle: d.meta_title ?? '',
        metaDescription: d.meta_description ?? '',
        parentSlug: d.parent_slug ?? null,
        version: d.version ?? 0,
        updatedByName: d.updated_by_name ?? undefined,
        updatedAt: d.updated_at ?? undefined,
        createdByName: d.created_by_name ?? undefined,
        createdAt: d.created_at ?? undefined,
      });
      setLoadStatus('done');
    } catch {
      setLoadStatus('error');
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  function set(k: keyof SubServiceData, v: string | null) {
    setForm(p => ({ ...p, [k]: v }));
    setSaveStatus('idle');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus('saving');
    setSaveMsg('');
    try {
      const res = await fetch(`/api/cms/sub-service/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          heroHeading: form.heroHeading,
          heroIntro: form.heroIntro,
          heroImage: form.heroImage || null,
          introHeading: form.introHeading,
          introBody: form.introBody,
          fImage: form.fImage,
          problemsHeading: form.problemsHeading,
          problemsItems: form.problemsItems.split('\n').map(s => s.trim()).filter(Boolean),
          ctaHeading: form.ctaHeading,
          ctaBody: form.ctaBody,
          f3Image: form.f3Image,
          ndcTitle: form.ndcTitle,
          ndcBody: form.ndcBody,
          status: form.status,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
          parentSlug: form.parentSlug || null,
          // Brief 75 (DP-1): optimistic-concurrency guard for direct edits.
          version: form.version,
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Save failed'); }
      const j = await res.json().catch(() => ({}));
      if (typeof j.version === 'number') setForm(p => ({ ...p, version: j.version }));
      setSaveStatus('saved');
      setSaveMsg('Draft saved');
    } catch (err: unknown) {
      setSaveStatus('error');
      setSaveMsg(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function handlePublishToggle() {
    const newStatus = form.status === 'published' ? 'draft' : 'published';
    setPublishBusy(true);
    try {
      const res = await fetch(`/api/cms/sub-service/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Failed'); }
      // The PATCH bumps the row version server-side; keep our copy in step so the
      // next content save isn't falsely rejected as stale (Brief 75, DP-1).
      setForm(p => ({ ...p, status: newStatus, version: (p.version ?? 0) + 1 }));
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : 'Publish toggle failed');
      setSaveStatus('error');
    } finally {
      setPublishBusy(false);
    }
  }

  const textField = (label: string, k: keyof SubServiceData, placeholder?: string) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>{label}</label>
      <input className="field" type="text" value={form[k] as string} onChange={e => set(k, e.target.value)}
        placeholder={placeholder} style={INPUT} />
    </div>
  );

  const textareaField = (label: string, k: keyof SubServiceData, rows = 4, hint?: string) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>{label}</label>
      {hint && <p style={{ fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontFamily: 'var(--font-nunito), system-ui, sans-serif', margin: '0 0 0.35rem' }}>{hint}</p>}
      <textarea className="field" value={form[k] as string} onChange={e => set(k, e.target.value)}
        rows={rows} style={{ ...INPUT, resize: 'vertical', lineHeight: 1.6 }} />
    </div>
  );

  if (loadStatus === 'loading') return <main style={{ padding: '2rem', color: ADMIN_COLORS.onSurfaceVariant }}>Loading…</main>;
  if (loadStatus === 'not-found') return (
    <main style={{ padding: '2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
      <p style={{ color: ADMIN_COLORS.error }}>Sub-service page &ldquo;{slug}&rdquo; not found.</p>
    </main>
  );
  if (loadStatus === 'error') return (
    <main style={{ padding: '2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
      <p style={{ color: ADMIN_COLORS.error }}>Failed to load sub-service page. Please try refreshing.</p>
    </main>
  );

  const parentCategory = serviceCategories.find(c => c.slug === form.parentSlug);

  return (
    <>
      <AdminPageHeader
        title={form.title || slug}
        pageType="sub-service"
        pageSlug={slug}
        templateName="Sub-Service"
        status={form.status}
        updatedBy={form.updatedByName}
        updatedAt={form.updatedAt}
        createdBy={form.createdByName}
        createdAt={form.createdAt}
        getContent={() => ({
          title: form.title,
          heroHeading: form.heroHeading,
          heroIntro: form.heroIntro,
          heroImage: form.heroImage,
          introHeading: form.introHeading,
          introBody: form.introBody,
          fImage: form.fImage,
          problemsHeading: form.problemsHeading,
          problemsItems: form.problemsItems,
          ctaHeading: form.ctaHeading,
          ctaBody: form.ctaBody,
          f3Image: form.f3Image,
          ndcTitle: form.ndcTitle,
          ndcBody: form.ndcBody,
          status: form.status,
          metaTitle: form.metaTitle,
          metaDescription: form.metaDescription,
        })}
        onPublishToggle={handlePublishToggle}
        publishBusy={publishBusy}
      />

      {/* ── Parent page indicator bar ─────────────────────────────────────── */}
      <div style={{
        background: ADMIN_COLORS.surfaceContainer,
        borderLeft: `3px solid ${ADMIN_COLORS.cerulean}`,
        borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}40`,
        padding: '0.45rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontFamily: 'var(--font-nunito), system-ui, sans-serif',
        fontSize: '12px',
      }}>
        <span style={{ color: ADMIN_COLORS.onSurfaceVariant, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Parent page:
        </span>
        {parentCategory ? (
          <a
            href={`/admin/${parentCategory.slug}`}
            style={{ color: ADMIN_COLORS.cerulean, fontWeight: 600, textDecoration: 'none' }}
          >
            {parentCategory.title}
          </a>
        ) : (
          <span style={{ color: ADMIN_COLORS.onSurfaceVariant, fontStyle: 'italic' }}>None assigned</span>
        )}
      </div>

      <div style={{ padding: '2rem', maxWidth: '800px', fontFamily: 'system-ui, sans-serif' }}>
        <style>{`
          .admin-cta-btn { transition: box-shadow 0.2s ease, filter 0.2s ease; }
          .admin-cta-btn:hover { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
          .field { transition: box-shadow 0.15s ease, border-color 0.15s ease; }
          .field:focus { outline: none; border-color: ${ADMIN_COLORS.cerulean}; box-shadow: 0 0 0 2px ${ADMIN_COLORS.cerulean}66; }
        `}</style>
        <form onSubmit={handleSave}>
          {textField('Page Title (internal)', 'title')}

          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>Hero</h3>
            <HeroImageField value={form.heroImage} onChange={url => set('heroImage', url)} />
            {textField('Hero Heading', 'heroHeading')}
            {textareaField('Hero Intro', 'heroIntro', 3)}
          </div>

          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>Intro Section</h3>
            {textField('Intro Heading', 'introHeading')}
            {textareaField('Intro Body', 'introBody', 5)}
            <HeroImageField value={form.fImage} onChange={url => set('fImage', url)} label="Intro Section Image" />
          </div>

          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>Problems We Solve</h3>
            {textField('Problems Heading', 'problemsHeading')}
            {textareaField('Problems (one per line)', 'problemsItems', 5, 'Enter one problem per line.')}
          </div>

          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>No Drip Club</h3>
            {textField('NDC Selling Point (label)', 'ndcTitle')}
            {textareaField('NDC Body', 'ndcBody', 3, 'The per-service No Drip Club pitch. Leave blank to use the generic default copy.')}
          </div>

          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>Call to Action</h3>
            {textField('CTA Heading', 'ctaHeading')}
            {textareaField('CTA Body', 'ctaBody', 3)}
            <HeroImageField value={form.f3Image} onChange={url => set('f3Image', url)} label="Closing CTA Image" />
          </div>

          {/* ── Settings ── */}
          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>Settings</h3>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={LABEL}>Parent Page</label>
              <p style={{ fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontFamily: 'var(--font-nunito), system-ui, sans-serif', margin: '0 0 0.35rem' }}>
                The service category this sub-service belongs to. Used for breadcrumbs and internal linking.
              </p>
              <select
                className="field"
                value={form.parentSlug ?? ''}
                onChange={e => set('parentSlug', e.target.value || null)}
                style={{
                  ...INPUT,
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23c4c6cd'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 10px center',
                  paddingRight: '2rem',
                  cursor: 'pointer',
                }}
              >
                <option value="">None</option>
                {serviceCategories.map(cat => (
                  <option key={cat.slug} value={cat.slug}>{cat.title}</option>
                ))}
              </select>
            </div>

            <MetaSection
              metaTitle={form.metaTitle}
              metaDescription={form.metaDescription}
              onMetaTitleChange={v => set('metaTitle', v)}
              onMetaDescriptionChange={v => set('metaDescription', v)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              className="admin-cta-btn"
              type="submit"
              disabled={saveStatus === 'saving'}
              style={{
                background: ADMIN_COLORS.cerulean, border: 'none', borderRadius: '9999px',
                padding: '0.6rem 1.5rem', color: '#fff',
                fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 600, fontSize: '14px',
                cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                opacity: saveStatus === 'saving' ? 0.7 : 1,
                boxShadow: ADMIN_SHADOWS.xl,
              }}
            >
              {saveStatus === 'saving' ? 'Saving…' : 'Save Page'}
            </button>
            {saveMsg && (
              <span style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '13px', color: saveStatus === 'error' ? ADMIN_COLORS.error : ADMIN_COLORS.success }}>
                {saveMsg}
              </span>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
