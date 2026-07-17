'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { usePopoverPlacement } from './usePopoverPlacement';

export interface SlugPopoverProps {
  slug: string;
  /** True only when the editor this sidebar is mounted in already has a working slug-save path. */
  editable: boolean;
  /** Shown instead of an editable input when `editable` is false. */
  disabledNote?: string;
  /** Full public URL shown as the "Permalink" line. */
  permalink: string;
  onSave?: (newSlug: string) => Promise<void> | void;
}

const WIDTH = 260;

export default function SlugPopover({ slug, editable, disabledNote, permalink, onSave }: SlugPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(slug);
  const [saving, setSaving] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const placement = usePopoverPlacement(open, triggerRef, WIDTH);

  useEffect(() => { setDraft(slug); }, [slug]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleSave() {
    if (!onSave || draft === slug) { setOpen(false); return; }
    setSaving(true);
    try {
      await onSave(draft);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  const fontBody = 'var(--font-nunito), system-ui, sans-serif';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          color: ADMIN_COLORS.cerulean,
          fontFamily: fontBody,
          fontWeight: 600,
          fontSize: '13px',
          cursor: 'pointer',
          textAlign: 'right',
          wordBreak: 'break-all',
        }}
      >
        {slug || '—'}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top: placement.top,
            left: placement.left,
            zIndex: 9999,
            width: `${WIDTH}px`,
            background: ADMIN_COLORS.surfaceContainerLow,
            border: `1px solid ${ADMIN_COLORS.outlineVariant}44`,
            borderRadius: '0.75rem',
            boxShadow: ADMIN_SHADOWS.elegant,
            padding: '0.9rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 700, fontSize: '13px', color: ADMIN_COLORS.onSurface }}>
              Slug
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: ADMIN_COLORS.onSurfaceVariant, fontSize: '14px', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>

          {editable ? (
            <>
              <p style={{ fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontFamily: fontBody, margin: '0 0 0.5rem' }}>
                Customize the last part of the permalink.
              </p>
              <input
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                style={{
                  display: 'block', width: '100%', boxSizing: 'border-box',
                  padding: '0.4rem 0.55rem', marginBottom: '0.6rem',
                  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.4rem',
                  fontFamily: fontBody, fontSize: '13px', color: ADMIN_COLORS.onSurface,
                  background: ADMIN_COLORS.surface,
                }}
              />
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: ADMIN_COLORS.cerulean, color: '#fff', border: 'none',
                  borderRadius: '9999px', padding: '0.3rem 0.9rem', fontWeight: 700,
                  fontSize: '12px', cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1, fontFamily: fontBody, marginBottom: '0.6rem',
                }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <div style={{
                padding: '0.4rem 0.55rem', marginBottom: '0.6rem', background: `${ADMIN_COLORS.onSurfaceVariant}14`,
                border: `1px solid ${ADMIN_COLORS.outlineVariant}44`, borderRadius: '0.4rem',
                fontFamily: fontBody, fontSize: '13px', color: `${ADMIN_COLORS.onSurfaceVariant}cc`,
              }}>
                /{slug}
              </div>
              <p style={{ fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontFamily: fontBody, margin: '0 0 0.6rem' }}>
                {disabledNote ?? "This page's URL can't be changed."}
              </p>
            </>
          )}

          <div style={{ fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontFamily: fontBody, marginBottom: '0.2rem' }}>
            Permalink:
          </div>
          <a
            href={permalink}
            target="_blank"
            rel="noreferrer"
            style={{ color: ADMIN_COLORS.cerulean, fontSize: '12px', fontWeight: 600, fontFamily: fontBody, wordBreak: 'break-all' }}
          >
            {permalink}
          </a>
        </div>,
        document.body
      )}
    </>
  );
}
