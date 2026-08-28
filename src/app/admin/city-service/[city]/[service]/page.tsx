'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import ImageUploaderField from '@/components/admin/ImageUploaderField';
import PageAttributesSidebar from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { useVersionStatusControl } from '@/components/admin/PageAttributesSidebar/useVersionStatusControl';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';

interface FaqField {
  question: string;
  answer: string;
}

interface ServiceCategory {
  slug: string;
  title: string;
}

interface FormState {
  serviceIntroHeading: string;
  serviceIntroText: string;
  serviceIntroImage: string;
  secondaryHeading: string;
  secondaryText: string;
  secondaryImage: string;
  faqs: FaqField[];
  metaTitle: string;
  metaDescription: string;
  parentSlug: string | null;
}

const EMPTY: FormState = {
  serviceIntroHeading: '',
  serviceIntroText: '',
  serviceIntroImage: '',
  secondaryHeading: '',
  secondaryText: '',
  secondaryImage: '',
  faqs: [],
  metaTitle: '',
  metaDescription: '',
  parentSlug: null,
};

/**
 * Brief 159 (Track C1) — the inverse of `buildPayload`: put a stored version's
 * content back into the form when the editor switches versions.
 *
 * Hand-written rather than using the shared `formFromContent` helper because the
 * payload is not a straight projection of the form: the two body fields are
 * stored as PARAGRAPH ARRAYS and edited as one blank-line-separated textarea.
 * Joining them here with the same `\n\n` the load effect uses is what makes a
 * version switch and a page load produce identical form state.
 */
function formFromPayload(data: Record<string, unknown>): FormState {
  const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
  const paras = (v: unknown) => (Array.isArray(v) ? (v as string[]).join('\n\n') : '');
  return {
    serviceIntroHeading: str(data.serviceIntroHeading),
    serviceIntroText: paras(data.serviceIntroParagraphs),
    serviceIntroImage: str(data.serviceIntroImage),
    secondaryHeading: str(data.secondaryHeading),
    secondaryText: paras(data.secondaryParagraphs),
    secondaryImage: str(data.secondaryImage),
    faqs: Array.isArray(data.faqs) ? (data.faqs as FaqField[]) : [],
    metaTitle: str(data.metaTitle),
    metaDescription: str(data.metaDescription),
    parentSlug: typeof data.parentSlug === 'string' ? data.parentSlug : null,
  };
}

