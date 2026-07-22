'use client';

/**
 * Shared image-upload field (Brief 89, A3).
 *
 * Extracted from the sub-service editor's `HeroImageField` (Brief 86, item 8) so
 * every editor's image control shares ONE layout instead of the four divergent
 * inline `ImageField`/`HeroImageField` copies that had grown across the admin
 * (service-category, city, city-service, articles, sub-service).
 *
 * Layout: preview (or a "No image selected" placeholder) on the left, Upload/URL
 * tabs on the right — stacked to a single column below 640px. The raw URL text is
 * not shown under the preview; "Remove image" sits under the Upload/URL box in the
 * right column and only renders when an image is set.
 *
 * Self-contained: it ships its own `.img-uploader-grid` responsive CSS so it can be
 * dropped into any editor without depending on that page's `<style>` block.
 */

import { useRef, useState } from 'react';
import { ADMIN_COLORS } from '@/lib/admin/theme';

const LABEL: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  fontSize: '13px',
  fontWeight: 600,
  color: ADMIN_COLORS.onSurface,
  marginBottom: '0.25rem',
};

const URL_INPUT: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: 0,
  border: 'none',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  fontSize: '0.9rem',
  color: ADMIN_COLORS.onSurface,
  background: 'transparent',
  boxSizing: 'border-box',
  boxShadow: 'none',
};

export default function ImageUploaderField({
  value,
  onChange,
  label = 'Image',
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

  const tabBtn = (text: string, t: 'upload' | 'url') => (
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
      {text}
    </button>
  );

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <style>{`
        .img-uploader-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; }
        @media (min-width: 640px) {
          .img-uploader-grid { grid-template-columns: minmax(160px, 240px) 1fr; gap: 1.25rem; align-items: start; }
        }
      `}</style>
      <label style={LABEL}>{label}</label>

      <div className="img-uploader-grid">
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
                type="url"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder="https://…"
                style={URL_INPUT}
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
