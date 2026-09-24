'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import RichTextField from '@/components/admin/RichTextField';
import ImageUploaderField from '@/components/admin/ImageUploaderField';
import ArticleTermsField from '@/components/admin/ArticleTermsField';
import { EMPTY_TERM_SELECTION, normalizeTermSelection, type ArticleTermSelection } from '@/lib/cms/kh-taxonomy-types';
import PageAttributesSidebar from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { useVersionStatusControl } from '@/components/admin/PageAttributesSidebar/useVersionStatusControl';
import { formFromContent } from '@/lib/admin/formFromContent';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';

interface ArticleData {
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  image: string;
  /** Brief 187: Topic + Location tags, as slugs. Replaces the legacy `categories`. */
  terms: ArticleTermSelection;
  status: string;
  metaTitle: string;
  metaDescription: string;
  updatedByName?: string;
  updatedAt?: string;
  createdByName?: string;
  createdAt?: string;
}

const EMPTY: ArticleData = {
  slug: '',
  title: '',
  excerpt: '',
  body: '',
  image: '',
  terms: EMPTY_TERM_SELECTION,
  status: 'draft',
  metaTitle: '',
  metaDescription: '',
};

const LABEL: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  fontSize: '13px',
  fontWeight: 600,
  color: ADMIN_COLORS.onSurface,
  marginBottom: '0.25rem',
};

const INPUT: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem',
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
  borderRadius: '0.5rem',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  fontSize: '0.9rem',
  color: ADMIN_COLORS.onSurface,
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


// ── Main page ─────────────────────────────────────────────────────────────────

