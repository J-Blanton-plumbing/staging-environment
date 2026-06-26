'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';

interface SubServiceData {
  title: string;
  heroHeading: string;
  heroIntro: string;
  introHeading: string;
  introBody: string;
  problemsHeading: string;
  problemsItems: string;
  ctaHeading: string;
  ctaBody: string;
  status: string;
  metaTitle: string;
  metaDescription: string;
}

const EMPTY: SubServiceData = {
  title: '', heroHeading: '', heroIntro: '',
  introHeading: '', introBody: '',
  problemsHeading: '', problemsItems: '',
  ctaHeading: '', ctaBody: '',
  status: 'draft', metaTitle: '', metaDescription: '',
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

export default function SubServiceAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<SubServiceData>(EMPTY);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'not-found' | 'error' | 'done'>('loading');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/cms/sub-service/${slug}`);
      if (res.status === 404) { setLoadStatus('not-found'); return; }
      if (!res.ok) { setLoadStatus('error'); return; }
      const d = await res.json();
      setForm({
        title: d.title ?? '',
        heroHeading: d.hero_heading ?? '',
        heroIntro: d.hero_intro ?? '',
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
      });
      setLoadStatus('done');
    } catch {
      setLoadStatus('error');
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  function set(k: keyof SubServiceData, v: string) {
    setForm(p => ({ ...p, [k]: v }));
    setSaveStatus('idle');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/cms/sub-service/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          heroHeading: form.heroHeading,
          heroIntro: form.heroIntro,
          introHeading: form.introHeading,
          introBody: form.introBody,
          problemsHeading: form.problemsHeading,
          problemsItems: form.problemsItems.split('\n').map(s => s.trim()).filter(Boolean),
          ctaHeading: form.ctaHeading,
          ctaBody: form.ctaBody,
          status: form.status,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Save failed'); }
      setSaveStatus('saved'); setSaveMsg('Saved');
    } catch (err: unknown) {
      setSaveStatus('error');
      setSaveMsg(err instanceof Error ? err.message : 'Save failed');
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

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', fontFamily: 'system-ui, sans-serif' }}>
      <AdminPageHeader
        title={form.title || slug}
        pageType="sub-service"
        pageSlug={slug}
        templateName="Sub-Service"
      />

      <form onSubmit={handleSave}>
        {textField('Page Title (internal)', 'title')}

        <h3 style={{ fontFamily: 'Industry, sans-serif', color: '#0A1B2E', fontSize: '16px', margin: '1.5rem 0 0.75rem' }}>Hero</h3>
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

        <div style={{ marginBottom: '1.25rem' }}>
          <label style={LABEL}>Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)} style={INPUT}>
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
            {saveStatus === 'saving' ? 'Saving…' : 'Save Page'}
          </button>
          {saveMsg && (
            <span style={{ fontFamily: 'Nunito, sans-serif', fontSize: '13px', color: saveStatus === 'error' ? '#BC0E0E' : '#15803d' }}>
              {saveMsg}
            </span>
          )}
        </div>
      </form>
    </main>
  );
}
