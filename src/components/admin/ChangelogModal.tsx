'use client';

import { useState, useEffect } from 'react';

interface ChangelogEntry {
  id: number;
  page_type: string;
  page_slug: string;
  changed_at: string;
  snapshot: Record<string, unknown>;
  changed_by_name: string | null;
}

interface FieldDiff {
  field: string;
  from: string;
  to: string;
  changed: boolean;
}

function diffSnapshots(
  prev: Record<string, unknown> | null,
  curr: Record<string, unknown>
): FieldDiff[] {
  if (!prev) return [{ field: '', from: '', to: '', changed: false }];

  const allKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(curr)]));
  const diffs: FieldDiff[] = [];

  for (const key of allKeys) {
    const a = JSON.stringify(prev[key] ?? '');
    const b = JSON.stringify(curr[key] ?? '');
    if (a !== b) {
      const fromVal = String(prev[key] ?? '');
      const toVal = String(curr[key] ?? '');
      diffs.push({
        field: key,
        from: fromVal.length > 80 ? '(updated)' : fromVal,
        to: toVal.length > 80 ? '(updated)' : toVal,
        changed: true,
      });
    }
  }

  return diffs;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) + ' at ' + d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ChangelogModal({
  pageType,
  pageSlug,
  pageName,
  onClose,
}: {
  pageType: string;
  pageSlug: string;
  pageName: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/cms/changelog/${pageType}/${pageSlug}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEntries(data);
        else setError('Failed to load changelog');
      })
      .catch(() => setError('Failed to load changelog'))
      .finally(() => setLoading(false));
  }, [pageType, pageSlug]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '10px',
          width: '100%',
          maxWidth: '680px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #e5e7eb',
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0A1B2E' }}>
            Change History — {pageName}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.4rem', lineHeight: 1, color: '#6b7280', padding: '0.25rem',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '1rem 1.5rem', flex: 1 }}>
          {loading && (
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Loading…</p>
          )}
          {error && (
            <p style={{ color: '#BC0E0E', fontSize: '0.9rem' }}>{error}</p>
          )}
          {!loading && !error && entries.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>No changes recorded yet.</p>
          )}
          {entries.map((entry, i) => {
            const prevEntry = entries[i + 1] ?? null;
            const diffs = diffSnapshots(prevEntry?.snapshot ?? null, entry.snapshot);
            const isInitial = !prevEntry;

            return (
              <div
                key={entry.id}
                style={{
                  borderBottom: i < entries.length - 1 ? '1px solid #f0f0f0' : 'none',
                  paddingBottom: '1.25rem',
                  marginBottom: '1.25rem',
                }}
              >
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.9rem', color: '#374151' }}>
                  <strong style={{ color: '#0A1B2E' }}>{entry.changed_by_name ?? 'Unknown'}</strong>
                  {' · '}
                  <span style={{ color: '#6b7280' }}>{formatDate(entry.changed_at)}</span>
                </p>

                {isInitial ? (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic' }}>
                    Initial save.
                  </p>
                ) : diffs.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280', fontStyle: 'italic' }}>
                    No field changes detected.
                  </p>
                ) : (
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {diffs.map(diff => (
                      <li
                        key={diff.field}
                        style={{
                          fontSize: '0.82rem',
                          color: '#374151',
                          padding: '0.2rem 0',
                          display: 'flex',
                          gap: '0.4rem',
                          alignItems: 'flex-start',
                        }}
                      >
                        <span style={{ color: '#BC0E0E', flexShrink: 0 }}>•</span>
                        <span>
                          <strong>{diff.field}</strong>
                          {diff.from === '(updated)' || diff.to === '(updated)' ? (
                            <span style={{ color: '#6b7280' }}> (updated)</span>
                          ) : (
                            <>
                              {': '}
                              <span style={{ color: '#6b7280' }}>&ldquo;{diff.from}&rdquo;</span>
                              {' → '}
                              <span style={{ color: '#0A1B2E' }}>&ldquo;{diff.to}&rdquo;</span>
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