function slugToTitle(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function AdminCityServicePage() {
  const params = useParams();
  const city = params?.city as string;
  const service = params?.service as string;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'loading' | 'not-found' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  // Brief 75/78 (DP-1): the row version this editor loaded, sent back on save so a
  // concurrent direct edit is rejected (409) rather than silently overwritten.
  const [version, setVersion] = useState<number>(0);
  const dv = useDraftVersions('city-service', `${city}/${service}`, buildPayload, {
    // Brief 147 (Track B): publishing bumps the live row's version, so the token
    // this editor loaded goes stale the instant a publish succeeds. Take the fresh
    // one from the publish response instead of forcing a full browser reload.
    onLiveVersionChange: setVersion,
    // Brief 159 (Track C1): selecting a version in the sidebar loads THAT
    // version's stored content into this form. Without it the form kept whatever
    // was on screen, so every version appeared to hold the edit you had just made
    // to a different one — and the next Save wrote it there for real.
    onLoadContent: (content) => setForm(formFromPayload((content ?? {}) as Record<string, unknown>)),
  });

  const cityTitle = city ? slugToTitle(city) : '';
  const serviceTitle = service ? slugToTitle(service) : '';
  const pageTitle = `${cityTitle} — ${serviceTitle} Admin`;
  // Brief 159 (Track C3): the Status row's publish / unpublish wiring, incl. the
  // typed-slug confirmation for taking the page off the site.
  const statusCtl = useVersionStatusControl(dv, { path: `/${city}/${service}` });

  useEffect(() => {
    if (!city || !service) return;
    setStatus('loading');
    Promise.all([
      fetch(`/api/cms/city-service/${city}/${service}`),
      fetch('/api/cms/service-categories'),
    ])
      .then(async ([pageRes, catsRes]) => {
        if (pageRes.status === 404) { setStatus('not-found'); return; }
        if (!pageRes.ok) throw new Error('Failed to load');
        const data = await pageRes.json();
        const cats = catsRes.ok ? await catsRes.json() : [];
        setServiceCategories(Array.isArray(cats) ? cats : []);
        const introParagraphs: string[] = data.serviceIntroParagraphs ?? [];
        const secondaryParagraphs: string[] = data.secondaryParagraphs ?? [];
        setForm({
          serviceIntroHeading: data.serviceIntroHeading ?? '',
          serviceIntroText: introParagraphs.join('\n\n'),
          serviceIntroImage: data.serviceIntroImage ?? '',
          secondaryHeading: data.secondaryHeading ?? '',
          secondaryText: secondaryParagraphs.join('\n\n'),
          secondaryImage: data.secondaryImage ?? '',
          faqs: data.faqs ?? [],
          metaTitle: data.metaTitle ?? '',
          metaDescription: data.metaDescription ?? '',
          parentSlug: data.parentSlug ?? null,
        });
        setVersion(typeof data.version === 'number' ? data.version : 0);
        setStatus('idle');
      })
      .catch((err) => {
        // Brief 64 follow-up: surface the underlying load error so future failures
        // (e.g. the two-dev-server / stale-.next case in CLAUDE.md gotcha #4) are
        // diagnosable instead of silently swallowed.
        console.error(`[admin/city-service/${city}/${service}] load failed`, err);
        setStatus('error');
        setErrorMsg('Failed to load content from database.');
      });
  }, [city, service]);

  function setFaq(i: number, key: keyof FaqField, value: string) {
    setForm(f => {
      const faqs = f.faqs.map((faq, idx) => idx === i ? { ...faq, [key]: value } : faq);
      return { ...f, faqs };
    });
  }

  function addFaq() {
    setForm(f => ({ ...f, faqs: [...f.faqs, { question: '', answer: '' }] }));
  }

  function removeFaq(i: number) {
    setForm(f => ({ ...f, faqs: f.faqs.filter((_, idx) => idx !== i) }));
  }

  function buildPayload() {
    return {
      serviceIntroHeading: form.serviceIntroHeading,
      serviceIntroParagraphs: form.serviceIntroText.split('\n\n').map(s => s.trim()).filter(Boolean),
      serviceIntroImage: form.serviceIntroImage,
      secondaryHeading: form.secondaryHeading,
      secondaryParagraphs: form.secondaryText.split('\n\n').map(s => s.trim()).filter(Boolean),
      secondaryImage: form.secondaryImage,
      faqs: form.faqs,
      metaTitle: form.metaTitle || null,
      metaDescription: form.metaDescription || null,
      parentSlug: form.parentSlug || null,
    };
  }

  async function handleSave() {
    setStatus('saving');
    setErrorMsg('');
    try {
      const res = await fetch(`/api/cms/city-service/${city}/${service}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...buildPayload(), version }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Unknown error');
      }
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

  const s: React.CSSProperties = {
    display: 'block', width: '100%', padding: '0.4rem 0.5rem',
    border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem', marginBottom: '1rem',
    fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box',
    background: ADMIN_COLORS.surfaceContainerLow, color: ADMIN_COLORS.onSurface,
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontWeight: 600, marginBottom: '0.25rem',
    fontSize: '13px', color: ADMIN_COLORS.onSurface,
  };
  const section: React.CSSProperties = {
    marginBottom: '2rem', padding: '1.5rem', borderRadius: '1.5rem',
    background: ADMIN_COLORS.surfaceContainerLow, border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
    boxShadow: ADMIN_SHADOWS.elegant,
  };

  if (status === 'loading') return <div style={{ padding: '2rem', color: ADMIN_COLORS.onSurfaceVariant }}>Loading...</div>;

  if (status === 'not-found') {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>{pageTitle}</h1>
        <p style={{ color: ADMIN_COLORS.onSurfaceVariant }}>
          No CMS content found for {city}/{service}. This page uses its static content file.
        </p>
      </div>
    );
  }

  const parentCategory = serviceCategories.find(c => c.slug === form.parentSlug);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .admin-cta-btn { transition: box-shadow 0.2s ease, filter 0.2s ease; }
        .admin-cta-btn:hover { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
        .field { transition: box-shadow 0.15s ease, border-color 0.15s ease; }
        .field:focus { outline: none; border-color: ${ADMIN_COLORS.cerulean}; box-shadow: 0 0 0 2px ${ADMIN_COLORS.cerulean}66; }
        .admin-editor-content { transition: margin-right 0.2s ease; }
        @media (min-width: 768px) {
          .admin-editor-content.attrs-open { margin-right: 280px; }
        }
      `}</style>
      <AdminPageHeader
        title={pageTitle}
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
        Edit city-service page content. Separate paragraphs with a blank line. Changes are saved to the database and applied immediately.
      </p>

      {/* Service Intro */}
      <div style={section}>
        <h2 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Service Intro</h2>
        <label style={labelStyle}>Intro Heading</label>
        <input className="field" style={s} value={form.serviceIntroHeading} onChange={e => setForm(f => ({ ...f, serviceIntroHeading: e.target.value }))} />
        <label style={labelStyle}>Introduction</label>
        <p style={{ fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: '-0.75rem 0 0.5rem' }}>Separate paragraphs with a blank line (double Enter).</p>
        <textarea
          className="field"
          rows={10}
          style={{ ...s, minHeight: '200px' }}
          value={form.serviceIntroText}
          onChange={e => setForm(f => ({ ...f, serviceIntroText: e.target.value }))}
        />
        <ImageUploaderField label="Intro Image" value={form.serviceIntroImage} onChange={v => setForm(f => ({ ...f, serviceIntroImage: v }))} />
      </div>

      {/* Secondary Section */}
      <div style={section}>
        <h2 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Secondary Section</h2>
        <label style={labelStyle}>Secondary Heading</label>
        <input className="field" style={s} value={form.secondaryHeading} onChange={e => setForm(f => ({ ...f, secondaryHeading: e.target.value }))} />
        <label style={labelStyle}>Body</label>
        <p style={{ fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: '-0.75rem 0 0.5rem' }}>Separate paragraphs with a blank line (double Enter).</p>
        <textarea
          className="field"
          rows={6}
          style={{ ...s, minHeight: '140px' }}
          value={form.secondaryText}
          onChange={e => setForm(f => ({ ...f, secondaryText: e.target.value }))}
        />
        <ImageUploaderField label="Secondary Image" value={form.secondaryImage} onChange={v => setForm(f => ({ ...f, secondaryImage: v }))} />
      </div>

      {/* FAQs */}
      <div style={section}>
        <h2 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>FAQs</h2>
        {form.faqs.map((faq, i) => (
          <div key={i} style={{ background: ADMIN_COLORS.surfaceContainer, border: `1px solid ${ADMIN_COLORS.outlineVariant}33`, borderRadius: '1rem', padding: '1rem', marginBottom: '0.75rem', boxShadow: ADMIN_SHADOWS.sm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.8rem', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: 0 }}>FAQ {i + 1}</p>
              <button
                onClick={() => removeFaq(i)}
                style={{ background: 'none', border: `1px solid ${ADMIN_COLORS.error}66`, color: ADMIN_COLORS.error, borderRadius: '0.5rem', padding: '0.2rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Remove
              </button>
            </div>
            <label style={labelStyle}>Question</label>
            <input className="field" style={s} value={faq.question} onChange={e => setFaq(i, 'question', e.target.value)} />
            <label style={labelStyle}>Answer</label>
            <textarea className="field" rows={3} style={{ ...s, minHeight: '70px' }} value={faq.answer} onChange={e => setFaq(i, 'answer', e.target.value)} />
          </div>
        ))}
        <button
          className="admin-cta-btn"
          onClick={addFaq}
          style={{ background: ADMIN_COLORS.cerulean, border: 'none', color: '#fff', borderRadius: '9999px', padding: '0.6rem 1.25rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600, width: '100%', boxShadow: ADMIN_SHADOWS.lg }}
        >
          + Add FAQ
        </button>
      </div>

      {/* ── Settings ── */}
      <div style={{ ...section }}>
        <h2 style={{ fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Settings</h2>
        <label style={labelStyle}>Parent Page</label>
        <p style={{ fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: '-0.5rem 0 0.5rem' }}>
          The service category this page belongs to. Used for breadcrumbs and internal linking.
        </p>
        <select
          className="field"
          value={form.parentSlug ?? ''}
          onChange={e => setForm(f => ({ ...f, parentSlug: e.target.value || null }))}
          style={{
            ...s,
            appearance: 'none',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23c4c6cd'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            paddingRight: '2rem',
            cursor: 'pointer',
            marginBottom: 0,
          }}
        >
          <option value="">None</option>
          {serviceCategories.map(cat => (
            <option key={cat.slug} value={cat.slug}>{cat.title}</option>
          ))}
        </select>
      </div>

      <MetaSection
        metaTitle={form.metaTitle}
        metaDescription={form.metaDescription}
        onMetaTitleChange={v => setForm(f => ({ ...f, metaTitle: v }))}
        onMetaDescriptionChange={v => setForm(f => ({ ...f, metaDescription: v }))}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
        <button
          className="admin-cta-btn"
          onClick={handleSave}
          disabled={status === 'saving'}
          style={{ background: ADMIN_COLORS.cerulean, color: '#fff', border: 'none', padding: '0.7rem 2rem', borderRadius: '9999px', fontWeight: 700, fontSize: '1rem', cursor: status === 'saving' ? 'not-allowed' : 'pointer', opacity: status === 'saving' ? 0.7 : 1, boxShadow: ADMIN_SHADOWS.xl }}
        >
          {status === 'saving' ? 'Saving...' : 'Save'}
        </button>
        {status === 'saved' && <span style={{ color: ADMIN_COLORS.success, fontWeight: 600 }}>Saved.</span>}
        {status === 'error' && <span style={{ color: ADMIN_COLORS.error }}>{errorMsg}</span>}
      </div>

    </div>

      {statusCtl.modal}


      <PageAttributesSidebar
        title={pageTitle}
        template={{ value: 'city-service', label: 'City Service', options: [{ value: 'city-service', label: 'City Service' }] }}
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
        slug={{ value: `${city}/${service}`, editable: false, disabledNote: "This page's URL is fixed at creation and can't be changed here.", permalink: `${SITE.baseUrl}/${city}/${service}` }}
        parent={{
          label: parentCategory ? parentCategory.title : 'None',
          editable: true,
          value: form.parentSlug,
          options: serviceCategories,
          onChange: (newParentSlug) => setForm(f => ({ ...f, parentSlug: newParentSlug })),
        }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </div>
  );
}
