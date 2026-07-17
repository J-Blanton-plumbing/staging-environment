'use client';

import { useLayoutEffect, useState } from 'react';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import { timeAgo } from '@/lib/admin/timeAgo';
import SlugPopover from './SlugPopover';
import ParentPopover, { ParentOption } from './ParentPopover';
import StatusPopover from './StatusPopover';
import VersionPopover from './VersionPopover';
import TemplatePopover, { TemplateOption } from './TemplatePopover';
import { DraftVersionRow } from './useDraftVersions';

export const PAGE_ATTRS_STORAGE_KEY = 'jbp-cms-page-attrs-collapsed';

/** Width of the open sidebar — also referenced by editors via SIDEBAR_WIDTH_PX to reserve layout space. */
export const SIDEBAR_WIDTH_PX = 280;

/**
 * Fallback top offset before the real header stack has been measured (AdminTopBar's
 * 80px `h-20` + AdminPageHeader's ~52px single-row compact height). The sidebar
 * must sit below the ENTIRE sticky header stack, not just the search bar — see
 * `jbp-admin-page-header`'s id, measured below. A hardcoded 80px caused the header
 * to visually cover the sidebar's title (Brief 85 iter. 2 bugfix).
 */
const FALLBACK_TOP_PX = 132;

export interface PageAttributesSlug {
  value: string;
  editable: boolean;
  disabledNote?: string;
  permalink: string;
  onSave?: (newSlug: string) => Promise<void> | void;
}

export interface PageAttributesParent {
  label: string;
  editable: boolean;
  value?: string | null;
  options?: ParentOption[];
  onChange?: (newParentSlug: string | null) => void;
}

export interface PageAttributesTemplate {
  value: string;
  label: string;
  /** Every template this page type currently supports. */
  options: TemplateOption[];
  /** Omit when this page type has no real template-switch pathway yet. */
  onChange?: (newTemplate: string) => Promise<void> | void;
  busy?: boolean;
}

export interface PageAttributesVersions {
  activeId: number | null;
  activeLabel: string;
  versions: DraftVersionRow[];
  busy?: boolean;
  currentUserId: number | null;
  onSwitch: (id: number) => void;
  onPublish: (id: number) => void;
  onDelete: (id: number) => void;
  onSaveAsNew: (label: string) => void;
  nextVersionName: () => Promise<string>;
}

export interface PageAttributesSidebarProps {
  title: string;
  updatedAt?: string;
  status?: string;
  /** Provide to make Status an interactive Draft/Published popover instead of plain text. */
  onStatusChange?: (newStatus: 'draft' | 'published') => Promise<void> | void;
  statusBusy?: boolean;
  /** Replaces the header's TemplateSwitcher for editors using this sidebar — always clickable, like Slug/Parent. */
  template?: PageAttributesTemplate;
  /** Version history — replaces the header's separate "Version" picker + "Drafts" panel when provided. */
  version?: PageAttributesVersions;
  slug: PageAttributesSlug;
  parent: PageAttributesParent;
  /** Placeholder author label. STUB — see Author row below. */
  author?: string;
  open: boolean;
  /** Dismisses the sidebar when its mobile backdrop is tapped. */
  onClose?: () => void;
}

