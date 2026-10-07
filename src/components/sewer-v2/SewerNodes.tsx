import { createElement, type CSSProperties, type ReactNode } from 'react';
import { PhoneLink, PhoneNumber } from '@/components/PhoneLink';
import ScheduleTrigger from '@/components/schedule/ScheduleTrigger';
import type { SewerNode, SewerRich, SewerVideo } from '@/lib/content/sewer-v2/types';
import { SewerIcon } from './icons';

/**
 * Brief 200 — renders a Sewer v2 content tree (`SewerNode[]`, see lib/content/sewer-v2/types.ts)
 * to the same markup the approved package had: tags, classes and inline styles verbatim.
 *
 * Usable from server components (it holds no state). Phone links/numbers go through the site's
 * PhoneLink/PhoneNumber so WhatConverts DNI swaps them; schedule buttons through ScheduleTrigger.
 */

export interface SewerPhone {
  /** Default dial target, e.g. `tel:773-724-9272` (Global Settings, site.ts fallback). */
  href: string;
  /** Default display number, e.g. `773-724-9272`. */
  display: string;
}

/** `"color:var(--c-slate);margin:0"` → a React style object (custom properties kept verbatim). */
export function parseStyle(css: string | undefined): CSSProperties | undefined {
  if (!css) return undefined;
  const out: Record<string, string> = {};
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const value = decl.slice(i + 1).trim();
    if (!prop) continue;
    const key = prop.startsWith('--')
      ? prop
      : prop.replace(/^-(webkit|moz|ms)-/, (_m, v: string) => `${v.charAt(0).toUpperCase()}${v.slice(1)}-`).replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());
    out[key] = value;
  }
  return out as CSSProperties;
}

const ATTR_TO_PROP: Record<string, string> = {
  referrerpolicy: 'referrerPolicy',
  allowfullscreen: 'allowFullScreen',
  tabindex: 'tabIndex',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  srcset: 'srcSet',
};

const VOID = new Set(['img', 'br']);

const YT_WRAP = parseStyle('border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(10,27,46,0.14);aspect-ratio:16/9;background:var(--c-midnight)');
const YT_FRAME = parseStyle('width:100%;height:100%;border:0;display:block');
const MP4_WRAP = parseStyle('border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(10,27,46,0.14)');
const MP4_VIDEO = parseStyle('width:100%;height:auto;display:block;background:var(--c-midnight)');

/** The approved video embed markup (YouTube iframe or self-hosted MP4). */
export function SewerVideoBlock({ video, phone }: { video: SewerVideo; phone: SewerPhone }) {
  if (video.kind === 'youtube') {
    return (
      <div style={YT_WRAP}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
          title={video.title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          style={YT_FRAME}
        />
      </div>
    );
  }
  const [before, after] = video.fallback.split('{phone}');
  return (
    <div style={MP4_WRAP}>
      <video controls poster={video.poster} preload="none" style={MP4_VIDEO}>
        <source src={video.src} type="video/mp4" />
        {before}
        {after !== undefined && <PhoneNumber value={phone.display} />}
        {after}
      </video>
    </div>
  );
}

export function SewerNodes({ nodes, phone }: { nodes: SewerNode[] | undefined; phone: SewerPhone }) {
  if (!nodes || nodes.length === 0) return null;
  return (
    <>
      {nodes.map((n, i) => (
        <SewerNodeView key={i} node={n} phone={phone} />
      ))}
    </>
  );
}

/** A FAQ answer: plain text, or nodes when it carries a link or the phone number. */
export function SewerRichText({ value, phone }: { value: SewerRich; phone: SewerPhone }) {
  return typeof value === 'string' ? <>{value}</> : <SewerNodes nodes={value} phone={phone} />;
}

function SewerNodeView({ node, phone }: { node: SewerNode; phone: SewerPhone }): ReactNode {
  if (typeof node === 'string') return node;
  if ('phoneNumber' in node) return <PhoneNumber value={phone.display} />;
  if ('icon' in node) return <SewerIcon name={node.icon} />;
  if ('video' in node) return <SewerVideoBlock video={node.video} phone={phone} />;
  if ('schedule' in node) return <ScheduleTrigger as="button" className={node.schedule.cls} label={node.schedule.label} />;
  if ('phone' in node) {
    return (
      <PhoneLink href={phone.href} display={phone.display} className={node.phone.cls} aria-label={node.phone.ariaLabel}>
        <SewerNodes nodes={node.phone.kids} phone={phone} />
      </PhoneLink>
    );
  }
  const props: Record<string, unknown> = {};
  if (node.cls) props.className = node.cls;
  if (node.style) props.style = parseStyle(node.style);
  for (const [k, v] of Object.entries(node.attrs ?? {})) props[ATTR_TO_PROP[k] ?? k] = v;
  if (node.tag === 'button' && !props.type) props.type = 'button';
  if (VOID.has(node.tag)) return createElement(node.tag, props);
  return createElement(node.tag, props, node.kids ? <SewerNodes nodes={node.kids} phone={phone} /> : null);
}

