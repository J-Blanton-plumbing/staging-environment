'use client';

import { useState, useEffect } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import RichTextField from '@/components/admin/RichTextField';
import TokenTextInput from '@/components/admin/TokenTextInput';

interface FormState {
  hero_heading: string;
  hero_description: string;
  hero_cta: string;
  how_heading: string;
  wait_heading: string;
  wait_body: string;
  wait_cta: string;
  meta_title: string;
  meta_description: string;
}

const EMPTY: FormState = {
  hero_heading: '', hero_description: '', hero_cta: '',
  how_heading: '',
  wait_heading: '', wait_body: '', wait_cta: '',
  meta_title: '', meta_description: '',
};

function buildPayload(form: FormState) {
  const { meta_title, meta_description, ...content } = form;
  return { ...content, meta_title: meta_title || null, meta_description: meta_description || null };
}

export default function NoDripClubAdminPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/cms/main/no-drip-club')
      .then(r => r.json())
      .then(data => {
        setForm({
          hero_heading: data.hero_heading ?? '',
          hero_description: data.hero_description ?? '',
          hero_cta: data.hero_cta ?? '',
          how_heading: data.how_heading ?? '',
          wait_heading: data.wait_heading ?? '',
          wait_body: data.wait_body ?? '',
          wait_cta: data.wait_cta ?? '',
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
      const res = await fetch('/api/cms/main/no-drip-club', {
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
  const lblRow: React.CSSProperties = { ...lbl, marginBottom: 0 };
  const sec: React.CSSProperties = { marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #e5e7eb' };

  if (status === 'loading') return <div style={{ padding: '2rem' }}>Loading...</div>;

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <AdminPageHeader
        title="No Drip Club — CMS Editor"
        pageType="main"
        pageSlug="no-drip-club"
        getContent={() => buildPayload(form)}
        templateName="No Drip Club"
        previewBaseUrl="/no-drip-club"
      />
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Hero</h2>
          <TokenTextInput label="Heading" value={form.hero_heading} onChange={v => set('hero_heading', v)} fieldStyle={s} labelStyle={lblRow} />
          <RichTextField label="Description" value={form.hero_description} onChange={v => set('hero_description', v)} rows={5} />
          <TokenTextInput label="CTA Label" value={form.hero_cta} onChange={v => set('hero_cta', v)} fieldStyle={s} labelStyle={lblRow} />
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>Membership Card</h2>
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>
            The membership price is now managed in{' '}
            <a href="/admin/global-settings" style={{ color: '#BC0E0E', fontWeight: 600 }}>Global Settings → No Drip Club</a>.
          </p>
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>How It Works</h2>
          <TokenTextInput label="Section Heading" value={form.how_heading} onChange={v => set('how_heading', v)} fieldStyle={s} labelStyle={lblRow} />
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem' }}>What Are You Waiting For?</h2>
          <TokenTextInput label="Heading" value={form.wait_heading} onChange={v => set('wait_heading', v)} fieldStyle={s} labelStyle={lblRow} />
          <RichTextField label="Body" value={form.wait_body} onChange={v => set('wait_body', v)} rows={5} />
          <TokenTextInput label="CTA Label" value={form.wait_cta} onChange={v => set('wait_cta', v)} fieldStyle={s} labelStyle={lblRow} />
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
