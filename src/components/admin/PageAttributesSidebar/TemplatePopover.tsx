'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { usePopoverPlacement } from './usePopoverPlacement';

export interface TemplateOption {
  value: string;
  label: string;
}

export interface TemplatePopoverProps {
  value: string;
  label: string;
  /** Every template this page type currently supports — not a hypothetical list. */
  options: TemplateOption[];
  /** Omit when this page type has no real template-switch pathway yet (single-option case). */
  onChange?: (newTemplate: string) => Promise<void> | void;
  busy?: boolean;
}

const WIDTH = 240;

export default function TemplatePopover({ value, label, options, onChange, busy }: TemplatePopoverProps) {
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

  async function select(next: string) {
    if (next === value) { setOpen(false); return; }
    if (onChange) await onChange(next);
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
        {busy ? '…' : label}
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
              Template
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

          {options.map(opt => (
            <label
              key={opt.value}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0',
                cursor: onChange ? 'pointer' : 'default',
              }}
            >
              <input
                type="radio"
                name="page-template"
                checked={value === opt.value}
                onChange={() => select(opt.value)}
                disabled={!onChange || busy}
                style={{ accentColor: ADMIN_COLORS.cerulean }}
              />
              <span style={{ fontFamily: fontBody, fontSize: '13px', fontWeight: 600, color: ADMIN_COLORS.onSurface }}>
                {opt.label}
              </span>
            </label>
          ))}

          {options.length <= 1 && (
            <p style={{ fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontFamily: fontBody, margin: '0.4rem 0 0' }}>
              No other templates exist for this page type yet.
            </p>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
