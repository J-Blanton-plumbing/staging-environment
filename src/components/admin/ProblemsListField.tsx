'use client';

/**
 * Repeatable one-line "Problems We Solve" input list (Brief 86, item 4).
 *
 * Replaces the old single newline-delimited textarea with individual inputs —
 * one per problem — so the list can be reordered/edited/added-to without
 * juggling delimiters. A floor of 3 inputs is always enforced (the remove
 * control is hidden once exactly 3 remain); there is no ceiling.
 */

import { ADMIN_COLORS } from '@/lib/admin/theme';

const MIN_PROBLEMS = 3;

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

/** Pad `items` up to the minimum floor with blank entries — never trims. */
export function padToMinProblems(items: string[]): string[] {
  return items.length >= MIN_PROBLEMS
    ? items
    : [...items, ...Array(MIN_PROBLEMS - items.length).fill('')];
}

export default function ProblemsListField({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const list = items.length ? items : padToMinProblems([]);

  function setAt(i: number, value: string) {
    const next = [...list];
    next[i] = value;
    onChange(next);
  }

  function removeAt(i: number) {
    if (list.length <= MIN_PROBLEMS) return;
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
              placeholder={`Item ${i + 1}`}
              style={INPUT}
            />
            {list.length > MIN_PROBLEMS && (
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
        + Add Item
      </button>
    </div>
  );
}
