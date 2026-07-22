'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ADMIN_COLORS } from '@/lib/admin/theme';
import { SITE } from '@/lib/site';
import {
  type SubServiceBlockInstance,
  type BlockStyle,
  type BlockBackground,
  type BlockIllustration,
  type BlockPosition,
  BLOCK_BACKGROUNDS,
  BLOCK_ILLUSTRATIONS,
  backgroundOption,
  illustrationOption,
  defaultBlockStyle,
  normalizeBlockStyle,
  resolveBlockStyle,
} from '@/lib/cms/sub-service-blocks';
import { BLOCK_CATALOGUE } from '@/lib/cms/block-catalogue';
import ServiceProblemsView from '@/components/ServiceProblemsView';
import NoDripClubView from '@/components/NoDripClubView';

const fontHead = 'var(--font-outfit), system-ui, sans-serif';
const fontBody = 'var(--font-nunito), system-ui, sans-serif';

const asStr = (v: unknown): string => (typeof v === 'string' ? v : '');

const FIELD_LABEL: React.CSSProperties = {
  display: 'block',
  fontFamily: fontHead,
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: `${ADMIN_COLORS.onSurfaceVariant}cc`,
  margin: '0 0 0.5rem',
};

/**
 * Brief 91 (Tracks C + D) — the Block-tab body for a style-enabled block. Shows a
 * live preview (Track D, rendered through the SAME view components the public page
 * uses) plus the closed-list style pickers (Track C: background, illustration,
 * and — when the block flips safely — position). Every choice comes from the
 * registry's `styleOptions`; there are no free-text or color-picker inputs.
 */
export default function BlockStylePanel({
  block,
  onStyleChange,
  onReset,
}: {
  block: SubServiceBlockInstance;
  onStyleChange: (patch: Partial<BlockStyle>) => void;
  onReset: () => void;
}) {
  const def = BLOCK_CATALOGUE[block.type];
  const opts = def.styleOptions;
  const fallback = defaultBlockStyle(block.type);

  // Is a style actually saved on this instance? (Drives the Reset button.)
  const savedStyle = normalizeBlockStyle(block.type, block.data.style);
  // The current selection = the saved style, else the type's default (so the
  // pickers always show the block's current look pre-selected). This never mutates
  // `data` on its own — nothing is written until the editor picks something.
  const current: BlockStyle | null = savedStyle ?? fallback;

  if (!opts || !current) {
    return (
      <p style={{ fontFamily: fontBody, fontSize: '13px', color: `${ADMIN_COLORS.onSurfaceVariant}cc`, margin: 0, lineHeight: 1.6 }}>
        This block type doesn&rsquo;t have style options yet.
      </p>
    );
  }

  // The preview shows EXACTLY what will render: the legacy default look when no
  // style is saved (so Reset visibly returns to default), the styled look once a
  // choice is committed. Picking any option writes `data.style`, flipping this on.
  const previewResolved = savedStyle ? resolveBlockStyle(block.type, { style: savedStyle }) : null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', margin: '0 0 0.75rem' }}>
        <h3 style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '13px', color: ADMIN_COLORS.onSurface, margin: 0 }}>
          {def.label} — Style
        </h3>
        <button
          type="button"
          onClick={onReset}
          disabled={!savedStyle}
          title={savedStyle ? 'Reset this block to its default look' : 'Already using the default look'}
          style={{
            flexShrink: 0,
            padding: '0.3rem 0.6rem',
            borderRadius: '0.4rem',
            border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
            background: 'transparent',
            color: savedStyle ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.onSurfaceVariant}55`,
            fontFamily: fontHead,
            fontWeight: 600,
            fontSize: '11px',
            cursor: savedStyle ? 'pointer' : 'not-allowed',
          }}
        >
          Reset
        </button>
      </div>

      {/* Track D — live preview using the exact public render components */}
      <BlockPreview block={block} resolved={previewResolved} />

      {/* Background — closed list of brand-approved combos */}
      {opts.background && opts.background.length > 0 && (
      <div style={{ marginTop: '1.25rem' }}>
        <label style={FIELD_LABEL}>Background</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
          {opts.background.map((value) => {
            const meta = backgroundOption(value)!;
            const active = current.background === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onStyleChange({ background: value as BlockBackground })}
                aria-pressed={active}
                title={meta.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.45rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${active ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.outlineVariant}55`}`,
                  background: ADMIN_COLORS.surfaceContainerLow,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    width: '22px',
                    height: '22px',
                    borderRadius: '0.3rem',
                    background: meta.bg,
                    border: `1px solid ${ADMIN_COLORS.outlineVariant}55`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: meta.fg,
                    fontFamily: fontHead,
                    fontWeight: 800,
                    fontSize: '12px',
                  }}
                >
                  A
                </span>
                <span style={{ fontFamily: fontBody, fontSize: '11px', lineHeight: 1.2, color: ADMIN_COLORS.onSurface }}>
                  {meta.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Illustration — closed list of the four J poses */}
      {opts.illustration && opts.illustration.length > 0 && (
      <div style={{ marginTop: '1.25rem' }}>
        <label style={FIELD_LABEL}>Character illustration</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
          {opts.illustration.map((value) => {
            const meta = illustrationOption(value)!;
            const active = current.illustration === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onStyleChange({ illustration: value as BlockIllustration })}
                aria-pressed={active}
                title={meta.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '0.4rem',
                  borderRadius: '0.5rem',
                  border: `2px solid ${active ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.outlineVariant}55`}`,
                  background: ADMIN_COLORS.surfaceContainerHigh,
                  cursor: 'pointer',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={meta.src}
                  alt={meta.label}
                  style={{ width: '100%', height: '70px', objectFit: 'contain' }}
                />
                <span style={{ fontFamily: fontBody, fontSize: '11px', color: ADMIN_COLORS.onSurface }}>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* Position — only when this block type supports a safe left/right flip */}
      {opts.position && opts.position.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <label style={FIELD_LABEL}>Character position</label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {opts.position.map((value) => {
              const active = (current.position ?? fallback?.position) === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onStyleChange({ position: value as BlockPosition })}
                  aria-pressed={active}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: '0.5rem',
                    border: `2px solid ${active ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.outlineVariant}55`}`,
                    background: active ? `${ADMIN_COLORS.cerulean}22` : ADMIN_COLORS.surfaceContainerLow,
                    color: ADMIN_COLORS.onSurface,
                    fontFamily: fontHead,
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p style={{ fontFamily: fontBody, fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}88`, margin: '1rem 0 0', lineHeight: 1.5 }}>
        All options are brand-approved. Changes save with the page.
      </p>
    </div>
  );
}

