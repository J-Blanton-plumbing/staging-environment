'use client';

/**
 * Brief 99 — extracted from the sub-service editor's inline `BlockField`
 * (Brief 90 Track D) so any registry-driven editor renders a block instance's
 * fields the same way. Adds repeater renderers for field types the sub-service
 * editor never needed: `faqRepeater` (Brief 97's `faqAccordion`, first wired to
 * a real editor here) and the three City V2 object-shaped repeaters
 * (`mostRequestedRepeater`/`whyPointRepeater`/`reviewRepeater`).
 */

import RichTextField from '@/components/admin/RichTextField';
import ImageUploaderField from '@/components/admin/ImageUploaderField';
import ListItemsField from '@/components/admin/ListItemsField';
import TokenTextInput from '@/components/admin/TokenTextInput';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import type { BlockFieldDef } from '@/lib/cms/block-catalogue';
import {
  BENEFITS_CARD_COLUMNS,
  type BenefitsCardGroup,
  type BenefitsCardPrice,
  type BenefitsCardColumns,
} from '@/lib/cms/benefits-card';
import {
  MEMBERSHIP_COMPARISON_MAX_PRICES,
  type ComparisonRowData,
  type ComparisonPriceData,
} from '@/lib/cms/membership-comparison';

const LABEL: React.CSSProperties = {
  display: 'block', fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  fontSize: '13px', fontWeight: 600, color: ADMIN_COLORS.onSurface, marginBottom: '0.25rem',
};
const INPUT: React.CSSProperties = {
  display: 'block', width: '100%', padding: '0.5rem',
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '0.9rem', color: ADMIN_COLORS.onSurface,
  background: ADMIN_COLORS.surfaceContainerLow, boxSizing: 'border-box',
};
const CARD: React.CSSProperties = {
  background: ADMIN_COLORS.surfaceContainer, border: `1px solid ${ADMIN_COLORS.outlineVariant}33`, borderRadius: '1rem',
  padding: '1rem', marginBottom: '0.75rem', boxShadow: ADMIN_SHADOWS.sm,
};
const ADD_BTN: React.CSSProperties = {
  background: ADMIN_COLORS.cerulean, border: 'none', borderRadius: '9999px',
  padding: '0.45rem 1.1rem', fontWeight: 600, fontSize: '0.85rem',
  color: '#fff', cursor: 'pointer', boxShadow: ADMIN_SHADOWS.lg,
};
const REMOVE_BTN: React.CSSProperties = {
  background: 'none', border: 'none', color: ADMIN_COLORS.error, fontWeight: 600,
  fontSize: '0.8rem', cursor: 'pointer', padding: 0,
};
const CARD_LABEL: React.CSSProperties = {
  fontWeight: 700, fontSize: '0.8rem', color: ADMIN_COLORS.onSurfaceVariant,
};

const asStr = (v: unknown): string => (typeof v === 'string' ? v : '');

// ── Object-shaped repeaters ─────────────────────────────────────────────────

