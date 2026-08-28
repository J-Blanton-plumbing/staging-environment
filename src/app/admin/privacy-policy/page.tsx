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
import { PRIVACY_POLICY } from '@/lib/content/privacy-policy';

/**
 * /admin/privacy-policy — CMS editor for the "Terms of Use & Privacy Policy"
 * utility page (Brief 110). Follows the Brief 89 main-page editor pattern
 * (see /admin/financing): loads/saves via /api/cms/main/privacy-policy with
 * optimistic-lock `version`, and supports draft versions + preview.
 *
 * Only two fields are page-specific: the H1 (`hero_heading`) and the long-form
 * legal body (`body_html`, a RichTextField). Every other block on the page
 * (nav, hero NAP box, services menu, articles, areas-served, FAQ, footer) is a
 * shared component with its own global/CMS behaviour and is intentionally not
 * editable here.
 *
 * ⚠️ The seeded `body_html` mirrors the live page verbatim, whose Privacy Policy
 * section is truncated mid-sentence at the source. Paste the complete legal copy
 * here once legal supplies it (see src/lib/content/privacy-policy.ts).
 */

interface FormState {
  hero_heading: string;
  hero_image: string;
  body_html: string;
  meta_title: string;
  meta_description: string;
  updated_at?: string;
}

const EMPTY: FormState = {
  hero_heading: '',
  hero_image: '',
  body_html: '',
  meta_title: '',
  meta_description: '',
};

function buildPayload(form: FormState) {
  const { meta_title, meta_description, updated_at, ...content } = form;
  void updated_at;
  return { ...content, meta_title: meta_title || null, meta_description: meta_description || null };
}

export default function PrivacyPolicyAdminPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  // The row version this editor loaded, sent back on save so a concurrent direct
  // edit is rejected (409) rather than silently overwritten.
  const [version, setVersion] = useState<number>(0);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  const dv = useDraftVersions('main', 'privacy-policy', () => buildPayload(form), {
    // Brief 147 (Track B): publishing bumps the live row's version, so the token
    // this editor loaded goes stale the instant a publish succeeds. Take the fresh
    // one from the publish response instead of forcing a full browser reload.
    onLiveVersionChange: setVersion,
    // Brief 159 (Track C1): selecting a version in the sidebar loads THAT
    // version's stored content into this form. Without it the form kept whatever
    // was on screen, so every version appeared to hold the edit you had just made
    // to a different one — and the next Save wrote it there for real.
    onLoadContent: (content) => setForm(f => ({ ...f, ...formFromContent(EMPTY, content) })),
  });
  // Brief 159 (Track C3): the Status row's publish / unpublish wiring, incl. the
  // typed-slug confirmation for taking the page off the site.
  const statusCtl = useVersionStatusControl(dv, { path: '/privacy-policy' });

  useEffect(() => {
    fetch('/api/cms/main/privacy-policy')
      .then(r => r.json())
      .then(data => {
        setForm({
          hero_heading: data.hero_heading ?? '',
          // Fall back to the static default so the editor always shows the
          // current hero image, even against a row seeded before this field existed.
          hero_image: data.hero_image || PRIVACY_POLICY.hero.image,
          body_html: data.body_html ?? '',
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
      const res = await fetch('/api/cms/main/privacy-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(form), version }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Unknown error'); }
      const j = await res.json().catch(() => ({}));
      if (typeof j.version === 'number') setVersion(j.version);
      // Brief 147 (Track B): this save moved the live row on, so the active draft's
      // publish baseline has to move with it — otherwise Publish reports "the live
      // page has changed since this draft was created" about this very save.
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
        title="Terms of Use & Privacy Policy — CMS Editor"
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
          Edit the page heading and the legal body. Everything else on the page (navbar, hero
          office box, services menu, articles, areas served, FAQ, footer) is shared and managed elsewhere.
        </p>

        <div style={sec}>
          <h2 style={secHead}>Hero</h2>
          <label style={lbl}>Heading (H1)</label>
          <input className="admin-field" style={s} value={form.hero_heading} onChange={e => set('hero_heading', e.target.value)} />
          <ImageUploaderField label="Hero Image" value={form.hero_image} onChange={v => set('hero_image', v)} />
        </div>

        <div style={sec}>
          <h2 style={secHead}>Legal Body — Terms of Use &amp; Privacy Policy</h2>
          <RichTextField label="Body" value={form.body_html} onChange={v => set('body_html', v)} rows={24} />
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
        title="Terms of Use & Privacy Policy"
        updatedAt={form.updated_at}
        template={{ value: 'privacy-policy', label: 'Privacy Policy', options: [{ value: 'privacy-policy', label: 'Privacy Policy' }] }}
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
        slug={{ value: 'privacy-policy', editable: false, disabledNote: "This is a fixed system page — its URL can't be changed.", permalink: `${SITE.baseUrl}/privacy-policy` }}
        parent={{ label: 'None', editable: false }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </div>
  );
}
