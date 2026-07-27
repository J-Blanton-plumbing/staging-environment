'use client';

/**
 * Brief 112 (Track D) — shared Media Library grid/browser.
 *
 * ONE component, two modes:
 *   • `select`  — used inside the uploader modal (Track C). Clicking a tile fires
 *                 `onSelect(media)`; the current value is highlighted. No details panel.
 *   • `manage`  — used on the standalone /admin/media page. Clicking a tile opens a
 *                 details panel with editable alt text / caption / display name and a
 *                 Delete button (with the delete-safety confirmation).
 *
 * Both modes share: a responsive thumbnail grid, a type filter (All / Images /
 * Videos), a filename/alt-text search box, and a video-icon overlay so videos are
 * distinguishable at a glance. Self-contained inline styles + ADMIN_COLORS so it
 * drops into either host without external CSS.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import { formatFileSize } from '@/lib/cms/media-types';

export interface MediaItem {
  id: number;
  filename: string;
  originalFilename: string;
  url: string;
  mimeType: string;
  mediaType: 'image' | 'video';
  fileSize: number;
  width: number | null;
  height: number | null;
  altText: string | null;
  caption: string | null;
  uploadedBy: number | null;
  uploadedByName: string | null;
  createdAt: string | null;
}

type TypeFilter = 'all' | 'image' | 'video';

const FONT_BODY = 'var(--font-nunito), system-ui, sans-serif';
const FONT_HEAD = 'var(--font-outfit), system-ui, sans-serif';
const PAGE_LIMIT = 60;

function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const inputStyle: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  border: `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
  borderRadius: '0.75rem',
  fontSize: '0.875rem',
  fontFamily: FONT_BODY,
  color: ADMIN_COLORS.onSurface,
  background: ADMIN_COLORS.surfaceContainer,
  boxSizing: 'border-box',
};

export default function MediaLibrary({
  mode,
  onSelect,
  selectedUrl,
  reloadToken = 0,
}: {
  mode: 'select' | 'manage';
  onSelect?: (media: MediaItem) => void;
  selectedUrl?: string;
  /** Bump to force a refetch (e.g. after an upload in the modal). */
  reloadToken?: number;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [type, setType] = useState<TypeFilter>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<'loading' | 'error' | 'done'>('loading');
  const [active, setActive] = useState<MediaItem | null>(null);

  // Debounce the search box so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (pageNum: number, replace: boolean) => {
      setStatus('loading');
      try {
        const qs = new URLSearchParams({
          type,
          search: debouncedSearch,
          page: String(pageNum),
          limit: String(PAGE_LIMIT),
        });
        const res = await fetch(`/api/cms/media?${qs.toString()}`);
        if (!res.ok) throw new Error('Failed to load media');
        const data = await res.json();
        const rows: MediaItem[] = Array.isArray(data.items) ? data.items : [];
        setItems(prev => (replace ? rows : [...prev, ...rows]));
        setTotal(data.total ?? rows.length);
        setHasMore(Boolean(data.hasMore));
        setStatus('done');
      } catch {
        setStatus('error');
      }
    },
    [type, debouncedSearch]
  );

  // Reset to page 1 whenever filters, search, or the reload signal change.
  useEffect(() => {
    setPage(1);
    fetchPage(1, true);
  }, [fetchPage, reloadToken]);

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchPage(next, false);
  }

  function handleTileClick(item: MediaItem) {
    if (mode === 'select') {
      onSelect?.(item);
    } else {
      setActive(item);
    }
  }

  // Called by the details panel after a successful edit/delete so the grid stays in sync.
  function applyUpdate(updated: MediaItem) {
    setItems(prev => prev.map(m => (m.id === updated.id ? updated : m)));
    setActive(updated);
  }
  function applyDelete(id: number) {
    setItems(prev => prev.filter(m => m.id !== id));
    setTotal(t => Math.max(0, t - 1));
    setActive(null);
  }

  const filterBtn = (label: string, val: TypeFilter) => (
    <button
      type="button"
      onClick={() => setType(val)}
      style={{
        padding: '0.4rem 0.9rem',
        fontSize: '13px',
        fontWeight: 700,
        fontFamily: FONT_BODY,
        border: `1px solid ${type === val ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.outlineVariant}4D`}`,
        borderRadius: '9999px',
        background: type === val ? `${ADMIN_COLORS.cerulean}22` : 'transparent',
        color: type === val ? ADMIN_COLORS.onSurface : ADMIN_COLORS.onSurfaceVariant,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <style>{`
        .medialib-layout { display: grid; grid-template-columns: 1fr; gap: 1.25rem; }
        .medialib-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.75rem;
        }
        @media (min-width: 900px) {
          .medialib-layout.has-panel { grid-template-columns: 1fr 320px; align-items: start; }
        }
        .medialib-tile:hover { border-color: ${ADMIN_COLORS.cerulean}99 !important; }
      `}</style>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center', marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="Search filename or alt text…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inputStyle, width: '260px', maxWidth: '100%' }}
        />
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {filterBtn('All', 'all')}
          {filterBtn('Images', 'image')}
          {filterBtn('Videos', 'video')}
        </div>
        <span style={{ fontSize: '13px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontFamily: FONT_BODY }}>
          {status === 'done' ? `${total} item${total === 1 ? '' : 's'}` : ' '}
        </span>
      </div>

      <div className={`medialib-layout ${mode === 'manage' && active ? 'has-panel' : ''}`}>
        {/* Grid */}
        <div>
          {status === 'error' && (
            <p style={{ color: ADMIN_COLORS.error, fontFamily: FONT_BODY }}>Failed to load media. Please refresh.</p>
          )}
          {status !== 'error' && items.length === 0 && status === 'done' && (
            <div
              style={{
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: ADMIN_COLORS.onSurfaceVariant,
                fontFamily: FONT_BODY,
                fontSize: '14px',
                border: `1px dashed ${ADMIN_COLORS.outlineVariant}4D`,
                borderRadius: '1rem',
              }}
            >
              No media found. Upload a file to get started.
            </div>
          )}

          {items.length > 0 && (
            <div className="medialib-grid">
              {items.map(item => (
                <MediaTile
                  key={item.id}
                  item={item}
                  selected={
                    mode === 'select'
                      ? selectedUrl === item.url
                      : active?.id === item.id
                  }
                  onClick={() => handleTileClick(item)}
                />
              ))}
            </div>
          )}

          {status === 'loading' && items.length === 0 && (
            <p style={{ color: ADMIN_COLORS.onSurfaceVariant, fontFamily: FONT_BODY, padding: '1rem 0' }}>Loading media…</p>
          )}

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={loadMore}
                disabled={status === 'loading'}
                style={{
                  padding: '0.5rem 1.25rem',
                  border: `1px solid ${ADMIN_COLORS.outlineVariant}4D`,
                  borderRadius: '9999px',
                  background: 'transparent',
                  color: ADMIN_COLORS.onSurface,
                  fontFamily: FONT_BODY,
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {status === 'loading' ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>

        {/* Details panel (manage mode only) */}
        {mode === 'manage' && active && (
          <MediaDetailsPanel
            key={active.id}
            item={active}
            onClose={() => setActive(null)}
            onUpdated={applyUpdate}
            onDeleted={applyDelete}
          />
        )}
      </div>
    </div>
  );
}

// ─── Tile ─────────────────────────────────────────────────────────────────────

function MediaTile({ item, selected, onClick }: { item: MediaItem; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="medialib-tile"
      title={item.originalFilename || item.filename}
      style={{
        position: 'relative',
        padding: 0,
        aspectRatio: '1 / 1',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        cursor: 'pointer',
        border: `2px solid ${selected ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.outlineVariant}33`}`,
        background: ADMIN_COLORS.surfaceContainerLow,
        transition: 'border-color 0.15s ease',
      }}
    >
      {item.mediaType === 'video' ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={item.url}
            preload="metadata"
            muted
            playsInline
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: ADMIN_COLORS.surfaceContainerLowest }}
          />
          <span
            className="material-symbols-outlined"
            aria-hidden
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '38px',
              color: '#fff',
              textShadow: '0 2px 8px rgba(0,0,0,0.6)',
              pointerEvents: 'none',
            }}
          >
            play_circle
          </span>
          <span
            className="material-symbols-outlined"
            aria-hidden
            style={{
              position: 'absolute', top: '6px', right: '6px', fontSize: '18px',
              color: '#fff', background: 'rgba(10,27,46,0.75)', borderRadius: '6px', padding: '2px',
            }}
          >
            movie
          </span>
        </>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={item.url}
          alt={item.altText || item.originalFilename || ''}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
    </button>
  );
}

