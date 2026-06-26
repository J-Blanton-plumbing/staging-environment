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
}: AdminPageHeaderProps) {
  const [draftsOpen, setDraftsOpen] = useState(false);

  const hasDrafts = !!(pageType && pageSlug && getContent);
  const hasTemplate = !!(currentTemplate && availableTemplates && onTemplateSwitched);
  const hasPreview = !!(pageType && pageSlug && getContent);

  // Metadata row: prefer updated_by / updated_at, fall back to created_by / created_at
  let metaLine: string | null = null;
  if (updatedBy && updatedAt) {
    metaLine = `Last updated by: ${updatedBy}  ·  ${formatDate(updatedAt)}`;
  } else if (createdBy && createdAt) {
    metaLine = `Created by: ${createdBy}  ·  ${formatDate(createdAt)}`;
  }
  if (metaLine && templateName) {
    metaLine += `  ·  Template: ${templateName}`;
  } else if (!metaLine && templateName) {
    metaLine = `Template: ${templateName}`;
  }

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
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
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
        {metaLine && (
          <div
            style={{
              width: '100%',
              fontFamily: 'Nunito, sans-serif',
              fontSize: '12px',
              color: 'rgba(249,243,236,0.7)',
              paddingBottom: '6px',
              marginTop: '-4px',
            }}
          >
            {metaLine}
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
