'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { DraftVersionRow } from './useDraftVersions';
import { usePopoverPlacement } from './usePopoverPlacement';
import { timeAgo } from '@/lib/admin/timeAgo';

const WIDTH = 280;

export interface VersionPopoverProps {
  activeId: number | null;
  activeLabel: string;
  versions: DraftVersionRow[];
  busy?: boolean;
  currentUserId: number | null;
  onSwitch: (id: number) => void;
  onPublish: (id: number) => void;
  onDelete: (id: number) => void;
  onSaveAsNew: (label: string) => void;
  nextVersionName: () => Promise<string>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Brief 159 (Track C2) — the per-version Draft/Published badge.
 *
 * Read from `is_published` and nothing else. Exactly one row in a page's list can
 * ever show Published (a partial unique index makes two structurally impossible),
 * which is the whole point: before this brief every version reported the same
 * hard-coded "Published" and the editor had no way to tell which one the public
 * was seeing.
 *
 * Cerulean for Published, muted Midnight for Draft — the admin theme's
 * `onSurfaceVariant` at reduced opacity, so the live version is the one thing
 * that stands out in the list.
 */
function VersionBadge({ published }: { published: boolean }) {
  const fontBody = 'var(--font-nunito), system-ui, sans-serif';
  return (
    <span
      style={{
        display: 'inline-block', borderRadius: '9999px', padding: '0.05rem 0.4rem',
        fontFamily: fontBody, fontSize: '10px', fontWeight: 700, letterSpacing: '0.03em',
        textTransform: 'uppercase', whiteSpace: 'nowrap',
        color: published ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.onSurfaceVariant}99`,
        background: published ? `${ADMIN_COLORS.cerulean}1F` : `${ADMIN_COLORS.outlineVariant}33`,
        border: `1px solid ${published ? `${ADMIN_COLORS.cerulean}55` : `${ADMIN_COLORS.outlineVariant}55`}`,
      }}
    >
      {published ? 'Published' : 'Draft'}
    </span>
  );
}

export default function VersionPopover({
  activeId,
  activeLabel,
  versions,
  busy,
  currentUserId,
  onSwitch,
  onPublish,
  onDelete,
  onSaveAsNew,
  nextVersionName,
}: VersionPopoverProps) {
  const [open, setOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const placement = usePopoverPlacement(open, triggerRef, WIDTH);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false); setNewOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setOpen(false); setNewOpen(false); }
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const fontBody = 'var(--font-nunito), system-ui, sans-serif';

  // Brief 159 (Track C4): the version whose content the public is seeing.
  // Derived from the SAME `versions` array the badges read, so the header line
  // and the badges can never disagree — they are one piece of state.
  const liveVersion = versions.find(v => v.is_published) ?? null;

  async function openNew() {
    setNewLabel(await nextVersionName());
    setNewOpen(true);
  }

  const miniBtn: React.CSSProperties = {
    border: 'none', borderRadius: '9999px', fontWeight: 600, fontSize: '11px',
    padding: '0.2rem 0.55rem', cursor: 'pointer', fontFamily: fontBody, whiteSpace: 'nowrap',
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', padding: 0, color: ADMIN_COLORS.cerulean,
          fontFamily: fontBody, fontWeight: 600, fontSize: '13px', cursor: 'pointer',
        }}
      >
        {activeLabel || 'No version yet'}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: placement.top, left: placement.left, zIndex: 9999, width: `${WIDTH}px`,
            maxHeight: '360px', overflowY: 'auto',
            background: ADMIN_COLORS.surfaceContainerLow,
            border: `1px solid ${ADMIN_COLORS.outlineVariant}44`,
            borderRadius: '0.75rem', boxShadow: ADMIN_SHADOWS.elegant, padding: '0.9rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 700, fontSize: '13px', color: ADMIN_COLORS.onSurface }}>
              Versions
            </span>
            <button
              type="button"
              onClick={() => { setOpen(false); setNewOpen(false); }}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: ADMIN_COLORS.onSurfaceVariant, fontSize: '14px', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {/*
            Brief 159 (Track C4) — say which version the public is seeing, in
            words, at the top of the list. The entire reported confusion was that
            the editor never stated what was live; one line closes it.
          */}
          <p
            style={{
              margin: '0 0 0.6rem', padding: '0.35rem 0.5rem', borderRadius: '0.5rem',
              fontFamily: fontBody, fontSize: '11.5px', lineHeight: 1.35,
              color: liveVersion ? ADMIN_COLORS.onSurface : ADMIN_COLORS.error,
              background: liveVersion ? `${ADMIN_COLORS.cerulean}14` : `${ADMIN_COLORS.error}12`,
              border: `1px solid ${liveVersion ? `${ADMIN_COLORS.cerulean}33` : `${ADMIN_COLORS.error}33`}`,
            }}
          >
            {liveVersion
              ? <>Live on the site: <strong>{liveVersion.label}</strong></>
              : <strong>This page is not live.</strong>}
          </p>

          {versions.length === 0 && (
            <p style={{ fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontFamily: fontBody, margin: '0 0 0.5rem' }}>
              No saved versions yet.
            </p>
          )}

          {versions.map(v => (
            <div
              key={v.id}
              onClick={() => { onSwitch(v.id); }}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.4rem 0.3rem',
                borderRadius: '0.5rem', cursor: 'pointer',
                background: v.id === activeId ? `${ADMIN_COLORS.cerulean}14` : 'transparent',
              }}
            >
              <input
                type="radio"
                name="page-version"
                checked={v.id === activeId}
                onChange={() => onSwitch(v.id)}
                style={{ marginTop: '3px', accentColor: ADMIN_COLORS.cerulean }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', fontFamily: fontBody, fontSize: '13px', fontWeight: 600, color: ADMIN_COLORS.onSurface }}>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.label}</span>
                  <VersionBadge published={v.is_published} />
                </span>
                <span style={{ display: 'block', fontFamily: fontBody, fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>
                  {timeAgo(v.created_at)} · {formatDate(v.created_at)} · {v.creator_name}
                </span>
                <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.3rem' }}>
                  {/* Publishing an already-live version would be a no-op that
                      looks like an action. Hide it rather than let it fire. */}
                  {!v.is_published && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onPublish(v.id); }}
                      style={{ ...miniBtn, background: `${ADMIN_COLORS.cerulean}1A`, color: ADMIN_COLORS.cerulean, border: `1px solid ${ADMIN_COLORS.cerulean}33` }}
                    >
                      Publish
                    </button>
                  )}
                  {/* Brief 159 (Track C2): deleting the live version would take
                      the page dark through the Delete button, bypassing every
                      Track E guardrail. Disabled here with the exact copy the
                      brief specifies; `deleteDraft` refuses server-side too. */}
                  {currentUserId !== null && v.created_by === currentUserId && (
                    <button
                      type="button"
                      disabled={v.is_published}
                      title={v.is_published ? 'This is the version currently live. Publish another version first.' : undefined}
                      onClick={e => {
                        e.stopPropagation();
                        if (v.is_published) return;
                        onDelete(v.id);
                      }}
                      style={{
                        ...miniBtn,
                        background: `${ADMIN_COLORS.error}1A`, color: ADMIN_COLORS.error,
                        border: `1px solid ${ADMIN_COLORS.error}33`,
                        cursor: v.is_published ? 'not-allowed' : 'pointer',
                        opacity: v.is_published ? 0.4 : 1,
                      }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div style={{ borderTop: `1px solid ${ADMIN_COLORS.outlineVariant}33`, marginTop: '0.5rem', paddingTop: '0.6rem' }}>
            {!newOpen ? (
              <button
                type="button"
                onClick={openNew}
                disabled={busy}
                style={{
                  width: '100%', background: ADMIN_COLORS.cerulean, color: '#fff', border: 'none',
                  borderRadius: '9999px', padding: '0.35rem 0.75rem', fontWeight: 700, fontSize: '12px',
                  cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1, fontFamily: fontBody,
                }}
              >
                + Save as new draft version
              </button>
            ) : (
              <div>
                <input
                  autoFocus
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value.slice(0, 60))}
                  onKeyDown={e => { if (e.key === 'Enter' && newLabel.trim()) { onSaveAsNew(newLabel.trim()); setNewOpen(false); } }}
                  style={{
                    display: 'block', width: '100%', boxSizing: 'border-box', padding: '0.35rem 0.5rem',
                    marginBottom: '0.4rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.4rem',
                    fontFamily: fontBody, fontSize: '13px', color: ADMIN_COLORS.onSurface, background: ADMIN_COLORS.surface,
                  }}
                />
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={() => { if (newLabel.trim()) { onSaveAsNew(newLabel.trim()); setNewOpen(false); } }}
                    disabled={busy || !newLabel.trim()}
                    style={{ ...miniBtn, flex: 1, background: ADMIN_COLORS.cerulean, color: '#fff', padding: '0.35rem 0.5rem', fontSize: '12px' }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewOpen(false)}
                    style={{ ...miniBtn, background: ADMIN_COLORS.surfaceContainer, color: ADMIN_COLORS.onSurface, border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, padding: '0.35rem 0.5rem', fontSize: '12px' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
