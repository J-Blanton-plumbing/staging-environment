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
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import type { BlockFieldDef } from '@/lib/cms/block-catalogue';

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
    case 'subcategoryRepeater':
      // Not wired to any editor yet (Brief 98 registered the type; no template
      // in this brief's scope uses it) — matches the pre-existing gap.
      return null;
    default:
      return null;
  }
}