// ─── Details panel ──────────────────────────────────────────────────────────

function MediaDetailsPanel({
  item,
  onClose,
  onUpdated,
  onDeleted,
}: {
  item: MediaItem;
  onClose: () => void;
  onUpdated: (m: MediaItem) => void;
  onDeleted: (id: number) => void;
}) {
  const [altText, setAltText] = useState(item.altText ?? '');
  const [caption, setCaption] = useState(item.caption ?? '');
  const [displayName, setDisplayName] = useState(item.originalFilename ?? '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const initial = useRef({ altText: item.altText ?? '', caption: item.caption ?? '', displayName: item.originalFilename ?? '' });

  const dirty =
    altText !== initial.current.altText ||
    caption !== initial.current.caption ||
    displayName !== initial.current.displayName;

  async function handleSave() {
    if (!displayName.trim()) {
      setMsg({ kind: 'err', text: 'Display name cannot be empty.' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/cms/media/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altText, caption, originalFilename: displayName.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Save failed');
      }
      const updated: MediaItem = await res.json();
      initial.current = { altText: updated.altText ?? '', caption: updated.caption ?? '', displayName: updated.originalFilename ?? '' };
      onUpdated(updated);
      setMsg({ kind: 'ok', text: 'Saved.' });
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setMsg(null);
    try {
      // First attempt — server returns 409 if the file is still referenced.
      let res = await fetch(`/api/cms/media/${item.id}`, { method: 'DELETE' });
      if (res.status === 409) {
        const j = await res.json().catch(() => ({}));
        const where = Array.isArray(j.usage) && j.usage.length ? `\n\nUsed in: ${j.usage.join(', ')}` : '';
        const ok = confirm(
          `"${item.originalFilename || item.filename}" is still used by ${j.count ?? 'one or more'} page${(j.count ?? 2) === 1 ? '' : 's'}.${where}\n\nDeleting it may break those pages. Delete anyway?`
        );
        if (!ok) {
          setDeleting(false);
          return;
        }
        res = await fetch(`/api/cms/media/${item.id}?force=1`, { method: 'DELETE' });
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Delete failed');
      }
      onDeleted(item.id);
    } catch (err) {
      setMsg({ kind: 'err', text: err instanceof Error ? err.message : 'Delete failed' });
      setDeleting(false);
    }
  }

  const label: React.CSSProperties = {
    display: 'block',
    fontFamily: FONT_BODY,
    fontSize: '12px',
    fontWeight: 700,
    color: ADMIN_COLORS.onSurfaceVariant,
    margin: '0.75rem 0 0.25rem',
  };
  const field: React.CSSProperties = { ...inputStyle, width: '100%', display: 'block' };
  const metaRow = (k: string, v: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '12px', fontFamily: FONT_BODY, padding: '2px 0' }}>
      <span style={{ color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>{k}</span>
      <span style={{ color: ADMIN_COLORS.onSurface, textAlign: 'right', wordBreak: 'break-word' }}>{v}</span>
    </div>
  );

  return (
    <aside
      style={{
        background: ADMIN_COLORS.surfaceContainerLow,
        border: `1px solid ${ADMIN_COLORS.outlineVariant}1A`,
        borderRadius: '1.25rem',
        padding: '1.25rem',
        position: 'sticky',
        top: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h2 style={{ fontFamily: FONT_HEAD, fontWeight: 700, fontSize: '1rem', color: ADMIN_COLORS.onSurface, margin: 0 }}>Details</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: ADMIN_COLORS.onSurfaceVariant, display: 'flex' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
        </button>
      </div>

      {/* Preview */}
      <div style={{ borderRadius: '0.75rem', overflow: 'hidden', border: `1px solid ${ADMIN_COLORS.outlineVariant}33`, marginBottom: '0.5rem', background: ADMIN_COLORS.surfaceContainerLowest }}>
        {item.mediaType === 'video' ? (
          /* eslint-disable-next-line jsx-a11y/media-has-caption */
          <video src={item.url} controls preload="metadata" style={{ width: '100%', display: 'block', maxHeight: '220px', background: '#000' }} />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={item.url} alt={item.altText || item.originalFilename || ''} style={{ width: '100%', display: 'block', maxHeight: '220px', objectFit: 'contain' }} />
        )}
      </div>

      {/* Read-only metadata */}
      <div style={{ borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}1A`, paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
        {metaRow('File', item.filename)}
        {metaRow('Type', item.mediaType === 'video' ? `Video (${item.mimeType})` : `Image (${item.mimeType})`)}
        {item.mediaType === 'image' && metaRow('Dimensions', item.width && item.height ? `${item.width} × ${item.height}` : '—')}
        {metaRow('Size', formatFileSize(item.fileSize))}
        {metaRow('Uploaded', formatDate(item.createdAt))}
        {metaRow('By', item.uploadedByName || '—')}
        <div style={{ marginTop: '0.35rem' }}>
          <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: ADMIN_COLORS.cerulean, fontFamily: FONT_BODY, fontWeight: 700, textDecoration: 'none' }}>
            Open original ↗
          </a>
        </div>
      </div>

      {/* Editable metadata */}
      <label style={label}>Alt text</label>
      <input value={altText} onChange={e => setAltText(e.target.value)} style={field} placeholder="Describe the image for accessibility" />

      <label style={label}>Caption</label>
      <textarea value={caption} onChange={e => setCaption(e.target.value)} style={{ ...field, minHeight: '54px', resize: 'vertical' }} placeholder="Optional caption" />

      <label style={label}>Display name</label>
      <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={field} />

      {msg && (
        <p style={{ margin: '0.6rem 0 0', fontSize: '12px', fontFamily: FONT_BODY, color: msg.kind === 'ok' ? ADMIN_COLORS.success : ADMIN_COLORS.error }}>
          {msg.text}
        </p>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          style={{
            padding: '0.45rem 0.9rem',
            borderRadius: '9999px',
            border: `1px solid ${ADMIN_COLORS.error}4D`,
            background: 'transparent',
            color: ADMIN_COLORS.error,
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: '13px',
            cursor: deleting ? 'not-allowed' : 'pointer',
            opacity: deleting ? 0.6 : 1,
          }}
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !dirty}
          style={{
            padding: '0.45rem 1.1rem',
            borderRadius: '9999px',
            border: 'none',
            background: ADMIN_COLORS.cerulean,
            color: '#fff',
            fontFamily: FONT_HEAD,
            fontWeight: 700,
            fontSize: '13px',
            cursor: saving || !dirty ? 'not-allowed' : 'pointer',
            opacity: saving || !dirty ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </aside>
  );
}
