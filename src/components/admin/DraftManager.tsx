'use client';

import { useState, useEffect, useCallback } from 'react';
import { ADMIN_COLORS } from '@/lib/admin/theme';

interface DraftRow {
  id: number;
  label: string;
  creator_name: string;
  created_by: number;
  created_at: string;
  published_at: string | null;
}

interface Props {
  pageType: string;
  pageSlug: string;
  getContent: () => unknown;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DraftManager({ pageType, pageSlug, getContent }: Props) {
  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLabelForm, setShowLabelForm] = useState(false);
  const [labelInput, setLabelInput] = useState('');
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };
  const showError = (msg: string) => {
    setToastError(msg);
    setTimeout(() => setToastError(''), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/cms/drafts?pageType=${encodeURIComponent(pageType)}&pageSlug=${encodeURIComponent(pageSlug)}`);
      if (!res.ok) throw new Error('Failed to load');
      setDrafts(await res.json());
    } catch {
      // silently fail — drafts are supplementary
    } finally {
      setLoading(false);
    }
  }, [pageType, pageSlug]);

  useEffect(() => {
    load();
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.userId) setCurrentUserId(data.userId); })
      .catch(() => {});
  }, [load]);

  async function handleSaveDraft() {
    const label = labelInput.trim();
    if (!label) return;
    setSaving(true);
    try {
      const res = await fetch('/api/cms/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType, pageSlug, label, content: getContent() }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Failed to create draft');
      }
      setLabelInput('');
      setShowLabelForm(false);
      await load();
      showToast('Draft saved.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create draft');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish(draft: DraftRow) {
    if (!confirm(`Publish "${draft.label}"? This will update the live page.`)) return;
    try {
      const res = await fetch(`/api/cms/drafts/${draft.id}/publish`, { method: 'POST' });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? 'Failed to publish');
      }
      await load();
      showToast('Published successfully.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Publish failed');
    }
  }

  async function handleDelete(draft: DraftRow) {
    if (!confirm(`Delete "${draft.label}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/cms/drafts/${draft.id}`, { method: 'DELETE' });
      if (res.status === 403) {
        showError('You can only delete your own drafts.');
        return;
      }
      if (!res.ok) throw new Error('Failed to delete');
      await load();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  function handlePreview(draft: DraftRow) {
    window.open(`/api/preview?draftId=${draft.id}`, '_blank');
  }

  const container: React.CSSProperties = {
    marginTop: '3rem',
    paddingTop: '2rem',
    borderTop: `2px solid ${ADMIN_COLORS.outlineVariant}44`,
    fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  };
  const heading: React.CSSProperties = {
    fontFamily: 'var(--font-outfit), system-ui, sans-serif',
    fontWeight: 700,
    fontSize: '1.1rem',
    color: ADMIN_COLORS.onSurface,
    marginBottom: '1rem',
  };
  const btnBase: React.CSSProperties = {
    border: 'none',
    borderRadius: '9999px',
    fontWeight: 600,
    fontSize: '0.8rem',
    padding: '0.3rem 0.75rem',
    cursor: 'pointer',
  };
  const btnCerulean: React.CSSProperties = { ...btnBase, background: ADMIN_COLORS.cerulean, color: '#fff' };
  const btnError: React.CSSProperties = { ...btnBase, background: ADMIN_COLORS.error, color: ADMIN_COLORS.onError };
  const btnGray: React.CSSProperties = { ...btnBase, background: ADMIN_COLORS.surfaceContainer, color: ADMIN_COLORS.onSurface, border: `1px solid ${ADMIN_COLORS.outlineVariant}66` };
  // Publish is a meaningful per-row action, but with one button per draft row it must
  // not use the solid Cerulean fill (that's reserved for the single page-level primary
  // CTA — "+ Save as New Draft" above). Use the tinted-accent treatment from the
  // reference implementation (admin/users.tsx's active-state badge) instead.
  const btnPublish: React.CSSProperties = { ...btnBase, background: `${ADMIN_COLORS.cerulean}1A`, color: ADMIN_COLORS.cerulean, border: `1px solid ${ADMIN_COLORS.cerulean}33` };

  return (
    <div style={container}>
      <h2 style={heading}>Drafts</h2>

      {toast && (
        <div style={{ background: `${ADMIN_COLORS.success}22`, border: `1px solid ${ADMIN_COLORS.success}66`, borderRadius: '0.5rem', padding: '0.5rem 1rem', marginBottom: '1rem', color: ADMIN_COLORS.success, fontSize: '0.875rem', fontWeight: 600 }}>
          {toast}
        </div>
      )}
      {toastError && (
        <div style={{ background: `${ADMIN_COLORS.error}22`, border: `1px solid ${ADMIN_COLORS.error}66`, borderRadius: '0.5rem', padding: '0.5rem 1rem', marginBottom: '1rem', color: ADMIN_COLORS.error, fontSize: '0.875rem', fontWeight: 600 }}>
          {toastError}
        </div>
      )}

      {!showLabelForm ? (
        <button style={btnCerulean} onClick={() => setShowLabelForm(true)}>
          + Save as New Draft
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <input
            autoFocus
            value={labelInput}
            onChange={e => setLabelInput(e.target.value.slice(0, 60))}
            placeholder='Draft label, e.g. "June refresh"'
            maxLength={60}
            style={{ padding: '0.35rem 0.6rem', background: ADMIN_COLORS.surfaceContainerLow, border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem', color: ADMIN_COLORS.onSurface, fontSize: '0.875rem', minWidth: '220px' }}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSaveDraft();
              if (e.key === 'Escape') { setShowLabelForm(false); setLabelInput(''); }
            }}
          />
          <button style={btnCerulean} onClick={handleSaveDraft} disabled={saving || !labelInput.trim()}>
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button style={btnGray} onClick={() => { setShowLabelForm(false); setLabelInput(''); }}>
            Cancel
          </button>
          <span style={{ fontSize: '0.75rem', color: ADMIN_COLORS.onSurfaceVariant }}>{labelInput.length}/60</span>
        </div>
      )}

      {loading ? (
        <p style={{ color: ADMIN_COLORS.onSurfaceVariant, fontSize: '0.875rem', marginTop: '1rem' }}>Loading drafts…</p>
      ) : drafts.length === 0 ? (
        <p style={{ color: ADMIN_COLORS.onSurfaceVariant, fontSize: '0.875rem', marginTop: '1rem' }}>No drafts yet.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}44`, color: `${ADMIN_COLORS.onSurfaceVariant}66`, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '10px' }}>
              <th style={{ textAlign: 'left', padding: '0.4rem 0.5rem' }}>Label</th>
              <th style={{ textAlign: 'left', padding: '0.4rem 0.5rem' }}>Author</th>
              <th style={{ textAlign: 'left', padding: '0.4rem 0.5rem' }}>Created</th>
              <th style={{ textAlign: 'left', padding: '0.4rem 0.5rem' }}>Status</th>
              <th style={{ textAlign: 'right', padding: '0.4rem 0.5rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map(draft => (
              <tr key={draft.id} style={{ borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}22` }}>
                <td style={{ padding: '0.5rem', fontSize: '14px', fontWeight: 600, color: ADMIN_COLORS.onSurface }}>{draft.label}</td>
                <td style={{ padding: '0.5rem', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>{draft.creator_name}</td>
                <td style={{ padding: '0.5rem', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>{formatDate(draft.created_at)}</td>
                <td style={{ padding: '0.5rem' }}>
                  {draft.published_at ? (
                    <span style={{ color: ADMIN_COLORS.success, fontWeight: 600, fontSize: '0.8rem' }}>Published</span>
                  ) : (
                    <span style={{ color: ADMIN_COLORS.warning, fontWeight: 600, fontSize: '0.8rem' }}>Draft</span>
                  )}
                </td>
                <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button style={btnGray} onClick={() => handlePreview(draft)}>Preview</button>
                    <button style={btnPublish} onClick={() => handlePublish(draft)}>Publish</button>
                    {currentUserId !== null && draft.created_by === currentUserId && (
                      <button style={btnError} onClick={() => handleDelete(draft)}>Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
