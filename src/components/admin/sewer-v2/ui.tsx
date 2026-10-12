'use client';

/**
 * Brief 204 — field primitives for the Sewer v2 editors (/admin/sub-service/<sewer slug>, /admin/sewer).
 *
 * Colours: the admin's existing dark theme tokens (ADMIN_COLORS) for surfaces and text, and only the
 * brand colours for anything new — Cerulean for actions, Carmine for warnings, Cream for notice
 * text, Midnight for surfaces (brand-rules.md; no pure black).
 */
import { useRef, useState } from 'react';
import ImageUploaderField from '@/components/admin/ImageUploaderField';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import type { SewerNode } from '@/lib/content/sewer-v2/types';
import { htmlToInlineNodes, inlineNodesToHtml, PHONE_TOKEN } from '@/lib/sewer-v2-cms/rich';
import { hasLiteralPhone, linkProblem, PHONE_MESSAGE } from '@/lib/sewer-v2-cms/conform';

export const BRAND = { carmine: '#BC0E0E', midnight: '#0A1B2E', cream: '#F9F3EC', cerulean: '#1560E6' } as const;
const FONT = 'var(--font-nunito), system-ui, sans-serif';
const HEAD = 'var(--font-outfit), system-ui, sans-serif';

export const LABEL: React.CSSProperties = { display: 'block', fontFamily: FONT, fontSize: '13px', fontWeight: 600, color: ADMIN_COLORS.onSurface, marginBottom: '0.25rem' };
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

export function Group({ title, note, children, id }: { title: string; note?: React.ReactNode; children?: React.ReactNode; id?: string }) {
  return (
    <section
      id={id}
      style={{
        background: ADMIN_COLORS.surfaceContainerLow, border: `1px solid ${ADMIN_COLORS.outlineVariant}33`, borderRadius: '1.5rem',
        padding: '1.5rem', marginBottom: '1.25rem', boxShadow: ADMIN_SHADOWS.elegant,
      }}
    >
      <h3 style={{ fontFamily: HEAD, color: ADMIN_COLORS.onSurface, fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>
        {title}
      </h3>
      {note && <p style={{ ...HINT, margin: '0 0 1rem' }}>{note}</p>}
      {children}
    </section>
  );
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn'; children: React.ReactNode }) {
  return (
    <div
      role={tone === 'warn' ? 'alert' : 'note'}
      style={{
        fontFamily: FONT, fontSize: '14px', lineHeight: 1.5, color: BRAND.cream, borderRadius: '0.75rem', padding: '0.85rem 1rem', marginBottom: '1.25rem',
        background: tone === 'warn' ? `${BRAND.carmine}e6` : `${BRAND.cerulean}33`, border: `1px solid ${tone === 'warn' ? BRAND.carmine : BRAND.cerulean}`,
      }}
    >
      {children}
    </div>
  );
}

function phoneWarning(value: string) {
  return hasLiteralPhone(value) ? <p style={WARN}>{PHONE_MESSAGE}</p> : null;
}

export function TextInput({
  label, value, onChange, multiline, hint, limit, link, readOnly,
}: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; hint?: React.ReactNode; limit?: number; link?: boolean; readOnly?: boolean;
}) {
  const over = limit !== undefined && value.length > limit;
  const linkIssue = link && value ? linkProblem(value) : null;
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
      {multiline ? (
        <textarea className="field" value={value} readOnly={readOnly} rows={Math.min(8, Math.max(2, Math.ceil(value.length / 90)))} onChange={(e) => onChange(e.target.value)} style={{ ...INPUT, resize: 'vertical' }} />
      ) : (
        <input className="field" type="text" value={value} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} style={INPUT} />
      )}
      {hint && <p style={HINT}>{hint}</p>}
      {linkIssue && <p style={WARN}>{linkIssue}</p>}
      {!link && phoneWarning(value)}
    </div>
  );
}

/**
 * A rich-text field: inline HTML limited to <strong>, <em>, <a href>, <br> and {{phone}}. The text
 * the editor types is kept as typed; the tree it parses to is what is saved. The approved inline
 * colours (carmine links, Midnight bold lead-ins) are re-applied by the server, so they are not shown.
 */
export function RichInput({ label, value, onChange, readOnly }: { label: string; value: readonly SewerNode[] | string; onChange: (nodes: SewerNode[]) => void; readOnly?: boolean }) {
  const [text, setText] = useState(() => inlineNodesToHtml(value as SewerNode[] | string));
  const ref = useRef<HTMLTextAreaElement>(null);
  const update = (t: string) => {
    setText(t);
    onChange(htmlToInlineNodes(t));
  };
  const wrap = (open: string, close: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    update(text.slice(0, a) + open + text.slice(a, b) + close + text.slice(b));
  };
  const insert = (s: string) => {
    const el = ref.current;
    const at = el ? el.selectionStart : text.length;
    update(text.slice(0, at) + s + text.slice(at));
  };
  const plain = text.replace(/<[^>]*>/g, '');
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={LABEL}>{label}</label>
      {!readOnly && (
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
          <button type="button" style={SMALL_BTN} onClick={() => wrap('<strong>', '</strong>')} title="Bold">B</button>
          <button type="button" style={{ ...SMALL_BTN, fontStyle: 'italic' }} onClick={() => wrap('<em>', '</em>')} title="Italic">I</button>
          <button
            type="button"
            style={SMALL_BTN}
            onClick={() => {
              const href = typeof window !== 'undefined' ? window.prompt('Link to (a site path like /financing, or a full https:// address). Type {{phone}} for a call link.') : null;
              if (href) wrap(`<a href="${href.replace(/"/g, '&quot;')}">`, '</a>');
            }}
            title="Link"
          >
            Link
          </button>
          <button type="button" style={SMALL_BTN} onClick={() => insert(PHONE_TOKEN)} title="Insert the phone number">{PHONE_TOKEN}</button>
        </div>
      )}
      <textarea ref={ref} className="field" value={text} readOnly={readOnly} rows={Math.min(10, Math.max(2, Math.ceil(text.length / 90)))} onChange={(e) => update(e.target.value)} style={{ ...INPUT, resize: 'vertical' }} />
      <p style={HINT}>
        Bold, italic, links and {PHONE_TOKEN} only ({PHONE_TOKEN} shows the current phone number from Global Settings and is swapped by call tracking).
      </p>
      {phoneWarning(plain)}
    </div>
  );
}

