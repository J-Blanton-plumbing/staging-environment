'use client';

import { useState, useEffect } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';

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
        body: JSON.stringify(getContent(form)),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Unknown error'); }
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Save failed.');
    }
  }

  const s: React.CSSProperties = { display: 'block', width: '100%', padding: '0.4rem 0.5rem', border: '1px solid #d1d5db', borderRadius: '4px', marginBottom: '1rem', fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { display: 'block', fontWeight: 600, marginBottom: '0.25rem', fontSize: '0.85rem', color: '#374151' };
  const sec: React.CSSProperties = { marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #e5e7eb' };

  if (status === 'loading') return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
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
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Hero</h2>
          <label style={lbl}>Heading</label>
          <input style={s} value={form.hero_heading} onChange={e => set('hero_heading', e.target.value)} />
          <label style={lbl}>CTA Label</label>
          <input style={s} value={form.hero_cta} onChange={e => set('hero_cta', e.target.value)} />
          <label style={lbl}>Tagline</label>
          <input style={s} value={form.hero_tagline} onChange={e => set('hero_tagline', e.target.value)} />
          <label style={lbl}>Intro</label>
          <textarea style={{ ...s, minHeight: '80px' }} value={form.hero_intro} onChange={e => set('hero_intro', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Services Section</h2>
          <label style={lbl}>Heading</label>
          <input style={s} value={form.services_heading} onChange={e => set('services_heading', e.target.value)} />
          <label style={lbl}>Intro</label>
          <textarea style={{ ...s, minHeight: '80px' }} value={form.services_intro} onChange={e => set('services_intro', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Why J. Blanton</h2>
          <label style={lbl}>Heading</label>
          <input style={s} value={form.why_heading} onChange={e => set('why_heading', e.target.value)} />
          <label style={lbl}>Body</label>
          <textarea style={{ ...s, minHeight: '100px' }} value={form.why_body} onChange={e => set('why_body', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Knowledge Hub Section</h2>
          <label style={lbl}>Heading</label>
          <input style={s} value={form.knowledge_hub_heading} onChange={e => set('knowledge_hub_heading', e.target.value)} />
          <label style={lbl}>Intro</label>
          <textarea style={{ ...s, minHeight: '80px' }} value={form.knowledge_hub_intro} onChange={e => set('knowledge_hub_intro', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Find Us Section</h2>
          <label style={lbl}>Heading</label>
          <input style={s} value={form.find_us_heading} onChange={e => set('find_us_heading', e.target.value)} />
          <label style={lbl}>Body</label>
          <textarea style={{ ...s, minHeight: '80px' }} value={form.find_us_body} onChange={e => set('find_us_body', e.target.value)} />
        </div>

        <MetaSection
          metaTitle={form.meta_title}
          metaDescription={form.meta_description}
          onMetaTitleChange={v => set('meta_title', v)}
          onMetaDescriptionChange={v => set('meta_description', v)}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <button onClick={handleSave} disabled={status === 'saving'} style={{ background: '#BC0E0E', color: '#fff', border: 'none', padding: '0.7rem 2rem', borderRadius: '4px', fontWeight: 700, fontSize: '1rem', cursor: status === 'saving' ? 'not-allowed' : 'pointer', opacity: status === 'saving' ? 0.7 : 1 }}>
            {status === 'saving' ? 'Saving...' : 'Save'}
          </button>
          {status === 'saved' && <span style={{ color: '#16a34a', fontWeight: 600 }}>Saved.</span>}
          {status === 'error' && <span style={{ color: '#dc2626' }}>{errorMsg}</span>}
        </div>

      </div>
    </div>
  );
}
