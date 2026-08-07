'use client';

import { useState, useEffect } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import RichTextField from '@/components/admin/RichTextField';
import TokenTextInput from '@/components/admin/TokenTextInput';
import PageAttributesSidebar from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';

interface FormState {
  hero_heading: string;
  hero_subheading: string;
  hero_description: string;
  hero_cta: string;
  about_us_heading: string;
  about_us_body: string;
  what_to_expect_heading: string;
  what_to_expect_body: string;
  meet_our_team_heading: string;
  meet_our_team_body: string;
  our_locations_heading: string;
  our_locations_body: string;
  join_our_team_heading: string;
  join_our_team_body: string;
  meta_title: string;
  meta_description: string;
}

const EMPTY: FormState = {
  hero_heading: '', hero_subheading: '', hero_description: '', hero_cta: '',
  about_us_heading: '', about_us_body: '',
  what_to_expect_heading: '', what_to_expect_body: '',
  meet_our_team_heading: '', meet_our_team_body: '',
  our_locations_heading: '', our_locations_body: '',
  join_our_team_heading: '', join_our_team_body: '',
  meta_title: '', meta_description: '',
};

function buildPayload(form: FormState) {
  const { meta_title, meta_description, ...content } = form;
  return { ...content, meta_title: meta_title || null, meta_description: meta_description || null };
}

export default function WhyJBlantonAdminPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  // Brief 78 (Track A): the row version this editor loaded, sent back on save so a
  // concurrent direct edit is rejected (409) rather than silently overwritten.
  const [version, setVersion] = useState<number>(0);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();
  const dv = useDraftVersions('main', 'why-j-blanton', () => buildPayload(form), {
    // Brief 147 (Track B): publishing bumps the live row's version, so the token
    // this editor loaded goes stale the instant a publish succeeds. Take the fresh
    // one from the publish response instead of forcing a full browser reload.
    onLiveVersionChange: setVersion,
  });

  useEffect(() => {
    fetch('/api/cms/main/why-j-blanton')
      .then(r => r.json())
      .then(data => {
        setForm({
          hero_heading: data.hero_heading ?? '',
          hero_subheading: data.hero_subheading ?? '',
          hero_description: data.hero_description ?? '',
          hero_cta: data.hero_cta ?? '',
          about_us_heading: data.about_us_heading ?? '',
          about_us_body: data.about_us_body ?? '',
          what_to_expect_heading: data.what_to_expect_heading ?? '',
          what_to_expect_body: data.what_to_expect_body ?? '',
          meet_our_team_heading: data.meet_our_team_heading ?? '',
          meet_our_team_body: data.meet_our_team_body ?? '',
          our_locations_heading: data.our_locations_heading ?? '',
          our_locations_body: data.our_locations_body ?? '',
          join_our_team_heading: data.join_our_team_heading ?? '',
          join_our_team_body: data.join_our_team_body ?? '',
          meta_title: data.meta_title ?? '',
          meta_description: data.meta_description ?? '',
        });
        setUpdatedAt(data.updated_at ?? undefined);
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
      const res = await fetch('/api/cms/main/why-j-blanton', {
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
  const lblRow: React.CSSProperties = { ...lbl, marginBottom: 0 };
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
        title="Why J. Blanton — CMS Editor"
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

        <div style={sec}>
          <h2 style={secHead}>Hero</h2>
          <TokenTextInput label="Heading" value={form.hero_heading} onChange={v => set('hero_heading', v)} fieldStyle={s} labelStyle={lblRow} />
          <TokenTextInput label="Subheading" value={form.hero_subheading} onChange={v => set('hero_subheading', v)} multiline rows={3} fieldStyle={{ ...s, minHeight: '80px' }} labelStyle={lblRow} />
          <RichTextField label="Description" value={form.hero_description} onChange={v => set('hero_description', v)} rows={5} />
          <TokenTextInput label="CTA Label" value={form.hero_cta} onChange={v => set('hero_cta', v)} fieldStyle={s} labelStyle={lblRow} />
        </div>

        {(
          [
            ['About Us', 'about_us'],
            ['What to Expect', 'what_to_expect'],
            ['Meet Our Team', 'meet_our_team'],
            ['Our Locations', 'our_locations'],
            ['Join Our Team', 'join_our_team'],
          ] as [string, string][]
        ).map(([title, key]) => (
          <div key={key} style={sec}>
            <h2 style={secHead}>{title}</h2>
            <TokenTextInput
              label="Heading"
              value={form[`${key}_heading` as keyof FormState]}
              onChange={v => set(`${key}_heading` as keyof FormState, v)}
              fieldStyle={s}
              labelStyle={lblRow}
            />
            <RichTextField
              label="Body"
              value={form[`${key}_body` as keyof FormState]}
              onChange={v => set(`${key}_body` as keyof FormState, v)}
              rows={5}
            />
          </div>
        ))}

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
        title="Why J. Blanton"
        updatedAt={updatedAt}
        status="published"
        template={{ value: 'why-j-blanton', label: 'Why J. Blanton', options: [{ value: 'why-j-blanton', label: 'Why J. Blanton' }] }}
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
        slug={{ value: 'why-j-blanton', editable: false, disabledNote: "This is a fixed system page — its URL can't be changed.", permalink: `${SITE.baseUrl}/why-j-blanton` }}
        parent={{ label: 'None', editable: false }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </div>
  );
}
