'use client';

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
        paddingTop: '1.5rem',
        borderTop: '1px solid rgba(0,0,0,0.1)',
      }}
    >
      <p
        style={{
          fontFamily: 'Industry, sans-serif',
          fontWeight: 600,
          fontSize: '13px',
          color: '#0A1B2E',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
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
            fontFamily: 'Nunito, sans-serif',
            fontSize: '13px',
            fontWeight: 600,
            color: '#0A1B2E',
            marginBottom: '0.25rem',
          }}
        >
          Meta Title
        </label>
        <input
          type="text"
          value={metaTitle}
          onChange={e => onMetaTitleChange(e.target.value)}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.4rem 0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            boxSizing: 'border-box',
            marginBottom: '0.25rem',
          }}
        />
        <p
          style={{
            fontFamily: 'Nunito, sans-serif',
            fontSize: '12px',
            color: titleOver ? '#BC0E0E' : '#6b7280',
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
            fontFamily: 'Nunito, sans-serif',
            fontSize: '13px',
            fontWeight: 600,
            color: '#0A1B2E',
            marginBottom: '0.25rem',
          }}
        >
          Meta Description
        </label>
        <textarea
          rows={3}
          value={metaDescription}
          onChange={e => onMetaDescriptionChange(e.target.value)}
          style={{
            display: 'block',
            width: '100%',
            padding: '0.4rem 0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            boxSizing: 'border-box',
            marginBottom: '0.25rem',
            resize: 'vertical',
          }}
        />
        <p
          style={{
            fontFamily: 'Nunito, sans-serif',
            fontSize: '12px',
            color: descOver ? '#BC0E0E' : '#6b7280',
            margin: 0,
          }}
        >
          Recommended: 150–160 characters. Current: {metaDescription.length} / {DESC_LIMIT}
        </p>
      </div>
    </div>
  );
}
