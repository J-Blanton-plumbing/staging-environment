'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import RichTextField from '@/components/admin/RichTextField';
import ProblemsListField, { padToMinProblems } from '@/components/admin/ProblemsListField';
import PageAttributesSidebar, { SIDEBAR_WIDTH_PX } from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';

interface ServiceCategory {
  slug: string;
  title: string;
}

interface SubServiceData {
  title: string;
  heroHeading: string;
  heroIntro: string;
  heroImage: string;
  introHeading: string;
  introBody: string;
  fImage: string;
  problemsHeading: string;
  problemsItems: string[];
  ctaHeading: string;
  ctaBody: string;
  f3Image: string;
  ndcTitle: string;
  ndcBody: string;
  status: string;
  metaTitle: string;
  metaDescription: string;
  parentSlug: string | null;
  version: number;
  updatedByName?: string;
  updatedAt?: string;
  createdByName?: string;
  createdAt?: string;
}

const EMPTY: SubServiceData = {
  title: '', heroHeading: '', heroIntro: '', heroImage: '',
  introHeading: '', introBody: '', fImage: '',
  problemsHeading: '', problemsItems: ['', '', ''],
  ctaHeading: '', ctaBody: '', f3Image: '',
  ndcTitle: '', ndcBody: '',
  status: 'draft', metaTitle: '', metaDescription: '',
  parentSlug: null, version: 0,
};

const LABEL: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  fontSize: '13px', fontWeight: 600, color: ADMIN_COLORS.onSurface, marginBottom: '0.25rem',
};
const INPUT: React.CSSProperties = {
  display: 'block', width: '100%', padding: '0.5rem',
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '0.9rem', color: ADMIN_COLORS.onSurface,
  background: ADMIN_COLORS.surfaceContainerLow,
  boxSizing: 'border-box',
};
const SECTION: React.CSSProperties = {
  background: ADMIN_COLORS.surfaceContainerLow,
  border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
  borderRadius: '1.5rem',
  padding: '1.5rem',
  marginBottom: '1.5rem',
  boxShadow: ADMIN_SHADOWS.elegant,
};
const SECTION_HEADING: React.CSSProperties = {
  fontFamily: 'var(--font-outfit), system-ui, sans-serif', color: ADMIN_COLORS.onSurface,
  fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em',
  margin: '0 0 1rem',
};

// ── Read-only placeholder box (Brief 88) ───────────────────────────────────────
// Blocks that render on the live page but have no editor controls today. Visually
// distinct from the editable SECTION boxes above (dashed border, muted heading,
// a badge pill) so there's no confusion about what can be changed here.

