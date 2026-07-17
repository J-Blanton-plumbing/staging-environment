'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { usePopoverPlacement } from './usePopoverPlacement';

export interface StatusPopoverProps {
  value: string;
  onChange: (newStatus: 'draft' | 'published') => Promise<void> | void;
  busy?: boolean;
}

// Only Draft/Published are wired today — this page-status column has no "scheduled"
// concept yet. Add a `Scheduled` option here (and a real scheduled-publish job) when
// that feature is scoped; see PROJECT-STATUS.md.
const OPTIONS: { value: 'draft' | 'published'; label: string; description: string }[] = [
  { value: 'draft', label: 'Draft', description: 'Not ready to publish.' },
  { value: 'published', label: 'Published', description: 'Visible to everyone.' },
];

const WIDTH = 230;

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function StatusPopover({ value, onChange, busy }: StatusPopoverProps) {
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

  async function select(next: 'draft' | 'published') {
    if (next === value) { setOpen(false); return; }
    await onChange(next);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={busy}
        style={{
          background: 'none', border: 'none', padding: 0, color: ADMIN_COLORS.cerulean,
          fontFamily: fontBody, fontWeight: 600, fontSize: '13px',
          cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? '…' : statusLabel(value)}
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
              Status
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

          {OPTIONS.map(opt => (
            <label
              key={opt.value}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.35rem 0',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="page-status"
                checked={value === opt.value}
                onChange={() => select(opt.value)}
                style={{ marginTop: '3px', accentColor: ADMIN_COLORS.cerulean }}
              />
              <span>
                <span style={{ display: 'block', fontFamily: fontBody, fontSize: '13px', fontWeight: 600, color: ADMIN_COLORS.onSurface }}>
                  {opt.label}
                </span>
                <span style={{ display: 'block', fontFamily: fontBody, fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>
                  {opt.description}
                </span>
              </span>
            </label>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
