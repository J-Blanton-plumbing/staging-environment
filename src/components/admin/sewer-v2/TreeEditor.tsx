'use client';

/**
 * Brief 204 — the editor for one editorial panel (`SewerNode[]`). Every text leaf, link, image (with
 * its alt), YouTube id and screen-reader label is a field; every list (cards, steps, bullets, table
 * rows, card rails) is a repeater; paragraphs / bullets / cells are rich text. Tags, classes, inline
 * styles and order are never shown and can't change — `conform.ts` enforces the same rules on save.
 */
import type { SewerElement, SewerNode } from '@/lib/content/sewer-v2/types';
import { isRepeaterElement, isRichElement } from '@/lib/sewer-v2-cms/conform';
import { nodesText } from '@/lib/sewer-v2-cms/rich';
import { ImageInput, Repeater, RichInput, TextInput } from './ui';

const isEl = (n: SewerNode): n is SewerElement => typeof n === 'object' && 'tag' in n;

/** The first heading text in a panel — its group label in the editor. */
export function panelTitle(nodes: readonly SewerNode[]): string {
  for (const n of nodes) {
    if (!isEl(n)) continue;
    if (n.tag === 'h2') return nodesText(n.kids);
    const inner = panelTitle(n.kids ?? []);
    if (inner) return inner;
  }
  return '';
}

function labelFor(e: SewerElement): string {
  const cls = e.cls ?? '';
  if (/\bt-eyebrow\b/.test(cls)) return 'Eyebrow';
  if (e.tag === 'h2') return 'Heading';
  if (e.tag === 'h3' || e.tag === 'h4') return 'Sub-heading';
  if (e.tag === 'p') return 'Paragraph';
  if (e.tag === 'li') return 'Bullet';
  if (e.tag === 'td') return 'Cell';
  if (e.tag === 'th') return 'Heading cell';
  if (e.tag === 'figcaption') return 'Caption';
  if (e.tag === 'strong') return 'Bold text';
  if (e.tag === 'a') return 'Link text';
  if (e.tag === 'button') return 'Button text';
  return 'Text';
}

/** A new list item: the first item's layout with its words emptied (images and video ids kept to replace). */
export function blankLike(n: SewerNode): SewerNode {
  if (typeof n === 'string') return '';
  if (!isEl(n)) {
    if ('schedule' in n) return { schedule: { ...n.schedule, label: '' } };
    return JSON.parse(JSON.stringify(n));
  }
  const out: SewerElement = JSON.parse(JSON.stringify({ ...n, kids: undefined }));
  if (out.attrs && typeof out.attrs.alt === 'string') out.attrs.alt = '';
  if (n.kids !== undefined) out.kids = isRichElement(n) ? [''] : n.kids.map(blankLike);
  return out;
}

const itemNoun = (parent: SewerElement) =>
  parent.tag === 'tbody' ? 'Row' : parent.tag === 'ul' || parent.tag === 'ol' ? 'Bullet' : /rail/.test(parent.cls ?? '') ? 'Card' : 'Card';

export function NodeList({ nodes, onChange, parentLabel = 'Text', readOnly }: { nodes: readonly SewerNode[]; onChange: (next: SewerNode[]) => void; parentLabel?: string; readOnly?: boolean }) {
  const set = (i: number, next: SewerNode) => onChange(nodes.map((x, y) => (y === i ? next : x)));
  return (
    <>
      {nodes.map((n, i) => (
        <NodeEditor key={i} node={n} onChange={(next) => set(i, next)} parentLabel={parentLabel} readOnly={readOnly} />
      ))}
    </>
  );
}

