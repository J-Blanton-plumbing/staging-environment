'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { usePopoverPlacement } from './usePopoverPlacement';

/**
 * Brief 159 (Track C3) — the sidebar's Status row.
 *
 * WHAT IT DESCRIBES. The status of the VERSION CURRENTLY OPEN IN THE EDITOR —
 * "Published" only for the version whose content is live, "Draft" for every
 * other. Before this brief it rendered the literal string "Published" on 13 of
 * the 15 editors (Brief 85 §4), which is the direct cause of items 2, 3 and 5 of
 * the marketing report: every version of every page claimed to be published, and
 * there was no way to make one a draft. It now never renders a literal that was
 * not read from data.
 *
 * WHAT IT DOES. It is also the control that publishes. Setting the open version
 * to Published copies its content live and drops every sibling to Draft, in one
 * transaction. Setting the LIVE version back to Draft unpublishes the page —
 * routed through the typed-slug modal and every Track E guardrail. There is one
 * control for this field and one source of truth behind it; a second switch is
 * how the reported class of bug comes back.
 *
 * WHAT IT DOES NOT DO. Published → Draft is INERT on a version that is not live:
 * that version is already a Draft, so the option is disabled rather than shown
 * as a control that does nothing. And the option list stays Draft / Published —
 * no "Pending", no "Private", and no disabled "Scheduled" implying a feature
 * that does not exist (Brief 85 §5).
 */
export interface StatusPopoverProps {
  /** Derived from the open version's `is_published` — never a hard-coded literal. */
  value: 'draft' | 'published';
  /**
   * Called with the editor's choice. The parent runs the confirmation (publish)
   * or opens the typed-slug modal (unpublish) — both need the page's URL, which
   * this component does not own.
   */
  onChange: (newStatus: 'draft' | 'published') => Promise<void> | void;
  busy?: boolean;
  /** No version open (a page with no versions yet) — nothing to describe. */
  disabled?: boolean;
  /** Label of the version this row is describing, shown for the avoidance of doubt. */
  versionLabel?: string;
  /**
   * True when this page can never be unpublished — the home page, a top-level
   * service category, or the destination of a live 301 (Brief 159, E2 items 2–3).
   * Server-enforced regardless; this only stops the editor reaching a refusal.
   */
  unpublishBlocked?: boolean;
  /** Why it is blocked, shown under the Draft option. */
  unpublishBlockedReason?: string;
}

const WIDTH = 250;

function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function StatusPopover({
  value,
  onChange,
  busy,
  disabled,
  versionLabel,
  unpublishBlocked,
  unpublishBlockedReason,
}: StatusPopoverProps) {
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

  // Draft is only a REAL transition from the live version — on any other version
  // it is already the current value, so selecting it would change nothing.
  const draftInert = value === 'draft';
  const draftDisabled = draftInert || !!unpublishBlocked;

  const OPTIONS: Array<{
    value: 'draft' | 'published';
    label: string;
    description: string;
    disabled: boolean;
  }> = [
    {
      value: 'draft',
      label: 'Draft',
      description: draftInert
        ? 'This version is not live. It is already a draft.'
        : unpublishBlocked
          ? unpublishBlockedReason ?? 'This page cannot be unpublished.'
          : 'Takes this page off the site — the URL will return 404.',
      disabled: draftDisabled,
    },
    {
      value: 'published',
      label: 'Published',
      description:
        value === 'published'
          ? 'This version’s content is what the public sees.'
          : 'Put this version live. Every other version becomes a Draft.',
      disabled: value === 'published',
    },
  ];

  async function select(next: 'draft' | 'published') {
    if (next === value) { setOpen(false); return; }
    setOpen(false);
    await onChange(next);
  }

  const isPublished = value === 'published';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={busy || disabled}
        title={versionLabel ? `Status of “${versionLabel}”` : undefined}
        style={{
          background: 'none', border: 'none', padding: 0,
          // Published is the Cerulean "this is live" accent; Draft is muted so the
          // two are distinguishable at a glance without reading the word (C2).
          color: isPublished ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.onSurfaceVariant}cc`,
          fontFamily: fontBody, fontWeight: 600, fontSize: '13px',
          cursor: busy || disabled ? 'not-allowed' : 'pointer', opacity: busy || disabled ? 0.6 : 1,
        }}
      >
        {busy ? '…' : disabled ? 'No version yet' : statusLabel(value)}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
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

          {versionLabel && (
            <p style={{ margin: '0 0 0.5rem', fontFamily: fontBody, fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>
              of “{versionLabel}”
            </p>
          )}

          {OPTIONS.map(opt => (
            <label
              key={opt.value}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.35rem 0',
                cursor: opt.disabled ? 'not-allowed' : 'pointer',
                opacity: opt.disabled && value !== opt.value ? 0.5 : 1,
              }}
            >
              <input
                type="radio"
                name="page-status"
                checked={value === opt.value}
                disabled={opt.disabled}
                onChange={() => { if (!opt.disabled) select(opt.value); }}
                style={{ marginTop: '3px', accentColor: ADMIN_COLORS.cerulean }}
              />
              <span>
                <span style={{ display: 'block', fontFamily: fontBody, fontSize: '13px', fontWeight: 600, color: ADMIN_COLORS.onSurface }}>
                  {opt.label}
                </span>
                <span style={{ display: 'block', fontFamily: fontBody, fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, lineHeight: 1.4 }}>
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
