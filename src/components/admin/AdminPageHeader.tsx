'use client';

import { useState } from 'react';
import DraftManager from '@/components/admin/DraftManager';
import TemplateSwitcher from '@/components/admin/TemplateSwitcher';
import DraftControls from '@/components/admin/DraftControls';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

export interface AdminPageHeaderProps {
  title: string;
  pageType?: string;
  pageSlug?: string;
  getContent?: () => unknown;
  currentTemplate?: string;
  availableTemplates?: string[];
  onTemplateSwitched?: (newTemplate: string, missingFields: string[]) => void;
  // New metadata props (all optional — no-op when absent)
  updatedBy?: string;
  updatedAt?: string;
  createdBy?: string;
  createdAt?: string;
  templateName?: string;
  previewBaseUrl?: string;
  status?: string;
  // Publish/Unpublish toggle (optional — renders a button in the header when provided)
  /**
   * Brief 159 (Track C3) — REMOVED. Status has one control: the sidebar Status
   * row. These props are gone rather than deprecated so nothing can re-open the
   * second door. See the note in the header body.
   */
  // Page Attributes sidebar toggle (Brief 85) — optional, renders an icon button when provided.
  pageAttributesOpen?: boolean;
  onTogglePageAttributes?: () => void;
  // Brief 85 (iteration 2): when a Page Attributes sidebar is mounted, that sidebar
  // becomes the source of truth for Title/Last-edited/Status/Template — set this so
  // the header doesn't render the same information a second time. Save/Publish/
  // Preview/Drafts controls are unaffected.
  compact?: boolean;
  // Brief 85 (iteration 2): when the Page Attributes sidebar owns version history
  // (its Version popover — see PageAttributesSidebar), pass the save/preview
  // handlers here instead of getContent/pageType/pageSlug. This replaces the
  // header's own DraftControls (Version picker + Save as) and Drafts panel with
  // plain Save/Preview buttons, so there's exactly one place to manage versions.
  draftVersions?: {
    busy: boolean;
    notice: string;
    noticeIsError: boolean;
    onSave: () => void;
    onPreview: () => void;
    onSaveAsNew: (label: string) => void;
    nextVersionName: () => Promise<string>;
  };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function AdminPageHeader({
  title,
  pageType,
  pageSlug,
  getContent,
  currentTemplate,
  availableTemplates,
  onTemplateSwitched,
  updatedBy,
  updatedAt,
  createdBy,
  createdAt,
  templateName,
  previewBaseUrl,
  status,
  pageAttributesOpen,
  onTogglePageAttributes,
  compact,
  draftVersions,
}: AdminPageHeaderProps) {
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsLabel, setSaveAsLabel] = useState('');

  async function openSaveAs() {
    if (!draftVersions) return;
    setSaveAsLabel(await draftVersions.nextVersionName());
    setSaveAsOpen(true);
  }

  function confirmSaveAs() {
    if (!draftVersions || !saveAsLabel.trim()) return;
    draftVersions.onSaveAsNew(saveAsLabel.trim());
    setSaveAsOpen(false);
  }

  const hasDrafts = !draftVersions && !!(pageType && pageSlug && getContent);
  const hasTemplate = !compact && !!(currentTemplate && availableTemplates && onTemplateSwitched);
  const hasPreview = !draftVersions && !!(pageType && pageSlug && getContent);

  // Metadata row: prefer updated_by / updated_at, fall back to created_by / created_at
  // (Brief 85: this whole row is redundant with the Page Attributes sidebar, so it's
  // suppressed entirely in compact mode rather than partially duplicated.)
  let metaLine: string | null = null;
  if (!compact) {
    if (updatedBy && updatedAt) {
      metaLine = `Last modified by ${updatedBy}  ·  ${formatDate(updatedAt)}`;
    } else if (createdBy && createdAt) {
      metaLine = `Created by ${createdBy}  ·  ${formatDate(createdAt)}`;
    }
    if (metaLine && templateName) {
      metaLine += `  ·  Template: ${templateName}`;
    } else if (!metaLine && templateName) {
      metaLine = `Template: ${templateName}`;
    }
  }

