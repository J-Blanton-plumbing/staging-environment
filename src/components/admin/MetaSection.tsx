'use client';

import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';

interface MetaSectionProps {
  metaTitle: string;
  metaDescription: string;
  onMetaTitleChange: (v: string) => void;
  onMetaDescriptionChange: (v: string) => void;
}

const TITLE_LIMIT = 60;
const DESC_LIMIT = 160;

export default function MetaSection({
  metaTitle,
  metaDescription,
  onMetaTitleChange,
  onMetaDescriptionChange,
}: MetaSectionProps) {
  const titleOver = metaTitle.length > TITLE_LIMIT;
  const descOver = metaDescription.length > DESC_LIMIT;

  return (
    <div
      style={{
        marginTop: '2rem',
        background: ADMIN_COLORS.surfaceContainerLow,
        border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
        borderRadius: '1.5rem',
        boxShadow: ADMIN_SHADOWS.elegant,
        padding: '1.5rem',
      }}
    >
      <style>{`
        .admin-field:focus { outline: none; box-shadow: 0 0 0 1px ${ADMIN_COLORS.primary}66; }
      `}</style>
      <p
        style={{
          fontFamily: 'var(--font-outfit), system-ui, sans-serif',
          fontWeight: 700,
          fontSize: '0.875rem',
          color: `${ADMIN_COLORS.onSurface}CC`,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          margin: '0 0 1rem',
        }}
      >
        SEO / Meta
      </p>

      {/* Meta Title */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-nunito), system-ui, sans-serif',
            fontSize: '13px',
            fontWeight: 600,
            color: ADMIN_COLORS.onSurface,
            marginBottom: '0.25rem',
          }}
        >
          Meta Title
        </label>
        <input
          type="text"
          className="admin-field"
          value={metaTitle}
          onChange={e => onMetaTitleChange(e.target.value)}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.4rem 0.5rem',
            background: ADMIN_COLORS.surfaceContainer,
            border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
            borderRadius: '0.5rem',
            color: ADMIN_COLORS.onSurface,
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            boxSizing: 'border-box',
            marginBottom: '0.25rem',
          }}
        />
        <p
          style={{
            fontFamily: 'var(--font-nunito), system-ui, sans-serif',
            fontSize: '12px',
            color: titleOver ? ADMIN_COLORS.error : `${ADMIN_COLORS.onSurfaceVariant}99`,
            margin: 0,
          }}
        >
          Recommended: 50–60 characters. Current: {metaTitle.length} / {TITLE_LIMIT}
        </p>
      </div>

      {/* Meta Description */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--font-nunito), system-ui, sans-serif',
            fontSize: '13px',
            fontWeight: 600,
            color: ADMIN_COLORS.onSurface,
            marginBottom: '0.25rem',
          }}
        >
          Meta Description
        </label>
        <textarea
          rows={3}
          className="admin-field"
          value={metaDescription}
          onChange={e => onMetaDescriptionChange(e.target.value)}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.4rem 0.5rem',
            background: ADMIN_COLORS.surfaceContainer,
            border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
            borderRadius: '0.5rem',
            color: ADMIN_COLORS.onSurface,
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            boxSizing: 'border-box',
            marginBottom: '0.25rem',
            resize: 'vertical',
          }}
        />
        <p
          style={{
            fontFamily: 'var(--font-nunito), system-ui, sans-serif',
            fontSize: '12px',
            color: descOver ? ADMIN_COLORS.error : `${ADMIN_COLORS.onSurfaceVariant}99`,
            margin: 0,
          }}
        >
          Recommended: 150–160 characters. Current: {metaDescription.length} / {DESC_LIMIT}
        </p>
      </div>
    </div>
  );
}
