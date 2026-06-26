'use client';

import { useState } from 'react';
import Link from 'next/link';
import ChangelogModal from './ChangelogModal';

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
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem 2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: '0.5rem', color: '#0A1B2E' }}>CMS Admin</h1>
      <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '2rem' }}>Select a service category page to edit.</p>
      <p style={{ color: '#9ca3af', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: '0.75rem' }}>
        Service Category Pages
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {pages.map(({ label, slug, path }) => {
          const edit = editMap[slug];
          return (
            <div
              key={slug}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1rem 1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: '#0A1B2E' }}>{label}</span>
                  {edit?.updatedByName ? (
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>
                      Last edited by{' '}
                      <button
                        onClick={() => setModal({ slug, label })}
                        style={{
                          background: 'none', border: 'none', padding: 0,
                          color: '#1560E6', cursor: 'pointer', fontSize: '0.8rem',
                          textDecoration: 'underline', fontWeight: 600,
                        }}
                      >
                        {edit.updatedByName}
                      </button>
                      {' · '}
                      {edit.updatedAt ? formatShortDate(edit.updatedAt) : ''}
                    </p>
                  ) : (
                    <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#d1d5db' }}>—</p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link
                    href={`/admin/${slug}`}
                    style={{ background: '#BC0E0E', color: '#fff', textDecoration: 'none', padding: '0.4rem 1rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    Edit
                  </Link>
                  <Link
                    href={path}
                    target="_blank"
                    style={{ background: '#f3f4f6', color: '#374151', textDecoration: 'none', padding: '0.4rem 1rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 600 }}
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
