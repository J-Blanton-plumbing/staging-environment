import { createElement } from 'react';
import { parseStyle } from '@/components/sewer-v2/SewerNodes';
import { WH_ICONS } from './wh-icon-data';

/**
 * Brief 222 — renders one of the package's inline SVGs by name (see wh-icon-data.ts). The outer <svg>'s
 * attributes become React props (so client-side navigation creates a correct SVG element); its children
 * are the package markup verbatim.
 */
const PROP: Record<string, string> = {
  class: 'className',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
};

export function WhIcon({ name }: { name: string }) {
  const icon = WH_ICONS[name];
  if (!icon) return null;
  const props: Record<string, unknown> = { dangerouslySetInnerHTML: { __html: icon.inner } };
  for (const [k, v] of Object.entries(icon.attrs)) {
    if (k === 'style') props.style = parseStyle(v);
    else props[PROP[k] ?? k] = v;
  }
  return createElement('svg', props);
}
