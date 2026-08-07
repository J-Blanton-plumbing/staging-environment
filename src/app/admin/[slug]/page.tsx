'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import MetaSection from '@/components/admin/MetaSection';
import RichTextField from '@/components/admin/RichTextField';
import ListItemsField, { padToMin } from '@/components/admin/ListItemsField';
import ImageUploaderField from '@/components/admin/ImageUploaderField';
import PageAttributesSidebar from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';

interface SubcategoryField {
  label: string;
  href: string;
  description: string;
  // Brief 98: the subcategory's card thumbnail — now part of the editable
  // `serviceSubcategories` block instead of a static per-category fallback.
  image: string;
}

interface FormState {
  hero_heading: string;
  hero_intro: string;
  hero_image: string;
  intro_heading: string;
  intro_body: string;
  f_image: string;
  problems_heading: string;
  problems_items: string[];
  subcategories_heading: string;
  preventative_heading: string;
  preventative_body: string;
  final_pitch_tagline: string;
  final_pitch_body: string;
  f3_image: string;
  articles_featured_slugs: string[];
  service_area_heading: string;
  service_area_body: string;
  tiktok_headline: string;
  subcategories: SubcategoryField[];
  meta_title: string;
  meta_description: string;
  updated_at?: string;
}

const EMPTY: FormState = {
  hero_heading: '',
  hero_intro: '',
  hero_image: '',
  intro_heading: '',
  intro_body: '',
  f_image: '',
  problems_heading: '',
  problems_items: ['', '', ''],
  subcategories_heading: '',
  preventative_heading: '',
  preventative_body: '',
  final_pitch_tagline: '',
  final_pitch_body: '',
  f3_image: '',
  articles_featured_slugs: [],
  service_area_heading: '',
  service_area_body: '',
  tiktok_headline: '',
  subcategories: [],
  meta_title: '',
  meta_description: '',
};

const PAGE_LABELS: Record<string, string> = {
  plumbing: 'Plumbing',
  sewer: 'Sewer',
  drain: 'Drain',
  'water-heater': 'Water Heater',
  'water-quality': 'Water Quality',
  commercial: 'Commercial',
  'hydro-jetting': 'Hydro Jetting',
  'sewer-rodding': 'Sewer Rodding',
};