function ObjectRepeaterField<T extends Record<string, string>>({
  label, items, empty, subFields, minItems = 0, maxItems, addLabel = '+ Add', onChange,
}: {
  label: string;
  items: T[];
  empty: T;
  subFields: Array<{ key: keyof T; label: string; multiline?: boolean }>;
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
  onChange: (items: T[]) => void;
}) {
  const list = items ?? [];
  function update(i: number, key: keyof T, value: string) {
    onChange(list.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)));
  }
  function add() {
    onChange([...list, { ...empty }]);
  }
  function remove(i: number) {
    if (list.length <= minItems) return;
    onChange(list.filter((_, idx) => idx !== i));
  }
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>{label}</label>
      {list.map((item, i) => (
        <div key={i} style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={CARD_LABEL}>Item {i + 1}</span>
            {list.length > minItems && (
              <button type="button" style={REMOVE_BTN} onClick={() => remove(i)}>Remove</button>
            )}
          </div>
          {subFields.map((sf) => (
            <div key={String(sf.key)} style={{ marginBottom: '0.6rem' }}>
              <label style={LABEL}>{sf.label}</label>
              {sf.multiline ? (
                <textarea
                  style={{ ...INPUT, minHeight: '80px', resize: 'vertical' }}
                  value={asStr(item[sf.key])}
                  onChange={(e) => update(i, sf.key, e.target.value)}
                />
              ) : (
                <input
                  style={INPUT}
                  type="text"
                  value={asStr(item[sf.key])}
                  onChange={(e) => update(i, sf.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      ))}
      {(maxItems === undefined || list.length < maxItems) && (
        <button type="button" className="admin-cta-btn" style={ADD_BTN} onClick={add}>{addLabel}</button>
      )}
    </div>
  );
}

// ── Brief 121 — Benefits Card repeaters ─────────────────────────────────────

const MOVE_BTN: React.CSSProperties = {
  background: 'none', border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.4rem',
  color: ADMIN_COLORS.cerulean, fontSize: '11px', lineHeight: 1, cursor: 'pointer',
  width: '22px', height: '22px', padding: 0, flexShrink: 0,
};
const MOVE_BTN_DISABLED: React.CSSProperties = {
  ...MOVE_BTN, color: `${ADMIN_COLORS.onSurfaceVariant}55`, cursor: 'not-allowed',
};

function MoveButtons({ index, total, onMove }: { index: number; total: number; onMove: (i: number, dir: -1 | 1) => void }) {
  return (
    <>
      <button type="button" aria-label="Move up" title="Move up" disabled={index === 0}
        style={index === 0 ? MOVE_BTN_DISABLED : MOVE_BTN} onClick={() => onMove(index, -1)}>▲</button>
      <button type="button" aria-label="Move down" title="Move down" disabled={index === total - 1}
        style={index === total - 1 ? MOVE_BTN_DISABLED : MOVE_BTN} onClick={() => onMove(index, 1)}>▼</button>
    </>
  );
}

function moveItem<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

const asGroups = (v: unknown): BenefitsCardGroup[] =>
  Array.isArray(v)
    ? (v as BenefitsCardGroup[]).map((g) => ({
        heading: typeof g?.heading === 'string' ? g.heading : null,
        items: Array.isArray(g?.items) ? g.items.filter((s): s is string => typeof s === 'string') : [],
        column: g?.column === 1 || g?.column === 2 || g?.column === 3 ? g.column : null,
      }))
    : [];

/**
 * Benefit-groups repeater (Brief 121, Track C): add / remove / reorder groups;
 * each group has a heading, an optional explicit column placement, and a nested
 * add / edit / remove / reorder repeater of checkmark lines.
 */
function BenefitsGroupsField({
  label, value, minItems = 0, addLabel = '+ Add group', onChange,
}: {
  label: string; value: unknown; minItems?: number; addLabel?: string;
  onChange: (groups: BenefitsCardGroup[]) => void;
}) {
  const groups = asGroups(value);

  function patch(i: number, p: Partial<BenefitsCardGroup>) {
    onChange(groups.map((g, idx) => (idx === i ? { ...g, ...p } : g)));
  }

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>{label}</label>
      {groups.map((group, gi) => (
        <div key={gi} style={CARD}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.35rem' }}>
            <span style={CARD_LABEL}>Group {gi + 1}</span>
            <span style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <MoveButtons index={gi} total={groups.length} onMove={(i, dir) => onChange(moveItem(groups, i, dir))} />
              {groups.length > minItems && (
                <button type="button" style={REMOVE_BTN} onClick={() => onChange(groups.filter((_, idx) => idx !== gi))}>Remove</button>
              )}
            </span>
          </div>

          <div style={{ marginBottom: '0.6rem' }}>
            <label style={LABEL}>Heading</label>
            <input style={INPUT} type="text" value={group.heading ?? ''} placeholder="e.g. SERIOUS SAVINGS (optional)"
              onChange={(e) => patch(gi, { heading: e.target.value || null })} />
          </div>

          <div style={{ marginBottom: '0.6rem' }}>
            <label style={LABEL}>Items</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {group.items.map((item, ii) => (
                <div key={ii} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span aria-hidden style={{ color: ADMIN_COLORS.onSurfaceVariant, fontSize: '1rem', lineHeight: 1, flexShrink: 0 }}>✓</span>
                  <input style={INPUT} type="text" value={item} placeholder={`Benefit line ${ii + 1}`}
                    onChange={(e) => patch(gi, { items: group.items.map((it, idx) => (idx === ii ? e.target.value : it)) })} />
                  <MoveButtons index={ii} total={group.items.length} onMove={(i, dir) => patch(gi, { items: moveItem(group.items, i, dir) })} />
                  <button type="button" aria-label={`Remove item ${ii + 1}`} style={REMOVE_BTN}
                    onClick={() => patch(gi, { items: group.items.filter((_, idx) => idx !== ii) })}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" style={{ ...ADD_BTN, marginTop: '0.5rem', padding: '0.35rem 0.9rem', fontSize: '0.8rem' }}
              onClick={() => patch(gi, { items: [...group.items, ''] })}>+ Add item</button>
          </div>

          <div>
            <label style={LABEL}>Column placement</label>
            <select
              style={{ ...INPUT, width: 'auto', paddingRight: '1.5rem' }}
              value={group.column ?? 'auto'}
              onChange={(e) =>
                patch(gi, { column: e.target.value === 'auto' ? null : (Number(e.target.value) as BenefitsCardColumns) })
              }
            >
              <option value="auto">Auto</option>
              {BENEFITS_CARD_COLUMNS.map((c) => (
                <option key={c} value={c}>Column {c}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
      <button type="button" className="admin-cta-btn" style={ADD_BTN}
        onClick={() => onChange([...groups, { heading: null, items: [''], column: null }])}>{addLabel}</button>
    </div>
  );
}

const asPrice = (v: unknown): BenefitsCardPrice => {
  const p = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
  return {
    enabled: typeof p.enabled === 'boolean' ? p.enabled : false,
    amount: typeof p.amount === 'string' ? p.amount : '',
    caption: typeof p.caption === 'string' && p.caption !== '' ? p.caption : null,
  };
};

/**
 * Price cluster (Brief 121, Track C): on/off toggle + amount (pre-filled with
 * the {{ndc_price}} token; TokenTextInput provides the Brief 77 "Insert
 * variable" affordance) + optional caption line.
 */
function PriceConfigField({
  label, value, onChange,
}: {
  label: string; value: unknown; onChange: (price: BenefitsCardPrice) => void;
}) {
  const price = asPrice(value);
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>{label}</label>
      <div style={CARD}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '0.9rem', color: ADMIN_COLORS.onSurface, cursor: 'pointer', marginBottom: price.enabled ? '0.75rem' : 0 }}>
          <input type="checkbox" checked={price.enabled}
            onChange={(e) => onChange({ ...price, enabled: e.target.checked })} />
          Show price line
        </label>
        {price.enabled && (
          <>
            <div style={{ marginBottom: '0.6rem' }}>
              <TokenTextInput label="Amount" value={price.amount}
                onChange={(v) => onChange({ ...price, amount: v })}
                fieldStyle={INPUT} labelStyle={{ ...LABEL, marginBottom: 0 }} />
              <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: '0.35rem 0 0' }}>
                {'{{ndc_price}}'} keeps the price driven by Global Settings → No Drip Club.
              </p>
            </div>
            <div>
              <label style={LABEL}>Caption (optional line under the price)</label>
              {/* Brief 143 (Track F): this placeholder used to read
                  "All for just … /month". Typing a cadence suffix beside the
                  price TOKEN is what produced strings that render as a monthly
                  price while containing no literal price at all — invisible to
                  every price search (Brief 142, Pattern B). The example is now
                  annual, matching the current offer. */}
              <input style={INPUT} type="text" value={price.caption ?? ''} placeholder="e.g. Billed annually"
                onChange={(e) => onChange({ ...price, caption: e.target.value || null })} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Brief 141 — Membership Comparison repeaters ─────────────────────────────

const asRows = (v: unknown): ComparisonRowData[] =>
  Array.isArray(v)
    ? (v as Array<Record<string, unknown>>).map((r) => ({
        label: typeof r?.label === 'string' ? r.label : '',
        caveat: typeof r?.caveat === 'string' && r.caveat !== '' ? r.caveat : null,
        child: r?.child === true,
        member: r?.member !== false,
        nonMember: r?.nonMember === true,
      }))
    : [];

/** A small check/cross segmented control for one column's cell. */
function MarkToggle({
  columnLabel, value, onChange,
}: {
  columnLabel: string; value: boolean; onChange: (next: boolean) => void;
}) {
  const btn = (active: boolean, ok: boolean): React.CSSProperties => ({
    flex: '0 0 auto', width: '30px', height: '26px', padding: 0, cursor: 'pointer',
    fontSize: '0.85rem', fontWeight: 700, lineHeight: 1,
    borderRadius: '0.4rem',
    border: `2px solid ${active ? (ok ? ADMIN_COLORS.success : ADMIN_COLORS.error) : `${ADMIN_COLORS.outlineVariant}55`}`,
    background: active ? `${ok ? ADMIN_COLORS.success : ADMIN_COLORS.error}22` : ADMIN_COLORS.surfaceContainerLowest,
    color: active ? (ok ? ADMIN_COLORS.success : ADMIN_COLORS.error) : ADMIN_COLORS.onSurfaceVariant,
  });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ ...LABEL, marginBottom: 0, fontSize: '11px', fontWeight: 700 }}>{columnLabel}</span>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        <button type="button" aria-label={`${columnLabel}: included`} aria-pressed={value}
          title="Included (check)" style={btn(value, true)} onClick={() => onChange(true)}>✓</button>
        <button type="button" aria-label={`${columnLabel}: not included`} aria-pressed={!value}
          title="Not included (cross)" style={btn(!value, false)} onClick={() => onChange(false)}>✕</button>
      </div>
    </div>
  );
}

/**
 * Benefit-rows repeater (Brief 141, Track E): add / remove / reorder rows; per
 * row a label, an optional caveat, a prominent "child row" toggle, and a
 * check/cross toggle for each column.
 *
 * The child toggle is the control most likely to confuse an editor, so it gets
 * a full-width tinted band and the card itself is visibly indented + labelled
 * "Sub-item" when it's on — the editor list mirrors the rendered indentation.
 */
function ComparisonRowsField({
  label, value, minItems = 0, addLabel = '+ Add row', onChange,
}: {
  label: string; value: unknown; minItems?: number; addLabel?: string;
  onChange: (rows: ComparisonRowData[]) => void;
}) {
  const rows = asRows(value);
  function patch(i: number, p: Partial<ComparisonRowData>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...p } : r)));
  }
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>{label}</label>
      <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: '0 0 0.6rem' }}>
        Every row shows one mark per column. Turn on <strong>Sub-item</strong> to indent a row
        as a bullet under the row above it.
      </p>
      {rows.map((row, i) => (
        <div key={i} style={{ ...CARD, marginLeft: row.child ? '1.5rem' : 0, borderLeft: row.child ? `3px solid ${ADMIN_COLORS.cerulean}` : CARD.border as string }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.35rem' }}>
            <span style={CARD_LABEL}>{row.child ? `Sub-item ${i + 1}` : `Row ${i + 1}`}</span>
            <span style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <MoveButtons index={i} total={rows.length} onMove={(idx, dir) => onChange(moveItem(rows, idx, dir))} />
              {rows.length > minItems && (
                <button type="button" style={REMOVE_BTN} onClick={() => onChange(rows.filter((_, idx) => idx !== i))}>Remove</button>
              )}
            </span>
          </div>

          <div style={{ marginBottom: '0.6rem' }}>
            <label style={LABEL}>Benefit</label>
            <input style={INPUT} type="text" value={row.label} placeholder="e.g. NO EMERGENCY FEES OR TRIP CHARGES"
              onChange={(e) => patch(i, { label: e.target.value })} />
          </div>

          <div style={{ marginBottom: '0.6rem' }}>
            <label style={LABEL}>Caveat (small line under the benefit — optional)</label>
            <input style={INPUT} type="text" value={row.caveat ?? ''} placeholder="e.g. (as needed, only during maintenance visits)"
              onChange={(e) => patch(i, { caveat: e.target.value || null })} />
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginBottom: '0.75rem',
            padding: '0.5rem 0.65rem', borderRadius: '0.5rem',
            background: row.child ? `${ADMIN_COLORS.cerulean}1f` : ADMIN_COLORS.surfaceContainerLowest,
            border: `1px solid ${row.child ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.outlineVariant}44`}`,
            fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '0.85rem', fontWeight: 700,
            color: ADMIN_COLORS.onSurface,
          }}>
            <input type="checkbox" checked={row.child} onChange={(e) => patch(i, { child: e.target.checked })} />
            Sub-item — indent this row as a bullet under the row above
          </label>

          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
            <MarkToggle columnLabel="Member column" value={row.member} onChange={(v) => patch(i, { member: v })} />
            <MarkToggle columnLabel="Non-member column" value={row.nonMember} onChange={(v) => patch(i, { nonMember: v })} />
          </div>
        </div>
      ))}
      <button type="button" className="admin-cta-btn" style={ADD_BTN}
        onClick={() => onChange([...rows, { label: '', caveat: null, child: false, member: true, nonMember: false }])}>
        {addLabel}
      </button>
    </div>
  );
}

const asPriceCards = (v: unknown): ComparisonPriceData[] =>
  Array.isArray(v)
    ? (v as Array<Record<string, unknown>>).map((p) => ({
        termLabel: typeof p?.termLabel === 'string' ? p.termLabel : '',
        amount: typeof p?.amount === 'string' ? p.amount : '',
        buttonLabel: typeof p?.buttonLabel === 'string' && p.buttonLabel !== '' ? p.buttonLabel : 'Join Today',
        emphasized: p?.emphasized === true,
      }))
    : [];

/** True when `amount` is exactly a Global Settings price token (not a literal). */
function isPriceToken(amount: string): boolean {
  return /^\s*\{\{\s*ndc_price(_1yr|_2yr)?\s*\}\}\s*$/i.test(amount);
}

/**
 * Price-cards repeater (Brief 141, Track E): add / remove / reorder, capped at
 * `MEMBERSHIP_COMPARISON_MAX_PRICES` to protect the layout. Per card: term
 * label, amount, button label and an "emphasize" toggle that is single-choice —
 * selecting one clears the others.
 *
 * The amount uses TokenTextInput so the Brief 77 "Insert variable" affordance is
 * available, and the field shows the raw token rather than a pre-resolved value.
 * A per-card note says whether that card is still driven by Global Settings or
 * has been detached by a typed literal — the one thing an editor can't otherwise
 * see (Brief 141, "two places to edit a price").
 */
function PriceCardsField({
  label, value, minItems = 0, addLabel = '+ Add price card', onChange,
}: {
  label: string; value: unknown; minItems?: number; addLabel?: string;
  onChange: (prices: ComparisonPriceData[]) => void;
}) {
  const prices = asPriceCards(value);
  function patch(i: number, p: Partial<ComparisonPriceData>) {
    onChange(prices.map((c, idx) => (idx === i ? { ...c, ...p } : c)));
  }
  // At most ONE emphasized card: setting it clears every other card's flag.
  function setEmphasis(i: number, on: boolean) {
    onChange(prices.map((c, idx) => ({ ...c, emphasized: on ? idx === i : idx === i ? false : c.emphasized })));
  }
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>{label}</label>
      {prices.map((price, i) => {
        const token = isPriceToken(price.amount);
        return (
          <div key={i} style={CARD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.35rem' }}>
              <span style={CARD_LABEL}>Card {i + 1}</span>
              <span style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                <MoveButtons index={i} total={prices.length} onMove={(idx, dir) => onChange(moveItem(prices, idx, dir))} />
                {prices.length > minItems && (
                  <button type="button" style={REMOVE_BTN} onClick={() => onChange(prices.filter((_, idx) => idx !== i))}>Remove</button>
                )}
              </span>
            </div>

            <div style={{ marginBottom: '0.6rem' }}>
              <label style={LABEL}>Term label</label>
              <input style={INPUT} type="text" value={price.termLabel} placeholder="e.g. 1 YEAR"
                onChange={(e) => patch(i, { termLabel: e.target.value })} />
            </div>

            <div style={{ marginBottom: '0.6rem' }}>
              <TokenTextInput label="Amount" value={price.amount}
                onChange={(v) => patch(i, { amount: v })}
                fieldStyle={INPUT} labelStyle={{ ...LABEL, marginBottom: 0 }} />
              <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', margin: '0.35rem 0 0', color: token ? `${ADMIN_COLORS.onSurfaceVariant}99` : ADMIN_COLORS.error }}>
                {token
                  ? 'Driven by Global Settings → No Drip Club Membership Prices. Edit the price there.'
                  : 'Detached from Global Settings — this card shows the literal text above. Insert a price variable to reconnect it.'}
              </p>
            </div>

            <div style={{ marginBottom: '0.6rem' }}>
              <label style={LABEL}>Button label</label>
              <input style={INPUT} type="text" value={price.buttonLabel} placeholder="e.g. Join Today"
                onChange={(e) => patch(i, { buttonLabel: e.target.value })} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '0.85rem', color: ADMIN_COLORS.onSurface }}>
              <input type="checkbox" checked={price.emphasized} onChange={(e) => setEmphasis(i, e.target.checked)} />
              Emphasize this card (red border + shadow) — only one card can be emphasized
            </label>
          </div>
        );
      })}
      {prices.length < MEMBERSHIP_COMPARISON_MAX_PRICES ? (
        <button type="button" className="admin-cta-btn" style={ADD_BTN}
          onClick={() => onChange([...prices, { termLabel: '', amount: '', buttonLabel: 'Join Today', emphasized: false }])}>
          {addLabel}
        </button>
      ) : (
        <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: 0 }}>
          Maximum of {MEMBERSHIP_COMPARISON_MAX_PRICES} price cards — remove one to add another.
        </p>
      )}
    </div>
  );
}

// ── Registry-driven field renderer for one block instance ──────────────────

export default function BlockField({
  field, data, onChange,
}: {
  field: BlockFieldDef; data: Record<string, unknown>; onChange: (key: string, value: unknown) => void;
}) {
  const value = data[field.key];
  switch (field.type) {
    case 'text':
      return (
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={LABEL}>{field.label}</label>
          <input className="field" type="text" value={asStr(value)} placeholder={field.placeholder}
            onChange={(e) => onChange(field.key, e.target.value)} style={INPUT} />
        </div>
      );
    case 'textarea':
      return (
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={LABEL}>{field.label}</label>
          <textarea className="field" value={asStr(value)} rows={field.rows ?? 3}
            onChange={(e) => onChange(field.key, e.target.value)} style={{ ...INPUT, resize: 'vertical', lineHeight: 1.6 }} />
          {field.help && (
            <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: '0.35rem 0 0' }}>
              {field.help}
            </p>
          )}
        </div>
      );
    case 'richtext':
      return (
        <RichTextField label={field.label} value={asStr(value)} rows={field.rows ?? 4} help={field.help}
          onChange={(v) => onChange(field.key, v)} />
      );
    case 'image':
      return (
        <ImageUploaderField label={field.label} value={asStr(value)} onChange={(url) => onChange(field.key, url)} />
      );
    case 'list':
      return (
        <ListItemsField
          label={field.label}
          items={Array.isArray(value) ? (value as string[]) : []}
          minItems={field.minItems ?? 3}
          addLabel={field.addLabel}
          placeholder={field.placeholder}
          onChange={(items) => onChange(field.key, items)}
        />
      );
    case 'faqRepeater':
      return (
        <ObjectRepeaterField
          label={field.label}
          items={Array.isArray(value) ? (value as Array<{ question: string; answer: string }>) : []}
          empty={{ question: '', answer: '' }}
          subFields={[
            { key: 'question', label: 'Question', multiline: true },
            { key: 'answer', label: 'Answer', multiline: true },
          ]}
          minItems={field.minItems ?? 0}
          addLabel={field.addLabel ?? '+ Add FAQ'}
          onChange={(items) => onChange(field.key, items)}
        />
      );
    case 'mostRequestedRepeater':
      return (
        <ObjectRepeaterField
          label={field.label}
          items={Array.isArray(value) ? (value as Array<{ title: string; body: string }>) : []}
          empty={{ title: '', body: '' }}
          subFields={[
            { key: 'title', label: 'Title' },
            { key: 'body', label: 'Body', multiline: true },
          ]}
          minItems={field.minItems ?? 0}
          addLabel={field.addLabel ?? '+ Add service'}
          onChange={(items) => onChange(field.key, items)}
        />
      );
    case 'whyPointRepeater':
      return (
        <ObjectRepeaterField
          label={field.label}
          items={Array.isArray(value) ? (value as Array<{ heading: string; body: string }>) : []}
          empty={{ heading: '', body: '' }}
          subFields={[
            { key: 'heading', label: 'Heading' },
            { key: 'body', label: 'Body', multiline: true },
          ]}
          minItems={field.minItems ?? 0}
          addLabel={field.addLabel ?? '+ Add point'}
          onChange={(items) => onChange(field.key, items)}
        />
      );
    case 'reviewRepeater':
      return (
        <ObjectRepeaterField
          label={field.label}
          items={Array.isArray(value) ? (value as Array<{ name: string; text: string; gbp_url: string }>) : []}
          empty={{ name: '', text: '', gbp_url: '' }}
          subFields={[
            { key: 'name', label: 'Reviewer Name' },
            { key: 'text', label: 'Review Text', multiline: true },
            { key: 'gbp_url', label: 'Google Business Profile URL' },
          ]}
          minItems={field.minItems ?? 0}
          maxItems={5}
          addLabel={field.addLabel ?? '+ Add review'}
          onChange={(items) => onChange(field.key, items)}
        />
      );
    case 'benefitsGroupRepeater':
      return (
        <BenefitsGroupsField
          label={field.label}
          value={value}
          minItems={field.minItems ?? 0}
          addLabel={field.addLabel ?? '+ Add group'}
          onChange={(groups) => onChange(field.key, groups)}
        />
      );
    case 'priceConfig':
      return (
        <PriceConfigField
          label={field.label}
          value={value}
          onChange={(price) => onChange(field.key, price)}
        />
      );
    case 'comparisonRowRepeater':
      return (
        <ComparisonRowsField
          label={field.label}
          value={value}
          minItems={field.minItems ?? 0}
          addLabel={field.addLabel ?? '+ Add row'}
          onChange={(rows) => onChange(field.key, rows)}
        />
      );
    case 'priceCardRepeater':
      return (
        <PriceCardsField
          label={field.label}
          value={value}
          minItems={field.minItems ?? 0}
          addLabel={field.addLabel ?? '+ Add price card'}
          onChange={(prices) => onChange(field.key, prices)}
        />
      );
    case 'serviceCardRepeater':
      // Brief 149 — Related Services cards. `image` and `href` are plain text
      // inputs on purpose: the two live pages carry absolute CDN URLs and
      // in-site paths respectively, and the media picker cannot express either.
      return (
        <ObjectRepeaterField
          label={field.label}
          items={
            Array.isArray(value)
              ? (value as Array<{ title: string; teaser: string; image: string; href: string }>)
              : []
          }
          empty={{ title: '', teaser: '', image: '', href: '' }}
          subFields={[
            { key: 'title', label: 'Card Title' },
            { key: 'teaser', label: 'Teaser', multiline: true },
            { key: 'image', label: 'Image URL' },
            { key: 'href', label: 'Link (e.g. /hydro-jetting)' },
          ]}
          minItems={field.minItems ?? 0}
          addLabel={field.addLabel ?? '+ Add card'}
          onChange={(items) => onChange(field.key, items)}
        />
      );
    case 'subcategoryRepeater':
      // Not wired to any editor yet (Brief 98 registered the type; no template
      // in this brief's scope uses it) — matches the pre-existing gap.
      return null;
    default:
      return null;
  }
}