export function ImageInput({ label, src, alt, onSrc, onAlt, decorative }: { label: string; src: string; alt?: string; onSrc: (v: string) => void; onAlt?: (v: string) => void; decorative?: boolean }) {
  return (
    <div style={{ marginBottom: '0.5rem', paddingLeft: '0.75rem', borderLeft: `2px solid ${ADMIN_COLORS.outlineVariant}55` }}>
      <ImageUploaderField label={label} value={src} onChange={onSrc} />
      {onAlt !== undefined && alt !== undefined ? (
        <TextInput label={`${label} — alt text`} value={alt} onChange={onAlt} hint="Describes the image for screen readers and Google." />
      ) : decorative ? (
        <p style={{ ...HINT, marginTop: '-0.75rem', marginBottom: '1rem' }}>Decorative image (no alt text by design).</p>
      ) : null}
    </div>
  );
}

let keySeq = 0;
const newKey = () => `k${++keySeq}`;

/**
 * Add / remove / ▲▼ reorder with STABLE per-item keys (the Brief 168 / Article V2 shape): the keys move
 * with their items, so a reorder never shows one item's half-typed text in another's field.
 */
export function Repeater<T>({
  label, items, onChange, newItem, renderItem, itemLabel, min = 1, readOnly, addLabel,
}: {
  label: string;
  items: readonly T[];
  onChange: (next: T[]) => void;
  newItem: (items: readonly T[]) => T;
  renderItem: (item: T, update: (next: T) => void, index: number) => React.ReactNode;
  itemLabel?: (item: T, index: number) => string;
  min?: number;
  readOnly?: boolean;
  addLabel?: string;
}) {
  const keys = useRef<string[]>([]);
  if (keys.current.length !== items.length) keys.current = items.map(() => newKey());
  const set = (next: T[], nextKeys: string[]) => {
    keys.current = nextKeys;
    onChange(next);
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const n = [...items];
    const k = [...keys.current];
    [n[i], n[j]] = [n[j], n[i]];
    [k[i], k[j]] = [k[j], k[i]];
    set(n, k);
  };
  const remove = (i: number) => {
    if (items.length <= min) return;
    set(items.filter((_, x) => x !== i), keys.current.filter((_, x) => x !== i));
  };
  const add = () => set([...items, newItem(items)], [...keys.current, newKey()]);
  return (
    <div style={{ marginBottom: '1rem' }}>
      <p style={{ ...LABEL, marginBottom: '0.5rem' }}>
        {label} <span style={{ fontWeight: 400, color: `${ADMIN_COLORS.onSurfaceVariant}cc` }}>({items.length})</span>
      </p>
      {items.map((item, i) => (
        <div
          key={keys.current[i]}
          style={{ border: `1px solid ${ADMIN_COLORS.outlineVariant}44`, borderRadius: '0.9rem', padding: '0.9rem 1rem 0.25rem', marginBottom: '0.6rem', background: ADMIN_COLORS.surfaceContainer }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <span style={{ fontFamily: FONT, fontSize: '12px', fontWeight: 700, color: `${ADMIN_COLORS.onSurfaceVariant}dd` }}>
              {itemLabel ? itemLabel(item, i) : `Item ${i + 1}`}
            </span>
            {!readOnly && (
              <span style={{ display: 'flex', gap: '0.3rem' }}>
                <button type="button" style={SMALL_BTN} onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">▲</button>
                <button type="button" style={SMALL_BTN} onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">▼</button>
                <button
                  type="button"
                  style={{ ...SMALL_BTN, color: BRAND.cream, background: items.length <= min ? ADMIN_COLORS.surfaceContainerHigh : `${BRAND.carmine}cc` }}
                  onClick={() => remove(i)}
                  disabled={items.length <= min}
                  aria-label="Remove"
                  title={items.length <= min ? 'A list needs at least one item' : 'Remove'}
                >
                  −
                </button>
              </span>
            )}
          </div>
          {renderItem(item, (next) => onChange(items.map((x, y) => (y === i ? next : x)) as T[]), i)}
        </div>
      ))}
      {!readOnly && (
        <button type="button" style={{ ...SMALL_BTN, background: BRAND.cerulean, color: BRAND.cream, border: 'none', padding: '0.35rem 0.85rem' }} onClick={add}>
          + {addLabel ?? 'Add item'}
        </button>
      )}
    </div>
  );
}

/** A select (featured service, hub order entries). */
export function Select({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={LABEL}>{label}</label>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)} style={INPUT}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
