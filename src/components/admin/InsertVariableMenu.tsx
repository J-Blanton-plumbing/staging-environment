'use client';

/**
 * "Insert variable" dropdown (Brief 77, Feature B).
 *
 * A brand-styled button that opens a list of the available Global Settings
 * tokens by friendly name ("Phone number", "No Drip Club price"). Selecting one
 * calls `onSelect(token)`; the consumer decides how to splice the token into its
 * field. Copywriters never type or memorize `{{...}}`.
 *
 * This is the shared dropdown UI. `RichTextField` uses it (inserting into the
 * HTML source / preview surface) and `InsertVariableButton` wraps it for plain
 * `<input>`/`<textarea>` heading fields.
 */

import { useEffect, useRef, useState } from 'react';
import { CMS_TOKENS, type CmsToken } from '@/lib/cms/tokens';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

export default function InsertVariableMenu({
  onSelect,
}: {
  onSelect: (token: CmsToken) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
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

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.3rem 0.7rem',
          fontSize: '12px',
          fontFamily: 'var(--font-nunito), system-ui, sans-serif',
          fontWeight: 700,
          border: `1px solid ${ADMIN_COLORS.cerulean}`,
          borderRadius: '9999px',
          background: open ? ADMIN_COLORS.cerulean : 'transparent',
          color: open ? '#fff' : ADMIN_COLORS.cerulean,
          cursor: 'pointer',
          lineHeight: 1.2,
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span aria-hidden="true" style={{ fontSize: '14px', fontWeight: 700 }}>
          {'{ }'}
        </span>
        Insert variable
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 20,
            minWidth: '240px',
            background: ADMIN_COLORS.surfaceContainerLow,
            border: `1px solid ${ADMIN_COLORS.outlineVariant}44`,
            borderRadius: '0.75rem',
            boxShadow: ADMIN_SHADOWS.elegant,
            overflow: 'hidden',
          }}
        >
          {CMS_TOKENS.map((t) => (
            <button
              key={t.token}
              type="button"
              role="menuitem"
              onClick={() => {
                onSelect(t);
                setOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '0.55rem 0.75rem',
                border: 'none',
                borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}22`,
                background: ADMIN_COLORS.surfaceContainerLow,
                cursor: 'pointer',
                fontFamily: 'var(--font-nunito), system-ui, sans-serif',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = ADMIN_COLORS.surfaceContainerHigh)}
              onMouseLeave={(e) => (e.currentTarget.style.background = ADMIN_COLORS.surfaceContainerLow)}
            >
              <span style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: ADMIN_COLORS.onSurface }}>
                {t.label}
              </span>
              <span style={{ display: 'block', fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, marginTop: '1px' }}>
                {t.hint} · <code style={{ color: ADMIN_COLORS.cerulean }}>{`{{${t.token}}}`}</code>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
