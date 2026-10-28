/**
 * Brief 204 — rich text for the Sewer v2 pages, kept as a TREE (Marketing decision 4, 2026-10-12).
 *
 * A paragraph, bullet, table cell or FAQ answer that allows inline formatting is stored as
 * `SewerNode[]` — strings plus `strong` / `em` / `a` / `br` elements and the phone nodes — exactly as
 * the code modules hold it, so an unedited field renders byte-identically. The editor shows it as a
 * small inline-HTML string; these two functions convert between the two, both in the browser and on
 * the server (no DOM, no dependency):
 *
 *   inlineNodesToHtml(nodes) → `Call <a href="/x">us</a> on {{phone}}`
 *   htmlToInlineNodes(html)  → ['Call ', { tag: 'a', attrs: { href: '/x' }, kids: ['us'] }, ' on ', { phoneNumber: true }]
 *
 * Phones never appear as numbers: the visible number is the text token `{{phone}}` (→ PhoneNumber),
 * and a call link is `<a href="{{phone}}">label</a>` (→ PhoneLink). Both render with the Global
 * Settings number and are swapped by WhatConverts like every other number on the site.
 *
 * Inline element classes/styles are NOT part of this string: the 8 approved inline styles (carmine
 * links, Midnight bold lead-ins) are re-applied server-side from the code module by `conform.ts`, so
 * an editor can neither lose them nor invent new ones.
 */
import type { SewerElement, SewerNode } from '@/lib/content/sewer-v2/types';

export const PHONE_TOKEN = '{{phone}}';

/** Tags an inline (rich) field may contain, besides text and the two phone nodes. */
export const INLINE_TAGS = new Set(['strong', 'em', 'a', 'br']);

const escText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s: string) => escText(s).replace(/"/g, '&quot;');

export function inlineNodesToHtml(nodes: readonly SewerNode[] | string): string {
  if (typeof nodes === 'string') return escText(nodes);
  let out = '';
  for (const n of nodes) {
    if (typeof n === 'string') out += escText(n);
    else if ('phoneNumber' in n) out += PHONE_TOKEN;
    else if ('phone' in n) out += `<a href="${PHONE_TOKEN}">${inlineNodesToHtml(n.phone.kids ?? [])}</a>`;
    else if ('tag' in n) {
      if (n.tag === 'br') out += '<br>';
      else if (n.tag === 'a') out += `<a href="${escAttr(String(n.attrs?.href ?? ''))}">${inlineNodesToHtml(n.kids ?? [])}</a>`;
      else if (n.tag === 'strong' || n.tag === 'em') out += `<${n.tag}>${inlineNodesToHtml(n.kids ?? [])}</${n.tag}>`;
      else out += inlineNodesToHtml(n.kids ?? []); // not inline vocabulary: keep the words only
    }
  }
  return out;
}

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", '#x27': "'" };
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e: string) => {
    const k = e.toLowerCase();
    if (k in NAMED) return NAMED[k];
    if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16));
    if (k.startsWith('#')) return String.fromCodePoint(parseInt(k.slice(1), 10));
    return m;
  });
}

/** Text → strings + `{ phoneNumber: true }` wherever the `{{phone}}` token appears. */
function splitPhoneToken(text: string): SewerNode[] {
  const out: SewerNode[] = [];
  const parts = text.split(PHONE_TOKEN);
  parts.forEach((p, i) => {
    if (p) out.push(p);
    if (i < parts.length - 1) out.push({ phoneNumber: true });
  });
  return out;
}

/** Merge adjacent strings (the tokenizer can split one run around a dropped tag). */
function joinStrings(nodes: SewerNode[]): SewerNode[] {
  const out: SewerNode[] = [];
  for (const n of nodes) {
    const last = out[out.length - 1];
    if (typeof n === 'string' && typeof last === 'string') out[out.length - 1] = last + n;
    else out.push(n);
  }
  return out;
}

/**
 * Parse the limited inline vocabulary. Anything else is reduced to its text: `<b>`/`<i>` become
 * `strong`/`em`, every other tag is dropped (its words kept), and an unclosed tag closes at the end.
 * This is a CONVERTER, not the security gate — the server runs `sanitizeCmsInlineHtml` first.
 */
export function htmlToInlineNodes(html: string): SewerNode[] {
  type Frame = { tag: 'root' | 'strong' | 'em' | 'a'; href?: string; kids: SewerNode[] };
  const stack: Frame[] = [{ tag: 'root', kids: [] }];
  const top = () => stack[stack.length - 1];
  const re = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const pushText = (raw: string) => {
    if (!raw) return;
    top().kids.push(...splitPhoneToken(decodeEntities(raw)));
  };
  const close = (tag: Frame['tag']) => {
    const i = stack.map((f) => f.tag).lastIndexOf(tag);
    if (i <= 0) return; // stray closing tag: ignore
    while (stack.length > i) {
      const f = stack.pop()!;
      const kids = joinStrings(f.kids);
      let node: SewerNode;
      if (f.tag === 'a') {
        node = f.href === PHONE_TOKEN ? { phone: { kids } } : { tag: 'a', attrs: { href: f.href ?? '' }, kids };
      } else node = { tag: f.tag as 'strong' | 'em', kids };
      top().kids.push(node);
    }
  };
  while ((m = re.exec(html))) {
    pushText(html.slice(last, m.index));
    last = re.lastIndex;
    const closing = m[1] === '/';
    const name = m[2].toLowerCase();
    const tag = name === 'b' ? 'strong' : name === 'i' ? 'em' : name;
    if (tag === 'br') { if (!closing) top().kids.push({ tag: 'br' }); continue; }
    if (tag !== 'strong' && tag !== 'em' && tag !== 'a') continue;
    if (closing) { close(tag); continue; }
    if (tag === 'a') {
      const h = /\shref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(` ${m[3]}`);
      stack.push({ tag: 'a', href: decodeEntities(h ? h[2] ?? h[3] ?? h[4] ?? '' : '').trim(), kids: [] });
    } else stack.push({ tag, kids: [] });
  }
  pushText(html.slice(last));
  while (stack.length > 1) close(top().tag);
  return joinStrings(stack[0].kids);
}

/** The visible words of a node list (labels, empty-field checks). */
export function nodesText(nodes: readonly SewerNode[] | string | undefined): string {
  if (nodes === undefined) return '';
  if (typeof nodes === 'string') return nodes;
  return nodes
    .map((n) =>
      typeof n === 'string'
        ? n
        : 'phoneNumber' in n
          ? PHONE_TOKEN
          : 'phone' in n
            ? nodesText(n.phone.kids)
            : 'schedule' in n
              ? n.schedule.label
              : 'tag' in n
                ? nodesText(n.kids)
                : ''
    )
    .join('');
}

/** Is this element's content the inline vocabulary only (→ edited as one rich-text field)? */
export function isInlineOnly(nodes: readonly SewerNode[] | undefined): boolean {
  return (nodes ?? []).every(
    (n) =>
      typeof n === 'string' ||
      'phoneNumber' in n ||
      // Brief 222: a phone link may also show the number itself (`<a href=tel>{{phone}}</a>` — the water
      // heater FAQs). No sewer rich field holds that shape, so their classification is unchanged.
      ('phone' in n && (n.phone.kids ?? []).every((k) => typeof k === 'string' || (typeof k === 'object' && 'phoneNumber' in k))) ||
      ('tag' in n && INLINE_TAGS.has(n.tag) && isInlineOnly((n as SewerElement).kids))
  );
}