function NodeEditor({ node, onChange, parentLabel, readOnly }: { node: SewerNode; onChange: (next: SewerNode) => void; parentLabel: string; readOnly?: boolean }) {
  if (typeof node === 'string') {
    if (!node.trim() && node !== '') return null; // whitespace between elements
    return <TextInput label={parentLabel} value={node} onChange={onChange} multiline={node.length > 90} readOnly={readOnly} />;
  }
  if ('phoneNumber' in node || 'icon' in node) return null;
  if ('schedule' in node) {
    return <TextInput label="Schedule button label" value={node.schedule.label} onChange={(label) => onChange({ schedule: { ...node.schedule, label } })} readOnly={readOnly} />;
  }
  if ('video' in node) {
    if (node.video.kind !== 'youtube') return null;
    const v = node.video;
    return (
      <div style={{ paddingLeft: '0.75rem', borderLeft: '2px solid #1560E655' }}>
        <TextInput label="YouTube video id" value={v.id} onChange={(id) => onChange({ video: { ...v, id } })} hint="The 11 characters after “v=” in the video’s YouTube link." readOnly={readOnly} />
        <TextInput label="Video title (screen readers)" value={v.title} onChange={(title) => onChange({ video: { ...v, title } })} readOnly={readOnly} />
      </div>
    );
  }
  if ('phone' in node) {
    const kids = node.phone.kids ?? [];
    const label = kids.filter((k): k is string => typeof k === 'string');
    return (
      <div style={{ marginBottom: '0.75rem' }}>
        <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: '#c4c6cdcc', margin: '0 0 0.4rem' }}>
          Call button — dials the phone number in Global Settings (layout locked).
        </p>
        {label.length > 0 && (
          <NodeList nodes={kids} onChange={(next) => onChange({ phone: { ...node.phone, kids: next } })} parentLabel="Call button label" readOnly={readOnly} />
        )}
      </div>
    );
  }
  const e = node;
  const setKids = (kids: SewerNode[]) => onChange({ ...e, kids });
  const setAttr = (k: string, v: string) => onChange({ ...e, attrs: { ...(e.attrs ?? {}), [k]: v } });

  if (e.tag === 'img') {
    const alt = typeof e.attrs?.alt === 'string' ? e.attrs.alt : undefined;
    return (
      <ImageInput
        label="Image"
        src={String(e.attrs?.src ?? '')}
        alt={alt}
        onSrc={(v) => setAttr('src', v)}
        onAlt={alt !== undefined ? (v) => setAttr('alt', v) : undefined}
        decorative={alt === undefined}
      />
    );
  }
  if (isRichElement(e)) {
    return <RichInput label={labelFor(e)} value={e.kids ?? []} onChange={setKids} readOnly={readOnly} />;
  }
  const extras = (
    <>
      {e.tag === 'a' && typeof e.attrs?.href === 'string' && (
        <TextInput label="Link" value={e.attrs.href} onChange={(v) => setAttr('href', v)} link hint="A site path (/financing) or a full https:// address." readOnly={readOnly} />
      )}
      {typeof e.attrs?.['aria-label'] === 'string' && (
        <TextInput label="Screen-reader label" value={e.attrs['aria-label']} onChange={(v) => setAttr('aria-label', v)} readOnly={readOnly} />
      )}
    </>
  );
  if (isRepeaterElement(e)) {
    const kids = e.kids ?? [];
    const noun = itemNoun(e);
    return (
      <>
        {extras}
        <Repeater<SewerNode>
          label={noun === 'Row' ? 'Table rows' : noun === 'Bullet' ? 'Bullets' : 'Cards'}
          items={kids}
          onChange={setKids}
          newItem={(items) => blankLike(items[0])}
          itemLabel={(item, i) => {
            const t = isEl(item) ? nodesText(item.kids).trim() : '';
            return `${noun} ${i + 1}${t ? ` — ${t.slice(0, 48)}${t.length > 48 ? '…' : ''}` : ''}`;
          }}
          renderItem={(item, update) =>
            isEl(item) && !isRichElement(item) && item.tag !== 'img' ? (
              <NodeList nodes={item.kids ?? []} onChange={(kids) => update({ ...item, kids })} parentLabel={labelFor(item)} readOnly={readOnly} />
            ) : (
              <NodeEditor node={item} onChange={update} parentLabel={noun} readOnly={readOnly} />
            )
          }
          addLabel={`Add ${noun.toLowerCase()}`}
          readOnly={readOnly}
        />
      </>
    );
  }
  if (e.tag === 'table') {
    return (
      <div style={{ paddingLeft: '0.75rem', borderLeft: '2px solid #1560E655' }}>
        <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: '#c4c6cdcc', margin: '0 0 0.6rem' }}>
          Table — the columns are fixed; rows can be added, removed and reordered. On phones each cell is labelled with its column heading automatically.
        </p>
        <NodeList nodes={e.kids ?? []} onChange={setKids} parentLabel="Column heading" readOnly={readOnly} />
      </div>
    );
  }
  return (
    <>
      {extras}
      <NodeList nodes={e.kids ?? []} onChange={setKids} parentLabel={labelFor(e)} readOnly={readOnly} />
    </>
  );
}