// ── Live preview (Track D) ──────────────────────────────────────────────────────
// Renders the selected block through the SAME view component the public page uses,
// at desktop design width, scaled down to fit the sidebar. This is what guarantees
// the preview can't drift from the real page.

function BlockPreview({
  block,
  resolved,
}: {
  block: SubServiceBlockInstance;
  resolved: ReturnType<typeof resolveBlockStyle>;
}) {
  let node: ReactNode = null;
  const d = block.data;

  if (block.type === 'listSection') {
    const items = Array.isArray(d.problemsItems) ? (d.problemsItems as string[]).filter(Boolean) : [];
    node = (
      <ServiceProblemsView
        heading={asStr(d.problemsHeading) || 'Common Problems We Solve'}
        items={items.length > 0 ? items : ['Add list items to see them here']}
        phoneHref={SITE.phoneHref}
        ctaLabel="MAKE A GOOD CALL"
        style={resolved}
      />
    );
  } else if (block.type === 'noDripClub') {
    node = (
      <NoDripClubView
        title={asStr(d.ndcTitle) || 'Premium Protection with Our No Drip Club'}
        // Admin-only preview of the editor's own draft copy; rendered as-is.
        bodyHtml={
          asStr(d.ndcBody) ||
          'Our No Drip Club offers premium plumbing protection and added peace of mind for homeowners.'
        }
        image="https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp"
        style={resolved}
      />
    );
  }

  return (
    <div>
      <label style={FIELD_LABEL}>Preview</label>
      <ScaledPreview>{node}</ScaledPreview>
    </div>
  );
}

/**
 * Renders children at a fixed desktop design width, then scales the whole thing
 * down to the container's width (so the `lg:` layout — e.g. the List Section's
 * character column — is faithful). Measures the natural height so the outer box
 * reserves exactly the scaled height.
 */
export function ScaledPreview({ children, designWidth = 1280 }: { children: ReactNode; designWidth?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.2);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    function measure() {
      const cw = containerRef.current?.clientWidth ?? 0;
      const s = cw > 0 ? cw / designWidth : 0.2;
      const natural = innerRef.current?.scrollHeight ?? 0;
      setScale(s);
      setHeight(natural * s);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [designWidth, children]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: height || undefined,
        overflow: 'hidden',
        borderRadius: '0.6rem',
        border: `1px solid ${ADMIN_COLORS.outlineVariant}55`,
        background: '#F9F3EC',
      }}
    >
      <div
        ref={innerRef}
        style={{ width: `${designWidth}px`, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {children}
      </div>
    </div>
  );
}
