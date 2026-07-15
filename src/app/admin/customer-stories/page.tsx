'use client';

import { useState, useEffect } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

interface FormState {
  hero_heading: string;
  hero_description: string;
  behind_review_heading: string;
  cta_heading: string;
  cta_body: string;
  meta_title: string;
  meta_description: string;
}

const EMPTY: FormState = {
  hero_heading: '', hero_description: '',
  behind_review_heading: '',
  cta_heading: '', cta_body: '',
  meta_title: '', meta_description: '',
};

function buildPayload(form: FormState) {
  const { meta_title, meta_description, ...content } = form;
  return { ...content, meta_title: meta_title || null, meta_description: meta_description || null };
}

export default function CustomerStoriesAdminPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  // Brief 78 (Track A): the row version this editor loaded, sent back on save so a
  // concurrent direct edit is rejected (409) rather than silently overwritten.
  const [version, setVersion] = useState<number>(0);

  useEffect(() => {
    fetch('/api/cms/main/customer-stories')
      .then(r => r.json())
      .then(data => {
        setForm({
          hero_heading: data.hero_heading ?? '',
          hero_description: data.hero_description ?? '',
          behind_review_heading: data.behind_review_heading ?? '',
          cta_heading: data.cta_heading ?? '',
          cta_body: data.cta_body ?? '',
          meta_title: data.meta_title ?? '',
          meta_description: data.meta_description ?? '',
        });
        setVersion(typeof data.version === 'number' ? data.version : 0);
        setStatus('idle');
      })
      .catch(() => { setStatus('error'); setErrorMsg('Failed to load content from database.'); });
  }, []);

  function set(key: keyof FormState, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setStatus('saving');
    try {
      const res = await fetch('/api/cms/main/customer-stories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(form), version }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Unknown error'); }
      const j = await res.json().catch(() => ({}));
      if (typeof j.version === 'number') setVersion(j.version);
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Save failed.');
    }
  }

  const s: React.CSSProperties = { display: 'block', width: '100%', padding: '0.4rem 0.5rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.75rem', marginBottom: '1rem', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box', background: ADMIN_COLORS.surfaceContainerLowest, color: ADMIN_COLORS.onSurface };
  const lbl: React.CSSProperties = { display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.85rem', color: ADMIN_COLORS.onSurfaceVariant, fontFamily: 'var(--font-nunito), system-ui, sans-serif' };
  const sec: React.CSSProperties = { marginBottom: '2rem', paddingBottom: '2rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}33`, background: ADMIN_COLORS.surfaceContainerLow, borderRadius: '1.5rem', padding: '1.5rem', boxShadow: ADMIN_SHADOWS.elegant };

  if (status === 'loading') return <div style={{ padding: '2rem', background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface, minHeight: '100vh' }}>Loading...</div>;

  return (
    <div className="admin-editor-page" style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface, minHeight: '100vh' }}>
      <style>{`
        .admin-editor-page input:focus, .admin-editor-page textarea:focus, .admin-editor-page select:focus { outline: none; box-shadow: 0 0 0 2px ${ADMIN_COLORS.primary}66; }
        .admin-save-btn { transition: box-shadow 0.2s ease, filter 0.2s ease; }
        .admin-save-btn:hover { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
      `}</style>
      <AdminPageHeader
        title="Customer Stories — CMS Editor"
        pageType="main"
        pageSlug="customer-stories"
        getContent={() => buildPayload(form)}
        templateName="Customer Stories"
        previewBaseUrl="/customer-stories"
      />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Hero</h2>
          <label style={lbl}>Heading</label>
          <input style={s} value={form.hero_heading} onChange={e => set('hero_heading', e.target.value)} />
          <label style={lbl}>Description</label>
          <textarea style={{ ...s, minHeight: '80px' }} value={form.hero_description} onChange={e => set('hero_description', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Behind the Review</h2>
          <label style={lbl}>Heading</label>
          <input style={s} value={form.behind_review_heading} onChange={e => set('behind_review_heading', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Bottom CTA</h2>
          <label style={lbl}>Heading</label>
          <input style={s} value={form.cta_heading} onChange={e => set('cta_heading', e.target.value)} />
          <label style={lbl}>Body</label>
          <textarea style={{ ...s, minHeight: '80px' }} value={form.cta_body} onChange={e => set('cta_body', e.target.value)} />
        </div>

        <MetaSection
          metaTitle={form.meta_title}
          metaDescription={form.meta_description}
          onMetaTitleChange={v => set('meta_title', v)}
          onMetaDescriptionChange={v => set('meta_description', v)}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <button className="admin-save-btn" onClick={handleSave} disabled={status === 'saving'} style={{ background: ADMIN_COLORS.cerulean, color: '#fff', border: 'none', padding: '0.7rem 2rem', borderRadius: '9999px', fontWeight: 700, fontSize: '1rem', cursor: status === 'saving' ? 'not-allowed' : 'pointer', opacity: status === 'saving' ? 0.7 : 1, boxShadow: ADMIN_SHADOWS.lg }}>
            {status === 'saving' ? 'Saving...' : 'Save'}
          </button>
          {status === 'saved' && <span style={{ color: ADMIN_COLORS.success, fontWeight: 600 }}>Saved.</span>}
          {status === 'error' && <span style={{ color: ADMIN_COLORS.error }}>{errorMsg}</span>}
        </div>

      </div>
    </div>
  );
}
