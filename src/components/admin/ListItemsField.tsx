'use client';

/**
 * Repeatable one-line list-item input (Brief 89, A2).
 *
 * Generalized from the sub-service editor's `ProblemsListField` (Brief 86, item 4)
 * so any editor with a "list of discrete short items" field — problems, featured
 * article slugs, etc. — uses ONE control instead of a newline-delimited textarea.
 * One input per item, each with a bullet marker; a configurable floor of blank
 * inputs (`minItems`, the Remove control hides once the floor is reached); no
 * ceiling. The add control label is configurable.
 */

import { ADMIN_COLORS } from '@/lib/admin/theme';

const LABEL: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  fontSize: '13px',
  fontWeight: 600,
  color: ADMIN_COLORS.onSurface,
  marginBottom: '0.25rem',
};

const INPUT: React.CSSProperties = {
  display: 'block',
  flex: 1,
  padding: '0.5rem',
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
  borderRadius: '0.5rem',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  fontSize: '0.9rem',
  color: ADMIN_COLORS.onSurface,
  background: ADMIN_COLORS.surfaceContainerLow,
  boxSizing: 'border-box',
};

/** Pad `items` up to `min` blank entries — never trims. */
export function padToMin(items: string[], min = 3): string[] {
  return items.length >= min ? items : [...items, ...Array(min - items.length).fill('')];
}

export default function ListItemsField({
  label,
  items,
  onChange,
  minItems = 3,
  addLabel = '+ Add Item',
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  /** Floor of always-present inputs (Remove hides once this many remain). */
  minItems?: number;
  addLabel?: string;
  /** Per-input placeholder; `{n}` is replaced with the 1-based index. */
  placeholder?: string;
}) {
  const list = items.length ? items : padToMin([], minItems);

  function setAt(i: number, value: string) {
    const next = [...list];
    next[i] = value;
    onChange(next);
  }

  function removeAt(i: number) {
    if (list.length <= minItems) return;
    onChange(list.filter((_, idx) => idx !== i));
  }

  function add() {
    onChange([...list, '']);
  }

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {list.map((value, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span aria-hidden style={{ color: ADMIN_COLORS.onSurfaceVariant, fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>
              &bull;
            </span>
            <input
              className="field"
              type="text"
              value={value}
              onChange={e => setAt(i, e.target.value)}
              placeholder={placeholder ? placeholder.replace('{n}', String(i + 1)) : `Item ${i + 1}`}
              style={INPUT}
            />
            {list.length > minItems && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove item ${i + 1}`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: ADMIN_COLORS.error,
                  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  flexShrink: 0,
                }}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        style={{
          marginTop: '0.6rem',
          background: 'none',
          border: `1px dashed ${ADMIN_COLORS.outlineVariant}99`,
          borderRadius: '0.5rem',
          color: ADMIN_COLORS.cerulean,
          fontFamily: 'var(--font-nunito), system-ui, sans-serif',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          padding: '0.4rem 0.9rem',
        }}
      >
        {addLabel}
      </button>
    </div>
  );
}
