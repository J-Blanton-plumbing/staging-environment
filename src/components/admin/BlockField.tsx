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
              <input style={INPUT} type="text" value={price.caption ?? ''} placeholder="e.g. All for just … /month"
                onChange={(e) => onChange({ ...price, caption: e.target.value || null })} />
            </div>
          </>
        )}
      </div>
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
    case 'subcategoryRepeater':
      // Not wired to any editor yet (Brief 98 registered the type; no template
      // in this brief's scope uses it) — matches the pre-existing gap.
      return null;
    default:
      return null;
  }
}
