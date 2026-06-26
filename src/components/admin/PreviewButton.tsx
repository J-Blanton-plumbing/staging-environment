'use client';

import { useState, useRef } from 'react';

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

  async function handleClick() {
    // Already have an active draft — update it silently and open preview
    if (activeDraftId.current !== null) {
      setSaving(true);
      try {
        const content = getContent();
        await fetch(`/api/cms/drafts/${activeDraftId.current}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
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
          border: '1px solid rgba(249,243,236,0.6)',
          borderRadius: '4px',
          padding: '0.3rem 0.75rem',
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 600,
          fontSize: '0.8rem',
          cursor: saving ? 'not-allowed' : 'pointer',
          color: '#F9F3EC',
          whiteSpace: 'nowrap',
          opacity: saving ? 0.6 : 1,
        }}
        onMouseEnter={e => {
          if (!saving) (e.currentTarget as HTMLElement).style.background = 'rgba(249,243,236,0.1)';
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
              background: '#fff',
              borderRadius: '8px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 0.75rem', fontFamily: 'Industry, sans-serif', fontSize: '16px', color: '#0A1B2E' }}>
              Save preview as draft
            </h3>
            <label style={{ display: 'block', fontSize: '13px', color: '#0A1B2E', marginBottom: '0.25rem', fontFamily: 'Nunito, sans-serif' }}>
              Version name:
            </label>
            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              style={{
                display: 'block', width: '100%', padding: '0.4rem 0.5rem',
                border: '1px solid #d1d5db', borderRadius: '4px',
                fontFamily: 'inherit', fontSize: '0.9rem',
                boxSizing: 'border-box', marginBottom: '0.75rem',
              }}
            />
            {error && (
              <p style={{ color: '#BC0E0E', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#0A1B2E', fontSize: '13px', fontFamily: 'Nunito, sans-serif',
                  padding: '0.4rem 0.75rem',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={saving || !label.trim()}
                style={{
                  background: '#BC0E0E', border: 'none', borderRadius: '4px',
                  padding: '0.4rem 1rem', color: '#F9F3EC',
                  fontFamily: 'Industry, sans-serif', fontWeight: 600, fontSize: '13px',
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
