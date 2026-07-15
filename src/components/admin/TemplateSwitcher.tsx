'use client';

import { useState } from 'react';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

const TEMPLATE_LABELS: Record<string, string> = {
  'coverage-area': 'Coverage Area City',
  'local-office': 'Local Office City',
  'local-office-v2': 'Local Office V2',
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
      {/* :hover / :focus states — inline styles can't express these */}
      <style>{`
        .admin-tswitch-cta { transition: box-shadow 0.2s ease, filter 0.2s ease; }
        .admin-tswitch-cta:hover:not(:disabled) { box-shadow: ${ADMIN_SHADOWS.glowCerulean}; filter: brightness(1.05); }
        .admin-tswitch-field:focus { outline: none; box-shadow: 0 0 0 1px ${ADMIN_COLORS.primary}66; }
      `}</style>
      {compact ? (
        /* Compact trigger for AdminPageHeader */
        otherTemplates.length > 0 ? (
          <button
            onClick={openModal}
            style={{
              background: ADMIN_COLORS.surfaceContainer,
              border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
              borderRadius: '9999px',
              padding: '0.3rem 0.75rem',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer',
              color: ADMIN_COLORS.onSurface,
              whiteSpace: 'nowrap',
            }}
          >
            Template: {TEMPLATE_LABELS[currentTemplate] ?? currentTemplate} ▾
          </button>
        ) : (
          <span style={{ fontSize: '0.8rem', color: ADMIN_COLORS.onSurfaceVariant, fontWeight: 600 }}>
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
            background: ADMIN_COLORS.surfaceContainerLow,
            border: `1px solid ${ADMIN_COLORS.outlineVariant}44`,
            borderRadius: '1rem',
            boxShadow: ADMIN_SHADOWS.elegant,
            marginBottom: '2rem',
          }}
        >
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: ADMIN_COLORS.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Template
            </p>
            <p style={{ margin: '0.15rem 0 0', fontWeight: 600, color: ADMIN_COLORS.onSurface }}>
              {TEMPLATE_LABELS[currentTemplate] ?? currentTemplate}
            </p>
          </div>
          {otherTemplates.length > 0 && (
            <button
              onClick={openModal}
              style={{
                background: ADMIN_COLORS.surfaceContainerHigh,
                border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
                borderRadius: '9999px',
                padding: '0.45rem 1rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                color: ADMIN_COLORS.onSurface,
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
              background: ADMIN_COLORS.surfaceContainerLow,
              borderRadius: '1.5rem',
              padding: '2rem',
              width: '100%',
              maxWidth: '480px',
              border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <h2 style={{ margin: '0 0 1.5rem', fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: ADMIN_COLORS.onSurface }}>
              Change Template
            </h2>

            <p style={{ margin: '0 0 1rem', color: ADMIN_COLORS.onSurfaceVariant }}>
              Switch <strong>{cityLabel}</strong> from:
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <span style={{ fontWeight: 600, color: ADMIN_COLORS.onSurface }}>
                {TEMPLATE_LABELS[currentTemplate] ?? currentTemplate}
              </span>
              <span style={{ color: ADMIN_COLORS.onSurfaceVariant }}>→</span>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="admin-tswitch-field"
                style={{
                  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
                  padding: '0.4rem 0.6rem', fontWeight: 600, fontSize: '0.9rem',
                  color: ADMIN_COLORS.onSurface, background: ADMIN_COLORS.surfaceContainer,
                }}
              >
                {otherTemplates.map((t) => (
                  <option key={t} value={t}>{TEMPLATE_LABELS[t] ?? t}</option>
                ))}
              </select>
            </div>

            <div
              style={{
                background: `${ADMIN_COLORS.warning}22`, border: `1px solid ${ADMIN_COLORS.warning}66`,
                borderRadius: '0.75rem', padding: '0.9rem 1rem',
                color: ADMIN_COLORS.onSurface, fontSize: '0.875rem', marginBottom: '1.5rem',
              }}
            >
              <strong>⚠ Warning:</strong> This will archive your current content and map matching
              fields to the new template. Fields that don&rsquo;t carry over will need to be filled
              in manually.
            </div>

            {/* Archive option */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: ADMIN_COLORS.onSurfaceVariant }}>
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: ADMIN_COLORS.onSurface, marginBottom: '0.25rem' }}>
                    Archive name:
                  </label>
                  <input
                    type="text"
                    className="admin-tswitch-field"
                    value={archiveName}
                    onChange={e => setArchiveName(e.target.value)}
                    style={{
                      width: '100%', padding: '0.35rem 0.5rem',
                      background: ADMIN_COLORS.surfaceContainerLowest,
                      border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
                      color: ADMIN_COLORS.onSurface,
                      fontSize: '0.875rem', boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}
            </div>

            {error && (
              <p style={{ color: ADMIN_COLORS.error, fontSize: '0.875rem', marginBottom: '1rem' }}>{error}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={closeModal}
                disabled={switching}
                style={{
                  background: 'transparent', border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '9999px',
                  padding: '0.6rem 1.25rem', fontWeight: 600, cursor: 'pointer',
                  color: ADMIN_COLORS.onSurfaceVariant, opacity: switching ? 0.6 : 1,
                }}
              >
                Cancel
              </button>
              <button
                className="admin-tswitch-cta"
                onClick={handleSwitch}
                disabled={switching || !selectedTemplate}
                style={{
                  background: ADMIN_COLORS.cerulean, border: 'none', borderRadius: '9999px',
                  padding: '0.6rem 1.25rem', fontWeight: 700, cursor: switching ? 'not-allowed' : 'pointer',
                  color: '#fff', opacity: switching ? 0.7 : 1,
                  boxShadow: ADMIN_SHADOWS.md,
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
