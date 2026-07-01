'use client';

import { useState } from 'react';
import DraftManager from '@/components/admin/DraftManager';
import TemplateSwitcher from '@/components/admin/TemplateSwitcher';
import DraftControls from '@/components/admin/DraftControls';

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
    status === 'published' ? '#15803d' :
    status === 'scheduled' ? '#b45309' :
    '#5a6a7a';
  const statusLabel = status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : null;

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 100 }}>
      {/* ── Main bar ───────────────────────────────────────────────────────── */}
      <div
        style={{
          background: '#0A1B2E',
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
              fontFamily: 'Industry, sans-serif',
              fontWeight: 600,
              fontSize: '16px',
              color: '#F9F3EC',
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
                  background: status === 'published' ? 'transparent' : '#1560E6',
                  border: status === 'published' ? '1px solid rgba(249,243,236,0.4)' : '1px solid #1560E6',
                  borderRadius: '4px',
                  padding: '0.3rem 0.85rem',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: '#F9F3EC',
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
                  background: draftsOpen ? 'rgba(249,243,236,0.2)' : 'rgba(249,243,236,0.1)',
                  border: '1px solid rgba(249,243,236,0.25)',
                  borderRadius: '4px',
                  padding: '0.3rem 0.75rem',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  color: '#F9F3EC',
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
              fontFamily: 'Nunito, sans-serif',
              fontSize: '12px',
              color: 'rgba(249,243,236,0.7)',
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
                  color: '#fff',
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
            background: '#fff',
            borderBottom: '2px solid #e5e7eb',
            padding: '1.5rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
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
