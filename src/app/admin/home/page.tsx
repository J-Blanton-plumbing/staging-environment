'use client';

import { useEffect, useState } from 'react';
import LiveHomepagePanel from '@/components/admin/home/LiveHomepagePanel';
import ClassicHomeEditor from '@/components/admin/home/ClassicHomeEditor';
import Home2026Editor from '@/components/admin/home/Home2026Editor';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import { BRAND } from '@/components/admin/sewer-v2/ui';

/**
 * /admin/home — Brief 220: two homepage records and the switch between them.
 *
 *   • Live homepage panel — which record visitors see at `/`, and the one-click switch (both ways).
 *   • Tabs — "Homepage 2026" (main_pages row `home-2026`) and "Classic homepage" (row `home`, the
 *     Brief 219 editor, unchanged). Each has its own Status row, versions, preview and publish;
 *     Preview works for either record whatever is live. Only the open tab's editor is mounted.
 *
 * `?tab=home-2026` opens the Homepage 2026 tab (its preview banner links there); no parameter opens
 * the Classic tab, as /admin/home always did.
 */
type Tab = 'home-2026' | 'classic';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'home-2026', label: 'Homepage 2026' },
  { id: 'classic', label: 'Classic homepage' },
];

export default function HomeAdminPage() {
  const [tab, setTab] = useState<Tab | null>(null);
  const [live, setLive] = useState<Tab | null>(null);

  useEffect(() => {
    setTab(new URLSearchParams(window.location.search).get('tab') === 'home-2026' ? 'home-2026' : 'classic');
  }, []);

  const pick = (t: Tab) => {
    setTab(t);
    const url = new URL(window.location.href);
    if (t === 'home-2026') url.searchParams.set('tab', 'home-2026');
    else url.searchParams.delete('tab');
    window.history.replaceState(null, '', url.toString());
  };

  return (
    <div style={{ background: ADMIN_COLORS.surface, color: ADMIN_COLORS.onSurface, minHeight: '100vh' }}>
      <LiveHomepagePanel onChange={setLive} />
      <div role="tablist" aria-label="Homepage records" style={{ display: 'flex', gap: '0.5rem', margin: '1.25rem 2rem 0', borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}55` }}>
        {TABS.map((t) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => pick(t.id)}
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: `3px solid ${on ? BRAND.carmine : 'transparent'}`,
                color: on ? ADMIN_COLORS.onSurface : `${ADMIN_COLORS.onSurfaceVariant}cc`,
                fontWeight: on ? 700 : 500,
                fontSize: 15,
                padding: '0.6rem 0.9rem',
                cursor: 'pointer',
              }}
            >
              {t.label}
              {live === t.id && (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: BRAND.cream, background: BRAND.carmine, borderRadius: 9999, padding: '0.1rem 0.5rem' }}>
                  Live
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{tab === 'home-2026' ? <Home2026Editor key="h26" /> : tab === 'classic' ? <ClassicHomeEditor key="classic" /> : null}</div>
    </div>
  );
}
