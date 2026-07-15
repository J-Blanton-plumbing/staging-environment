'use client';

import { useState, useEffect } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

interface FormState {
  hero_heading: string;
  hero_cta: string;
  hero_tagline: string;
  hero_intro: string;
  services_heading: string;
  services_intro: string;
  why_heading: string;
  why_body: string;
  knowledge_hub_heading: string;
  knowledge_hub_intro: string;
  find_us_heading: string;
  find_us_body: string;
  meta_title: string;
  meta_description: string;
}

const EMPTY: FormState = {
  hero_heading: '', hero_cta: '', hero_tagline: '', hero_intro: '',
  services_heading: '', services_intro: '',
  why_heading: '', why_body: '',
  knowledge_hub_heading: '', knowledge_hub_intro: '',
  find_us_heading: '', find_us_body: '',
  meta_title: '', meta_description: '',
};

function getContent(form: FormState) {
  const { meta_title, meta_description, ...content } = form;
  return { ...content, meta_title: meta_title || null, meta_description: meta_description || null };
}

export default function HomeAdminPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  // Brief 78 (Track A): the row version this editor loaded, sent back on save so a
  // concurrent direct edit is rejected (409) rather than silently overwritten.
  const [version, setVersion] = useState<number>(0);

  useEffect(() => {
    fetch('/api/cms/main/home')
      .then(r => r.json())
      .then(data => {
        setForm({
          hero_heading: data.hero_heading ?? '',
          hero_cta: data.hero_cta ?? '',
          hero_tagline: data.hero_tagline ?? '',
          hero_intro: data.hero_intro ?? '',
          services_heading: data.services_heading ?? '',
          services_intro: data.services_intro ?? '',
          why_heading: data.why_heading ?? '',
          why_body: data.why_body ?? '',
          knowledge_hub_heading: data.knowledge_hub_heading ?? '',
          knowledge_hub_intro: data.knowledge_hub_intro ?? '',
          find_us_heading: data.find_us_heading ?? '',
          find_us_body: data.find_us_body ?? '',
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
      const res = await fetch('/api/cms/main/home', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getContent(form), version }),
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

  const s: React.CSSProperties = { display: 'block', width: '100%', padding: '0.5rem 0.65rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem', marginBottom: '1rem', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box', background: ADMIN_COLORS.surfaceContainerLow, color: ADMIN_COLORS.onSurface };
  const lbl: React.CSSProperties = { display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.8125rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-nunito), system-ui, sans-serif' };
  const sec: React.CSSProperties = { marginBottom: '2rem', paddingBottom: '2rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}1A`, background: ADMIN_COLORS.surfaceContainerLow, borderRadius: '1.5rem', padding: '1.5rem', boxShadow: ADMIN_SHADOWS.elegant };
  const secHead: React.CSSProperties = { margin: '0 0 1rem', fontWeight: 700, fontSize: '0.8125rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' };

  if (status === 'loading') return <div style={{ padding: '2rem', background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface, minHeight: '100vh' }}>Loading...</div>;

  return (
    <div style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface, minHeight: '100vh' }}>
      <style>{`
        .admin-save-btn:hover { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
        .admin-field:focus { outline: none; box-shadow: 0 0 0 2px ${ADMIN_COLORS.primary}66; }
      `}</style>
      <AdminPageHeader
        title="Home — CMS Editor"
        pageType="main"
        pageSlug="home"
        getContent={() => getContent(form)}
        templateName="Home"
        previewBaseUrl="/"
      />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>

        <div style={sec}>
          <h2 style={secHead}>Hero</h2>
          <label style={lbl}>Heading</label>
          <input className="admin-field" style={s} value={form.hero_heading} onChange={e => set('hero_heading', e.target.value)} />
          <label style={lbl}>CTA Label</label>
          <input className="admin-field" style={s} value={form.hero_cta} onChange={e => set('hero_cta', e.target.value)} />
          <label style={lbl}>Tagline</label>
          <input className="admin-field" style={s} value={form.hero_tagline} onChange={e => set('hero_tagline', e.target.value)} />
          <label style={lbl}>Intro</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '80px' }} value={form.hero_intro} onChange={e => set('hero_intro', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Services Section</h2>
          <label style={lbl}>Heading</label>
          <input className="admin-field" style={s} value={form.services_heading} onChange={e => set('services_heading', e.target.value)} />
          <label style={lbl}>Intro</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '80px' }} value={form.services_intro} onChange={e => set('services_intro', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Why J. Blanton</h2>
          <label style={lbl}>Heading</label>
          <input className="admin-field" style={s} value={form.why_heading} onChange={e => set('why_heading', e.target.value)} />
          <label style={lbl}>Body</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '100px' }} value={form.why_body} onChange={e => set('why_body', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Knowledge Hub Section</h2>
          <label style={lbl}>Heading</label>
          <input className="admin-field" style={s} value={form.knowledge_hub_heading} onChange={e => set('knowledge_hub_heading', e.target.value)} />
          <label style={lbl}>Intro</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '80px' }} value={form.knowledge_hub_intro} onChange={e => set('knowledge_hub_intro', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Find Us Section</h2>
          <label style={lbl}>Heading</label>
          <input className="admin-field" style={s} value={form.find_us_heading} onChange={e => set('find_us_heading', e.target.value)} />
          <label style={lbl}>Body</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '80px' }} value={form.find_us_body} onChange={e => set('find_us_body', e.target.value)} />
        </div>

        <MetaSection
          metaTitle={form.meta_title}
          metaDescription={form.meta_description}
          onMetaTitleChange={v => set('meta_title', v)}
          onMetaDescriptionChange={v => set('meta_description', v)}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <button className="admin-save-btn" onClick={handleSave} disabled={status === 'saving'} style={{ background: ADMIN_COLORS.cerulean, color: '#fff', border: 'none', padding: '0.7rem 2rem', borderRadius: '9999px', fontWeight: 700, fontSize: '1rem', cursor: status === 'saving' ? 'not-allowed' : 'pointer', opacity: status === 'saving' ? 0.7 : 1, boxShadow: ADMIN_SHADOWS.xl, transition: 'box-shadow 0.2s ease, filter 0.2s ease' }}>
            {status === 'saving' ? 'Saving...' : 'Save'}
          </button>
          {status === 'saved' && <span style={{ color: ADMIN_COLORS.success, fontWeight: 600 }}>Saved.</span>}
          {status === 'error' && <span style={{ color: ADMIN_COLORS.error }}>{errorMsg}</span>}
        </div>

      </div>
    </div>
  );
}
