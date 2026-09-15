'use client';

import { useState, useEffect } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import RichTextField from '@/components/admin/RichTextField';
import ImageUploaderField from '@/components/admin/ImageUploaderField';
import PageAttributesSidebar from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { useVersionStatusControl } from '@/components/admin/PageAttributesSidebar/useVersionStatusControl';
import { formFromContent } from '@/lib/admin/formFromContent';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';
import { CONSUMER_RIGHTS } from '@/lib/content/consumer-rights';

/**
 * /admin/consumer-rights — CMS editor for the "Home Repair: Know Your Consumer
 * Rights" utility page (Brief 176, Track D). Same shape as /admin/privacy-policy
 * (Brief 110): loads/saves via /api/cms/main/consumer-rights with optimistic-lock
 * `version`, and supports draft versions + preview.
 *
 * ── What is editable here, and what is NOT ─────────────────────────────────
 * Editable: the H1, the hero image, every prose block, and the Meta section.
 *
 * Deliberately NOT editable (Brief 176, C1 — the page is a hybrid):
 *  • The two VERBATIM statutory callouts — the insurance-claim cancellation
 *    provision and the Mechanics Lien Act passage with its required asterisk
 *    disclaimer. Statutory text; it must not be casually edited.
 *  • The section headings — three of them are also the `FAQPage` JSON-LD
 *    question names, which must match the visible heading character for
 *    character.
 *  • The three tables, the hotline numbers and the six warning-sign cards —
 *    structured data, because the shared CMS sanitizer allows no table tags.
 *  • The download CTA (label, meta line, href).
 *
 * All of those live in src/lib/content/consumer-rights.ts and change by code.
 */

interface FormState {
  hero_heading: string;
  hero_image: string;
  intro_body: string;
  scope_note: string;
  before_sign_intro: string;
  precautions_html: string;
  cancellation_intro: string;
  cancellation_after_table: string;
  cancellation_after_callout: string;
  contract_after_table: string;
  sworn_statement_body: string;
  liens_body: string;
  fraud_intro: string;
  complaint_intro: string;
  file_complaint_body: string;
  roofing_body: string;
  download_body: string;
  footnote_html: string;
  meta_title: string;
  meta_description: string;
  updated_at?: string;
}

const EMPTY: FormState = {
  hero_heading: '',
  hero_image: '',
  intro_body: '',
  scope_note: '',
  before_sign_intro: '',
  precautions_html: '',
  cancellation_intro: '',
  cancellation_after_table: '',
  cancellation_after_callout: '',
  contract_after_table: '',
  sworn_statement_body: '',
  liens_body: '',
  fraud_intro: '',
  complaint_intro: '',
  file_complaint_body: '',
  roofing_body: '',
  download_body: '',
  footnote_html: '',
  meta_title: '',
  meta_description: '',
};

function buildPayload(form: FormState) {
  const { meta_title, meta_description, updated_at, ...content } = form;
  void updated_at;
  return { ...content, meta_title: meta_title || null, meta_description: meta_description || null };
}

