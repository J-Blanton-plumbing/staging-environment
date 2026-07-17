'use client';

import { useState, useEffect } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import PageAttributesSidebar from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';

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
  updated_at?: string;
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
  const { meta_title, meta_description, updated_at, ...content } = form;
  void updated_at;
  return { ...content, meta_title: meta_title || null, meta_description: meta_description || null };
}

export default function FinancingAdminPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  // Brief 78 (Track A): the row version this editor loaded, sent back on save so a
  // concurrent direct edit is rejected (409) rather than silently overwritten.
  const [version, setVersion] = useState<number>(0);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  const dv = useDraftVersions('main', 'financing', () => buildPayload(form));

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
          updated_at: data.updated_at ?? undefined,
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
      const res = await fetch('/api/cms/main/financing', {
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
        .admin-editor-content { transition: margin-right 0.2s ease; }
        @media (min-width: 768px) {
          .admin-editor-content.attrs-open { margin-right: 280px; }
        }
      `}</style>
      <AdminPageHeader
        title="Financing — CMS Editor"
        pageAttributesOpen={attrsOpen}
        onTogglePageAttributes={() => setAttrsOpen(!attrsOpen)}
        draftVersions={{
          busy: dv.busy,
          notice: dv.notice,
          noticeIsError: dv.noticeIsError,
          onSave: dv.save,
          onPreview: dv.preview,
          onSaveAsNew: dv.saveAsNew,
          nextVersionName: dv.nextVersionName,
        }}
        compact
      />
      <div className={`admin-editor-content${attrsOpen ? ' attrs-open' : ''}`} style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>

        <div style={sec}>
          <h2 style={secHead}>Hero</h2>
          <label style={lbl}>Heading</label>
          <input className="admin-field" style={s} value={form.hero_heading} onChange={e => set('hero_heading', e.target.value)} />
          <label style={lbl}>Description</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '100px' }} value={form.hero_description} onChange={e => set('hero_description', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Financing Solutions Ready</h2>
          <label style={lbl}>Label</label>
          <input className="admin-field" style={s} value={form.financing_ready_label} onChange={e => set('financing_ready_label', e.target.value)} />
          <label style={lbl}>Body</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '80px' }} value={form.financing_ready_body} onChange={e => set('financing_ready_body', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Financing Made Simple</h2>
          <label style={lbl}>Label</label>
          <input className="admin-field" style={s} value={form.financing_simple_label} onChange={e => set('financing_simple_label', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Coverage Section</h2>
          <label style={lbl}>Heading</label>
          <input className="admin-field" style={s} value={form.coverage_heading} onChange={e => set('coverage_heading', e.target.value)} />
          <label style={lbl}>Body</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '80px' }} value={form.coverage_body} onChange={e => set('coverage_body', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>We Hate Surprise Bills Too</h2>
          <label style={lbl}>Label</label>
          <input className="admin-field" style={s} value={form.surprise_bills_label} onChange={e => set('surprise_bills_label', e.target.value)} />
          <label style={lbl}>Body</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '80px' }} value={form.surprise_bills_body} onChange={e => set('surprise_bills_body', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Bottom CTA</h2>
          <label style={lbl}>Label</label>
          <input className="admin-field" style={s} value={form.bottom_cta_label} onChange={e => set('bottom_cta_label', e.target.value)} />
          <label style={lbl}>Body</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '80px' }} value={form.bottom_cta_body} onChange={e => set('bottom_cta_body', e.target.value)} />
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

      <PageAttributesSidebar
        title="Financing"
        updatedAt={form.updated_at}
        status="published"
        template={{ value: 'financing', label: 'Financing', options: [{ value: 'financing', label: 'Financing' }] }}
        version={{
          activeId: dv.activeId,
          activeLabel: dv.activeLabel,
          versions: dv.versions,
          busy: dv.busy,
          currentUserId: dv.currentUserId,
          onSwitch: dv.switchTo,
          onPublish: dv.publish,
          onDelete: dv.remove,
          onSaveAsNew: dv.saveAsNew,
          nextVersionName: dv.nextVersionName,
        }}
        slug={{ value: 'financing', editable: false, disabledNote: "This is a fixed system page — its URL can't be changed.", permalink: `${SITE.baseUrl}/financing` }}
        parent={{ label: 'None', editable: false }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </div>
  );
}
