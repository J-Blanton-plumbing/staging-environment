'use client';

import { ADMIN_COLORS } from '@/lib/admin/theme';
import {
  type SubServiceBlockInstance,
  type BlockPosition,
  readTwoColumnPosition,
} from '@/lib/cms/sub-service-blocks';
import { BLOCK_CATALOGUE } from '@/lib/cms/block-catalogue';
import TwoColumnSectionView from '@/components/TwoColumnSectionView';
import { ScaledPreview } from '@/components/admin/BlockStylePanel';

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
 * Brief 93 (Tracks B + C + D) — the Block-tab body for a "2 Column Section" block.
 * The STRUCTURAL controls live here in the sidebar (Brief 91 principle): the
 * alignment (image side) toggle and the button on/off toggle. The CONTENT inputs
 * (heading, body, image, and — when the button is on — its label + link) live in
 * the block's own box in the main editor column.
 *
 * A live preview (Track D) renders through the SAME <TwoColumnSectionView> the
 * public page uses, so the sidebar preview can't drift from the real page.
 */
export default function TwoColumnBlockPanel({
  block,
  onPositionChange,
  onButtonToggle,
  onReset,
}: {
  block: SubServiceBlockInstance;
  onPositionChange: (position: BlockPosition) => void;
  onButtonToggle: (enabled: boolean) => void;
  onReset: () => void;
}) {
  const def = BLOCK_CATALOGUE[block.type];
  const positions = def.styleOptions?.position ?? (['left', 'right'] as BlockPosition[]);
  const current = readTwoColumnPosition(block.data);
  const button = (block.data.button ?? {}) as { enabled?: boolean; label?: string; href?: string };
  const buttonOn = button.enabled === true;
  // Reset is available whenever there's something to revert: an explicit style
  // (even a redundant one matching the default) or a button object of any kind.
  const hasOverrides = 'style' in block.data || 'button' in block.data;

  const d = block.data;
  const paragraphs = d.introBody ? [asStr(d.introBody)] : [];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', margin: '0 0 0.75rem' }}>
        <h3 style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '13px', color: ADMIN_COLORS.onSurface, margin: 0 }}>
          {def.label} — Layout
        </h3>
        <button
          type="button"
          onClick={onReset}
          disabled={!hasOverrides}
          title={hasOverrides ? 'Reset this block to its default look' : 'Already using the default look'}
          style={{
            flexShrink: 0,
            padding: '0.3rem 0.6rem',
            borderRadius: '0.4rem',
            border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
            background: 'transparent',
            color: hasOverrides ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.onSurfaceVariant}55`,
            fontFamily: fontHead,
            fontWeight: 600,
            fontSize: '11px',
            cursor: hasOverrides ? 'pointer' : 'not-allowed',
          }}
        >
          Reset
        </button>
      </div>

      {/* Track D — live preview using the exact public render component */}
      <div>
        <label style={FIELD_LABEL}>Preview</label>
        <ScaledPreview>
          <TwoColumnSectionView
            heading={asStr(d.introHeading) || 'Section heading'}
            paragraphs={paragraphs.length > 0 ? paragraphs : ['Add body copy to see it here.']}
            image={asStr(d.fImage)}
            position={current}
            button={buttonOn && asStr(button.label).trim() ? { label: asStr(button.label), href: asStr(button.href) } : null}
          />
        </ScaledPreview>
      </div>

      {/* Alignment — which side the image sits on (desktop). Mobile is always text-first. */}
      <div style={{ marginTop: '1.25rem' }}>
        <label style={FIELD_LABEL}>Image position (desktop)</label>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {positions.map((value) => {
            const active = current === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onPositionChange(value)}
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
        <p style={{ fontFamily: fontBody, fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}88`, margin: '0.4rem 0 0', lineHeight: 1.5 }}>
          Flips the desktop columns. On mobile the text always stacks above the image.
        </p>
      </div>

      {/* Button on/off — the label + link fields appear inside the block's box. */}
      <div style={{ marginTop: '1.25rem' }}>
        <label style={FIELD_LABEL}>Button</label>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[
            { value: false, label: 'Off' },
            { value: true, label: 'On' },
          ].map((opt) => {
            const active = buttonOn === opt.value;
            return (
              <button
                key={opt.label}
                type="button"
                onClick={() => onButtonToggle(opt.value)}
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
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p style={{ fontFamily: fontBody, fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}88`, margin: '0.4rem 0 0', lineHeight: 1.5 }}>
          {buttonOn
            ? 'Set the button label + link in the block box (main column).'
            : 'No button renders. Turn on to add a brand-approved CTA button.'}
        </p>
      </div>

      <p style={{ fontFamily: fontBody, fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}88`, margin: '1rem 0 0', lineHeight: 1.5 }}>
        Changes save with the page.
      </p>
    </div>
  );
}
