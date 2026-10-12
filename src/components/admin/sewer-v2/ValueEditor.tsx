'use client';

/**
 * Brief 204 — a generic editor for the STRUCTURED parts of the Sewer v2 content (hero, reviews, FAQ,
 * final CTA, the hub's sections, the sewer-shared sections). It walks the value itself, so every
 * string, number, image and list in the content gets a control — nothing can be silently left out
 * (the Brief 179 lesson). Layout values (`LOCKED`) are never shown; `conform.ts` refuses them anyway.
 */
import type { SewerNode } from '@/lib/content/sewer-v2/types';
import { ImageInput, Repeater, RichInput, TextInput } from './ui';

const LOCKED = new Set(['kind', 'id', 'tint', 'order', 'variant', 'financingOrder', 'schema', 'color', 'highlight', 'ticks', 'slug']);
const IMAGE_KEYS = new Set(['image', 'src', 'icon', 'seal', 'sinceIcon']);
const LINK_KEYS = new Set(['href', 'iframeSrc']);
const RICH_KEYS = new Set(['preview', 'full']);
/** Lists with a fixed number of items (positional chart colours). */
const FIXED = new Set(['bars']);

const LABELS: Record<string, string> = {
  eyebrow: 'Eyebrow', heading: 'Heading', intro: 'Intro text', body: 'Text', cta: 'Button label', href: 'Link', image: 'Image', alt: 'Alt text',
  title: 'Title', desc: 'Description', short: 'Short line', quote: 'Quote', name: 'Name', q: 'Question', preview: 'Short answer (shown first)',
  full: 'Full answer (shown when opened)', crumb: 'Breadcrumb label', note: 'Small print', label: 'Label', ariaLabel: 'Screen-reader label',
  items: 'Items', links: 'Links', pills: 'Quick-link pills', pillsLabel: 'Quick links — screen-reader label', tiles: 'Tiles', side: 'Side reviews',
  featured: 'Featured review', bars: 'Chart bars', value: 'Value (%)', stat: 'Big number (%)', statLabel: 'Big number label', subheading: 'Sub-heading',
  titleLine1: 'Chart title, line 1', titleLine2: 'Chart title, line 2', yLabel: 'Chart axis label', sinceIcon: 'Since-1993 icon', sinceLine1: 'Since-1993 line 1',
  sinceLine2: 'Since-1993 line 2', iframeTitle: 'Map title (screen readers)', iframeSrc: 'Google Map embed address', headingLine1: 'Heading, line 1',
  headingLine2: 'Heading, line 2', proofLabel: 'Ratings box — screen-reader label', rating: 'Average rating', ratingStarsLabel: 'Rating stars — screen-reader label',
  ratingSub: 'Rating caption', seal: 'BBB seal image', sealAlt: 'BBB seal alt text', bbb: 'BBB link', headingLink: 'Heading — linked words',
  headingRest: 'Heading — rest (starts with a space)', benefits: 'Benefits', call: 'Call box', trust: 'Trust list', financing: 'Financing card',
  row: 'Row on the service pages', hub: 'Card on the hub', sub: 'Second line', stars: 'Stars', starsLabel: 'Stars — screen-reader label',
  caption: 'Caption under reviewer names', callPrefix: '"Call Now:" text before the number', schedule: 'Schedule button label', learnMore: '"Learn More" link text',
  badge24Label: '"24 hours" badge — screen-reader label', crumbParent: 'Breadcrumb parent', uploadDate: 'Upload date (ISO, e.g. 2025-05-21T07:47:39-07:00)',
  duration: 'Duration (ISO, e.g. PT47S)', thumbnailUrl: 'Thumbnail image address', description: 'Description',
};

export function humanize(key: string): string {
  return LABELS[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
}

function blank<T>(v: T): T {
  if (typeof v === 'string') return '' as T;
  if (Array.isArray(v)) return (v.length ? [blank(v[0])] : []) as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, LOCKED.has(k) ? x : blank(x)])) as T;
  return v;
}

