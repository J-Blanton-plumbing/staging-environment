'use client';

import { useState, useEffect } from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import RichTextField from '@/components/admin/RichTextField';
import TokenTextInput from '@/components/admin/TokenTextInput';
import BlockField from '@/components/admin/BlockField';
import { BLOCK_CATALOGUE, fieldsFor } from '@/lib/cms/block-catalogue';
import {
  BENEFITS_CARD_COLUMNS,
  normalizeBenefitsCardInstance,
  staticNdcBenefitsCardData,
  type BenefitsCardColumns,
  type BenefitsCardInstance,
} from '@/lib/cms/benefits-card';
import PageAttributesSidebar from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';

interface FormState {
  hero_heading: string;
  hero_description: string;
  hero_cta: string;
  how_heading: string;
  wait_heading: string;
  wait_body: string;
  wait_cta: string;
  /**
   * Brief 121 — the page's contained `benefitsCard` block instance (the
   * "MEMBERS GET:" card), stored under `content.benefits_card`. Null only
   * until the initial fetch resolves.
   */
  benefits_card: BenefitsCardInstance | null;
  meta_title: string;
  meta_description: string;
  updated_at?: string;
}

const EMPTY: FormState = {
  hero_heading: '', hero_description: '', hero_cta: '',
  how_heading: '',
  wait_heading: '', wait_body: '', wait_cta: '',
  benefits_card: null,
  meta_title: '', meta_description: '',
};

/**
 * Brief 121 — the editor's starting instance when the DB row has no
 * `benefits_card` yet (i.e. the seed script hasn't run): the SAME static
 * mapper the public page's fallback and the seed script use, so editing
 * before/without the seed still starts from exactly today's card — no path
 * ever starts from an empty card.
 */
function initialBenefitsCard(raw: unknown): BenefitsCardInstance {
  return (
    normalizeBenefitsCardInstance(raw) ?? {
      id: `benefitsCard-${crypto.randomUUID()}`,
      type: 'benefitsCard',
      data: staticNdcBenefitsCardData(),
    }
  );
}

function buildPayload(form: FormState) {
  const { meta_title, meta_description, updated_at, ...content } = form;
  void updated_at;
  return { ...content, meta_title: meta_title || null, meta_description: meta_description || null };
}

