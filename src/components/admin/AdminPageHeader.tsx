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
  onPublishToggle?: () => Promise<void>;
  publishBusy?: boolean;
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
  onPublishToggle,
  publishBusy,
}: AdminPageHeaderProps) {
  const [draftsOpen, setDraftsOpen] = useState(false);

  const hasDrafts = !!(pageType && pageSlug && getContent);
  const hasTemplate = !!(currentTemplate && availableTemplates && onTemplateSwitched);
  const hasPreview = !!(pageType && pageSlug && getContent);

  // Metadata row: prefer updated_by / updated_at, fall back to created_by / created_at
  let metaLine: string | null = null;
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

  const statusBadgeColor =
    status === 'published' ? ADMIN_COLORS.success :
    status === 'scheduled' ? ADMIN_COLORS.warning :
    ADMIN_COLORS.onSurfaceVariant;
  const statusLabel = status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : null;

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            {onPublishToggle && (
              <button
                onClick={onPublishToggle}
                disabled={publishBusy}
                style={{
                  background: status === 'published' ? 'transparent' : ADMIN_COLORS.cerulean,
                  border: status === 'published' ? `1px solid ${ADMIN_COLORS.onSurfaceVariant}66` : `1px solid ${ADMIN_COLORS.cerulean}`,
                  borderRadius: '9999px',
                  padding: '0.3rem 0.85rem',
                  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: status === 'published' ? ADMIN_COLORS.onSurface : '#fff',
                  cursor: publishBusy ? 'not-allowed' : 'pointer',
                  opacity: publishBusy ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {publishBusy ? '…' : status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
            )}

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
    </div>
  );
}
