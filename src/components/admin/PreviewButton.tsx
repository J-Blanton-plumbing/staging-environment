'use client';

import { useState, useRef } from 'react';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

export interface PreviewButtonProps {
  getContent: () => unknown;
  pageType: string;
  pageSlug: string;
  previewBaseUrl: string;
}

export default function PreviewButton({
  getContent,
  pageType,
  pageSlug,
}: PreviewButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const activeDraftId = useRef<number | null>(null);
  // Brief 75 (DP-1): track the draft version for optimistic-concurrency saves.
  const activeDraftVersion = useRef<number | null>(null);

  async function handleClick() {
    // Already have an active draft — update it and open preview only if it saved.
    if (activeDraftId.current !== null) {
      setSaving(true);
      setError('');
      try {
        const content = getContent();
        const res = await fetch(`/api/cms/drafts/${activeDraftId.current}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, version: activeDraftVersion.current ?? 0 }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          // Don't open a stale preview on a failed/conflicting save (DP-1).
          setError(res.status === 409
            ? (json.error ?? 'Someone else changed this draft. Reload before previewing.')
            : (json.error ?? 'Preview save failed'));
          return;
        }
        if (typeof json.version === 'number') activeDraftVersion.current = json.version;
        window.open(`/api/preview?draftId=${activeDraftId.current}`, 'jbp-preview');
      } finally {
        setSaving(false);
      }
      return;
    }

    // First time — fetch existing draft count for default version name, then show dialog
    try {
      const res = await fetch(
        `/api/cms/drafts?pageType=${encodeURIComponent(pageType)}&pageSlug=${encodeURIComponent(pageSlug)}`
      );
      const existing = res.ok ? await res.json() : [];
      setLabel(`Version ${Array.isArray(existing) ? existing.length + 1 : 1}`);
    } catch {
      setLabel('Version 1');
    }
    setError('');
    setDialogOpen(true);
  }

  async function handleConfirm() {
    setSaving(true);
    setError('');
    try {
      const content = getContent();
      const res = await fetch('/api/cms/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType, pageSlug, label, content, published: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Draft save failed');
      activeDraftId.current = json.id;
      activeDraftVersion.current = json.version ?? 0;
      setDialogOpen(false);
      window.open(`/api/preview?draftId=${json.id}`, 'jbp-preview');
    } catch (err: unknown) {
      setError(`Preview failed — ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={saving}
        style={{
          background: 'transparent',
          border: `1px solid ${ADMIN_COLORS.onSurfaceVariant}66`,
          borderRadius: '9999px',
          padding: '0.3rem 0.75rem',
          fontFamily: 'var(--font-nunito), system-ui, sans-serif',
          fontWeight: 600,
          fontSize: '0.8rem',
          cursor: saving ? 'not-allowed' : 'pointer',
          color: ADMIN_COLORS.onSurface,
          whiteSpace: 'nowrap',
          opacity: saving ? 0.6 : 1,
        }}
        onMouseEnter={e => {
          if (!saving) (e.currentTarget as HTMLElement).style.background = ADMIN_COLORS.surfaceContainerHigh;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        {saving ? 'Saving…' : 'Preview'}
      </button>

      {dialogOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => { if (!saving) setDialogOpen(false); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: ADMIN_COLORS.surfaceContainerLow,
              borderRadius: '1.5rem',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '400px',
              border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
              boxShadow: ADMIN_SHADOWS.elegant,
            }}
          >
            <h3 style={{ margin: '0 0 0.75rem', fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontSize: '16px', color: ADMIN_COLORS.onSurface }}>
              Save preview as draft
            </h3>
            <label style={{ display: 'block', fontSize: '13px', color: ADMIN_COLORS.onSurface, marginBottom: '0.25rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
              Version name:
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              style={{
                display: 'block', width: '100%', padding: '0.4rem 0.5rem',
                background: ADMIN_COLORS.surfaceContainerLowest,
                border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
                color: ADMIN_COLORS.onSurface,
                fontFamily: 'inherit', fontSize: '0.9rem',
                boxSizing: 'border-box', marginBottom: '0.75rem',
              }}
            />
            {error && (
              <p style={{ color: ADMIN_COLORS.error, fontSize: '0.8rem', margin: '0 0 0.75rem' }}>
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: ADMIN_COLORS.onSurfaceVariant, fontSize: '13px', fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                  padding: '0.4rem 0.75rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving || !label.trim()}
                style={{
                  background: ADMIN_COLORS.cerulean, border: 'none', borderRadius: '9999px',
                  padding: '0.4rem 1rem', color: '#fff',
                  fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 600, fontSize: '13px',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Confirm & Open Preview'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
