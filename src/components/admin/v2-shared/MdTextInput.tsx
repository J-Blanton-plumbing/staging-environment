'use client';

/**
 * Brief 212 (= Brief 206 decision 4) — a text field whose links are stored as `[label](/href)`, the
 * only markup City Hub and City Service V2 copy carries (what the views render). Editors never type
 * that syntax: they select words and press **Link**, then give a site path (/geneva/sewer-repair) or
 * a full https:// address. A preview under the field shows the text with its links resolved, and the
 * same checks the server runs (no literal phone number, no `tel:`, no malformed link) show inline.
 */
import { useRef } from 'react';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import { hasLiteralPhone, linkProblem, mdLinks, mdSyntaxProblem, PHONE_MESSAGE } from '@/lib/cms-v2/shared';
import { BRAND, LABEL } from '@/components/admin/sewer-v2/ui';

const FONT = 'var(--font-nunito), system-ui, sans-serif';
const INPUT: React.CSSProperties = {
  display: 'block', width: '100%', padding: '0.5rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
  fontFamily: FONT, fontSize: '0.9rem', color: ADMIN_COLORS.onSurface, background: ADMIN_COLORS.surfaceContainerLow, boxSizing: 'border-box',
};
const HINT: React.CSSProperties = { fontFamily: FONT, fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}cc`, margin: '0.25rem 0 0', lineHeight: 1.5 };
const WARN: React.CSSProperties = { ...HINT, color: BRAND.cream, background: `${BRAND.carmine}cc`, borderRadius: '0.4rem', padding: '0.2rem 0.5rem', display: 'inline-block' };
const SMALL_BTN: React.CSSProperties = {
  fontFamily: FONT, fontSize: '12px', fontWeight: 600, color: ADMIN_COLORS.onSurface, background: ADMIN_COLORS.surfaceContainerHigh,
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.4rem', padding: '0.2rem 0.55rem', cursor: 'pointer', lineHeight: 1.4,
};

function Preview({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <a key={m.index} href={m[2]} target="_blank" rel="noreferrer" style={{ color: BRAND.cerulean, textDecoration: 'underline' }} title={m[2]}>
        {m[1]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function MdTextInput({
  label, value, onChange, multiline, hint, limit, readOnly, links = true, actions,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  hint?: React.ReactNode;
  limit?: number;
  readOnly?: boolean;
  /** false = a plain field (no Link button; links refused). */
  links?: boolean;
  /** Extra buttons beside Link (e.g. "Auto-fill from answer"). */
  actions?: React.ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const over = limit !== undefined && value.length > limit;
  const issues: string[] = [];
  if (hasLiteralPhone(value)) issues.push(PHONE_MESSAGE);
  if (links) {
    const syn = mdSyntaxProblem(value);
    if (syn) issues.push(syn);
    for (const l of mdLinks(value)) {
      const p = linkProblem(l.href);
      if (p) issues.push(p);
    }
  }
  const addLink = () => {
    const el = ref.current;
    if (!el) return;
    const a = el.selectionStart ?? 0;
    const b = el.selectionEnd ?? 0;
    if (a === b) {
      window.alert('Select the words to turn into a link first.');
      return;
    }
    const href = window.prompt('Link to (a site path like /geneva/sewer-repair, or a full https:// address):');
    if (!href) return;
    const words = value.slice(a, b).replace(/[[\]]/g, '');
    onChange(`${value.slice(0, a)}[${words}](${href.trim()})${value.slice(b)}`);
  };
  const removeLinks = () => {
    const el = ref.current;
    const a = el?.selectionStart ?? 0;
    const b = el?.selectionEnd ?? value.length;
    const [from, to] = a === b ? [0, value.length] : [a, b];
    onChange(value.slice(0, from) + value.slice(from, to).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '$1') + value.slice(to));
  };
  const hasLink = links && /\[[^\]]+\]\([^)\s]+\)/.test(value);
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={LABEL}>
        {label}
        {limit !== undefined && (
          <span style={{ fontWeight: 400, marginLeft: '0.5rem', color: over ? BRAND.carmine : `${ADMIN_COLORS.onSurfaceVariant}cc` }}>
            {value.length}/{limit}
          </span>
        )}
      </label>
      {!readOnly && (links || actions) && (
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
          {links && (
            <>
              <button type="button" style={SMALL_BTN} onClick={addLink} title="Turn the selected words into a link">Link</button>
              {hasLink && <button type="button" style={SMALL_BTN} onClick={removeLinks} title="Remove the links in the selection (or the whole field)">Remove link</button>}
            </>
          )}
          {actions}
        </div>
      )}
      {multiline ? (
        <textarea
          ref={ref}
          className="field"
          value={value}
          readOnly={readOnly}
          rows={Math.min(8, Math.max(2, Math.ceil(value.length / 90)))}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...INPUT, resize: 'vertical' }}
        />
      ) : (
        <input ref={ref} className="field" type="text" value={value} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} style={INPUT} />
      )}
      {hasLink && (
        <p style={{ ...HINT, color: ADMIN_COLORS.onSurface }}>
          <span style={{ opacity: 0.7 }}>Shows as: </span>
          <Preview text={value} />
        </p>
      )}
      {hint && <p style={HINT}>{hint}</p>}
      {issues.map((i) => (
        <p key={i} style={WARN}>{i}</p>
      ))}
    </div>
  );
}
