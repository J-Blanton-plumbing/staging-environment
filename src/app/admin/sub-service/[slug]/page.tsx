'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';

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
  problemsHeading: string;
  problemsItems: string;
  ctaHeading: string;
  ctaBody: string;
  status: string;
  metaTitle: string;
  metaDescription: string;
  parentSlug: string | null;
  updatedByName?: string;
  updatedAt?: string;
  createdByName?: string;
  createdAt?: string;
}

const EMPTY: SubServiceData = {
  title: '', heroHeading: '', heroIntro: '', heroImage: '',
  introHeading: '', introBody: '',
  problemsHeading: '', problemsItems: '',
  ctaHeading: '', ctaBody: '',
  status: 'draft', metaTitle: '', metaDescription: '',
  parentSlug: null,
};

const LABEL: React.CSSProperties = {
  display: 'block', fontFamily: 'Nunito, sans-serif',
  fontSize: '13px', fontWeight: 700, color: '#0A1B2E', marginBottom: '0.25rem',
};
const INPUT: React.CSSProperties = {
  display: 'block', width: '100%', padding: '0.5rem',
  border: '1px solid rgba(10,27,46,0.2)', borderRadius: '6px',
  fontFamily: 'Nunito, sans-serif', fontSize: '0.9rem', color: '#0A1B2E',
  boxSizing: 'border-box',
};

