'use client';

import { useMemo, useRef, useState } from 'react';
import RichTextField from '@/components/admin/RichTextField';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import {
  EMPTY_V2_COMPONENT_ITEM,
  V2_COMPONENT_FIELDS,
  V2_COMPONENT_LABELS,
  V2_COMPONENT_TYPES,
  componentMarker,
  isSafeComponentUrl,
  scanComponentMarkers,
  slugifyComponentName,
  suggestComponentName,
  type ArticleV2Component,
  type V2ComponentItem,
  type V2ComponentType,
} from '@/lib/cms/article-v2';

/**
 * Brief 192 (Track B) — "Content components" in the Article V2 editor: Promise
 * list, Service rows and Feature cards. Each has a short name; its marker
 * [[component:<name>]], pasted on its own line in the body, is where it renders.
 *
 * The warnings (component not placed, marker without a component, marker used
 * twice, marker inside other text, duplicate name, ignored link) are shown HERE
 * only — the public page silently renders nothing for any of them.
 *
 * Components ride in the version content with the other V2 fields (Save →
 * preview → Publish); the bottom "Save Article" button skips them (Brief 190).
 */

const FONT = 'var(--font-nunito), system-ui, sans-serif';
const LABEL: React.CSSProperties = { display: 'block', fontFamily: FONT, fontSize: '13px', fontWeight: 600, color: ADMIN_COLORS.onSurface, marginBottom: '0.25rem' };
const HELP: React.CSSProperties = { fontFamily: FONT, fontSize: '12px', lineHeight: 1.5, color: ADMIN_COLORS.onSurfaceVariant, margin: '0.3rem 0 0' };
const WARN: React.CSSProperties = { fontFamily: FONT, fontSize: '12px', lineHeight: 1.45, color: ADMIN_COLORS.warning, margin: '0.25rem 0 0' };
const INPUT: React.CSSProperties = {
  display: 'block', width: '100%', padding: '0.5rem', border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
  fontFamily: FONT, fontSize: '0.9rem', color: ADMIN_COLORS.onSurface, background: ADMIN_COLORS.surfaceContainerLow, boxSizing: 'border-box',
};
const CARD: React.CSSProperties = {
  background: ADMIN_COLORS.surfaceContainer, border: `1px solid ${ADMIN_COLORS.outlineVariant}33`, borderRadius: '1rem',
  padding: '1rem', marginBottom: '0.75rem', boxShadow: ADMIN_SHADOWS.sm,
};
const ITEM: React.CSSProperties = {
  background: ADMIN_COLORS.surfaceContainerLow, border: `1px solid ${ADMIN_COLORS.outlineVariant}33`, borderRadius: '0.75rem',
  padding: '0.75rem', marginBottom: '0.6rem',
};
const SMALL_BTN: React.CSSProperties = {
  background: 'none', border: `1px dashed ${ADMIN_COLORS.outlineVariant}99`, borderRadius: '0.5rem', color: ADMIN_COLORS.cerulean,
  fontFamily: FONT, fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: '0.4rem 0.9rem',
};
const REMOVE: React.CSSProperties = {
  background: 'none', border: `1px solid ${ADMIN_COLORS.error}66`, color: ADMIN_COLORS.error, borderRadius: '9999px',
  padding: '0.2rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, flexShrink: 0,
};
const moveStyle = (disabled: boolean): React.CSSProperties => ({
  background: 'none', border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, color: ADMIN_COLORS.onSurfaceVariant, borderRadius: '9999px',
  width: '1.6rem', height: '1.6rem', fontSize: '0.8rem', cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1, lineHeight: 1, flexShrink: 0,
});

function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function Controls({ i, count, noun, onMove, onRemove }: { i: number; count: number; noun: string; onMove: (d: -1 | 1) => void; onRemove: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <button type="button" onClick={() => onMove(-1)} disabled={i === 0} aria-label={`Move ${noun} ${i + 1} up`} style={moveStyle(i === 0)}>▲</button>
      <button type="button" onClick={() => onMove(1)} disabled={i === count - 1} aria-label={`Move ${noun} ${i + 1} down`} style={moveStyle(i === count - 1)}>▼</button>
      <button type="button" onClick={onRemove} aria-label={`Remove ${noun} ${i + 1}`} style={REMOVE}>Remove</button>
    </div>
  );
}