export function ValueEditor({
  value, onChange, keyName, label, readOnly,
}: {
  value: unknown; onChange: (next: unknown) => void; keyName: string; label?: string; readOnly?: boolean;
}) {
  const lbl = label ?? humanize(keyName);
  if (LOCKED.has(keyName)) return null;
  if (RICH_KEYS.has(keyName) && (typeof value === 'string' || Array.isArray(value))) {
    return (
      <RichInput
        label={lbl}
        value={value as SewerNode[] | string}
        onChange={(nodes) => onChange(nodes.length === 1 && typeof nodes[0] === 'string' ? nodes[0] : nodes.length === 0 ? '' : nodes)}
        readOnly={readOnly}
      />
    );
  }
  if (typeof value === 'string') {
    if (IMAGE_KEYS.has(keyName)) return <ImageInput label={lbl} src={value} onSrc={(v) => onChange(v)} />;
    return (
      <TextInput
        label={lbl}
        value={value}
        onChange={(v) => onChange(v)}
        multiline={value.length > 90 || ['intro', 'body', 'quote', 'desc', 'description'].includes(keyName)}
        link={LINK_KEYS.has(keyName)}
        hint={keyName === 'href' && /maps\.app\.goo\.gl/.test(value) ? 'The reviewer’s Google Maps review link.' : undefined}
        readOnly={readOnly}
      />
    );
  }
  if (typeof value === 'number') {
    return (
      <div style={{ marginBottom: '1rem' }}>
        <TextInput label={lbl} value={String(value)} onChange={(v) => onChange(v.trim() === '' || isNaN(Number(v)) ? value : Number(v))} readOnly={readOnly} />
      </div>
    );
  }
  if (Array.isArray(value)) {
    if (FIXED.has(keyName)) {
      return (
        <div>
          <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '13px', fontWeight: 600, color: '#d3e4ff', margin: '0 0 0.5rem' }}>
            {lbl} (fixed number — the bar colours are part of the design)
          </p>
          {value.map((item, i) => (
            <div key={i} style={{ paddingLeft: '0.75rem', borderLeft: '2px solid #1560E655', marginBottom: '0.5rem' }}>
              <ValueEditor value={item} keyName={String(i)} label={`Bar ${i + 1}`} onChange={(n) => onChange(value.map((x, y) => (y === i ? n : x)))} readOnly={readOnly} />
            </div>
          ))}
        </div>
      );
    }
    return (
      <Repeater<unknown>
        label={lbl}
        items={value}
        onChange={(n) => onChange(n)}
        newItem={(items) => blank(items[items.length - 1])}
        itemLabel={(item, i) => {
          const t = typeof item === 'string' ? item : item && typeof item === 'object' ? String((item as Record<string, unknown>).name ?? (item as Record<string, unknown>).q ?? (item as Record<string, unknown>).label ?? (item as Record<string, unknown>).heading ?? (item as Record<string, Record<string, unknown>>).row?.title ?? '') : '';
          return `${i + 1}${t ? ` — ${t.slice(0, 48)}${t.length > 48 ? '…' : ''}` : ''}`;
        }}
        renderItem={(item, update) => (
          <ValueEditor value={item} keyName={typeof item === 'string' ? 'item' : keyName} label={typeof item === 'string' ? 'Text' : ''} onChange={update} readOnly={readOnly} />
        )}
        readOnly={readOnly}
      />
    );
  }
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const entries = Object.entries(o).filter(([k]) => !LOCKED.has(k));
    // An image + its alt are shown as one control.
    const hasImgAlt = typeof o.src === 'string' && typeof o.alt === 'string';
    const imageAltKey = typeof o.image === 'string' ? (typeof o.alt === 'string' ? 'alt' : null) : null;
    return (
      <div>
        {label !== '' && entries.length > 0 && lbl && !/^\d+$/.test(keyName) && keyName !== 'item' && (
          <p style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontSize: '13px', fontWeight: 700, color: '#d3e4ff', margin: '0.25rem 0 0.6rem' }}>{lbl}</p>
        )}
        {hasImgAlt && <ImageInput label={lbl || 'Image'} src={o.src as string} alt={o.alt as string} onSrc={(v) => onChange({ ...o, src: v })} onAlt={(v) => onChange({ ...o, alt: v })} />}
        {entries.map(([k, v]) => {
          if (hasImgAlt && (k === 'src' || k === 'alt')) return null;
          if (k === 'image' && imageAltKey) {
            return <ImageInput key={k} label="Image" src={v as string} alt={o.alt as string} onSrc={(x) => onChange({ ...o, image: x })} onAlt={(x) => onChange({ ...o, alt: x })} />;
          }
          if (k === 'alt' && imageAltKey) return null;
          return <ValueEditor key={k} value={v} keyName={k} onChange={(n) => onChange({ ...o, [k]: n })} readOnly={readOnly} />;
        })}
      </div>
    );
  }
  return null;
}
