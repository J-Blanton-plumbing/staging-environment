'use client';

import { useState } from 'react';
import Link from 'next/link';
import ChangelogModal from './ChangelogModal';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

interface PageEntry {
  label: string;
  slug: string;
  path: string;
}

interface LastEdit {
  slug: string;
  updatedByName: string | null;
  updatedAt: string | null;
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminPageList({
  pages,
  editMap,
}: {
  pages: PageEntry[];
  editMap: Record<string, LastEdit>;
}) {
  const [modal, setModal] = useState<{ slug: string; label: string } | null>(null);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 2rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
      <h1 style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 700, fontSize: '1.875rem', letterSpacing: '-0.025em', marginBottom: '0.5rem', color: ADMIN_COLORS.onSurface }}>CMS Admin</h1>
      <p style={{ color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontSize: '0.875rem', marginBottom: '2rem' }}>Select a service category page to edit.</p>
      <p style={{ color: `${ADMIN_COLORS.onSurfaceVariant}66`, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700, marginBottom: '0.75rem' }}>
        Service Category Pages
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {pages.map(({ label, slug, path }) => {
          const edit = editMap[slug];
          return (
            <div
              key={slug}
              style={{
                background: ADMIN_COLORS.surfaceContainerLow,
                border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
                borderRadius: '1.5rem',
                padding: '1rem 1.25rem',
                boxShadow: ADMIN_SHADOWS.elegant,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: ADMIN_COLORS.onSurface }}>{label}</span>
                  {edit?.updatedByName ? (
                    <p style={{ margin: '0.2rem 0 0', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>
                      Last edited by{' '}
                      <button
                        onClick={() => setModal({ slug, label })}
                        style={{
                          background: 'none', border: 'none', padding: 0,
                          color: ADMIN_COLORS.cerulean, cursor: 'pointer', fontSize: '12px',
                          textDecoration: 'underline', fontWeight: 600,
                        }}
                      >
                        {edit.updatedByName}
                      </button>
                      {' · '}
                      {edit.updatedAt ? formatShortDate(edit.updatedAt) : ''}
                    </p>
                  ) : (
                    <p style={{ margin: '0.2rem 0 0', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>—</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link
                    href={`/admin/${slug}`}
                    style={{ background: 'transparent', color: ADMIN_COLORS.onSurfaceVariant, border: `1px solid ${ADMIN_COLORS.outlineVariant}4D`, textDecoration: 'none', padding: '0.4rem 0.9rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    Edit
                  </Link>
                  <Link
                    href={path}
                    target="_blank"
                    style={{ background: ADMIN_COLORS.surfaceContainerHighest, color: ADMIN_COLORS.onSurface, textDecoration: 'none', padding: '0.4rem 0.9rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    View ↗
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <ChangelogModal
          pageType="service"
          pageSlug={modal.slug}
          pageName={modal.label}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