export default function NoDripClubAdminPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  // Brief 78 (Track A): the row version this editor loaded, sent back on save so a
  // concurrent direct edit is rejected (409) rather than silently overwritten.
  const [version, setVersion] = useState<number>(0);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  const dv = useDraftVersions('main', 'no-drip-club', () => buildPayload(form));

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
          benefits_card: initialBenefitsCard(data.benefits_card),
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

  // Brief 121 — patch one key of the benefits-card block's `data` (the shape
  // BlockField's onChange emits). The instance id is preserved across edits.
  function setCardData(key: string, value: unknown) {
    setForm(f =>
      f.benefits_card
        ? { ...f, benefits_card: { ...f.benefits_card, data: { ...f.benefits_card.data, [key]: value } } }
        : f
    );
  }

  async function handleSave() {
    setStatus('saving');
    try {
      const res = await fetch('/api/cms/main/no-drip-club', {
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
  const lblRow: React.CSSProperties = { ...lbl, marginBottom: 0 };
  const sec: React.CSSProperties = { marginBottom: '2rem', paddingBottom: '2rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}33`, background: ADMIN_COLORS.surfaceContainerLow, borderRadius: '1.5rem', padding: '1.5rem', boxShadow: ADMIN_SHADOWS.elegant };

  if (status === 'loading') return <div style={{ padding: '2rem', background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface, minHeight: '100vh' }}>Loading...</div>;

  return (
    <div className="admin-editor-page" style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface, minHeight: '100vh' }}>
      <style>{`
        .admin-editor-page input:focus, .admin-editor-page textarea:focus, .admin-editor-page select:focus { outline: none; box-shadow: 0 0 0 2px ${ADMIN_COLORS.primary}66; }
        .admin-save-btn { transition: box-shadow 0.2s ease, filter 0.2s ease; }
        .admin-save-btn:hover { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
        .admin-editor-content { transition: margin-right 0.2s ease; }
        @media (min-width: 768px) {
          .admin-editor-content.attrs-open { margin-right: 280px; }
        }
      `}</style>
      <AdminPageHeader
        title="No Drip Club — CMS Editor"
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
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Hero</h2>
          <TokenTextInput label="Heading" value={form.hero_heading} onChange={v => set('hero_heading', v)} fieldStyle={s} labelStyle={lblRow} />
          <RichTextField label="Description" value={form.hero_description} onChange={v => set('hero_description', v)} rows={5} />
          <TokenTextInput label="CTA Label" value={form.hero_cta} onChange={v => set('hero_cta', v)} fieldStyle={s} labelStyle={lblRow} />
        </div>

        {/* Brief 121 — the "MEMBERS GET:" card is a contained `benefitsCard`
            block instance. Fields render registry-driven through the shared
            BlockField (the same renderer the block-builder editors use); the
            column count is the block's structural style option, surfaced here
            because this standalone editor has no Block-tab sidebar. */}
        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '0.25rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Membership Card — Benefits Card block</h2>
          <p style={{ fontSize: '0.85rem', color: ADMIN_COLORS.onSurfaceVariant, margin: '0 0 1.25rem' }}>
            The price line stays driven by{' '}
            <a href="/admin/global-settings" style={{ color: ADMIN_COLORS.secondaryContainer, fontWeight: 600 }}>Global Settings → No Drip Club</a>{' '}
            via the {'{{ndc_price}}'} variable. Mobile always stacks to one column.
          </p>
          {form.benefits_card && (
            <>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={lbl}>Columns (desktop layout)</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {BENEFITS_CARD_COLUMNS.map((c: BenefitsCardColumns) => {
                    const active = form.benefits_card!.data.columns === c;
                    return (
                      <button key={c} type="button" aria-pressed={active}
                        onClick={() => setCardData('columns', c)}
                        style={{
                          flex: '0 0 auto', padding: '0.45rem 1rem', borderRadius: '0.5rem',
                          border: `2px solid ${active ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.outlineVariant}55`}`,
                          background: active ? `${ADMIN_COLORS.cerulean}22` : ADMIN_COLORS.surfaceContainerLowest,
                          color: ADMIN_COLORS.onSurface, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                        }}>
                        {c} {c === 1 ? 'column' : 'columns'}
                      </button>
                    );
                  })}
                </div>
              </div>
              {fieldsFor(BLOCK_CATALOGUE.benefitsCard, 'no-drip-club').map((f) => (
                <BlockField key={f.key} field={f} data={form.benefits_card!.data as unknown as Record<string, unknown>} onChange={setCardData} />
              ))}
            </>
          )}
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>How It Works</h2>
          <TokenTextInput label="Section Heading" value={form.how_heading} onChange={v => set('how_heading', v)} fieldStyle={s} labelStyle={lblRow} />
        </div>

        <div style={sec}>
          <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>What Are You Waiting For?</h2>
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
          <button className="admin-save-btn" onClick={handleSave} disabled={status === 'saving'} style={{ background: ADMIN_COLORS.cerulean, color: '#fff', border: 'none', padding: '0.7rem 2rem', borderRadius: '9999px', fontWeight: 700, fontSize: '1rem', cursor: status === 'saving' ? 'not-allowed' : 'pointer', opacity: status === 'saving' ? 0.7 : 1, boxShadow: ADMIN_SHADOWS.lg }}>
            {status === 'saving' ? 'Saving...' : 'Save'}
          </button>
          {status === 'saved' && <span style={{ color: ADMIN_COLORS.success, fontWeight: 600 }}>Saved.</span>}
          {status === 'error' && <span style={{ color: ADMIN_COLORS.error }}>{errorMsg}</span>}
        </div>

      </div>

      <PageAttributesSidebar
        title="No Drip Club"
        updatedAt={form.updated_at}
        status="published"
        template={{ value: 'no-drip-club', label: 'No Drip Club', options: [{ value: 'no-drip-club', label: 'No Drip Club' }] }}
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
        slug={{ value: 'no-drip-club', editable: false, disabledNote: "This is a fixed system page — its URL can't be changed.", permalink: `${SITE.baseUrl}/no-drip-club` }}
        parent={{ label: 'None', editable: false }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </div>
  );
}
