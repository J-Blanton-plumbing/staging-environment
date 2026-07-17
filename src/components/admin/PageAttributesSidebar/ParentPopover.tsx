'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { usePopoverPlacement } from './usePopoverPlacement';

export interface ParentOption {
  slug: string;
  title: string;
}

export interface ParentPopoverProps {
  /** Display label for the current parent, or "None". */
  label: string;
  /** True only when this page type has a real parent_slug relationship in the DB. */
  editable: boolean;
  value?: string | null;
  options?: ParentOption[];
  onChange?: (newParentSlug: string | null) => void;
}

const WIDTH = 240;

export default function ParentPopover({ label, editable, value, options, onChange }: ParentPopoverProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const placement = usePopoverPlacement(open, triggerRef, WIDTH);

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

  const fontBody = 'var(--font-nunito), system-ui, sans-serif';

  if (!editable) {
    return (
      <span style={{ color: `${ADMIN_COLORS.onSurfaceVariant}cc`, fontFamily: fontBody, fontWeight: 600, fontSize: '13px' }}>
        {label}
      </span>
    );
  }

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
        {label}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{
            position: 'fixed', top: placement.top, left: placement.left, zIndex: 9999, width: `${WIDTH}px`,
            background: ADMIN_COLORS.surfaceContainerLow,
            border: `1px solid ${ADMIN_COLORS.outlineVariant}44`,
            borderRadius: '0.75rem', boxShadow: ADMIN_SHADOWS.elegant, padding: '0.9rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 700, fontSize: '13px', color: ADMIN_COLORS.onSurface }}>
              Parent
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

          <select
            value={value ?? ''}
            onChange={e => { onChange?.(e.target.value || null); setOpen(false); }}
            style={{
              display: 'block', width: '100%', boxSizing: 'border-box', padding: '0.4rem 0.55rem',
              border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.4rem',
              fontFamily: fontBody, fontSize: '13px', color: ADMIN_COLORS.onSurface,
              background: ADMIN_COLORS.surface, cursor: 'pointer',
            }}
          >
            <option value="">None</option>
            {(options ?? []).map(o => (
              <option key={o.slug} value={o.slug}>{o.title}</option>
            ))}
          </select>
        </div>,
        document.body
      )}
    </>
  );
}
