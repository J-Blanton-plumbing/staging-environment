'use client';

import { useState, useEffect } from 'react';
import MetaSection from '@/components/admin/MetaSection';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import PageAttributesSidebar from '@/components/admin/PageAttributesSidebar';
import { usePageAttributesOpen } from '@/components/admin/PageAttributesSidebar/usePageAttributesOpen';
import { useDraftVersions } from '@/components/admin/PageAttributesSidebar/useDraftVersions';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';

interface FormState {
  heroHeading: string;
  heroDescription: string;
  heroImage: string;
  fHeading: string;
  fBody: string;
  fImage: string;
  cardHeading: string;
  cardItems: string;
  mapHeading: string;
  mapBody: string;
  f2Heading: string;
  f2Body: string;
  f2Image: string;
  f3Heading: string;
  f3Body: string;
  f3Image: string;
  metaTitle: string;
  metaDescription: string;
}

const EMPTY: FormState = {
  heroHeading: '', heroDescription: '', heroImage: '',
  fHeading: '', fBody: '', fImage: '',
  cardHeading: '', cardItems: '',
  mapHeading: '', mapBody: '',
  f2Heading: '', f2Body: '', f2Image: '',
  f3Heading: '', f3Body: '', f3Image: '',
  metaTitle: '', metaDescription: '',
};

