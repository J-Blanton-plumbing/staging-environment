'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

/**
 * Brief 159 (Track E, E2 item 1) — the confirmation for taking a page off the
 * site.
 *
 * Not "Are you sure?". Unpublishing is the highest-risk action in this CMS: the
 * site is mid-migration with an indexation recovery in progress (Briefs
 * 152/153), and a mis-click here 404s a URL Google already ranks. So this modal
 * does three things a plain confirm cannot:
 *
 *   1. names the exact URL and states the consequence in the words that matter
 *      ("will return 404", "removed from the sitemap", "Google may drop it");
 *   2. requires the editor to TYPE the slug, the same pattern as a destructive
 *      delete — a deliberate action cannot be produced by a stray Enter key;
 *   3. says plainly how to undo it, because an editor must never need a
 *      developer to reverse a mis-click (E3).
 *
 * It is a UX guardrail, not the enforcement point. Every refusal it describes is
 * also enforced server-side in `unpublishDraft`.
 */
export interface UnpublishConfirmModalProps {
  open: boolean;
  /** The public path that will start returning 404, e.g. `/columbus`. */
  path: string;
  /** Absolute URL shown in the warning copy. */
  url: string;
  /** What the editor must type to confirm — the page's slug. */
  confirmToken: string;
  /** Label of the version being taken back to Draft. */
  versionLabel: string;
  busy?: boolean;
  /** Server-side refusal (a 409 from the unpublish route), shown verbatim. */
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const fontHead = 'var(--font-outfit), system-ui, sans-serif';
const fontBody = 'var(--font-nunito), system-ui, sans-serif';

export default function UnpublishConfirmModal({
  open,
  path,
  url,
  confirmToken,
  versionLabel,
  busy,
  error,
  onCancel,
  onConfirm,
}: UnpublishConfirmModalProps) {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (open) setTyped('');
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open || typeof document === 'undefined') return null;

  const matches = typed.trim() === confirmToken;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Unpublish this page"
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${ADMIN_COLORS.surface}cc`, padding: '1rem',
      }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        style={{
          width: 'min(440px, 100%)', boxSizing: 'border-box',
          background: ADMIN_COLORS.surfaceContainerLow,
          border: `1px solid ${ADMIN_COLORS.error}44`,
          borderRadius: '1rem', boxShadow: ADMIN_SHADOWS.elegant, padding: '1.25rem',
        }}
      >
        <h2 style={{ margin: 0, fontFamily: fontHead, fontWeight: 700, fontSize: '15px', color: ADMIN_COLORS.error }}>
          Unpublish this page?
        </h2>

        <p style={{ fontFamily: fontBody, fontSize: '13px', lineHeight: 1.5, color: ADMIN_COLORS.onSurface, margin: '0.75rem 0' }}>
          Unpublishing will make <strong style={{ wordBreak: 'break-all' }}>{url}</strong> return{' '}
          <strong>404</strong> and remove it from the sitemap. Google may drop it from search results.
        </p>

        <p style={{ fontFamily: fontBody, fontSize: '12px', lineHeight: 1.5, color: `${ADMIN_COLORS.onSurfaceVariant}cc`, margin: '0 0 0.75rem' }}>
          “{versionLabel}” goes back to Draft. No other version is Published, so the page has no live
          content. You can bring it straight back at any time by setting a version to Published — the
          page returns 200 and rejoins the sitemap, unchanged.
        </p>

        <label
          htmlFor="jbp-unpublish-confirm"
          style={{ display: 'block', fontFamily: fontBody, fontSize: '12px', fontWeight: 700, color: ADMIN_COLORS.onSurface, marginBottom: '0.3rem' }}
        >
          Type <code style={{ background: `${ADMIN_COLORS.outlineVariant}33`, padding: '0 0.25rem', borderRadius: '0.25rem' }}>{confirmToken}</code> to confirm
        </label>
        <input
          id="jbp-unpublish-confirm"
          autoFocus
          autoComplete="off"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={confirmToken}
          style={{
            display: 'block', width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.6rem',
            border: `1px solid ${matches ? ADMIN_COLORS.error : `${ADMIN_COLORS.outlineVariant}66`}`,
            borderRadius: '0.5rem', fontFamily: fontBody, fontSize: '13px',
            background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface,
          }}
        />

        <p style={{ fontFamily: fontBody, fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: '0.4rem 0 0' }}>
          The path is <code>{path}</code>.
        </p>

        {error && (
          <p
            role="alert"
            style={{
              fontFamily: fontBody, fontSize: '12px', lineHeight: 1.45, color: ADMIN_COLORS.error,
              background: `${ADMIN_COLORS.error}12`, border: `1px solid ${ADMIN_COLORS.error}33`,
              borderRadius: '0.5rem', padding: '0.5rem 0.6rem', margin: '0.75rem 0 0',
            }}
          >
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1, padding: '0.45rem 0.75rem', borderRadius: '9999px', cursor: 'pointer',
              border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, background: ADMIN_COLORS.surfaceContainer,
              color: ADMIN_COLORS.onSurface, fontFamily: fontBody, fontWeight: 700, fontSize: '13px',
            }}
          >
            Keep it published
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!matches || busy}
            style={{
              flex: 1, padding: '0.45rem 0.75rem', borderRadius: '9999px',
              border: 'none', background: ADMIN_COLORS.error, color: ADMIN_COLORS.onError,
              fontFamily: fontBody, fontWeight: 700, fontSize: '13px',
              cursor: !matches || busy ? 'not-allowed' : 'pointer', opacity: !matches || busy ? 0.5 : 1,
            }}
          >
            {busy ? 'Unpublishing…' : 'Unpublish'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