function ReadOnlyBlock({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge: string;
}) {
  return (
    <div
      style={{
        ...SECTION,
        border: `1px dashed ${ADMIN_COLORS.outlineVariant}66`,
        boxShadow: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <h3 style={{ ...SECTION_HEADING, color: ADMIN_COLORS.onSurfaceVariant, margin: 0 }}>{title}</h3>
        <span
          style={{
            fontFamily: 'var(--font-nunito), system-ui, sans-serif',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: ADMIN_COLORS.onSurfaceVariant,
            background: ADMIN_COLORS.surfaceContainerHigh,
            border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
            borderRadius: '9999px',
            padding: '0.15rem 0.65rem',
          }}
        >
          {badge}
        </span>
      </div>
      <p
        style={{
          fontFamily: 'var(--font-nunito), system-ui, sans-serif',
          fontSize: '13px',
          color: `${ADMIN_COLORS.onSurfaceVariant}cc`,
          margin: 0,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    </div>
  );
}

// ── Hero Image Uploader (matches article editor pattern) ──────────────────────

function HeroImageField({
  value,
  onChange,
  label = 'Hero Image',
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/cms/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Upload failed');
      }
      const { url } = await res.json();
      onChange(url);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const tabBtn = (label: string, t: 'upload' | 'url') => (
    <button
      type="button"
      onClick={() => setTab(t)}
      style={{
        padding: '0.3rem 0.9rem',
        fontSize: '12px',
        fontFamily: 'var(--font-nunito), system-ui, sans-serif',
        fontWeight: 700,
        border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
        borderRadius: '0.5rem 0.5rem 0 0',
        borderBottom: tab === t ? `2px solid ${ADMIN_COLORS.cerulean}` : undefined,
        background: tab === t ? ADMIN_COLORS.surfaceContainerHigh : ADMIN_COLORS.surfaceContainer,
        color: tab === t ? ADMIN_COLORS.cerulean : ADMIN_COLORS.onSurfaceVariant,
        cursor: 'pointer',
        marginRight: '2px',
        position: 'relative',
        bottom: '-1px',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>{label}</label>

      <div className="image-field-grid">
        {/* Left — preview (or an empty placeholder so the layout doesn't jump) */}
        <div>
          {value ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={value}
              alt="Image preview"
              style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '0.75rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}66` }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '120px',
                borderRadius: '0.75rem',
                border: `1px dashed ${ADMIN_COLORS.outlineVariant}66`,
                background: ADMIN_COLORS.surfaceContainerLow,
                color: ADMIN_COLORS.onSurfaceVariant,
                fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                fontSize: '12px',
                textAlign: 'center',
                padding: '0.5rem',
              }}
            >
              No image selected
            </div>
          )}
        </div>

        {/* Right — Upload/URL tabs */}
        <div>
          <div style={{ borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}66`, marginBottom: 0 }}>
            {tabBtn('Upload', 'upload')}
            {tabBtn('URL', 'url')}
          </div>

          <div style={{ border: `1px dashed ${ADMIN_COLORS.outlineVariant}66`, borderTop: 'none', borderRadius: '0 0.5rem 0.5rem 0.5rem', padding: '0.75rem', background: ADMIN_COLORS.surfaceContainer }}>
            {tab === 'upload' ? (
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={uploading}
                  style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '0.875rem' }}
                />
                {uploading && (
                  <span style={{ marginLeft: '0.75rem', fontSize: '12px', fontFamily: 'var(--font-nunito), system-ui, sans-serif', color: ADMIN_COLORS.onSurfaceVariant }}>
                    Uploading…
                  </span>
                )}
                {uploadError && (
                  <div style={{ marginTop: '0.35rem', fontSize: '12px', color: ADMIN_COLORS.error, fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
                    {uploadError}
                  </div>
                )}
                <div style={{ marginTop: '0.4rem', fontSize: '11px', color: ADMIN_COLORS.onSurfaceVariant, fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
                  JPEG, PNG, or WebP · max 10 MB
                </div>
              </div>
            ) : (
              <input
                className="field"
                type="url"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="https://…"
                style={{ ...INPUT, border: 'none', padding: '0', boxShadow: 'none' }}
              />
            )}
          </div>

          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              style={{
                marginTop: '0.5rem',
                background: 'none',
                border: 'none',
                color: ADMIN_COLORS.error,
                fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                fontSize: '12px',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Remove image
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SubServiceAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<SubServiceData>(EMPTY);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'not-found' | 'error' | 'done'>('loading');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [publishBusy, setPublishBusy] = useState(false);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  const dv = useDraftVersions('sub-service', slug, () => ({
    title: form.title,
    heroHeading: form.heroHeading,
    heroIntro: form.heroIntro,
    heroImage: form.heroImage,
    introHeading: form.introHeading,
    introBody: form.introBody,
    fImage: form.fImage,
    problemsHeading: form.problemsHeading,
    problemsItems: form.problemsItems,
    ctaHeading: form.ctaHeading,
    ctaBody: form.ctaBody,
    f3Image: form.f3Image,
    ndcTitle: form.ndcTitle,
    ndcBody: form.ndcBody,
    status: form.status,
    metaTitle: form.metaTitle,
    metaDescription: form.metaDescription,
  }));

  const load = useCallback(async () => {
    try {
      const [pageRes, catsRes] = await Promise.all([
        fetch(`/api/cms/sub-service/${slug}`),
        fetch('/api/cms/service-categories'),
      ]);
      if (pageRes.status === 404) { setLoadStatus('not-found'); return; }
      if (!pageRes.ok) { setLoadStatus('error'); return; }
      const d = await pageRes.json();
      const cats = catsRes.ok ? await catsRes.json() : [];
      setServiceCategories(Array.isArray(cats) ? cats : []);
      setForm({
        title: d.title ?? '',
        heroHeading: d.hero_heading ?? '',
        heroIntro: d.hero_intro ?? '',
        heroImage: d.hero_image ?? '',
        introHeading: d.intro_heading ?? '',
        introBody: d.intro_body ?? '',
        fImage: d.f_image ?? '',
        problemsHeading: d.problems_heading ?? '',
        problemsItems: padToMinProblems(Array.isArray(d.problems_items) ? d.problems_items : []),
        ctaHeading: d.cta_heading ?? '',
        ctaBody: d.cta_body ?? '',
        f3Image: d.f3_image ?? '',
        ndcTitle: d.ndc_title ?? '',
        ndcBody: d.ndc_body ?? '',
        status: d.status ?? 'draft',
        metaTitle: d.meta_title ?? '',
        metaDescription: d.meta_description ?? '',
        parentSlug: d.parent_slug ?? null,
        version: d.version ?? 0,
        updatedByName: d.updated_by_name ?? undefined,
        updatedAt: d.updated_at ?? undefined,
        createdByName: d.created_by_name ?? undefined,
        createdAt: d.created_at ?? undefined,
      });
      setLoadStatus('done');
    } catch {
      setLoadStatus('error');
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  function set(k: keyof SubServiceData, v: string | string[] | null) {
    setForm(p => ({ ...p, [k]: v }));
    setSaveStatus('idle');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus('saving');
    setSaveMsg('');
    try {
      const res = await fetch(`/api/cms/sub-service/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          heroHeading: form.heroHeading,
          heroIntro: form.heroIntro,
          heroImage: form.heroImage || null,
          introHeading: form.introHeading,
          introBody: form.introBody,
          fImage: form.fImage,
          problemsHeading: form.problemsHeading,
          problemsItems: form.problemsItems.map(s => s.trim()).filter(Boolean),
          ctaHeading: form.ctaHeading,
          ctaBody: form.ctaBody,
          f3Image: form.f3Image,
          ndcTitle: form.ndcTitle,
          ndcBody: form.ndcBody,
          status: form.status,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
          parentSlug: form.parentSlug || null,
          // Brief 75 (DP-1): optimistic-concurrency guard for direct edits.
          version: form.version,
        }),
      });
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error ?? 'Save failed'); }
      const j = await res.json().catch(() => ({}));
      if (typeof j.version === 'number') setForm(p => ({ ...p, version: j.version }));
      setSaveStatus('saved');
      setSaveMsg('Draft saved');
    } catch (err: unknown) {
      setSaveStatus('error');
      setSaveMsg(err instanceof Error ? err.message : 'Save failed');
    }
  }

  // Brief 85 (iter. 2): the header's old Publish/Unpublish button was removed —
  // Status is now set exclusively via the sidebar's Status popover, which calls
  // this directly with the explicitly selected value.
  async function handleStatusChange(newStatus: string) {
    setPublishBusy(true);
    try {
      const res = await fetch(`/api/cms/sub-service/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? 'Failed'); }
      // The PATCH bumps the row version server-side; keep our copy in step so the
      // next content save isn't falsely rejected as stale (Brief 75, DP-1).
      setForm(p => ({ ...p, status: newStatus, version: (p.version ?? 0) + 1 }));
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : 'Status change failed');
      setSaveStatus('error');
    } finally {
      setPublishBusy(false);
    }
  }


  const textField = (label: string, k: keyof SubServiceData, placeholder?: string) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>{label}</label>
      <input className="field" type="text" value={form[k] as string} onChange={e => set(k, e.target.value)}
        placeholder={placeholder} style={INPUT} />
    </div>
  );

  const textareaField = (label: string, k: keyof SubServiceData, rows = 4, hint?: string) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>{label}</label>
      {hint && <p style={{ fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontFamily: 'var(--font-nunito), system-ui, sans-serif', margin: '0 0 0.35rem' }}>{hint}</p>}
      <textarea className="field" value={form[k] as string} onChange={e => set(k, e.target.value)}
        rows={rows} style={{ ...INPUT, resize: 'vertical', lineHeight: 1.6 }} />
    </div>
  );

  if (loadStatus === 'loading') return <main style={{ padding: '2rem', color: ADMIN_COLORS.onSurfaceVariant }}>Loading…</main>;
  if (loadStatus === 'not-found') return (
    <main style={{ padding: '2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
      <p style={{ color: ADMIN_COLORS.error }}>Sub-service page &ldquo;{slug}&rdquo; not found.</p>
    </main>
  );
  if (loadStatus === 'error') return (
    <main style={{ padding: '2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
      <p style={{ color: ADMIN_COLORS.error }}>Failed to load sub-service page. Please try refreshing.</p>
    </main>
  );

  const parentCategory = serviceCategories.find(c => c.slug === form.parentSlug);

  return (
    <>
      <AdminPageHeader
        title={form.title || slug}
        templateName="Sub-Service"
        status={form.status}
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

      <div className={`admin-editor-content${attrsOpen ? ' attrs-open' : ''}`} style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <style>{`
          .admin-cta-btn { transition: box-shadow 0.2s ease, filter 0.2s ease; }
          .admin-cta-btn:hover { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
          .field { transition: box-shadow 0.15s ease, border-color 0.15s ease; }
          .field:focus { outline: none; border-color: ${ADMIN_COLORS.cerulean}; box-shadow: 0 0 0 2px ${ADMIN_COLORS.cerulean}66; }
          /* Brief 86, item 1: the content column fills the available width instead
             of being boxed into a fixed reading-width column — it only ever gives
             up exactly the sidebar's width (reserved via margin-right) when the
             sidebar is open, and reclaims all of it when collapsed. No auto-margin
             centering — that was pushing the leftover space to the left instead of
             letting the boxes actually use it. Reacts live to .attrs-open since
             that class is driven by attrsOpen state. */
          .admin-editor-content { transition: margin-right 0.2s ease; }
          @media (min-width: 768px) {
            .admin-editor-content.attrs-open { margin-right: ${SIDEBAR_WIDTH_PX}px; }
          }
          /* Image uploader fields: preview on the left, Upload/URL tabs on the
             right. Stacked on narrow viewports. */
          .image-field-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
          @media (min-width: 640px) {
            .image-field-grid { grid-template-columns: minmax(160px, 240px) 1fr; gap: 1.25rem; align-items: start; }
          }
        `}</style>
        <form onSubmit={handleSave}>
          {textField('Page Title (internal)', 'title')}

          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>Hero Section</h3>
            <HeroImageField value={form.heroImage} onChange={url => set('heroImage', url)} />
            {textField('H1: Main Header', 'heroHeading')}
            {textareaField('Sub-text', 'heroIntro', 3)}
          </div>

          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>Intro Section</h3>
            {textField('H2: Section Header', 'introHeading')}
            <RichTextField label="Section Body" value={form.introBody} onChange={v => set('introBody', v)} rows={6} />
            <HeroImageField value={form.fImage} onChange={url => set('fImage', url)} label="Intro Section Image" />
          </div>

          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>List Section</h3>
            {textField('H2: Section Header', 'problemsHeading')}
            <ProblemsListField
              label="List items"
              items={form.problemsItems}
              onChange={v => set('problemsItems', v)}
            />
          </div>

          <ReadOnlyBlock
            title="Coverage Map"
            description="Service-area map (&ldquo;We&rsquo;re almost everywhere&rdquo;). Heading and map are shared across all sub-service pages."
            badge="Managed in Elfsight"
          />

          <ReadOnlyBlock
            title="Google Reviews"
            description="Google reviews carousel, shared across the site."
            badge="Managed in Elfsight"
          />

          <ReadOnlyBlock
            title="TikTok Feed"
            description="TikTok video feed. Headline is shared across all sub-service pages."
            badge="Managed in Elfsight"
          />

          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>No Drip Club</h3>
            {textField('H2: Section Header', 'ndcTitle')}
            <RichTextField
              label="Section Body"
              value={form.ndcBody}
              onChange={v => set('ndcBody', v)}
              rows={4}
              help="The per-service No Drip Club pitch. Leave blank to use the generic default copy."
            />
            <p style={{
              fontFamily: 'var(--font-nunito), system-ui, sans-serif',
              fontSize: '12px',
              color: `${ADMIN_COLORS.onSurfaceVariant}99`,
              margin: '0.5rem 0 0',
            }}>
              The No Drip Club image is a fixed default and not editable per page today.
            </p>
          </div>

          <ReadOnlyBlock
            title="Related Articles"
            description="Shows the 3 latest Knowledge Hub articles (same on every sub-service page today; not filtered by service)."
            badge="Auto-generated"
          />

          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>Final CTA</h3>
            {textField('Section Header', 'ctaHeading')}
            {textareaField('Section Body', 'ctaBody', 3)}
            <HeroImageField value={form.f3Image} onChange={url => set('f3Image', url)} label="Closing CTA Image" />
          </div>

          {/* ── Settings ── */}
          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>Settings</h3>

            <MetaSection
              metaTitle={form.metaTitle}
              metaDescription={form.metaDescription}
              onMetaTitleChange={v => set('metaTitle', v)}
              onMetaDescriptionChange={v => set('metaDescription', v)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <button
              className="admin-cta-btn"
              type="submit"
              disabled={saveStatus === 'saving'}
              style={{
                background: ADMIN_COLORS.cerulean, border: 'none', borderRadius: '9999px',
                padding: '0.6rem 1.5rem', color: '#fff',
                fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 600, fontSize: '14px',
                cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                opacity: saveStatus === 'saving' ? 0.7 : 1,
                boxShadow: ADMIN_SHADOWS.xl,
              }}
            >
              {saveStatus === 'saving' ? 'Saving…' : 'Save Page'}
            </button>
            {saveMsg && (
              <span style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '13px', color: saveStatus === 'error' ? ADMIN_COLORS.error : ADMIN_COLORS.success }}>
                {saveMsg}
              </span>
            )}
          </div>
        </form>
      </div>

      <PageAttributesSidebar
        title={form.title}
        updatedAt={form.updatedAt}
        status={form.status}
        onStatusChange={handleStatusChange}
        statusBusy={publishBusy}
        template={{
          value: 'sub-service',
          label: 'Sub-Service',
          options: [{ value: 'sub-service', label: 'Sub-Service' }],
        }}
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
        slug={{ value: slug, editable: false, disabledNote: "This page's URL is fixed at creation and can't be changed here.", permalink: `${SITE.baseUrl}/${slug}` }}
        parent={{
          label: parentCategory ? parentCategory.title : 'None',
          editable: true,
          value: form.parentSlug,
          options: serviceCategories,
          onChange: (newParentSlug) => set('parentSlug', newParentSlug),
        }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </>
  );
}