export default function AdminServicePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [globalOpen, setGlobalOpen] = useState(false);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  // Brief 75/78 (DP-1): the row version this editor loaded, sent back on save so a
  // concurrent direct edit is rejected (409) rather than silently overwritten.
  const [version, setVersion] = useState<number>(0);
  const dv = useDraftVersions('service', slug, () => ({
    hero_heading: form.hero_heading,
    hero_intro: form.hero_intro,
    hero_image: form.hero_image,
    intro_heading: form.intro_heading,
    intro_body: form.intro_body,
    f_image: form.f_image,
    problems_heading: form.problems_heading,
    problems_items: form.problems_items.map((s: string) => s.trim()).filter(Boolean),
    subcategories_heading: form.subcategories_heading,
    preventative_heading: form.preventative_heading,
    preventative_body: form.preventative_body,
    final_pitch_tagline: form.final_pitch_tagline,
    final_pitch_body: form.final_pitch_body,
    f3_image: form.f3_image,
    articles_featured_slugs: form.articles_featured_slugs.map((s: string) => s.trim()).filter(Boolean),
    service_area_heading: form.service_area_heading,
    service_area_body: form.service_area_body,
    tiktok_headline: form.tiktok_headline,
    subcategories: form.subcategories,
    meta_title: form.meta_title || null,
    meta_description: form.meta_description || null,
  }), {
    // Brief 147 (Track B): publishing bumps the live row's version, so the token
    // this editor loaded goes stale the instant a publish succeeds. Take the fresh
    // one from the publish response instead of forcing a full browser reload.
    onLiveVersionChange: setVersion,
  });

  useEffect(() => {
    if (!slug) return;
    setStatus('loading');
    setForm(EMPTY);
    fetch(`/api/cms/${slug}`)
      .then(r => r.json())
      .then(data => {
        const { page, subcategoriesBlock, global: g } = data;
        const subcategories: SubcategoryField[] = (subcategoriesBlock?.items ?? []).map(
          (item: { label: string; href: string; desc: string; image: string }) => ({
            label: item.label,
            href: item.href,
            description: item.desc,
            image: item.image,
          })
        );
        setForm({
          hero_heading: page.hero_heading ?? '',
          hero_intro: page.hero_intro ?? '',
          hero_image: page.hero_image ?? '',
          intro_heading: page.intro_heading ?? '',
          intro_body: page.intro_body ?? '',
          f_image: page.f_image ?? '',
          problems_heading: page.problems_heading ?? '',
          problems_items: padToMin(Array.isArray(page.problems_items) ? page.problems_items : [], 3),
          subcategories_heading: page.subcategories_heading ?? '',
          preventative_heading: page.preventative_heading ?? '',
          preventative_body: page.preventative_body ?? '',
          final_pitch_tagline: page.final_pitch_tagline ?? '',
          final_pitch_body: page.final_pitch_body ?? '',
          f3_image: page.f3_image ?? '',
          articles_featured_slugs: Array.isArray(page.articles_featured_slugs) ? page.articles_featured_slugs : [],
          service_area_heading: g?.service_area_heading ?? '',
          service_area_body: g?.service_area_body ?? '',
          tiktok_headline: g?.tiktok_headline ?? '',
          subcategories,
          meta_title: page.meta_title ?? '',
          meta_description: page.meta_description ?? '',
          updated_at: page.updated_at ?? undefined,
        });
        setVersion(typeof page.version === 'number' ? page.version : 0);
        setStatus('idle');
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('Failed to load content from database.');
      });
  }, [slug]);

  function set(key: keyof Omit<FormState, 'subcategories'>, value: string | string[]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function setSub(i: number, key: keyof SubcategoryField, value: string) {
    setForm(f => {
      const subs = f.subcategories.map((sub, idx) => idx === i ? { ...sub, [key]: value } : sub);
      return { ...f, subcategories: subs };
    });
  }

  function addSub() {
    setForm(f => ({
      ...f,
      subcategories: [...f.subcategories, { label: '', href: '', description: '', image: '' }],
    }));
  }

  // Brief 98: array position IS the order now (no more `sort_order` column) —
  // reorder is a plain array swap.
  function moveSub(i: number, direction: -1 | 1) {
    setForm(f => {
      const j = i + direction;
      if (j < 0 || j >= f.subcategories.length) return f;
      const subs = [...f.subcategories];
      [subs[i], subs[j]] = [subs[j], subs[i]];
      return { ...f, subcategories: subs };
    });
  }

  function removeSub(i: number) {
    setForm(f => ({
      ...f,
      subcategories: f.subcategories.filter((_, idx) => idx !== i),
    }));
  }

  async function handleSave() {
    setStatus('saving');
    try {
      const res = await fetch(`/api/cms/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hero_heading: form.hero_heading,
          hero_intro: form.hero_intro,
          hero_image: form.hero_image,
          intro_heading: form.intro_heading,
          intro_body: form.intro_body,
          f_image: form.f_image,
          problems_heading: form.problems_heading,
          problems_items: form.problems_items.map(s => s.trim()).filter(Boolean),
          subcategories_heading: form.subcategories_heading,
          preventative_heading: form.preventative_heading,
          preventative_body: form.preventative_body,
          final_pitch_tagline: form.final_pitch_tagline,
          final_pitch_body: form.final_pitch_body,
          f3_image: form.f3_image,
          articles_featured_slugs: form.articles_featured_slugs.map(s => s.trim()).filter(Boolean),
          service_area_heading: form.service_area_heading,
          service_area_body: form.service_area_body,
          tiktok_headline: form.tiktok_headline,
          subcategories: form.subcategories,
          meta_title: form.meta_title || null,
          meta_description: form.meta_description || null,
          version,
        }),
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
    border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.75rem', marginBottom: '1rem',
    fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box',
    background: ADMIN_COLORS.surfaceContainerLowest, color: ADMIN_COLORS.onSurface,
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontWeight: 600, marginBottom: '0.25rem',
    fontSize: '0.85rem', color: ADMIN_COLORS.onSurfaceVariant, fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  };
  const section: React.CSSProperties = {
    marginBottom: '2rem', paddingBottom: '2rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
    background: ADMIN_COLORS.surfaceContainerLow, borderRadius: '1.5rem', padding: '1.5rem',
    boxShadow: ADMIN_SHADOWS.elegant,
  };

  const pageLabel = PAGE_LABELS[slug] ?? slug;

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
        title={`${pageLabel} — CMS Editor`}
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
      <p style={{ color: ADMIN_COLORS.onSurfaceVariant, fontSize: '0.875rem', marginBottom: '2rem' }}>Edit text content. Images on the live page come from static files and are not affected here.</p>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Hero</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.hero_heading} onChange={e => set('hero_heading', e.target.value)} />
        <label style={labelStyle}>Intro</label>
        <textarea style={{ ...s, minHeight: '80px' }} value={form.hero_intro} onChange={e => set('hero_intro', e.target.value)} />
        <ImageUploaderField label="Background Image" value={form.hero_image} onChange={v => set('hero_image', v)} />
      </div>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Intro Section</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.intro_heading} onChange={e => set('intro_heading', e.target.value)} />
        <RichTextField label="Body" value={form.intro_body} onChange={v => set('intro_body', v)} rows={5} />
        <ImageUploaderField label="Section Image" value={form.f_image} onChange={v => set('f_image', v)} />
      </div>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Problems Panel</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.problems_heading} onChange={e => set('problems_heading', e.target.value)} />
        <ListItemsField
          label="Items"
          items={form.problems_items}
          onChange={v => set('problems_items', v)}
        />
      </div>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Subcategories</h2>
        <label style={labelStyle}>Section Heading</label>
        <input style={s} value={form.subcategories_heading} onChange={e => set('subcategories_heading', e.target.value)} />
        {form.subcategories.map((sub, i) => (
          <div key={i} style={{ background: ADMIN_COLORS.surfaceContainer, border: `1px solid ${ADMIN_COLORS.outlineVariant}33`, borderRadius: '1rem', padding: '1rem', marginBottom: '0.75rem', boxShadow: ADMIN_SHADOWS.sm }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: ADMIN_COLORS.onSurface, margin: 0, fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>Card {i + 1}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => moveSub(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move card ${i + 1} up`}
                  style={{ background: 'none', border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, color: ADMIN_COLORS.onSurfaceVariant, borderRadius: '9999px', width: '1.6rem', height: '1.6rem', fontSize: '0.8rem', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? 0.4 : 1, lineHeight: 1 }}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveSub(i, 1)}
                  disabled={i === form.subcategories.length - 1}
                  aria-label={`Move card ${i + 1} down`}
                  style={{ background: 'none', border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, color: ADMIN_COLORS.onSurfaceVariant, borderRadius: '9999px', width: '1.6rem', height: '1.6rem', fontSize: '0.8rem', cursor: i === form.subcategories.length - 1 ? 'default' : 'pointer', opacity: i === form.subcategories.length - 1 ? 0.4 : 1, lineHeight: 1 }}
                >
                  ▼
                </button>
                <button
                  onClick={() => removeSub(i)}
                  style={{ background: 'none', border: `1px solid ${ADMIN_COLORS.error}66`, color: ADMIN_COLORS.error, borderRadius: '9999px', padding: '0.2rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                >
                  Remove
                </button>
              </div>
            </div>
            <ImageUploaderField label="Image" value={sub.image} onChange={v => setSub(i, 'image', v)} />
            <label style={labelStyle}>Label</label>
            <input style={s} value={sub.label} onChange={e => setSub(i, 'label', e.target.value)} />
            <label style={labelStyle}>Href</label>
            <input style={s} value={sub.href} onChange={e => setSub(i, 'href', e.target.value)} />
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...s, minHeight: '70px' }} value={sub.description} onChange={e => setSub(i, 'description', e.target.value)} />
          </div>
        ))}
        <button
          onClick={addSub}
          style={{ background: ADMIN_COLORS.surfaceContainerLowest, border: `1px dashed ${ADMIN_COLORS.outlineVariant}`, color: ADMIN_COLORS.onSurface, borderRadius: '1rem', padding: '0.6rem 1.25rem', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600, width: '100%' }}
        >
          + Add card
        </button>
      </div>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Preventative Section</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.preventative_heading} onChange={e => set('preventative_heading', e.target.value)} />
        <RichTextField label="Body" value={form.preventative_body} onChange={v => set('preventative_body', v)} rows={4} />
      </div>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Final Pitch</h2>
        <label style={labelStyle}>Tagline</label>
        <input style={s} value={form.final_pitch_tagline} onChange={e => set('final_pitch_tagline', e.target.value)} />
        <RichTextField label="Body" value={form.final_pitch_body} onChange={v => set('final_pitch_body', v)} rows={4} />
        <ImageUploaderField label="Section Image" value={form.f3_image} onChange={v => set('f3_image', v)} />
      </div>

      <div style={section}>
        <h2 style={{ fontWeight: 700, marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>Featured Article Slugs</h2>
        <ListItemsField
          label="Slugs"
          items={form.articles_featured_slugs}
          onChange={v => set('articles_featured_slugs', v)}
          minItems={0}
          addLabel="+ Add slug"
          placeholder="article-slug-{n}"
        />
      </div>

      <div style={{ ...section, background: ADMIN_COLORS.surfaceContainer, borderRadius: '1.5rem', padding: '1rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}33` }}>
        <button
          onClick={() => setGlobalOpen(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', color: ADMIN_COLORS.onSurface, padding: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}
        >
          {globalOpen ? '▾' : '▸'} Global Settings
        </button>
        <p style={{ fontSize: '0.8rem', color: ADMIN_COLORS.onSurfaceVariant, marginTop: '0.25rem' }}>Shared across all service pages — editing here affects every page.</p>
        {globalOpen && (
          <div style={{ marginTop: '1rem' }}>
            <label style={labelStyle}>Service Area Heading</label>
            <input style={s} value={form.service_area_heading} onChange={e => set('service_area_heading', e.target.value)} />
            <label style={labelStyle}>Service Area Body</label>
            <textarea style={{ ...s, minHeight: '70px' }} value={form.service_area_body} onChange={e => set('service_area_body', e.target.value)} />
            <label style={labelStyle}>TikTok Headline</label>
            <input style={s} value={form.tiktok_headline} onChange={e => set('tiktok_headline', e.target.value)} />
          </div>
        )}
      </div>

      <MetaSection
        metaTitle={form.meta_title}
        metaDescription={form.meta_description}
        onMetaTitleChange={v => set('meta_title', v)}
        onMetaDescriptionChange={v => set('meta_description', v)}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
        <button
          className="admin-save-btn"
          onClick={handleSave}
          disabled={status === 'saving'}
          style={{ background: ADMIN_COLORS.cerulean, color: '#fff', border: 'none', padding: '0.7rem 2rem', borderRadius: '9999px', fontWeight: 700, fontSize: '1rem', cursor: status === 'saving' ? 'not-allowed' : 'pointer', opacity: status === 'saving' ? 0.7 : 1, boxShadow: ADMIN_SHADOWS.lg }}
        >
          {status === 'saving' ? 'Saving...' : 'Save'}
        </button>
        {status === 'saved' && <span style={{ color: ADMIN_COLORS.success, fontWeight: 600 }}>Saved.</span>}
        {status === 'error' && <span style={{ color: ADMIN_COLORS.error }}>{errorMsg}</span>}
      </div>

    </div>

      <PageAttributesSidebar
        title={pageLabel}
        updatedAt={form.updated_at}
        status="published"
        template={{ value: 'service-category', label: 'Service Category', options: [{ value: 'service-category', label: 'Service Category' }] }}
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
        slug={{ value: slug, editable: false, disabledNote: "This page's URL is derived from its service category and can't be changed here.", permalink: `${SITE.baseUrl}/services/${slug}` }}
        parent={{ label: 'None', editable: false }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </div>
  );
}
