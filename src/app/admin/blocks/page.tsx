'use client';

import { ADMIN_COLORS } from '@/lib/admin/theme';
import { insertableBlocksByCategory } from '@/lib/cms/block-catalogue';

/**
 * Brief 90 (Track C) — Block Catalogue landing page.
 *
 * The sidebar "Blocks" link opens this page (rather than expanding a list inline).
 * It lists every insertable block from the single block registry
 * (`block-catalogue.ts`), grouped by category. Read-only browse — actual insertion
 * happens from the "+" inserter inside a sub-service page editor (Track D).
 */

export default function BlocksLandingPage() {
  const groups = insertableBlocksByCategory();
  const total = groups.reduce((n, g) => n + g.blocks.length, 0);

  return (
    <main style={{ padding: '2rem', maxWidth: '1400px', fontFamily: 'system-ui, sans-serif' }}>
      <h1
        style={{
          fontFamily: 'var(--font-outfit), system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '1.875rem',
          letterSpacing: '-0.025em',
          color: ADMIN_COLORS.onSurface,
          marginBottom: '0.25rem',
        }}
      >
        Blocks
      </h1>
      <p
        style={{
          fontFamily: 'var(--font-nunito), system-ui, sans-serif',
          color: `${ADMIN_COLORS.onSurfaceVariant}99`,
          fontSize: '0.875rem',
          marginBottom: '2rem',
        }}
      >
        The {total} building blocks available for sub-service pages. Add them from the
        “+” inserter inside a sub-service page editor.
      </p>

      {groups.map((g) => (
        <section key={g.category} style={{ marginBottom: '2.5rem' }}>
          <h2
            className="font-admin-headline"
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: `${ADMIN_COLORS.onSurfaceVariant}99`,
              marginBottom: '1rem',
            }}
          >
            {g.label}
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {g.blocks.map((b) => (
              <div
                key={b.type}
                className="rounded-admin-3xl bg-admin-surface-container-low p-6 shadow-admin-elegant"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-admin-secondary-container">
                    widgets
                  </span>
                  <h3 className="font-admin-headline text-base font-bold text-admin-on-surface">
                    {b.label}
                  </h3>
                </div>
                <p className="mb-3 font-admin-body text-[13px] leading-relaxed text-admin-on-surface-variant/80">
                  {b.description}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full border px-2.5 py-0.5 font-admin-body text-[11px] font-semibold uppercase tracking-wide"
                    style={{
                      color: ADMIN_COLORS.onSurfaceVariant,
                      borderColor: `${ADMIN_COLORS.outlineVariant}66`,
                      background: ADMIN_COLORS.surfaceContainerHigh,
                    }}
                  >
                    {b.variant}
                  </span>
                  {!b.allowMultiple && (
                    <span className="font-admin-body text-[11px] text-admin-on-surface-variant/50">
                      One per page
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
