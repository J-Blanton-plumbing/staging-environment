import { createElement, type ReactNode } from 'react';
import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import ScheduleTrigger from '@/components/schedule/ScheduleTrigger';
import { parseStyle, type SewerPhone } from '@/components/sewer-v2/SewerNodes';
import type { SewerRich } from '@/lib/content/sewer-v2/types';
import type { WhTreeNode } from '@/lib/content/water-heater-v2/types';
import { WhIcon } from './WhIcon';

/**
 * Brief 222 — renders a water heater content tree (the Brief 200 `SewerNode` model) to the package
 * markup: tags, classes and inline styles verbatim. The sewer renderer (SewerNodes) is untouched; this
 * one differs only in what the water heater package needs:
 *   - icons resolve against the water heater SVG set (WhIcon), attribute for attribute;
 *   - `{{phone}}` in a phone link's screen-reader label becomes the display number;
 *   - `fetchpriority` / `decoding` / `<details open>` map to their React props.
 * Phone links/numbers go through PhoneLink / PhoneNumber (WhatConverts DNI); schedule buttons through
 * ScheduleTrigger (Brief 169).
 */

export type WhPhone = SewerPhone;

const ATTR_TO_PROP: Record<string, string> = {
  referrerpolicy: 'referrerPolicy',
  allowfullscreen: 'allowFullScreen',
  tabindex: 'tabIndex',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  srcset: 'srcSet',
  fetchpriority: 'fetchPriority',
  for: 'htmlFor',
};

const VOID = new Set(['img', 'br']);

export const phoneLabel = (label: string | undefined, phone: WhPhone) => (label ? label.split('{{phone}}').join(phone.display) : undefined);

export function WhNodes({ nodes, phone }: { nodes: WhTreeNode[] | undefined; phone: WhPhone }) {
  if (!nodes || nodes.length === 0) return null;
  return (
    <>
      {nodes.map((n, i) => (
        <WhNode key={i} node={n} phone={phone} />
      ))}
    </>
  );
}

/** A FAQ answer: plain text, or nodes when it carries a link or the phone number. */
export function WhRichText({ value, phone }: { value: SewerRich; phone: WhPhone }) {
  return typeof value === 'string' ? <>{value}</> : <WhNodes nodes={value as WhTreeNode[]} phone={phone} />;
}

export function WhNode({ node, phone }: { node: WhTreeNode; phone: WhPhone }): ReactNode {
  if (typeof node === 'string') return node;
  if ('phoneNumber' in node) return <PhoneNumber value={phone.display} />;
  if ('icon' in node) return <WhIcon name={node.icon} />;
  if ('schedule' in node) return <ScheduleTrigger as="button" className={node.schedule.cls} label={node.schedule.label} />;
  if ('phone' in node) {
    return (
      <PhoneLink href={phone.href} display={phone.display} className={node.phone.cls} aria-label={phoneLabel(node.phone.ariaLabel, phone)}>
        <WhNodes nodes={node.phone.kids} phone={phone} />
      </PhoneLink>
    );
  }
  const props: Record<string, unknown> = {};
  if (node.cls) props.className = node.cls;
  if (node.style) props.style = parseStyle(node.style);
  for (const [k, v] of Object.entries(node.attrs ?? {})) props[ATTR_TO_PROP[k] ?? k] = v;
  if (node.tag === 'button' && !props.type) props.type = 'button';
  if (VOID.has(node.tag)) return createElement(node.tag, props);
  return createElement(node.tag, props, node.kids ? <WhNodes nodes={node.kids} phone={phone} /> : null);
}
