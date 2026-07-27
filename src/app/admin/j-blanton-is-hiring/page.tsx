'use client';

import { useState, useEffect } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

/**
 * CMS editor for the "Join Our Team" utility page (Brief 109).
 *
 * Edits the `main_pages` row (slug `j-blanton-is-hiring`) via the shared
 * `/api/cms/main/[slug]` GET/PATCH route — the same contract the other utility
 * pages use, with optimistic-concurrency `version` guarding (Brief 78).
 *
 * Scope (per brief Track C): only the hiring-specific body copy is editable.
 * The shared blocks (nav, hero NAP box, Our Services, articles, areas-served,
 * FAQ, footer) follow their existing global behavior. The hero "JOIN US" CTA is
 * a fixed external link (i.jblantonplumbing.com/careers) and is intentionally
 * NOT editable here. The three lists are one-item-per-line textareas.
 */

const SLUG = 'j-blanton-is-hiring';

interface FormState {
  hero_heading: string;
  body_heading: string;
  body_intro: string;
  body_paragraph: string;
  benefits_label: string;
  benefits: string;
  candidates_label: string;
  candidates: string;
  signing_bonus: string;
  ready_paragraph: string;
  positions_label: string;
  positions: string;
  meta_title: string;
  meta_description: string;
}

const EMPTY: FormState = {
  hero_heading: '',
  body_heading: '',
  body_intro: '',
  body_paragraph: '',
  benefits_label: '',
  benefits: '',
  candidates_label: '',
  candidates: '',
  signing_bonus: '',
  ready_paragraph: '',
  positions_label: '',
  positions: '',
  meta_title: '',
  meta_description: '',
};

function buildPayload(form: FormState) {
  const { meta_title, meta_description, ...content } = form;
  return { ...content, meta_title: meta_title || null, meta_description: meta_description || null };
}

export default function JoinOurTeamAdminPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  // Brief 78 (Track A): row version this editor loaded, echoed back on save so a
  // concurrent direct edit is rejected (409) rather than silently overwritten.
  const [version, setVersion] = useState<number>(0);

  useEffect(() => {
    fetch(`/api/cms/main/${SLUG}`)
      .then(r => {
        if (!r.ok) throw new Error('load-failed');
        return r.json();
      })
      .then(data => {
        setForm({
          hero_heading: data.hero_heading ?? '',
          body_heading: data.body_heading ?? '',
          body_intro: data.body_intro ?? '',
          body_paragraph: data.body_paragraph ?? '',
          benefits_label: data.benefits_label ?? '',
          benefits: data.benefits ?? '',
          candidates_label: data.candidates_label ?? '',
          candidates: data.candidates ?? '',
          signing_bonus: data.signing_bonus ?? '',
          ready_paragraph: data.ready_paragraph ?? '',
          positions_label: data.positions_label ?? '',
          positions: data.positions ?? '',
          meta_title: data.meta_title ?? '',
          meta_description: data.meta_description ?? '',
        });
        setVersion(typeof data.version === 'number' ? data.version : 0);
        setStatus('idle');
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('Failed to load content from database. The page row may not be seeded yet.');
      });
  }, []);

  function set(key: keyof FormState, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setStatus('saving');
    try {
      const res = await fetch(`/api/cms/main/${SLUG}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(form), version }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Unknown error');
      }
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
  const hint: React.CSSProperties = { display: 'block', marginTop: '-0.75rem', marginBottom: '1rem', fontSize: '0.75rem', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontFamily: 'var(--font-nunito), system-ui, sans-serif' };
  const sec: React.CSSProperties = { marginBottom: '2rem', paddingBottom: '2rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}1A`, background: ADMIN_COLORS.surfaceContainerLow, borderRadius: '1.5rem', padding: '1.5rem', boxShadow: ADMIN_SHADOWS.elegant };
  const secHead: React.CSSProperties = { margin: '0 0 1rem', fontWeight: 700, fontSize: '0.8125rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif', textTransform: 'uppercase', letterSpacing: '0.08em' };

  if (status === 'loading') return <div style={{ padding: '2rem', background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface, minHeight: '100vh' }}>Loading...</div>;

  return (
    <div style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface, minHeight: '100vh' }}>
      <style>{`
        .admin-save-btn:hover { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
        .admin-field:focus { outline: none; box-shadow: 0 0 0 2px ${ADMIN_COLORS.primary}66; }
      `}</style>
      <AdminPageHeader title="Join Our Team — CMS Editor" compact />
      <div style={{ padding: '2rem' }}>

        <p style={{ marginTop: 0, marginBottom: '1.5rem', maxWidth: '780px', fontSize: '0.875rem', color: `${ADMIN_COLORS.onSurfaceVariant}CC` }}>
          Edits the hiring copy on <strong>/j-blanton-is-hiring</strong>. The header, hero layout, Local Office box,
          Our Services menu, articles, areas-served list, FAQ and footer are shared site blocks and are edited elsewhere.
          The hero <strong>&ldquo;JOIN US&rdquo;</strong> button always links to the external careers portal and is not editable here.
        </p>

        <div style={sec}>
          <h2 style={secHead}>Hero</h2>
          <label style={lbl}>H1 Heading</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '4rem' }} value={form.hero_heading} onChange={e => set('hero_heading', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Body — Intro</h2>
          <label style={lbl}>Heading</label>
          <input className="admin-field" style={s} value={form.body_heading} onChange={e => set('body_heading', e.target.value)} />
          <label style={lbl}>Intro line</label>
          <input className="admin-field" style={s} value={form.body_intro} onChange={e => set('body_intro', e.target.value)} />
          <label style={lbl}>Paragraph</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '8rem' }} value={form.body_paragraph} onChange={e => set('body_paragraph', e.target.value)} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Employees Receive</h2>
          <label style={lbl}>List label</label>
          <input className="admin-field" style={s} value={form.benefits_label} onChange={e => set('benefits_label', e.target.value)} />
          <label style={lbl}>List items</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '10rem', marginBottom: '0.25rem' }} value={form.benefits} onChange={e => set('benefits', e.target.value)} />
          <span style={hint}>One item per line.</span>
        </div>

        <div style={sec}>
          <h2 style={secHead}>Candidates Must Have</h2>
          <label style={lbl}>List label</label>
          <input className="admin-field" style={s} value={form.candidates_label} onChange={e => set('candidates_label', e.target.value)} />
          <label style={lbl}>List items</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '7rem', marginBottom: '0.25rem' }} value={form.candidates} onChange={e => set('candidates', e.target.value)} />
          <span style={hint}>One item per line.</span>
        </div>

        <div style={sec}>
          <h2 style={secHead}>Signing Bonus & Current Positions</h2>
          <label style={lbl}>Signing-bonus callout</label>
          <input className="admin-field" style={s} value={form.signing_bonus} onChange={e => set('signing_bonus', e.target.value)} />
          <label style={lbl}>&ldquo;Ready to join&rdquo; paragraph</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '5rem' }} value={form.ready_paragraph} onChange={e => set('ready_paragraph', e.target.value)} />
          <label style={lbl}>Positions label</label>
          <input className="admin-field" style={s} value={form.positions_label} onChange={e => set('positions_label', e.target.value)} />
          <label style={lbl}>Positions</label>
          <textarea className="admin-field" style={{ ...s, minHeight: '5rem', marginBottom: '0.25rem' }} value={form.positions} onChange={e => set('positions', e.target.value)} />
          <span style={hint}>One position per line.</span>
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