// ── Hero Image Uploader (matches article editor pattern) ──────────────────────

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
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              marginTop: '0.3rem',
              background: 'none',
              border: 'none',
              color: '#BC0E0E',
              fontFamily: 'Nunito, sans-serif',
              fontSize: '12px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Remove image
          </button>
        </div>
      )}

      <div style={{ borderBottom: '1px solid rgba(10,27,46,0.2)', marginBottom: 0 }}>
        {tabBtn('Upload', 'upload')}
        {tabBtn('URL', 'url')}
      </div>

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
        problemsHeading: d.problems_heading ?? '',
        problemsItems: Array.isArray(d.problems_items)
          ? d.problems_items.join('\n')
          : '',
        ctaHeading: d.cta_heading ?? '',
        ctaBody: d.cta_body ?? '',
        status: d.status ?? 'draft',
        metaTitle: d.meta_title ?? '',
        metaDescription: d.meta_description ?? '',
        parentSlug: d.parent_slug ?? null,
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
          problemsHeading: form.problemsHeading,
          problemsItems: form.problemsItems.split('\n').map(s => s.trim()).filter(Boolean),
          ctaHeading: form.ctaHeading,
          ctaBody: form.ctaBody,
          status: form.status,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
          parentSlug: form.parentSlug || null,
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Save failed'); }
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
      setForm(p => ({ ...p, status: newStatus }));
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
      <input type="text" value={form[k] as string} onChange={e => set(k, e.target.value)}
        placeholder={placeholder} style={INPUT} />
    </div>
  );

  const textareaField = (label: string, k: keyof SubServiceData, rows = 4, hint?: string) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>{label}</label>
      {hint && <p style={{ fontSize: '12px', color: '#5a6a7a', fontFamily: 'Nunito, sans-serif', margin: '0 0 0.35rem' }}>{hint}</p>}
      <textarea value={form[k] as string} onChange={e => set(k, e.target.value)}
        rows={rows} style={{ ...INPUT, resize: 'vertical', lineHeight: 1.6 }} />
    </div>
  );

  if (loadStatus === 'loading') return <main style={{ padding: '2rem' }}>Loading…</main>;
  if (loadStatus === 'not-found') return (
    <main style={{ padding: '2rem', fontFamily: 'Nunito, sans-serif' }}>
      <p style={{ color: '#BC0E0E' }}>Sub-service page &ldquo;{slug}&rdquo; not found.</p>
    </main>
  );
  if (loadStatus === 'error') return (
    <main style={{ padding: '2rem', fontFamily: 'Nunito, sans-serif' }}>
      <p style={{ color: '#BC0E0E' }}>Failed to load sub-service page. Please try refreshing.</p>
    </main>
  );

  const parentCategory = serviceCategories.find(c => c.slug === form.parentSlug);

  return (
    <>
      <AdminPageHeader
        title={form.title || slug}
        pageType="service"
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
          problemsHeading: form.problemsHeading,
          problemsItems: form.problemsItems,
          ctaHeading: form.ctaHeading,
          ctaBody: form.ctaBody,
          status: form.status,
          metaTitle: form.metaTitle,
          metaDescription: form.metaDescription,
        })}
        onPublishToggle={handlePublishToggle}
        publishBusy={publishBusy}
      />

      {/* ── Parent page indicator bar ─────────────────────────────────────── */}
      <div style={{
        background: '#F9F3EC',
        borderBottom: '1px solid rgba(10,27,46,0.1)',
        padding: '0.45rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        fontFamily: 'Nunito, sans-serif',
        fontSize: '12px',
      }}>
        <span style={{ color: 'rgba(10,27,46,0.55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Parent page:
        </span>
        {parentCategory ? (
          <a
            href={`/admin/${parentCategory.slug}`}
            style={{ color: '#1560E6', fontWeight: 600, textDecoration: 'none' }}
          >
            {parentCategory.title}
          </a>
        ) : (
          <span style={{ color: 'rgba(10,27,46,0.4)', fontStyle: 'italic' }}>None assigned</span>
        )}
      </div>

      <div style={{ padding: '2rem', maxWidth: '800px', fontFamily: 'system-ui, sans-serif' }}>
        <form onSubmit={handleSave}>
          {textField('Page Title (internal)', 'title')}

          <h3 style={{ fontFamily: 'Industry, sans-serif', color: '#0A1B2E', fontSize: '16px', margin: '1.5rem 0 0.75rem' }}>Hero</h3>
          <HeroImageField value={form.heroImage} onChange={url => set('heroImage', url)} />
          {textField('Hero Heading', 'heroHeading')}
          {textareaField('Hero Intro', 'heroIntro', 3)}

          <h3 style={{ fontFamily: 'Industry, sans-serif', color: '#0A1B2E', fontSize: '16px', margin: '1.5rem 0 0.75rem' }}>Intro Section</h3>
          {textField('Intro Heading', 'introHeading')}
          {textareaField('Intro Body', 'introBody', 5)}

          <h3 style={{ fontFamily: 'Industry, sans-serif', color: '#0A1B2E', fontSize: '16px', margin: '1.5rem 0 0.75rem' }}>Problems We Solve</h3>
          {textField('Problems Heading', 'problemsHeading')}
          {textareaField('Problems (one per line)', 'problemsItems', 5, 'Enter one problem per line.')}

          <h3 style={{ fontFamily: 'Industry, sans-serif', color: '#0A1B2E', fontSize: '16px', margin: '1.5rem 0 0.75rem' }}>Call to Action</h3>
          {textField('CTA Heading', 'ctaHeading')}
          {textareaField('CTA Body', 'ctaBody', 3)}

          {/* ── Settings ── */}
          <h3 style={{ fontFamily: 'Industry, sans-serif', color: '#0A1B2E', fontSize: '16px', margin: '1.5rem 0 0.75rem' }}>Settings</h3>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={LABEL}>Parent Page</label>
            <p style={{ fontSize: '12px', color: '#5a6a7a', fontFamily: 'Nunito, sans-serif', margin: '0 0 0.35rem' }}>
              The service category this sub-service belongs to. Used for breadcrumbs and internal linking.
            </p>
            <select
              value={form.parentSlug ?? ''}
              onChange={e => set('parentSlug', e.target.value || null)}
              style={{
                ...INPUT,
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%235a6a7a'/%3E%3C/svg%3E")`,
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
              {saveStatus === 'saving' ? 'Saving…' : 'Save Page'}
            </button>
            {saveMsg && (
              <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: '13px', color: saveStatus === 'error' ? '#BC0E0E' : '#15803d' }}>
                {saveMsg}
              </span>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
