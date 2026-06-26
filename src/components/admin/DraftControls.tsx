'use client';

import { useRef, useState, useCallback } from 'react';

interface DraftOption {
  id: number;
  label: string;
  published_at: string | null;
}

interface Props {
  getContent: () => unknown;
  pageType: string;
  pageSlug: string;
}

export default function DraftControls({ getContent, pageType, pageSlug }: Props) {
  const activeDraftId = useRef<number | null>(null);
  const [activeDraftLabel, setActiveDraftLabel] = useState<string>('');
  const [drafts, setDrafts] = useState<DraftOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsLabel, setSaveAsLabel] = useState('');
  const [saveAsError, setSaveAsError] = useState('');
  const [notice, setNotice] = useState('');

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(''), 2500);
  }

  const fetchDrafts = useCallback(async (): Promise<DraftOption[]> => {
    try {
      const res = await fetch(
        `/api/cms/drafts?pageType=${encodeURIComponent(pageType)}&pageSlug=${encodeURIComponent(pageSlug)}`
      );
      const rows: DraftOption[] = res.ok ? await res.json() : [];
      setDrafts(rows);
      return rows;
    } catch {
      return [];
    }
  }, [pageType, pageSlug]);

  async function nextVersionName(): Promise<string> {
    const rows = await fetchDrafts();
    return `Version ${rows.length + 1}`;
  }

  async function createDraft(label: string): Promise<number> {
    const res = await fetch('/api/cms/drafts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageType, pageSlug, label, content: getContent() }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed to save');
    return json.id;
  }

  async function updateDraft(): Promise<void> {
    await fetch(`/api/cms/drafts/${activeDraftId.current}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: getContent() }),
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    setBusy(true);
    try {
      if (activeDraftId.current !== null) {
        await updateDraft();
        flash('Saved ✓');
      } else {
        const label = await nextVersionName();
        const id = await createDraft(label);
        activeDraftId.current = id;
        setActiveDraftLabel(label);
        await fetchDrafts();
        flash(`Saved as "${label}" ✓`);
      }
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  // ── Save as ───────────────────────────────────────────────────────────────
  async function openSaveAs() {
    setSaveAsLabel(await nextVersionName());
    setSaveAsError('');
    setSaveAsOpen(true);
  }

  async function handleSaveAsConfirm() {
    setBusy(true);
    setSaveAsError('');
    try {
      const id = await createDraft(saveAsLabel);
      activeDraftId.current = id;
      setActiveDraftLabel(saveAsLabel);
      await fetchDrafts();
      setSaveAsOpen(false);
      flash(`Saved as "${saveAsLabel}" ✓`);
    } catch (err) {
      setSaveAsError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  // ── Preview ───────────────────────────────────────────────────────────────
  async function handlePreview() {
    setBusy(true);
    try {
      if (activeDraftId.current === null) {
        const label = await nextVersionName();
        const id = await createDraft(label);
        activeDraftId.current = id;
        setActiveDraftLabel(label);
        await fetchDrafts();
        flash(`Saved as "${label}" ✓`);
      } else {
        await updateDraft();
      }
      window.open(`/api/preview?draftId=${activeDraftId.current}`, 'jbp-preview');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setBusy(false);
    }
  }

  // ── Version picker ────────────────────────────────────────────────────────
  async function handleVersionChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = parseInt(e.target.value, 10);
    if (isNaN(id)) return;
    const draft = drafts.find(d => d.id === id);
    if (!draft) return;
    activeDraftId.current = id;
    setActiveDraftLabel(draft.label);
    flash(`Switched to "${draft.label}"`);
  }

  async function handleVersionPickerFocus() {
    if (drafts.length === 0) await fetchDrafts();
  }

  // ── Styles ────────────────────────────────────────────────────────────────
  const ghostBtn: React.CSSProperties = {
    background: 'rgba(249,243,236,0.12)',
    border: '1px solid rgba(249,243,236,0.25)',
    color: '#F9F3EC',
    borderRadius: '4px',
    padding: '0.3rem 0.75rem',
    fontFamily: 'Nunito, sans-serif',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: busy ? 'not-allowed' : 'pointer',
    whiteSpace: 'nowrap' as const,
    opacity: busy ? 0.6 : 1,
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Version picker / indicator */}
        <div style={{ position: 'relative' }}>
          <select
            value={activeDraftId.current ?? ''}
            onChange={handleVersionChange}
            onFocus={handleVersionPickerFocus}
            style={{
              background: 'rgba(249,243,236,0.08)',
              border: '1px solid rgba(249,243,236,0.25)',
              color: activeDraftLabel ? '#F9F3EC' : 'rgba(249,243,236,0.45)',
              borderRadius: '4px',
              padding: '0.28rem 1.6rem 0.28rem 0.6rem',
              fontFamily: 'Nunito, sans-serif',
              fontSize: '0.78rem',
              fontWeight: 500,
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              maxWidth: '160px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {!activeDraftLabel && (
              <option value="" disabled style={{ background: '#0A1B2E', color: 'rgba(249,243,236,0.5)' }}>
                No draft saved
              </option>
            )}
            {drafts.map(d => (
              <option key={d.id} value={d.id} style={{ background: '#0A1B2E', color: '#F9F3EC' }}>
                {d.label}{d.published_at ? ' ✓' : ''}
              </option>
            ))}
            {activeDraftLabel && !drafts.find(d => d.id === activeDraftId.current) && (
              <option value={activeDraftId.current ?? ''} style={{ background: '#0A1B2E', color: '#F9F3EC' }}>
                {activeDraftLabel}
              </option>
            )}
          </select>
          {/* chevron icon */}
          <span style={{
            position: 'absolute', right: '0.4rem', top: '50%', transform: 'translateY(-50%)',
            pointerEvents: 'none', color: 'rgba(249,243,236,0.5)', fontSize: '0.6rem',
          }}>▾</span>
        </div>

        {/* Divider */}
        <span style={{ width: '1px', height: '18px', background: 'rgba(249,243,236,0.2)', flexShrink: 0 }} />

        {notice && (
          <span style={{ color: '#86efac', fontSize: '0.78rem', fontFamily: 'Nunito, sans-serif', whiteSpace: 'nowrap' }}>
            {notice}
          </span>
        )}

        <button onClick={handleSave} disabled={busy} style={ghostBtn}>Save</button>
        <button onClick={openSaveAs} disabled={busy} style={ghostBtn}>Save as</button>
        <button onClick={handlePreview} disabled={busy} style={{ ...ghostBtn, opacity: busy ? 0.6 : 1 }}>
          {busy ? 'Saving…' : 'Preview'}
        </button>
      </div>

      {/* ── Save as dialog ─────────────────────────────────────────────────── */}
      {saveAsOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => { if (!busy) setSaveAsOpen(false); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '8px', padding: '1.5rem',
              width: '100%', maxWidth: '400px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 0.75rem', fontFamily: 'Industry, sans-serif', fontSize: '16px', color: '#0A1B2E' }}>
              Save as new version
            </h3>
            <label style={{ display: 'block', fontSize: '13px', color: '#0A1B2E', marginBottom: '0.25rem', fontFamily: 'Nunito, sans-serif' }}>
              Version name:
            </label>
            <input
              autoFocus
              type="text"
              value={saveAsLabel}
              onChange={e => setSaveAsLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && saveAsLabel.trim()) handleSaveAsConfirm(); }}
              style={{
                display: 'block', width: '100%', padding: '0.4rem 0.5rem',
                border: '1px solid #d1d5db', borderRadius: '4px',
                fontFamily: 'inherit', fontSize: '0.9rem',
                boxSizing: 'border-box', marginBottom: '0.75rem',
              }}
            />
            {saveAsError && (
              <p style={{ color: '#BC0E0E', fontSize: '0.8rem', margin: '0 0 0.75rem' }}>{saveAsError}</p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSaveAsOpen(false)}
                disabled={busy}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0A1B2E', fontSize: '13px', fontFamily: 'Nunito, sans-serif', padding: '0.4rem 0.75rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsConfirm}
                disabled={busy || !saveAsLabel.trim()}
                style={{
                  background: '#BC0E0E', border: 'none', borderRadius: '4px',
                  padding: '0.4rem 1rem', color: '#F9F3EC',
                  fontFamily: 'Industry, sans-serif', fontWeight: 600, fontSize: '13px',
                  cursor: busy || !saveAsLabel.trim() ? 'not-allowed' : 'pointer',
                  opacity: busy || !saveAsLabel.trim() ? 0.7 : 1,
                }}
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
