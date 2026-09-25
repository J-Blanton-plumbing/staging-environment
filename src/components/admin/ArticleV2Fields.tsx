'use client';

import { useEffect, useRef, useState } from 'react';
import RichTextField from '@/components/admin/RichTextField';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import {
  DEFAULT_BYLINE_NAME,
  bylineInitials,
  type ArticleV2Content,
  type ArticleV2Faq,
  type V2ServiceArea,
} from '@/lib/cms/article-v2';

/**
 * Brief 190 (Track D) — the Article V2 field group in /admin/articles/[slug].
 *
 * Fields are in the order they appear on the page: Subtitle, Byline, Hero
 * alt/caption, Key takeaways, Local office, Service-area list (+ label), FAQ.
 * The hero IMAGE itself stays in "Article Details" — both templates use it.
 *
 * Rendered only while "Article V2" is the selected template, but the parent
 * keeps the values in its form either way: switching to V1 HIDES this group,
 * it never clears it, so V2 → V1 → V2 loses nothing.
 */

const FONT_BODY = 'var(--font-nunito), system-ui, sans-serif';

const LABEL: React.CSSProperties = {
  display: 'block',
  fontFamily: FONT_BODY,
  fontSize: '13px',
  fontWeight: 600,
  color: ADMIN_COLORS.onSurface,
  marginBottom: '0.25rem',
};

const HELP: React.CSSProperties = {
  fontFamily: FONT_BODY,
  fontSize: '12px',
  lineHeight: 1.5,
  color: ADMIN_COLORS.onSurfaceVariant,
  margin: '0.3rem 0 0',
};

const INPUT: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem',
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
  borderRadius: '0.5rem',
  fontFamily: FONT_BODY,
  fontSize: '0.9rem',
  color: ADMIN_COLORS.onSurface,
  background: ADMIN_COLORS.surfaceContainerLow,
  boxSizing: 'border-box',
};

const FIELD: React.CSSProperties = { marginBottom: '1.25rem' };

const CARD: React.CSSProperties = {
  background: ADMIN_COLORS.surfaceContainer,
  border: `1px solid ${ADMIN_COLORS.outlineVariant}33`,
  borderRadius: '1rem',
  padding: '1rem',
  marginBottom: '0.75rem',
  boxShadow: ADMIN_SHADOWS.sm,
};

const ADD_BTN: React.CSSProperties = {
  marginTop: '0.25rem',
  background: 'none',
  border: `1px dashed ${ADMIN_COLORS.outlineVariant}99`,
  borderRadius: '0.5rem',
  color: ADMIN_COLORS.cerulean,
  fontFamily: FONT_BODY,
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  padding: '0.4rem 0.9rem',
};

function moveBtn(disabled: boolean): React.CSSProperties {
  return {
    background: 'none',
    border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
    color: ADMIN_COLORS.onSurfaceVariant,
    borderRadius: '9999px',
    width: '1.6rem',
    height: '1.6rem',
    fontSize: '0.8rem',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    lineHeight: 1,
    flexShrink: 0,
  };
}

const REMOVE_BTN: React.CSSProperties = {
  background: 'none',
  border: `1px solid ${ADMIN_COLORS.error}66`,
  color: ADMIN_COLORS.error,
  borderRadius: '9999px',
  padding: '0.2rem 0.6rem',
  fontSize: '0.8rem',
  cursor: 'pointer',
  fontWeight: 600,
  flexShrink: 0,
};

function move<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** ▲ / ▼ / Remove — the repeater controls used across the admin (e.g. the service-page subcategory cards). */
function RowControls({ i, count, noun, onMove, onRemove }: {
  i: number;
  count: number;
  noun: string;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <button type="button" onClick={() => onMove(-1)} disabled={i === 0} aria-label={`Move ${noun} ${i + 1} up`} style={moveBtn(i === 0)}>▲</button>
      <button type="button" onClick={() => onMove(1)} disabled={i === count - 1} aria-label={`Move ${noun} ${i + 1} down`} style={moveBtn(i === count - 1)}>▼</button>
      <button type="button" onClick={onRemove} aria-label={`Remove ${noun} ${i + 1}`} style={REMOVE_BTN}>Remove</button>
    </div>
  );
}

interface OfficeOption {
  slug: string;
  name: string;
  city: string;
  state: string;
  phone: string;
}

const SERVICE_AREA_OPTIONS: { value: V2ServiceArea | ''; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'columbus', label: 'Central Ohio' },
  { value: 'chicagoland', label: 'Chicagoland' },
];

