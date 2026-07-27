'use client';

/**
 * Shared media-upload field.
 *
 * Brief 89 (A3) extracted this from the sub-service editor so every editor's
 * image control shared ONE layout. Brief 112 (Track C) rebuilds it into a
 * WordPress-style tabbed picker: the field shows a preview + a "Select media"
 * button; clicking opens a modal with three tabs —
 *   • Upload new    — drag-and-drop or browse (now accepts video too)
 *   • Media Library — the shared MediaLibrary grid in select mode (choose existing)
 *   • From URL      — paste a URL (kept from the old uploader)
 *
 * BACKWARD COMPATIBILITY (hard rule): the public prop contract is UNCHANGED —
 * `{ value: string; onChange: (url: string) => void; label?: string }`. Every
 * existing call site (BlockField, articles, city, city-service, hiring, privacy,
 * service-category `[slug]`) keeps working: on any selection we fire
 * `onChange(url)` with the chosen file's URL exactly as before. The prop is still
 * named `value` and still a plain URL string, so images and videos both flow
 * through the same string channel their parents already persist.
 *
 * Self-contained: ships its own responsive CSS so it drops into any editor.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import { ACCEPT_ATTR } from '@/lib/cms/media-types';
import MediaLibrary, { type MediaItem } from '@/components/admin/MediaLibrary';

const FONT_BODY = 'var(--font-nunito), system-ui, sans-serif';
const FONT_HEAD = 'var(--font-outfit), system-ui, sans-serif';

const LABEL: React.CSSProperties = {
  display: 'block',
  fontFamily: FONT_BODY,
  fontSize: '13px',
  fontWeight: 600,
  color: ADMIN_COLORS.onSurface,
  marginBottom: '0.25rem',
};

function isVideoUrl(url: string): boolean {
  return /\.(mp4|mov|m4v|webm|ogv)(\?|#|$)/i.test(url);
}

export default function ImageUploaderField({
  value,
  onChange,
  label = 'Image',
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

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
            isVideoUrl(value) ? (
              /* eslint-disable-next-line jsx-a11y/media-has-caption */
              <video
                src={value}
                controls
                preload="metadata"
                style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '0.75rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, background: '#000' }}
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={value}
                alt="Selected media preview"
                style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '0.75rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}66` }}
              />
            )
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
                fontFamily: FONT_BODY,
                fontSize: '12px',
                textAlign: 'center',
                padding: '0.5rem',
              }}
            >
              No media selected
            </div>
          )}
        </div>

        {/* Right — open picker + remove */}
        <div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              borderRadius: '0.6rem',
              border: `1px solid ${ADMIN_COLORS.cerulean}`,
              background: `${ADMIN_COLORS.cerulean}1A`,
              color: ADMIN_COLORS.onSurface,
              fontFamily: FONT_HEAD,
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>photo_library</span>
            {value ? 'Change media' : 'Select media'}
          </button>

          {value && (
            <div>
              <button
                type="button"
                onClick={() => onChange('')}
                style={{
                  marginTop: '0.5rem',
                  background: 'none',
                  border: 'none',
                  color: ADMIN_COLORS.error,
                  fontFamily: FONT_BODY,
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'block',
                }}
              >
                Remove media
              </button>
            </div>
          )}
        </div>
      </div>

      {open && (
        <MediaModal
          currentUrl={value}
          onClose={() => setOpen(false)}
          onSelect={url => {
            onChange(url);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Tabbed modal ───────────────────────────────────────────────────────────

type Tab = 'upload' | 'library' | 'url';

function MediaModal({
  currentUrl,
  onClose,
  onSelect,
}: {
  currentUrl: string;
  onClose: () => void;
  onSelect: (url: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('upload');
  const [reloadToken, setReloadToken] = useState(0);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const tabBtn = (text: string, t: Tab) => (
    <button
      type="button"
      onClick={() => setTab(t)}
      style={{
        padding: '0.5rem 1rem',
        fontSize: '13px',
        fontFamily: FONT_HEAD,
        fontWeight: 700,
        border: 'none',
        borderBottom: tab === t ? `2px solid ${ADMIN_COLORS.cerulean}` : '2px solid transparent',
        background: 'transparent',
        color: tab === t ? ADMIN_COLORS.onSurface : ADMIN_COLORS.onSurfaceVariant,
        cursor: 'pointer',
      }}
    >
      {text}
    </button>
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: ADMIN_COLORS.surfaceContainerLow,
          borderRadius: '1.5rem',
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem 0' }}>
          <h2 style={{ margin: 0, fontFamily: FONT_HEAD, fontWeight: 700, fontSize: '1.2rem', color: ADMIN_COLORS.onSurface }}>
            Select media
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: ADMIN_COLORS.onSurfaceVariant, display: 'flex' }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1.5rem 0', borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}33` }}>
          {tabBtn('Upload new', 'upload')}
          {tabBtn('Media Library', 'library')}
          {tabBtn('From URL', 'url')}
        </div>

        {/* Body */}
        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto' }}>
          {tab === 'upload' && (
            <UploadTab
              onUploaded={url => onSelect(url)}
              onGoToLibrary={() => { setReloadToken(t => t + 1); setTab('library'); }}
            />
          )}
          {tab === 'library' && (
            <MediaLibrary mode="select" selectedUrl={currentUrl} reloadToken={reloadToken} onSelect={(m: MediaItem) => onSelect(m.url)} />
          )}
          {tab === 'url' && <UrlTab currentUrl={currentUrl} onUse={url => onSelect(url)} />}
        </div>
      </div>
    </div>
  );
}

// ─── Upload tab (drag-and-drop + browse) ──────────────────────────────────────

function UploadTab({ onUploaded, onGoToLibrary }: { onUploaded: (url: string) => void; onGoToLibrary: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/cms/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Upload failed');
      }
      const { url } = await res.json();
      onUploaded(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [onUploaded]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          minHeight: '220px',
          borderRadius: '1rem',
          border: `2px dashed ${dragOver ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.outlineVariant}66`}`,
          background: dragOver ? `${ADMIN_COLORS.cerulean}14` : ADMIN_COLORS.surfaceContainer,
          cursor: 'pointer',
          textAlign: 'center',
          padding: '1.5rem',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '42px', color: ADMIN_COLORS.onSurfaceVariant }}>
          cloud_upload
        </span>
        <p style={{ margin: 0, fontFamily: FONT_HEAD, fontWeight: 700, color: ADMIN_COLORS.onSurface }}>
          {uploading ? 'Uploading…' : 'Drag & drop, or click to browse'}
        </p>
        <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: '12px', color: ADMIN_COLORS.onSurfaceVariant }}>
          Images: JPEG, PNG, WebP (max 10 MB) · Videos: MP4, MOV, WebM (max 50 MB)
        </p>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTR}
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
      </div>

      {error && (
        <p style={{ marginTop: '0.6rem', fontSize: '13px', color: ADMIN_COLORS.error, fontFamily: FONT_BODY }}>
          {error}
        </p>
      )}

      <p style={{ marginTop: '0.75rem', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontFamily: FONT_BODY }}>
        Already uploaded?{' '}
        <button
          type="button"
          onClick={onGoToLibrary}
          style={{ background: 'none', border: 'none', color: ADMIN_COLORS.cerulean, fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: FONT_BODY, fontSize: '12px' }}
        >
          Choose from the Media Library
        </button>
        .
      </p>
    </div>
  );
}

// ─── From-URL tab ─────────────────────────────────────────────────────────────

function UrlTab({ currentUrl, onUse }: { currentUrl: string; onUse: (url: string) => void }) {
  const [url, setUrl] = useState(currentUrl && /^https?:\/\//i.test(currentUrl) ? currentUrl : '');

  return (
    <div style={{ maxWidth: '520px' }}>
      <label style={{ ...LABEL, fontSize: '12px' }}>Paste an image or video URL</label>
      <input
        type="url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://…"
        style={{
          display: 'block',
          width: '100%',
          padding: '0.55rem 0.75rem',
          borderRadius: '0.6rem',
          border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
          background: ADMIN_COLORS.surfaceContainer,
          color: ADMIN_COLORS.onSurface,
          fontFamily: FONT_BODY,
          fontSize: '0.9rem',
          boxSizing: 'border-box',
        }}
      />
      <p style={{ marginTop: '0.4rem', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontFamily: FONT_BODY }}>
        External URLs are used as-is and are not added to the Media Library.
      </p>
      <button
        type="button"
        onClick={() => url.trim() && onUse(url.trim())}
        disabled={!url.trim()}
        style={{
          marginTop: '0.75rem',
          padding: '0.5rem 1.25rem',
          borderRadius: '9999px',
          border: 'none',
          background: ADMIN_COLORS.cerulean,
          color: '#fff',
          fontFamily: FONT_HEAD,
          fontWeight: 700,
          fontSize: '13px',
          cursor: url.trim() ? 'pointer' : 'not-allowed',
          opacity: url.trim() ? 1 : 0.6,
        }}
      >
        Use this URL
      </button>
    </div>
  );
}