const fontHead = 'var(--font-outfit), system-ui, sans-serif';
const fontBody = 'var(--font-nunito), system-ui, sans-serif';

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
  padding: '0.6rem 0',
  borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}22`,
  fontFamily: fontBody,
  fontSize: '13px',
};

const labelStyle: React.CSSProperties = {
  color: ADMIN_COLORS.onSurfaceVariant,
  fontWeight: 600,
};

function statusLabel(status?: string): string {
  if (!status) return 'Draft';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function PageAttributesSidebar({
  title,
  updatedAt,
  status,
  onStatusChange,
  statusBusy,
  template,
  version,
  slug,
  parent,
  author = '—',
  open,
  onClose,
}: PageAttributesSidebarProps) {
  const [topPx, setTopPx] = useState(FALLBACK_TOP_PX);

  useLayoutEffect(() => {
    const headerEl = document.getElementById('jbp-admin-page-header');
    if (!headerEl) return;

    function measure() {
      // Intrinsic height of the header stack — stable regardless of scroll position
      // (unlike getBoundingClientRect on a `position: sticky` element, whose `top`
      // moves once scrolled). AdminTopBar sits directly above it in normal flow.
      const topBar = document.querySelector('header.sticky');
      const topBarHeight = topBar instanceof HTMLElement ? topBar.offsetHeight : 80;
      setTopPx(topBarHeight + (headerEl as HTMLElement).offsetHeight);
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(headerEl);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <>
      {/* Backdrop — mobile only, dims the editor behind the overlay drawer. */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed right-0 z-40 transition-transform duration-200 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          top: `${topPx}px`,
          height: `calc(100vh - ${topPx}px)`,
          width: `${SIDEBAR_WIDTH_PX}px`,
          overflowY: 'auto',
          background: ADMIN_COLORS.surfaceContainerLow,
          borderLeft: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
          boxShadow: ADMIN_SHADOWS.elegant,
        }}
        aria-hidden={!open}
      >
        <div style={{ padding: '1.1rem 1.25rem', boxSizing: 'border-box' }}>
          {/* Page title */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span aria-hidden style={{ fontSize: '15px', lineHeight: 1.3 }}>📄</span>
            <span style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '14px', color: ADMIN_COLORS.onSurface, lineHeight: 1.3 }}>
              {title || 'No title'}
            </span>
          </div>

          {updatedAt && (
            <p style={{ margin: '0 0 0.75rem', fontFamily: fontBody, fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99` }}>
              Last edited {timeAgo(updatedAt)}.
            </p>
          )}

          <div style={{ marginTop: '0.25rem' }}>
            {/* Status — functional, mirrors AdminPageHeader's status badge. Interactive
                (Draft/Published popover) when onStatusChange is supplied; plain text otherwise. */}
            <div style={rowStyle}>
              <span style={labelStyle}>Status</span>
              {onStatusChange ? (
                <StatusPopover value={status ?? 'draft'} onChange={onStatusChange} busy={statusBusy} />
              ) : (
                <span style={{ color: ADMIN_COLORS.cerulean, fontWeight: 600 }}>{statusLabel(status)}</span>
              )}
            </div>

            {version && (
              <div style={rowStyle}>
                <span style={labelStyle}>Version</span>
                <VersionPopover
                  activeId={version.activeId}
                  activeLabel={version.activeLabel}
                  versions={version.versions}
                  busy={version.busy}
                  currentUserId={version.currentUserId}
                  onSwitch={version.onSwitch}
                  onPublish={version.onPublish}
                  onDelete={version.onDelete}
                  onSaveAsNew={version.onSaveAsNew}
                  nextVersionName={version.nextVersionName}
                />
              </div>
            )}

            {template && (
              <div style={rowStyle}>
                <span style={labelStyle}>Template</span>
                <TemplatePopover
                  value={template.value}
                  label={template.label}
                  options={template.options}
                  onChange={template.onChange}
                  busy={template.busy}
                />
              </div>
            )}

            {/*
              STUB: no scheduling/publish-date feature exists yet.
              Hard-coded to "Immediately" to match the reference UX (Brief 85).
              Wire to a real scheduling system in a future brief — see PROJECT-STATUS.md open items.
            */}
            <div style={rowStyle}>
              <span style={labelStyle}>Publish</span>
              <span style={{ color: `${ADMIN_COLORS.onSurfaceVariant}cc`, fontWeight: 600 }}>Immediately</span>
            </div>

            <div style={rowStyle}>
              <span style={labelStyle}>Slug</span>
              <SlugPopover
                slug={slug.value}
                editable={slug.editable}
                disabledNote={slug.disabledNote}
                permalink={slug.permalink}
                onSave={slug.onSave}
              />
            </div>

            {/*
              STUB: no per-page author/attribution concept exists consistently yet
              (created_by exists on some tables, not others — see Brief 45/81).
              Placeholder only. Wire to real user attribution in a future brief.
            */}
            <div style={rowStyle}>
              <span style={labelStyle}>Author</span>
              <span style={{ color: `${ADMIN_COLORS.onSurfaceVariant}cc`, fontWeight: 600 }}>{author}</span>
            </div>

            {/*
              STUB: no comments/discussion feature exists on this site.
              Placeholder only, kept for UX parity with the WP reference (Brief 85).
              Revisit if/when a comments feature is ever scoped.
            */}
            <div style={rowStyle}>
              <span style={labelStyle}>Discussion</span>
              <span style={{ color: `${ADMIN_COLORS.onSurfaceVariant}cc`, fontWeight: 600 }}>Closed</span>
            </div>

            <div style={{ ...rowStyle, borderBottom: 'none' }}>
              <span style={labelStyle}>Parent</span>
              <ParentPopover
                label={parent.label}
                editable={parent.editable}
                value={parent.value}
                options={parent.options}
                onChange={parent.onChange}
              />
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