  const statusBadgeColor =
    status === 'published' ? ADMIN_COLORS.success :
    status === 'scheduled' ? ADMIN_COLORS.warning :
    ADMIN_COLORS.onSurfaceVariant;
  const statusLabel = !compact && status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : null;

  return (
    <div id="jbp-admin-page-header" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      {/* ── Main bar ───────────────────────────────────────────────────────── */}
      <div
        style={{
          background: ADMIN_COLORS.surface,
          borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}22`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 1.5rem',
          gap: '1rem',
          minHeight: metaLine ? '44px' : '52px',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '1rem' }}>
          {!compact && (
            <span
              style={{
                flex: 1,
                fontFamily: 'var(--font-outfit), system-ui, sans-serif',
                fontWeight: 600,
                fontSize: '16px',
                color: ADMIN_COLORS.onSurface,
                lineHeight: 1.3,
              }}
            >
              {title}
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            {/*
              Brief 159 (Track C3): the header's Publish/Unpublish button is GONE.

              Status is one field with one control — the sidebar's Status row,
              which describes the version open in the editor and publishes it.
              This button was a second door onto the same state (and, by the time
              this brief landed, dead code: no editor passed `onPublishToggle`).
              Leaving it in place was an invitation to wire it back up and
              re-create the exact class of bug Brief 159 closes. If a header
              affordance is ever wanted again, it must call the same
              `useVersionStatusControl` path, not a parallel one.
            */}

            {hasTemplate && pageType && pageSlug && onTemplateSwitched && (
              <TemplateSwitcher
                pageType={pageType}
                pageSlug={pageSlug}
                currentTemplate={currentTemplate}
                availableTemplates={availableTemplates!}
                onSwitched={onTemplateSwitched}
                compact
              />
            )}

            {hasPreview && (
              <DraftControls
                getContent={getContent!}
                pageType={pageType!}
                pageSlug={pageSlug!}
              />
            )}

            {draftVersions && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {draftVersions.notice && (
                  <span style={{
                    color: draftVersions.noticeIsError ? ADMIN_COLORS.error : ADMIN_COLORS.success,
                    fontSize: '0.78rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                    whiteSpace: 'nowrap',
                  }}>
                    {draftVersions.notice}
                  </span>
                )}
                <button
                  onClick={draftVersions.onSave}
                  disabled={draftVersions.busy}
                  style={{
                    background: ADMIN_COLORS.surfaceContainer,
                    border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
                    color: ADMIN_COLORS.onSurface,
                    borderRadius: '9999px', padding: '0.3rem 0.75rem',
                    fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontWeight: 600, fontSize: '0.8rem',
                    cursor: draftVersions.busy ? 'not-allowed' : 'pointer',
                    opacity: draftVersions.busy ? 0.6 : 1, whiteSpace: 'nowrap',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={openSaveAs}
                  disabled={draftVersions.busy}
                  style={{
                    background: ADMIN_COLORS.surfaceContainer,
                    border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
                    color: ADMIN_COLORS.onSurface,
                    borderRadius: '9999px', padding: '0.3rem 0.75rem',
                    fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontWeight: 600, fontSize: '0.8rem',
                    cursor: draftVersions.busy ? 'not-allowed' : 'pointer',
                    opacity: draftVersions.busy ? 0.6 : 1, whiteSpace: 'nowrap',
                  }}
                >
                  Save as
                </button>
                <button
                  onClick={draftVersions.onPreview}
                  disabled={draftVersions.busy}
                  style={{
                    background: ADMIN_COLORS.surfaceContainer,
                    border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
                    color: ADMIN_COLORS.onSurface,
                    borderRadius: '9999px', padding: '0.3rem 0.75rem',
                    fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontWeight: 600, fontSize: '0.8rem',
                    cursor: draftVersions.busy ? 'not-allowed' : 'pointer',
                    opacity: draftVersions.busy ? 0.6 : 1, whiteSpace: 'nowrap',
                  }}
                >
                  {draftVersions.busy ? 'Saving…' : 'Preview'}
                </button>
              </div>
            )}

            {onTogglePageAttributes && (
              <button
                onClick={onTogglePageAttributes}
                title="Page attributes"
                aria-label="Toggle Page Attributes sidebar"
                aria-pressed={!!pageAttributesOpen}
                style={{
                  background: pageAttributesOpen ? ADMIN_COLORS.surfaceContainerHigh : ADMIN_COLORS.surfaceContainer,
                  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
                  borderRadius: '0.4rem',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: ADMIN_COLORS.onSurface,
                  flexShrink: 0,
                }}
              >
                <span aria-hidden style={{ fontSize: '14px', lineHeight: 1 }}>▤</span>
              </button>
            )}

            {hasDrafts && (
              <button
                onClick={() => setDraftsOpen(o => !o)}
                style={{
                  background: draftsOpen ? ADMIN_COLORS.surfaceContainerHigh : ADMIN_COLORS.surfaceContainer,
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
                Drafts {draftsOpen ? '▴' : '▾'}
              </button>
            )}
          </div>
        </div>

        {/* Metadata row */}
        {(metaLine || statusLabel) && (
          <div
            style={{
              width: '100%',
              fontFamily: 'var(--font-nunito), system-ui, sans-serif',
              fontSize: '12px',
              color: `${ADMIN_COLORS.onSurfaceVariant}99`,
              paddingBottom: '6px',
              marginTop: '-4px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              flexWrap: 'wrap',
            }}
          >
            {metaLine && <span>{metaLine}</span>}
            {statusLabel && (
              <span
                style={{
                  background: statusBadgeColor,
                  color: status === 'published' ? ADMIN_COLORS.successOn : status === 'scheduled' ? ADMIN_COLORS.warningOn : '#fff',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 7px',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {statusLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Drafts panel ───────────────────────────────────────────────────── */}
      {hasDrafts && draftsOpen && pageType && pageSlug && getContent && (
        <div
          style={{
            background: ADMIN_COLORS.surfaceContainerLow,
            borderBottom: `2px solid ${ADMIN_COLORS.outlineVariant}44`,
            padding: '1.5rem',
            boxShadow: ADMIN_SHADOWS.elegant,
          }}
        >
          <DraftManager
            pageType={pageType}
            pageSlug={pageSlug}
            getContent={getContent}
          />
        </div>
      )}

      {/* ── Save-as dialog (draftVersions mode) ─────────────────────────────── */}
      {saveAsOpen && draftVersions && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => { if (!draftVersions.busy) setSaveAsOpen(false); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: ADMIN_COLORS.surfaceContainerLow, borderRadius: '1.5rem', padding: '1.5rem',
              width: '100%', maxWidth: '400px', border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
              boxShadow: ADMIN_SHADOWS.elegant,
            }}
          >
            <h3 style={{ margin: '0 0 0.75rem', fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontSize: '16px', color: ADMIN_COLORS.onSurface }}>
              Save as new version
            </h3>
            <label style={{ display: 'block', fontSize: '13px', color: ADMIN_COLORS.onSurfaceVariant, marginBottom: '0.25rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif' }}>
              Version name:
            </label>
            <input
              autoFocus
              type="text"
              value={saveAsLabel}
              onChange={e => setSaveAsLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && saveAsLabel.trim()) confirmSaveAs(); }}
              style={{
                display: 'block', width: '100%', padding: '0.4rem 0.5rem',
                background: ADMIN_COLORS.surfaceContainerLowest,
                border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
                color: ADMIN_COLORS.onSurface,
                fontFamily: 'inherit', fontSize: '0.9rem',
                boxSizing: 'border-box', marginBottom: '0.75rem',
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSaveAsOpen(false)}
                disabled={draftVersions.busy}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: ADMIN_COLORS.onSurfaceVariant, fontSize: '13px', fontFamily: 'var(--font-nunito), system-ui, sans-serif', padding: '0.4rem 0.75rem' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveAs}
                disabled={draftVersions.busy || !saveAsLabel.trim()}
                style={{
                  background: ADMIN_COLORS.cerulean, border: 'none', borderRadius: '9999px',
                  padding: '0.4rem 1rem', color: '#fff',
                  fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 600, fontSize: '13px',
                  cursor: draftVersions.busy || !saveAsLabel.trim() ? 'not-allowed' : 'pointer',
                  opacity: draftVersions.busy || !saveAsLabel.trim() ? 0.7 : 1,
                }}
              >
                {draftVersions.busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
