'use client';

import { useState } from 'react';

const TEMPLATE_LABELS: Record<string, string> = {
  'coverage-area': 'Coverage Area City',
  'local-office': 'Local Office City',
};

interface Props {
  pageType: string;
  pageSlug: string;
  currentTemplate: string;
  availableTemplates: string[];
  onSwitched: (newTemplate: string, missingFields: string[]) => void;
  compact?: boolean;
  getContent?: () => unknown;
}

export default function TemplateSwitcher({
  pageType,
  pageSlug,
  currentTemplate,
  availableTemplates,
  onSwitched,
  compact = false,
  getContent,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState('');
  const [archiveChecked, setArchiveChecked] = useState(false);
  const [archiveName, setArchiveName] = useState('');

  const otherTemplates = availableTemplates.filter((t) => t !== currentTemplate);

  function todayStr() {
    return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function openModal() {
    setSelectedTemplate(otherTemplates[0] ?? '');
    setArchiveChecked(false);
    setArchiveName(`${pageSlug} — ${currentTemplate} — ${todayStr()}`);
    setError('');
    setModalOpen(true);
  }

  function closeModal() {
    if (switching) return;
    setModalOpen(false);
    setError('');
  }

  async function handleSwitch() {
    if (!selectedTemplate) return;
    setSwitching(true);
    setError('');
    try {
      // Archive step (optional)
      if (archiveChecked && archiveName && getContent) {
        const archiveRes = await fetch('/api/cms/archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page_type: pageType,
            slug: pageSlug,
            template: currentTemplate,
            archive_name: archiveName,
            content_json: getContent(),
          }),
        });
        if (!archiveRes.ok) {
          const j = await archiveRes.json();
          throw new Error(j.error ?? 'Archive failed');
        }
      }

      const res = await fetch('/api/cms/template-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageType, pageSlug, toTemplate: selectedTemplate }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Switch failed');
      setModalOpen(false);
      onSwitched(selectedTemplate, json.missingFields ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Switch failed');
    } finally {
      setSwitching(false);
    }
  }

  const cityLabel = pageSlug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <>
      {compact ? (
        /* Compact trigger for AdminPageHeader */
        otherTemplates.length > 0 ? (
          <button
            onClick={openModal}
            style={{
              background: 'rgba(249,243,236,0.15)',
              border: '1px solid rgba(249,243,236,0.3)',
              borderRadius: '4px',
              padding: '0.3rem 0.75rem',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              color: '#F9F3EC',
              whiteSpace: 'nowrap',
            }}
          >
            Template: {TEMPLATE_LABELS[currentTemplate] ?? currentTemplate} ▾
          </button>
        ) : (
          <span style={{ fontSize: '0.8rem', color: 'rgba(249,243,236,0.7)', fontWeight: 600 }}>
            Template: {TEMPLATE_LABELS[currentTemplate] ?? currentTemplate}
          </span>
        )
      ) : (
        /* Standard card display */
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.25rem',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            marginBottom: '2rem',
          }}
        >
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Template
            </p>
            <p style={{ margin: '0.15rem 0 0', fontWeight: 600, color: '#111827' }}>
              {TEMPLATE_LABELS[currentTemplate] ?? currentTemplate}
            </p>
          </div>
          {otherTemplates.length > 0 && (
            <button
              onClick={openModal}
              style={{
                background: '#fff',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                padding: '0.45rem 1rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                color: '#374151',
                whiteSpace: 'nowrap',
              }}
            >
              Change Template ▾
            </button>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '2rem',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem', fontWeight: 700, fontSize: '1.2rem', color: '#0A1B2E' }}>
              Change Template
            </h2>

            <p style={{ margin: '0 0 1rem', color: '#374151' }}>
              Switch <strong>{cityLabel}</strong> from:
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span style={{ fontWeight: 600, color: '#0A1B2E' }}>
                {TEMPLATE_LABELS[currentTemplate] ?? currentTemplate}
              </span>
              <span style={{ color: '#9ca3af' }}>→</span>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                style={{
                  border: '1px solid #d1d5db', borderRadius: '4px',
                  padding: '0.4rem 0.6rem', fontWeight: 600, fontSize: '0.9rem',
                  color: '#0A1B2E', background: '#fff',
                }}
              >
                {otherTemplates.map((t) => (
                  <option key={t} value={t}>{TEMPLATE_LABELS[t] ?? t}</option>
                ))}
              </select>
            </div>

            <div
              style={{
                background: '#fffbeb', border: '1px solid #fcd34d',
                borderRadius: '6px', padding: '0.9rem 1rem',
                color: '#92400e', fontSize: '0.875rem', marginBottom: '1.5rem',
              }}
            >
              <strong>⚠ Warning:</strong> This will archive your current content and map matching
              fields to the new template. Fields that don&rsquo;t carry over will need to be filled
              in manually.
            </div>

            {/* Archive option */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#374151' }}>
                <input
                  type="checkbox"
                  checked={archiveChecked}
                  onChange={e => setArchiveChecked(e.target.checked)}
                  style={{ marginTop: '2px', flexShrink: 0 }}
                />
                Save current page as archive before switching
              </label>
              {archiveChecked && (
                <div style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                    Archive name:
                  </label>
                  <input
                    type="text"
                    value={archiveName}
                    onChange={e => setArchiveName(e.target.value)}
                    style={{
                      width: '100%', padding: '0.35rem 0.5rem',
                      border: '1px solid #d1d5db', borderRadius: '4px',
                      fontSize: '0.875rem', boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}
            </div>

            {error && (
              <p style={{ color: '#BC0E0E', fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={closeModal}
                disabled={switching}
                style={{
                  background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px',
                  padding: '0.6rem 1.25rem', fontWeight: 600, cursor: 'pointer',
                  color: '#374151', opacity: switching ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSwitch}
                disabled={switching || !selectedTemplate}
                style={{
                  background: '#BC0E0E', border: 'none', borderRadius: '4px',
                  padding: '0.6rem 1.25rem', fontWeight: 700, cursor: switching ? 'not-allowed' : 'pointer',
                  color: '#fff', opacity: switching ? 0.7 : 1,
                }}
              >
                {switching ? 'Switching…' : 'Switch Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