function ImageField({
  label: labelText,
  value,
  onChange,
  labelStyle,
  inputStyle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  labelStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/cms/upload', {
        method: 'POST',
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');
      onChange(json.url);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={labelStyle}>{labelText}</label>
      {value && (
        <img
          src={value}
          alt="current"
          style={{ display: 'block', maxHeight: '140px', maxWidth: '100%', objectFit: 'cover', borderRadius: '0.75rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}33`, marginBottom: '0.5rem' }}
        />
      )}
      <input
        style={{ ...inputStyle, marginBottom: '0.25rem' }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="https://... or leave empty to use default image"
      />
      <label style={{ display: 'inline-block', cursor: uploading ? 'not-allowed' : 'pointer' }}>
        <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFile} disabled={uploading} />
        <span style={{ display: 'inline-block', background: ADMIN_COLORS.surfaceContainer, border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '9999px', padding: '0.35rem 0.85rem', fontSize: '0.85rem', fontWeight: 600, color: ADMIN_COLORS.onSurface, opacity: uploading ? 0.6 : 1 }}>
          {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
        </span>
      </label>
      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', color: ADMIN_COLORS.onSurfaceVariant }}>JPEG, PNG or WebP · max 10 MB</span>
      {uploadError && <p style={{ color: ADMIN_COLORS.error, fontSize: '0.85rem', marginTop: '0.25rem' }}>{uploadError}</p>}
    </div>
  );
}

export default function AdminEmergencyPlumbingPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'loading' | 'idle' | 'saving' | 'saved' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  // Brief 75/78 (DP-1): the row version this editor loaded, sent back on save so a
  // concurrent direct edit is rejected (409) rather than silently overwritten.
  const [version, setVersion] = useState<number>(0);
  const [attrsOpen, setAttrsOpen] = usePageAttributesOpen();
  const dv = useDraftVersions('emergency-plumbing', 'emergency-plumbing', () => ({
    heroHeading: form.heroHeading,
    heroDescription: form.heroDescription,
    heroImage: form.heroImage,
    fHeading: form.fHeading,
    fBody: form.fBody,
    fImage: form.fImage,
    cardHeading: form.cardHeading,
    cardItems: form.cardItems.split('\n').map((s: string) => s.trim()).filter(Boolean),
    mapHeading: form.mapHeading,
    mapBody: form.mapBody,
    f2Heading: form.f2Heading,
    f2Body: form.f2Body,
    f2Image: form.f2Image,
    f3Heading: form.f3Heading,
    f3Body: form.f3Body,
    f3Image: form.f3Image,
    metaTitle: form.metaTitle || null,
    metaDescription: form.metaDescription || null,
  }), {
    // Brief 147 (Track B): publishing bumps the live row's version, so the token
    // this editor loaded goes stale the instant a publish succeeds. Take the fresh
    // one from the publish response instead of forcing a full browser reload.
    onLiveVersionChange: setVersion,
  });

  useEffect(() => {
    fetch('/api/cms/emergency-plumbing')
      .then(r => r.json())
      .then(data => {
        setForm({
          heroHeading: data.heroHeading ?? '',
          heroDescription: data.heroDescription ?? '',
          heroImage: data.heroImage ?? '',
          fHeading: data.fHeading ?? '',
          fBody: data.fBody ?? '',
          fImage: data.fImage ?? '',
          cardHeading: data.cardHeading ?? '',
          cardItems: Array.isArray(data.cardItems) ? data.cardItems.join('\n') : '',
          mapHeading: data.mapHeading ?? '',
          mapBody: data.mapBody ?? '',
          f2Heading: data.f2Heading ?? '',
          f2Body: data.f2Body ?? '',
          f2Image: data.f2Image ?? '',
          f3Heading: data.f3Heading ?? '',
          f3Body: data.f3Body ?? '',
          f3Image: data.f3Image ?? '',
          metaTitle: data.metaTitle ?? '',
          metaDescription: data.metaDescription ?? '',
        });
        setVersion(typeof data.version === 'number' ? data.version : 0);
        setStatus('idle');
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('Failed to load content from database.');
      });
  }, []);

  function set(key: keyof FormState, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setStatus('saving');
    try {
      const res = await fetch('/api/cms/emergency-plumbing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          heroHeading: form.heroHeading,
          heroDescription: form.heroDescription,
          heroImage: form.heroImage,
          fHeading: form.fHeading,
          fBody: form.fBody,
          fImage: form.fImage,
          cardHeading: form.cardHeading,
          cardItems: form.cardItems.split('\n').map(s => s.trim()).filter(Boolean),
          mapHeading: form.mapHeading,
          mapBody: form.mapBody,
          f2Heading: form.f2Heading,
          f2Body: form.f2Body,
          f2Image: form.f2Image,
          f3Heading: form.f3Heading,
          f3Body: form.f3Body,
          f3Image: form.f3Image,
          metaTitle: form.metaTitle || null,
          metaDescription: form.metaDescription || null,
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
  const h2Style: React.CSSProperties = {
    fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', color: ADMIN_COLORS.onSurface, fontFamily: 'var(--font-outfit), system-ui, sans-serif',
  };

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
        title="Emergency Plumbing — CMS Editor"
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
      <p style={{ color: ADMIN_COLORS.onSurfaceVariant, fontSize: '0.875rem', marginBottom: '2rem' }}>Edit text and images. Leave an image field empty to use the default asset.</p>

      {/* ── Hero ── */}
      <div style={section}>
        <h2 style={h2Style}>Hero</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.heroHeading} onChange={e => set('heroHeading', e.target.value)} />
        <label style={labelStyle}>Description</label>
        <textarea style={{ ...s, minHeight: '80px' }} value={form.heroDescription} onChange={e => set('heroDescription', e.target.value)} />
        <ImageField label="Hero Image" value={form.heroImage} onChange={v => set('heroImage', v)} labelStyle={labelStyle} inputStyle={s} />
      </div>

      {/* ── Plumbers at the Ready ── */}
      <div style={section}>
        <h2 style={h2Style}>Plumbers at the Ready</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.fHeading} onChange={e => set('fHeading', e.target.value)} />
        <label style={labelStyle}>Body</label>
        <textarea style={{ ...s, minHeight: '80px' }} value={form.fBody} onChange={e => set('fBody', e.target.value)} />
        <ImageField label="Section Image" value={form.fImage} onChange={v => set('fImage', v)} labelStyle={labelStyle} inputStyle={s} />
      </div>

      {/* ── Emergencies We Fix ── */}
      <div style={section}>
        <h2 style={h2Style}>Emergencies We Fix</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.cardHeading} onChange={e => set('cardHeading', e.target.value)} />
        <label style={labelStyle}>Items (one per line)</label>
        <textarea style={{ ...s, minHeight: '120px' }} value={form.cardItems} onChange={e => set('cardItems', e.target.value)} />
      </div>

      {/* ── We're Almost Everywhere ── */}
      <div style={section}>
        <h2 style={h2Style}>We&rsquo;re Almost Everywhere</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.mapHeading} onChange={e => set('mapHeading', e.target.value)} />
        <label style={labelStyle}>Body</label>
        <textarea style={{ ...s, minHeight: '80px' }} value={form.mapBody} onChange={e => set('mapBody', e.target.value)} />
      </div>

      {/* ── We Hate Emergencies Too ── */}
      <div style={section}>
        <h2 style={h2Style}>We Hate Emergencies Too</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.f2Heading} onChange={e => set('f2Heading', e.target.value)} />
        <label style={labelStyle}>Body</label>
        <textarea style={{ ...s, minHeight: '80px' }} value={form.f2Body} onChange={e => set('f2Body', e.target.value)} />
        <ImageField label="Section Image" value={form.f2Image} onChange={v => set('f2Image', v)} labelStyle={labelStyle} inputStyle={s} />
      </div>

      {/* ── Final Pitch ── */}
      <div style={section}>
        <h2 style={h2Style}>Final Pitch</h2>
        <label style={labelStyle}>Heading</label>
        <input style={s} value={form.f3Heading} onChange={e => set('f3Heading', e.target.value)} />
        <label style={labelStyle}>Body</label>
        <textarea style={{ ...s, minHeight: '80px' }} value={form.f3Body} onChange={e => set('f3Body', e.target.value)} />
        <ImageField label="Section Image" value={form.f3Image} onChange={v => set('f3Image', v)} labelStyle={labelStyle} inputStyle={s} />
      </div>

      <MetaSection
        metaTitle={form.metaTitle}
        metaDescription={form.metaDescription}
        onMetaTitleChange={v => set('metaTitle', v)}
        onMetaDescriptionChange={v => set('metaDescription', v)}
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
        title="Emergency Plumbing"
        status="published"
        template={{ value: 'emergency-plumbing', label: 'Emergency Plumbing', options: [{ value: 'emergency-plumbing', label: 'Emergency Plumbing' }] }}
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
        slug={{ value: 'emergency-plumbing', editable: false, disabledNote: "This is a fixed system page — its URL can't be changed.", permalink: `${SITE.baseUrl}/emergency-plumbing` }}
        parent={{ label: 'None', editable: false }}
        open={attrsOpen}
        onClose={() => setAttrsOpen(false)}
      />
    </div>
  );
}