export default function ConsumerRightsAdminPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  // The row version this editor loaded, sent back on save so a concurrent direct
  // edit is rejected (409) rather than silently overwritten.
  const [version, setVersion] = useState<number>(0);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  const dv = useDraftVersions('main', 'consumer-rights', () => buildPayload(form), {
    // Brief 147 (Track B): take the fresh live version from the publish response
    // instead of forcing a browser reload.
    onLiveVersionChange: setVersion,
    // Brief 159 (Track C1): load the SELECTED version's stored content into the form.
    onLoadContent: (content) => setForm(f => ({ ...f, ...formFromContent(EMPTY, content) })),
  });
  const statusCtl = useVersionStatusControl(dv, { path: '/consumer-rights' });

  useEffect(() => {
    fetch('/api/cms/main/consumer-rights')
      .then(r => r.json())
      .then(data => {
        setForm({
          hero_heading: data.hero_heading ?? '',
          // Fall back to the static default so the editor always shows the
          // current hero image, even against a row seeded before this field existed.
          hero_image: data.hero_image || CONSUMER_RIGHTS.hero.image,
          intro_body: data.intro_body ?? '',
          scope_note: data.scope_note ?? '',
          before_sign_intro: data.before_sign_intro ?? '',
          precautions_html: data.precautions_html ?? '',
          cancellation_intro: data.cancellation_intro ?? '',
          cancellation_after_table: data.cancellation_after_table ?? '',
          cancellation_after_callout: data.cancellation_after_callout ?? '',
          contract_after_table: data.contract_after_table ?? '',
          sworn_statement_body: data.sworn_statement_body ?? '',
          liens_body: data.liens_body ?? '',
          fraud_intro: data.fraud_intro ?? '',
          complaint_intro: data.complaint_intro ?? '',
          file_complaint_body: data.file_complaint_body ?? '',
          roofing_body: data.roofing_body ?? '',
          download_body: data.download_body ?? '',
          footnote_html: data.footnote_html ?? '',
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
      const res = await fetch('/api/cms/main/consumer-rights', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(form), version }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Unknown error'); }
      const j = await res.json().catch(() => ({}));
      if (typeof j.version === 'number') setVersion(j.version);
      // Brief 147 (Track B): move the active draft's publish baseline with this save.
      void dv.syncAfterLiveSave();
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
  const note: React.CSSProperties = { margin: '0 0 1rem', fontSize: '0.8125rem', lineHeight: 1.5, color: `${ADMIN_COLORS.onSurfaceVariant}CC`, fontFamily: 'var(--font-nunito), system-ui, sans-serif' };

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
        title="Consumer Rights — CMS Editor"
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
      <div className={`admin-editor-content${attrsOpen ? ' attrs-open' : ''}`} style={{ padding: '2rem' }}>
        <p style={{ color: ADMIN_COLORS.onSurfaceVariant, fontSize: '0.875rem', marginBottom: '2rem' }}>
          Edit the page heading, the hero image and the body prose. The section headings, the
          three tables, the six warning-sign cards, the download button and the two quoted
          statutory blocks are fixed in code &mdash; the quoted blocks are legal text and the
          headings are also used as the page&rsquo;s FAQ structured data, which has to match them
          exactly. Everything else on the page (navbar, hero office box, services menu, articles,
          areas served, footer) is shared and managed elsewhere.
        </p>

        <div style={sec}>
          <h2 style={secHead}>Hero</h2>
          <label style={lbl}>Heading (H1)</label>
          <input className="admin-field" style={s} value={form.hero_heading} onChange={e => set('hero_heading', e.target.value)} />
          <ImageUploaderField label="Hero Image" value={form.hero_image} onChange={v => set('hero_image', v)} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Intro &amp; Scope Note</h2>
          <p style={note}>
            The opening paragraphs above the download button, and the &ldquo;Illinois only&rdquo;
            note directly below it.
          </p>
          <RichTextField label="Intro copy" value={form.intro_body} onChange={v => set('intro_body', v)} rows={6} />
          <RichTextField label="Scope note" value={form.scope_note} onChange={v => set('scope_note', v)} rows={4} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Before You Sign a Contract</h2>
          <RichTextField label="Section intro" value={form.before_sign_intro} onChange={v => set('before_sign_intro', v)} rows={4} />
          <RichTextField label="The ten precautions (numbered list)" value={form.precautions_html} onChange={v => set('precautions_html', v)} rows={14} />
          <RichTextField label="Cancellation intro (above the deadlines table)" value={form.cancellation_intro} onChange={v => set('cancellation_intro', v)} rows={4} />
          <RichTextField label="After the deadlines table" value={form.cancellation_after_table} onChange={v => set('cancellation_after_table', v)} rows={3} />
          <RichTextField label="After the quoted contract provision" value={form.cancellation_after_callout} onChange={v => set('cancellation_after_callout', v)} rows={4} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>What Illinois Law Requires in Your Contract</h2>
          <RichTextField label="After the requirements table" value={form.contract_after_table} onChange={v => set('contract_after_table', v)} rows={3} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Liens, Sworn Statements &amp; Subcontractors</h2>
          <RichTextField label="What a Sworn Statement Is" value={form.sworn_statement_body} onChange={v => set('sworn_statement_body', v)} rows={5} />
          <RichTextField label="Why Liens Matter to You" value={form.liens_body} onChange={v => set('liens_body', v)} rows={5} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Warning Signs of Home Repair Fraud</h2>
          <RichTextField label="Section intro (above the cards)" value={form.fraud_intro} onChange={v => set('fraud_intro', v)} rows={3} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>How to File a Complaint in Illinois</h2>
          <RichTextField label="Section intro" value={form.complaint_intro} onChange={v => set('complaint_intro', v)} rows={4} />
          <RichTextField label="How to file a complaint" value={form.file_complaint_body} onChange={v => set('file_complaint_body', v)} rows={5} />
          <p style={note}>
            The &ldquo;More information is available at IllinoisAttorneyGeneral.gov&rdquo; line
            that follows is fixed in code, because its link needs a specific
            <code> rel</code> attribute the editor would strip.
          </p>
          <RichTextField label="Roofing complaints" value={form.roofing_body} onChange={v => set('roofing_body', v)} rows={5} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Download the Full Fact Sheet</h2>
          <RichTextField label="Closing copy (above the second download button)" value={form.download_body} onChange={v => set('download_body', v)} rows={3} />
          <RichTextField label="Page footnote (small type)" value={form.footnote_html} onChange={v => set('footnote_html', v)} rows={6} />
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

      {statusCtl.modal}

      <PageAttributesSidebar
        title="Consumer Rights"
        updatedAt={form.updated_at}
        template={{ value: 'consumer-rights', label: 'Consumer Rights', options: [{ value: 'consumer-rights', label: 'Consumer Rights' }] }}
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
        ...statusCtl.versionProps,
        }}
        slug={{ value: 'consumer-rights', editable: false, disabledNote: "This is a fixed system page — its URL can't be changed.", permalink: `${SITE.baseUrl}/consumer-rights` }}
        parent={{ label: 'None', editable: false }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </div>
  );
}
