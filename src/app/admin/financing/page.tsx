'use client';

import { useState, useEffect } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';

interface FormState {
  hero_heading: string;
  hero_description: string;
  financing_ready_label: string;
  financing_ready_body: string;
  financing_simple_label: string;
  coverage_heading: string;
  coverage_body: string;
  surprise_bills_label: string;
  surprise_bills_body: string;
  bottom_cta_label: string;
  bottom_cta_body: string;
  meta_title: string;
  meta_description: string;
}

const EMPTY: FormState = {
  hero_heading: '', hero_description: '',
  financing_ready_label: '', financing_ready_body: '',
  financing_simple_label: '',
  coverage_heading: '', coverage_body: '',
  surprise_bills_label: '', surprise_bills_body: '',
  bottom_cta_label: '', bottom_cta_body: '',
  meta_title: '', meta_description: '',
};

function buildPayload(form: FormState) {
  const { meta_title, meta_description, ...content } = form;
  return { ...content, meta_title: meta_title || null, meta_description: meta_description || null };
}

export default function FinancingAdminPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/cms/main/financing')
      .then(r => r.json())
      .then(data => {
        setForm({
          hero_heading: data.hero_heading ?? '',
          hero_description: data.hero_description ?? '',
          financing_ready_label: data.financing_ready_label ?? '',
          financing_ready_body: data.financing_ready_body ?? '',
          financing_simple_label: data.financing_simple_label ?? '',
          coverage_heading: data.coverage_heading ?? '',
          coverage_body: data.coverage_body ?? '',
          surprise_bills_label: data.surprise_bills_label ?? '',
          surprise_bills_body: data.surprise_bills_body ?? '',
          bottom_cta_label: data.bottom_cta_label ?? '',
          bottom_cta_body: data.bottom_cta_body ?? '',
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
      const res = await fetch('/api/cms/main/financing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(form)),
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
        title="Financing — CMS Editor"
        pageType="main"
        pageSlug="financing"
        getContent={() => buildPayload(form)}
        templateName="Financing"
        previewBaseUrl="/financing"
      />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Hero</h2>
          <label style={lbl}>Heading</label>
          <input style={s} value={form.hero_heading} onChange={e => set('hero_heading', e.target.value)} />
          <label style={lbl}>Description</label>
          <textarea style={{ ...s, minHeight: '100px' }} value={form.hero_description} onChange={e => set('hero_description', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Financing Solutions Ready</h2>
          <label style={lbl}>Label</label>
          <input style={s} value={form.financing_ready_label} onChange={e => set('financing_ready_label', e.target.value)} />
          <label style={lbl}>Body</label>
          <textarea style={{ ...s, minHeight: '80px' }} value={form.financing_ready_body} onChange={e => set('financing_ready_body', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Financing Made Simple</h2>
          <label style={lbl}>Label</label>
          <input style={s} value={form.financing_simple_label} onChange={e => set('financing_simple_label', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Coverage Section</h2>
          <label style={lbl}>Heading</label>
          <input style={s} value={form.coverage_heading} onChange={e => set('coverage_heading', e.target.value)} />
          <label style={lbl}>Body</label>
          <textarea style={{ ...s, minHeight: '80px' }} value={form.coverage_body} onChange={e => set('coverage_body', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>We Hate Surprise Bills Too</h2>
          <label style={lbl}>Label</label>
          <input style={s} value={form.surprise_bills_label} onChange={e => set('surprise_bills_label', e.target.value)} />
          <label style={lbl}>Body</label>
          <textarea style={{ ...s, minHeight: '80px' }} value={form.surprise_bills_body} onChange={e => set('surprise_bills_body', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Bottom CTA</h2>
          <label style={lbl}>Label</label>
          <input style={s} value={form.bottom_cta_label} onChange={e => set('bottom_cta_label', e.target.value)} />
          <label style={lbl}>Body</label>
          <textarea style={{ ...s, minHeight: '80px' }} value={form.bottom_cta_body} onChange={e => set('bottom_cta_body', e.target.value)} />
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
