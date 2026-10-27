'use client';

/**
 * Brief 220 — the "Live homepage" panel at the top of /admin/home: which homepage record visitors see
 * at jblantonplumbing.com, since when and by whom, and the two buttons that change it. The live one
 * is disabled; a record with no published version can't be made live (the server refuses too).
 * Switching takes effect on the next page load — no deploy — and is logged.
 */
import { useCallback, useEffect, useState } from 'react';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { BRAND } from '@/components/admin/sewer-v2/ui';

type Rec = 'classic' | 'home-2026';
interface State {
  active: Rec;
  renders: Rec;
  since: { at: string; by: string | null; from: Rec | null } | null;
  published: Record<Rec, { ok: boolean; label: string | null }>;
}
const LABEL: Record<Rec, string> = { classic: 'Classic homepage', 'home-2026': 'Homepage 2026' };
const ORDER: Rec[] = ['home-2026', 'classic'];

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function LiveHomepagePanel({ onChange }: { onChange?: (live: Rec) => void }) {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<Rec | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch('/api/cms/homepage-switch', { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
        return j as State;
      })
      .then((s) => {
        setState(s);
        onChange?.(s.active);
      })
      .catch((e: Error) => setError(e.message));
  }, [onChange]);
  useEffect(load, [load]);

  async function doSwitch(to: Rec) {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/cms/homepage-switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setState(j.state as State);
      onChange?.((j.state as State).active);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Switch failed.');
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const box: React.CSSProperties = {
    margin: '1.25rem 2rem 0',
    maxWidth: 1100,
    padding: '1.1rem 1.25rem',
    borderRadius: '1rem',
    background: ADMIN_COLORS.surfaceContainer,
    border: `1px solid ${ADMIN_COLORS.outlineVariant}55`,
    boxShadow: ADMIN_SHADOWS.xl,
    fontFamily: 'var(--font-nunito), system-ui, sans-serif',
    color: ADMIN_COLORS.onSurface,
  };

  return (
    <section style={box} aria-labelledby="live-homepage-title">
      <h2 id="live-homepage-title" style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: `${ADMIN_COLORS.onSurfaceVariant}dd` }}>
        Live homepage
      </h2>
      {!state && !error && <p style={{ margin: '0.5rem 0 0' }}>Loading…</p>}
      {state && (
        <>
          <p style={{ margin: '0.5rem 0 0.9rem', fontSize: 17 }} aria-live="polite">
            Live now: <strong>{LABEL[state.active]}</strong>
            {state.since ? (
              <>
                , since {fmt(state.since.at)}
                {state.since.by ? ` by ${state.since.by}` : ''}
              </>
            ) : (
              ' (the default; it has never been switched)'
            )}
          </p>
          {state.active !== state.renders && (
            <p style={{ margin: '0 0 0.9rem', color: BRAND.cream, background: `${BRAND.carmine}cc`, borderRadius: '0.5rem', padding: '0.4rem 0.7rem' }}>
              Homepage 2026 has no published version, so visitors see the Classic homepage.
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {ORDER.map((rec) => {
              const live = state.active === rec;
              const can = state.published[rec].ok;
              return (
                <div key={rec} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <button
                    type="button"
                    disabled={live || !can || busy}
                    onClick={() => setConfirm(rec)}
                    style={{
                      background: live || !can ? ADMIN_COLORS.surfaceContainerHigh : BRAND.cerulean,
                      color: live || !can ? `${ADMIN_COLORS.onSurfaceVariant}cc` : BRAND.cream,
                      border: 'none',
                      padding: '0.6rem 1.25rem',
                      borderRadius: '9999px',
                      fontWeight: 700,
                      cursor: live || !can || busy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {live ? `“${LABEL[rec]}” is live` : `Make “${LABEL[rec]}” live`}
                  </button>
                  {!can && !live && <span style={{ fontSize: 12, color: BRAND.carmine }}>No published version yet — publish one in its tab first.</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
      {error && <p style={{ margin: '0.75rem 0 0', color: ADMIN_COLORS.error }}>{error}</p>}

      {confirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="live-confirm-title" style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(10,27,46,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface, borderRadius: '1rem', padding: '1.5rem', maxWidth: 460, boxShadow: ADMIN_SHADOWS.xl }}>
            <h3 id="live-confirm-title" style={{ margin: '0 0 0.75rem', fontSize: 18 }}>
              Make “{LABEL[confirm]}” the live homepage?
            </h3>
            <p style={{ margin: '0 0 1.25rem', lineHeight: 1.5 }}>This changes what visitors see at jblantonplumbing.com right away. You can switch back at any time.</p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setConfirm(null)} disabled={busy} style={{ background: 'transparent', color: ADMIN_COLORS.onSurface, border: `1px solid ${ADMIN_COLORS.outlineVariant}`, padding: '0.55rem 1.1rem', borderRadius: '9999px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" autoFocus onClick={() => doSwitch(confirm)} disabled={busy} style={{ background: BRAND.carmine, color: BRAND.cream, border: 'none', padding: '0.55rem 1.1rem', borderRadius: '9999px', fontWeight: 700, cursor: 'pointer' }}>
                {busy ? 'Switching…' : `Yes, make it live`}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
