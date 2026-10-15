'use client';

/**
 * Brief 212 (Track D3) — "Restore this page" on a City Hub / City Service V2 page's pre-template
 * archive version. A Carmine confirm modal, then POST /api/cms/restore-archive. The archive version
 * itself is never published; the restore writes the archived columns back and records a new
 * "Restored pre-template archive (date)" version (src/lib/cms/restore-archive.ts).
 */
import { useState } from 'react';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import { BRAND } from '@/components/admin/sewer-v2/ui';

const FONT = 'var(--font-nunito), system-ui, sans-serif';
export const RESTORE_CONFIRM_TEXT =
  'This puts the page back exactly as it was before the new template, including its title and description. The new version is kept and can be published again.';

export default function RestoreArchiveButton({ draftId, onRestored }: { draftId: number; onRestored: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/cms/restore-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId, apply: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? `Restore failed (${res.status})`);
      setOpen(false);
      onRestored();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setBusy(false);
    }
  };
  const btn: React.CSSProperties = { fontFamily: FONT, fontWeight: 700, fontSize: '14px', borderRadius: '0.6rem', padding: '0.55rem 1rem', cursor: 'pointer', border: 'none' };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={{ ...btn, background: BRAND.carmine, color: BRAND.cream, marginBottom: '1rem' }}>
        Restore this page
      </button>
      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="restore-title" style={{ position: 'fixed', inset: 0, background: `${BRAND.midnight}cc`, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: ADMIN_COLORS.surfaceContainerLow, border: `2px solid ${BRAND.carmine}`, borderRadius: '1rem', padding: '1.5rem', maxWidth: 520, width: '100%', fontFamily: FONT, color: ADMIN_COLORS.onSurface }}>
            <h2 id="restore-title" style={{ margin: '0 0 0.75rem', fontSize: '18px', color: BRAND.cream }}>Restore this page?</h2>
            <p style={{ margin: '0 0 1.25rem', lineHeight: 1.5 }}>{RESTORE_CONFIRM_TEXT}</p>
            {error && <p style={{ margin: '0 0 1rem', color: BRAND.cream, background: `${BRAND.carmine}cc`, borderRadius: '0.4rem', padding: '0.4rem 0.6rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setOpen(false)} disabled={busy} style={{ ...btn, background: ADMIN_COLORS.surfaceContainerHigh, color: ADMIN_COLORS.onSurface }}>
                Cancel
              </button>
              <button type="button" onClick={run} disabled={busy} style={{ ...btn, background: BRAND.carmine, color: BRAND.cream }}>
                {busy ? 'Restoring…' : 'Restore this page'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