export default function ArticleV2Fields({
  value,
  onChange,
}: {
  value: ArticleV2Content;
  onChange: (next: ArticleV2Content) => void;
}) {
  const [offices, setOffices] = useState<OfficeOption[] | null>(null);

  // The office list is the Global Settings offices — the same records the
  // footer, the locator and the city NAP blocks read.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/cms/global-settings')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled) return;
        const list: OfficeOption[] = Array.isArray(data?.offices)
          ? data.offices
              .filter((o: Record<string, unknown>) => typeof o.slug === 'string' && o.slug)
              .map((o: Record<string, unknown>) => ({
                slug: String(o.slug),
                name: typeof o.name === 'string' ? o.name : String(o.slug),
                city: typeof o.city === 'string' ? o.city : '',
                state: typeof o.state === 'string' ? o.state : '',
                phone: typeof o.phone === 'string' ? o.phone.trim() : '',
              }))
          : [];
        setOffices(list);
      })
      .catch(() => { if (!cancelled) setOffices([]); });
    return () => { cancelled = true; };
  }, []);

  function set<K extends keyof ArticleV2Content>(key: K, v: ArticleV2Content[K]) {
    onChange({ ...value, [key]: v });
  }

  const takeaways = value.takeaways;
  const faqs = value.faqs;

  // Stable per-row keys for the FAQ cards. RichTextField stamps its visual
  // surface from `value` only on mount, so an index key would leave a moved
  // answer showing its old neighbour's text. Keys move with their row on ▲/▼,
  // and are regenerated whenever the list arrives from OUTSIDE (a version was
  // loaded), which remounts every answer editor with the loaded text.
  const keySeq = useRef(0);
  const faqKeys = useRef<number[]>([]);
  const emittedFaqs = useRef<ArticleV2Faq[] | null>(null);
  if (faqs !== emittedFaqs.current) {
    faqKeys.current = faqs.map(() => ++keySeq.current);
    emittedFaqs.current = faqs;
  }
  function setFaqs(next: ArticleV2Faq[], keys: number[]) {
    faqKeys.current = keys;
    emittedFaqs.current = next;
    set('faqs', next);
  }
  const setFaq = (i: number, patch: Partial<ArticleV2Faq>) =>
    setFaqs(faqs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)), faqKeys.current);

  const chosenOffice = offices?.find(o => o.slug === value.office) ?? null;
  const officeMissing = !!value.office && offices !== null && !chosenOffice;

  return (
    <div>
      {/* ── Subtitle ── */}
      <div style={FIELD}>
        <label style={LABEL} htmlFor="v2-dek">Subtitle</label>
        <textarea
          id="v2-dek"
          className="field"
          value={value.dek}
          onChange={e => set('dek', e.target.value)}
          rows={2}
          placeholder="One or two sentences under the headline (optional)"
          style={{ ...INPUT, resize: 'vertical', lineHeight: 1.5 }}
        />
        <p style={HELP}>Plain text. Leave blank to show no subtitle.</p>
      </div>

      {/* ── Byline ── */}
      <div style={FIELD}>
        <label style={LABEL} htmlFor="v2-byline">Byline</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span
            aria-hidden
            style={{
              flex: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'grid', placeItems: 'center',
              background: ADMIN_COLORS.secondaryContainer, color: '#fff', fontFamily: FONT_BODY, fontWeight: 700, fontSize: '12px',
            }}
          >
            {bylineInitials(value.byline_name)}
          </span>
          <input
            id="v2-byline"
            className="field"
            type="text"
            value={value.byline_name}
            onChange={e => set('byline_name', e.target.value)}
            placeholder={DEFAULT_BYLINE_NAME}
            style={INPUT}
          />
        </div>
        <p style={HELP}>
          Shown as &ldquo;By {value.byline_name.trim() || DEFAULT_BYLINE_NAME}&rdquo; with the initials badge. Blank shows
          &ldquo;{DEFAULT_BYLINE_NAME}&rdquo;. Author profiles are not available yet.
        </p>
      </div>

      {/* ── Hero alt + caption ── */}
      <div style={{ ...FIELD, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={LABEL} htmlFor="v2-alt">Hero image alt text</label>
          <input id="v2-alt" className="field" type="text" value={value.image_alt} onChange={e => set('image_alt', e.target.value)} placeholder="Describe the photo for screen readers" style={INPUT} />
          <p style={HELP}>Blank uses the article title.</p>
        </div>
        <div>
          <label style={LABEL} htmlFor="v2-caption">Hero image caption</label>
          <input id="v2-caption" className="field" type="text" value={value.image_caption} onChange={e => set('image_caption', e.target.value)} placeholder="e.g. Our team in Columbus. Photo: …" style={INPUT} />
          <p style={HELP}>Blank shows no caption.</p>
        </div>
      </div>

      {/* ── Key takeaways ── */}
      <div style={FIELD}>
        <label style={LABEL}>Key takeaways</label>
        {takeaways.map((t, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span aria-hidden style={{ color: ADMIN_COLORS.onSurfaceVariant, fontSize: '1.1rem', lineHeight: 1, flexShrink: 0 }}>&bull;</span>
            <input
              className="field"
              type="text"
              value={t}
              onChange={e => set('takeaways', takeaways.map((x, idx) => (idx === i ? e.target.value : x)))}
              placeholder={`Takeaway ${i + 1}`}
              aria-label={`Takeaway ${i + 1}`}
              style={{ ...INPUT, flex: 1 }}
            />
            <RowControls
              i={i}
              count={takeaways.length}
              noun="takeaway"
              onMove={dir => set('takeaways', move(takeaways, i, dir))}
              onRemove={() => set('takeaways', takeaways.filter((_, idx) => idx !== i))}
            />
          </div>
        ))}
        <button type="button" onClick={() => set('takeaways', [...takeaways, ''])} style={ADD_BTN}>+ Add Takeaway</button>
        <p style={HELP}>Short plain-text points. With none, the Key takeaways box is hidden.</p>
      </div>

      {/* ── Local office ── */}
      <div style={FIELD}>
        <label style={LABEL} htmlFor="v2-office">Local office</label>
        <select id="v2-office" className="field" value={value.office} onChange={e => set('office', e.target.value)} style={INPUT} disabled={offices === null}>
          <option value="">None</option>
          {officeMissing && <option value={value.office}>{value.office} (no longer in Global Settings)</option>}
          {(offices ?? []).map(o => (
            <option key={o.slug} value={o.slug}>{o.name}{o.city ? ` — ${o.city}, ${o.state}` : ''}</option>
          ))}
        </select>
        <p style={HELP}>
          {offices === null
            ? 'Loading offices…'
            : chosenOffice
              ? chosenOffice.phone
                ? `The office card, map, directions, call buttons and mobile call bar use this office. Phone: ${chosenOffice.phone}.`
                : 'This office has no phone of its own in Global Settings, so the article shows the main phone number.'
              : officeMissing
                ? 'This office was removed from Global Settings — the article shows no office card or map until you pick another.'
                : 'None: no office card or map; every phone link uses the main number. The rail shows the No Drip Club card only.'}
        </p>
      </div>

      {/* ── Service-area list ── */}
      <div style={{ ...FIELD, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div>
          <label style={LABEL} htmlFor="v2-area">Service-area list</label>
          <select id="v2-area" className="field" value={value.service_area} onChange={e => set('service_area', e.target.value as V2ServiceArea | '')} style={INPUT}>
            {SERVICE_AREA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <p style={HELP}>A collapsible list of every community in the region, shown with the office map.</p>
        </div>
        <div>
          <label style={LABEL} htmlFor="v2-area-label">Service-area list label</label>
          <input
            id="v2-area-label"
            className="field"
            type="text"
            value={value.service_area_label}
            onChange={e => set('service_area_label', e.target.value)}
            placeholder="See all {N} communities we serve in {region}"
            style={INPUT}
            disabled={!value.service_area}
          />
          <p style={HELP}>Blank uses &ldquo;See all N communities we serve in …&rdquo; with the live count.</p>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div style={{ marginBottom: 0 }}>
        <label style={LABEL}>FAQ</label>
        {faqs.map((f, i) => (
          <div key={faqKeys.current[i] ?? `i${i}`} style={CARD}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: ADMIN_COLORS.onSurface, margin: 0, fontFamily: FONT_BODY }}>Question {i + 1}</p>
              <RowControls
                i={i}
                count={faqs.length}
                noun="question"
                onMove={dir => setFaqs(move(faqs, i, dir), move(faqKeys.current, i, dir))}
                onRemove={() => setFaqs(faqs.filter((_, idx) => idx !== i), faqKeys.current.filter((_, idx) => idx !== i))}
              />
            </div>
            <label style={LABEL} htmlFor={`v2-faq-q-${i}`}>Question</label>
            <input id={`v2-faq-q-${i}`} className="field" type="text" value={f.q} onChange={e => setFaq(i, { q: e.target.value })} style={{ ...INPUT, marginBottom: '0.75rem' }} />
            <RichTextField
              label="Answer"
              value={f.a}
              onChange={v => setFaq(i, { a: v })}
              rows={4}
              help="Bold, italic and links. Headings and lists are flattened to one paragraph. {{phone}} becomes the article's phone number."
            />
          </div>
        ))}
        <button type="button" onClick={() => setFaqs([...faqs, { q: '', a: '' }], [...faqKeys.current, ++keySeq.current])} style={ADD_BTN}>+ Add Question</button>
        <p style={HELP}>
          Shown as an expandable &ldquo;Frequently Asked Questions&rdquo; section at the end of the article, and listed in
          the table of contents. With no questions, the section is hidden. (No FAQ schema is emitted — site rule.)
        </p>
      </div>
    </div>
  );
}
