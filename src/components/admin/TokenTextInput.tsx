'use client';

/**
 * Labeled single-line (or short multi-line) text field with an "Insert variable"
 * button (Brief 77, Feature B). Used for headline / subheading / CTA fields so
 * tokens like `{{phone}}` can go into any text, not just rich-text bodies.
 *
 * Styling is passed in (`fieldStyle` / `labelStyle`) so each admin editor keeps
 * its existing look; the component only adds the label+button row and its own
 * ref for caret-aware insertion.
 */

import { useRef } from 'react';
import InsertVariableButton from './InsertVariableButton';

export default function TokenTextInput({
  label,
  value,
  onChange,
  multiline = false,
  rows = 3,
  fieldStyle,
  labelStyle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
  fieldStyle?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
}) {
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '0.5rem',
          marginBottom: '0.25rem',
        }}
      >
        <label style={labelStyle}>{label}</label>
        <InsertVariableButton targetRef={ref} value={value} onChange={onChange} />
      </div>
      {multiline ? (
        <textarea
          ref={ref}
          style={fieldStyle}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          ref={ref}
          style={fieldStyle}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