export default function ArticleAdminPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<ArticleData>(EMPTY);
  const [loadStatus, setLoadStatus] = useState<'loading' | 'not-found' | 'error' | 'done'>('loading');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMsg, setSaveMsg] = useState('');
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  const dv = useDraftVersions('article', slug, () => ({
    title: form.title,
    excerpt: form.excerpt,
    body: form.body,
    image: form.image,
    // Brief 187: tags live in the VERSION's content, exactly like the body. They
    // reach `cms_article_terms` only when this version is published
    // (updateArticleCmsContent), so a tag change can never bypass draft →
    // publish. The legacy `categories` key is no longer written.
    terms: form.terms,
    // Brief 159 (Track A2): `status` is NO LONGER part of a version's content — it
    // is derived from which version is published and has exactly one writer.
    metaTitle: form.metaTitle,
    metaDescription: form.metaDescription,
  }), {
    // Brief 159 (Track C1): selecting a version in the sidebar loads THAT
    // version's stored content into this form. Without it the form kept whatever
    // was on screen, so every version appeared to hold the edit you had just made
    // to a different one — and the next Save wrote it there for real.
    //
    // Brief 187: a version saved BEFORE tags existed has no `terms` key. Loading
    // it keeps the tags already in the form (the live ones) instead of blanking
    // them, so saving or publishing an old version never silently strips an
    // article's tags.
    onLoadContent: (content) => setForm(f => ({
      ...f,
      ...formFromContent(EMPTY, content),
      slug: f.slug,
      terms: normalizeTermSelection((content as Record<string, unknown> | null)?.terms) ?? f.terms,
    })),
  });
  // Brief 159 (Track C3): the Status row's publish / unpublish wiring, incl. the
  // typed-slug confirmation for taking the article off the site.
  const statusCtl = useVersionStatusControl(dv, { path: `/knowledge-hub/${slug}` });

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/cms/article/${slug}`);
      if (res.status === 404) { setLoadStatus('not-found'); return; }
      if (!res.ok) { setLoadStatus('error'); return; }
      const data = await res.json();
      setForm({
        slug: data.slug ?? slug,
        title: data.title ?? '',
        excerpt: data.excerpt ?? '',
        body: typeof data.body === 'string' ? data.body : '',
        image: data.image ?? '',
        terms: normalizeTermSelection(data.terms) ?? EMPTY_TERM_SELECTION,
        status: data.status ?? 'draft',
        metaTitle: data.meta_title ?? '',
        metaDescription: data.meta_description ?? '',
        updatedByName: data.updated_by_name ?? undefined,
        updatedAt: data.updated_at ?? undefined,
        createdByName: data.created_by_name ?? undefined,
        createdAt: data.created_at ?? undefined,
      });
      setLoadStatus('done');
    } catch {
      setLoadStatus('error');
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  function set<K extends keyof ArticleData>(field: K, value: ArticleData[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
    setSaveStatus('idle');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaveStatus('saving');
    setSaveMsg('');
    try {
      const res = await fetch(`/api/cms/article/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          excerpt: form.excerpt,
          body: form.body,
          image: form.image,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Save failed');
      }
      setSaveStatus('saved');
      setSaveMsg('Saved');
    } catch (err: unknown) {
      setSaveStatus('error');
      setSaveMsg(err instanceof Error ? err.message : 'Save failed');
    }
  }

  if (loadStatus === 'loading') {
    return <div style={{ padding: '2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif', color: ADMIN_COLORS.onSurfaceVariant }}>Loading…</div>;
  }

  if (loadStatus === 'not-found') {
    return (
      <div style={{ padding: '2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
        <p style={{ color: ADMIN_COLORS.error }}>Article &ldquo;{slug}&rdquo; not found in the database. Run the Brief 45 migration first.</p>
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div style={{ padding: '2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
        <p style={{ color: ADMIN_COLORS.error }}>Failed to load article. The cms_articles table may not exist — run the Brief 45 migration.</p>
      </div>
    );
  }

  return (
    // Fix 2: AdminPageHeader is outside the constrained wrapper so it spans full width
    <>
      <AdminPageHeader
        title={form.title || slug}
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
          .admin-editor-content { transition: margin-right 0.2s ease; }
          @media (min-width: 768px) {
            .admin-editor-content.attrs-open { margin-right: 280px; }
          }
        `}</style>
        <form onSubmit={handleSave}>
          {/* Article Details */}
          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>Article Details</h3>
            {/* Title */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={LABEL}>Title</label>
              <input
                className="field"
                type="text"
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Article title"
                style={INPUT}
              />
            </div>

            {/* Fix 1: Hero Image Uploader */}
            <ImageUploaderField label="Hero Image" value={form.image} onChange={url => set('image', url)} />

            {/* Brief 187 (B1): Topic + Location pickers (replaced CategoriesField) */}
            <ArticleTermsField value={form.terms} onChange={terms => set('terms', terms)} />

            {/* Fix 4: Excerpt as resizable textarea */}
            <div style={{ marginBottom: 0 }}>
              <label style={LABEL}>Excerpt</label>
              <textarea
                className="field"
                value={form.excerpt}
                onChange={e => set('excerpt', e.target.value)}
                placeholder="One or two sentences summarising the article"
                rows={3}
                style={{ ...INPUT, resize: 'vertical', minHeight: '80px', lineHeight: 1.5 }}
              />
            </div>
          </div>

          {/* Body with HTML / Preview toggle (shared RichTextField — Brief 77) */}
          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>Body</h3>
            <RichTextField label="Body" value={form.body} onChange={v => set('body', v)} rows={16} />
          </div>

          {/* SEO — Status now lives exclusively in the Page Attributes sidebar (Brief 85 iter. 3) */}
          <div style={SECTION}>
            <h3 style={SECTION_HEADING}>SEO</h3>
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
              {saveStatus === 'saving' ? 'Saving…' : 'Save Article'}
            </button>
            {saveMsg && (
              <span style={{
                fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                fontSize: '13px',
                color: saveStatus === 'error' ? ADMIN_COLORS.error : ADMIN_COLORS.success,
              }}>
                {saveMsg}
              </span>
            )}
          </div>
        </form>
      </div>

      {statusCtl.modal}


      <PageAttributesSidebar
        title={form.title}
        updatedAt={form.updatedAt}
        template={{ value: 'article', label: 'Article', options: [{ value: 'article', label: 'Article' }] }}
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
        slug={{ value: slug, editable: false, disabledNote: "This page's URL is fixed at creation and can't be changed here.", permalink: `${SITE.baseUrl}/knowledge-hub/${slug}` }}
        parent={{ label: 'None', editable: false }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </>
  );
}