/** Lenient while typing (a trailing hyphen is allowed); fully slugified on save. */
function typeName(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-{2,}/g, '-').replace(/^-+/, '').slice(0, 40);
}

const ITEM_NOUN: Record<V2ComponentType, string> = { promises: 'promise', services: 'service', cards: 'card' };
const ITEM_TITLE: Record<V2ComponentType, string> = { promises: 'Promise (bold)', services: 'Service name', cards: 'Card title (heading)' };

export default function ArticleV2ComponentsField({
  value,
  onChange,
  body,
}: {
  value: ArticleV2Component[];
  onChange: (next: ArticleV2Component[]) => void;
  body: string;
}) {
  const [addType, setAddType] = useState<V2ComponentType>('promises');
  const [copied, setCopied] = useState<string | null>(null);

  // Stable keys (RichTextField stamps its surface from `value` only on mount —
  // an index key would show a moved card its neighbour's text). Keys move with
  // their rows and are regenerated when the list arrives from outside (a version load).
  const seq = useRef(0);
  const compKeys = useRef<number[]>([]);
  const itemKeys = useRef<number[][]>([]);
  const emitted = useRef<ArticleV2Component[] | null>(null);
  if (value !== emitted.current) {
    compKeys.current = value.map(() => ++seq.current);
    itemKeys.current = value.map((c) => c.items.map(() => ++seq.current));
    emitted.current = value;
  }
  function emit(next: ArticleV2Component[], ck: number[], ik: number[][]) {
    compKeys.current = ck;
    itemKeys.current = ik;
    emitted.current = next;
    onChange(next);
  }
  const setComp = (i: number, patch: Partial<ArticleV2Component>) =>
    emit(value.map((c, n) => (n === i ? { ...c, ...patch } : c)), compKeys.current, itemKeys.current);
  const setItems = (i: number, items: V2ComponentItem[], keys: number[]) =>
    emit(
      value.map((c, n) => (n === i ? { ...c, items } : c)),
      compKeys.current,
      itemKeys.current.map((k, n) => (n === i ? keys : k))
    );

  function addComponent() {
    const name = suggestComponentName(addType, value.map((c) => c.name));
    emit(
      [...value, { name, type: addType, items: [{ ...EMPTY_V2_COMPONENT_ITEM }] }],
      [...compKeys.current, ++seq.current],
      [...itemKeys.current, [++seq.current]]
    );
  }

  async function copyMarker(marker: string) {
    try {
      await navigator.clipboard.writeText(marker);
    } catch {
      const t = document.createElement('textarea');
      t.value = marker;
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setCopied(marker);
    window.setTimeout(() => setCopied((c) => (c === marker ? null : c)), 1500);
  }

  // ── Warnings (admin only) ──
  const scan = useMemo(() => scanComponentMarkers(body), [body]);
  const names = value.map((c) => slugifyComponentName(c.name));
  const orphanMarkers = Array.from(new Set([...Array.from(scan.standalone.keys()), ...Array.from(scan.inline.keys())])).filter(
    (n) => !names.includes(n)
  );

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>Content components</label>
      <p style={{ ...HELP, margin: '0 0 0.6rem' }}>
        Promise list, Service rows and Feature cards, in the approved design. Each shows where its marker (e.g.{' '}
        <code>{componentMarker('promises')}</code>) is pasted on its own line in the Body. A component without a marker is not shown.
      </p>

      {orphanMarkers.map((n) => (
        <p key={`orphan-${n}`} style={WARN} role="status">
          ⚠ The body has <code>{componentMarker(n)}</code>, but no component is named “{n}” — that marker shows nothing on the page.
        </p>
      ))}

      {value.map((c, i) => {
        const f = V2_COMPONENT_FIELDS[c.type];
        const name = slugifyComponentName(c.name);
        const marker = componentMarker(name || '…');
        const placed = scan.standalone.get(name) ?? 0;
        const inlineOnly = (scan.inline.get(name) ?? 0) > 0;
        const dupName = !!name && names.filter((x) => x === name).length > 1;
        const ik = itemKeys.current[i] ?? [];
        return (
          <div key={compKeys.current[i] ?? `c${i}`} style={CARD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: ADMIN_COLORS.onSurface, margin: 0, fontFamily: FONT }}>
                {V2_COMPONENT_LABELS[c.type]}
              </p>
              <Controls
                i={i}
                count={value.length}
                noun="component"
                onMove={(d) => emit(move(value, i, d), move(compKeys.current, i, d), move(itemKeys.current, i, d))}
                onRemove={() =>
                  emit(value.filter((_, n) => n !== i), compKeys.current.filter((_, n) => n !== i), itemKeys.current.filter((_, n) => n !== i))
                }
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
              <div>
                <label style={LABEL} htmlFor={`v2c-name-${i}`}>Short name</label>
                <input
                  id={`v2c-name-${i}`}
                  className="field"
                  type="text"
                  value={c.name}
                  onChange={(e) => setComp(i, { name: typeName(e.target.value) })}
                  onBlur={() => setComp(i, { name: slugifyComponentName(c.name) })}
                  placeholder="e.g. stays-the-same"
                  style={INPUT}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <code style={{ fontFamily: 'ui-monospace, monospace', fontSize: '12.5px', color: ADMIN_COLORS.onSurface, padding: '0.45rem 0.6rem', borderRadius: '0.5rem', background: ADMIN_COLORS.surfaceContainerLow, border: `1px solid ${ADMIN_COLORS.outlineVariant}44`, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {marker}
                </code>
                <button type="button" onClick={() => copyMarker(marker)} disabled={!name} style={{ ...SMALL_BTN, borderStyle: 'solid', flexShrink: 0 }}>
                  {copied === marker ? 'Copied' : 'Copy marker'}
                </button>
              </div>
            </div>
            {!name && <p style={WARN}>⚠ Give this component a short name — its marker needs one.</p>}
            {dupName && <p style={WARN}>⚠ Another component is also named “{name}”. Rename one: on save the second becomes “{name}-2”.</p>}
            {name && placed === 0 && !inlineOnly && (
              <p style={WARN}>⚠ Not shown on the page: paste <code>{marker}</code> on its own line in the Body.</p>
            )}
            {name && placed === 0 && inlineOnly && (
              <p style={WARN}>⚠ The marker is inside other text in the Body. Put <code>{marker}</code> on a line of its own, or it shows nothing.</p>
            )}
            {placed > 1 && <p style={WARN}>⚠ The marker is used {placed} times in the Body — only the first one shows.</p>}

            <div style={{ marginTop: '0.9rem' }}>
              {c.items.map((it, j) => {
                const setItem = (patch: Partial<V2ComponentItem>) =>
                  setItems(i, c.items.map((x, n) => (n === j ? { ...x, ...patch } : x)), ik);
                const badLink = f.link && (it.link_label.trim() !== '' || it.link_url.trim() !== '') && !(it.link_label.trim() && isSafeComponentUrl(it.link_url));
                return (
                  <div key={ik[j] ?? `i${j}`} style={ITEM}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <span style={{ fontFamily: FONT, fontSize: '12px', fontWeight: 700, color: ADMIN_COLORS.onSurfaceVariant, textTransform: 'capitalize' }}>
                        {ITEM_NOUN[c.type]} {j + 1}
                      </span>
                      <Controls
                        i={j}
                        count={c.items.length}
                        noun={ITEM_NOUN[c.type]}
                        onMove={(d) => setItems(i, move(c.items, j, d), move(ik, j, d))}
                        onRemove={() => setItems(i, c.items.filter((_, n) => n !== j), ik.filter((_, n) => n !== j))}
                      />
                    </div>
                    <label style={LABEL} htmlFor={`v2c-${i}-${j}-t`}>{ITEM_TITLE[c.type]}</label>
                    <input id={`v2c-${i}-${j}-t`} className="field" type="text" value={it.title} onChange={(e) => setItem({ title: e.target.value })} style={{ ...INPUT, marginBottom: '0.6rem' }} />
                    {f.inlineText ? (
                      <RichTextField
                        label="Text"
                        value={it.text}
                        onChange={(v) => setItem({ text: v })}
                        rows={3}
                        help="Bold, italic and links only. {{phone}} becomes the article's phone number."
                      />
                    ) : (
                      <>
                        <label style={LABEL} htmlFor={`v2c-${i}-${j}-x`}>Text</label>
                        <textarea id={`v2c-${i}-${j}-x`} className="field" value={it.text} onChange={(e) => setItem({ text: e.target.value })} rows={2} style={{ ...INPUT, resize: 'vertical', lineHeight: 1.5 }} />
                        <p style={HELP}>Plain text.</p>
                      </>
                    )}
                    {f.checklist && (
                      <div style={{ marginTop: '0.6rem' }}>
                        <label style={LABEL}>Checklist (optional)</label>
                        {it.checklist.map((b, k) => (
                          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <span aria-hidden style={{ color: ADMIN_COLORS.secondaryContainer, fontWeight: 700 }}>✓</span>
                            <input
                              className="field"
                              type="text"
                              value={b}
                              aria-label={`Checklist item ${k + 1}`}
                              onChange={(e) => setItem({ checklist: it.checklist.map((x, n) => (n === k ? e.target.value : x)) })}
                              style={{ ...INPUT, flex: 1 }}
                            />
                            <Controls
                              i={k}
                              count={it.checklist.length}
                              noun="checklist item"
                              onMove={(d) => setItem({ checklist: move(it.checklist, k, d) })}
                              onRemove={() => setItem({ checklist: it.checklist.filter((_, n) => n !== k) })}
                            />
                          </div>
                        ))}
                        <button type="button" onClick={() => setItem({ checklist: [...it.checklist, ''] })} style={SMALL_BTN}>+ Add checklist item</button>
                      </div>
                    )}
                    {f.link && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '0.6rem' }}>
                        <div>
                          <label style={LABEL} htmlFor={`v2c-${i}-${j}-ll`}>Link label (optional)</label>
                          <input id={`v2c-${i}-${j}-ll`} className="field" type="text" value={it.link_label} onChange={(e) => setItem({ link_label: e.target.value })} placeholder="e.g. Explore drain services" style={INPUT} />
                        </div>
                        <div>
                          <label style={LABEL} htmlFor={`v2c-${i}-${j}-lu`}>Link URL</label>
                          <input id={`v2c-${i}-${j}-lu`} className="field" type="text" value={it.link_url} onChange={(e) => setItem({ link_url: e.target.value })} placeholder="/services/drain or https://…" style={INPUT} />
                        </div>
                      </div>
                    )}
                    {badLink && <p style={WARN}>⚠ This link is not shown: it needs a label and a URL that starts with / (a site page) or https://.</p>}
                  </div>
                );
              })}
              <button type="button" onClick={() => setItems(i, [...c.items, { ...EMPTY_V2_COMPONENT_ITEM }], [...ik, ++seq.current])} style={SMALL_BTN}>
                + Add {ITEM_NOUN[c.type]}
              </button>
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <select aria-label="Component type" className="field" value={addType} onChange={(e) => setAddType(e.target.value as V2ComponentType)} style={{ ...INPUT, width: 'auto' }}>
          {V2_COMPONENT_TYPES.map((t) => (
            <option key={t} value={t}>{V2_COMPONENT_LABELS[t]}</option>
          ))}
        </select>
        <button type="button" onClick={addComponent} style={SMALL_BTN}>+ Add component</button>
      </div>
    </div>
  );
}
