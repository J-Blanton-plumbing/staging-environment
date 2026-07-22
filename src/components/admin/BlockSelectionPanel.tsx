'use client';

import { ADMIN_COLORS } from '@/lib/admin/theme';
import {
  type SubServiceBlockInstance,
} from '@/lib/cms/sub-service-blocks';
import { BLOCK_CATALOGUE } from '@/lib/cms/block-catalogue';
import {
  readRelatedArticlesConfig,
  resolveRelatedArticles,
  type ResolvableArticle,
  type RelatedArticlesMode,
  type RelatedArticlesCount,
} from '@/lib/cms/related-articles';
import ArticleGrid from '@/components/ArticleGrid';
import { ScaledPreview } from '@/components/admin/BlockStylePanel';

const fontHead = 'var(--font-outfit), system-ui, sans-serif';
const fontBody = 'var(--font-nunito), system-ui, sans-serif';

const FIELD_LABEL: React.CSSProperties = {
  display: 'block', fontFamily: fontHead, fontSize: '11px', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em',
  color: `${ADMIN_COLORS.onSurfaceVariant}cc`, margin: '0 0 0.5rem',
};

/**
 * Brief 92 (Tracks A + D) — the Block-tab body for a SELECTION-enabled block
 * (Related Articles). Renders the registry-driven mode + count controls and a live
 * preview through the SAME resolver + ArticleGrid the public page uses, so the
 * preview can't drift. Mode-specific INPUTS (category picker, hand-pick fields,
 * backfill) live in the block's own box in the main column, not here.
 */
export default function BlockSelectionPanel({
  block,
  articles,
  onSelectionChange,
}: {
  block: SubServiceBlockInstance;
  articles: ResolvableArticle[];
  onSelectionChange: (key: 'mode' | 'count', value: unknown) => void;
}) {
  const def = BLOCK_CATALOGUE[block.type];
  const opts = def.selectionOptions;
  const config = readRelatedArticlesConfig(block.data);

  if (!opts) {
    return (
      <p style={{ fontFamily: fontBody, fontSize: '13px', color: `${ADMIN_COLORS.onSurfaceVariant}cc`, margin: 0, lineHeight: 1.6 }}>
        This block type doesn&rsquo;t have options yet.
      </p>
    );
  }

  const resolved = resolveRelatedArticles(config, articles);

  return (
    <div>
      <h3 style={{ fontFamily: fontHead, fontWeight: 700, fontSize: '13px', color: ADMIN_COLORS.onSurface, margin: '0 0 0.75rem' }}>
        {def.label} — Articles
      </h3>

      {/* Track D — live preview through the shared resolver + public ArticleGrid */}
      <div style={{ marginBottom: '1.25rem' }}>
        <label style={FIELD_LABEL}>Preview</label>
        {resolved.length > 0 ? (
          <ScaledPreview>
            <div style={{ padding: '24px' }}>
              <ArticleGrid articles={resolved} />
            </div>
          </ScaledPreview>
        ) : (
          <p style={{ fontFamily: fontBody, fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}aa`, margin: 0, lineHeight: 1.5 }}>
            No articles match yet — the row will be empty on the page.
          </p>
        )}
      </div>

      {/* Mode — three-option segmented control from the registry */}
      <div>
        <label style={FIELD_LABEL}>Mode</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {opts.modes.map((m) => {
            const active = config.mode === m.value;
            return (
              <button
                key={m.value}
                type="button"
                onClick={() => onSelectionChange('mode', m.value as RelatedArticlesMode)}
                aria-pressed={active}
                style={{
                  padding: '0.5rem 0.6rem', borderRadius: '0.5rem', textAlign: 'left',
                  border: `2px solid ${active ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.outlineVariant}55`}`,
                  background: active ? `${ADMIN_COLORS.cerulean}22` : ADMIN_COLORS.surfaceContainerLow,
                  color: ADMIN_COLORS.onSurface, fontFamily: fontHead, fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Count — 3 / 6 / 9 */}
      <div style={{ marginTop: '1.25rem' }}>
        <label style={FIELD_LABEL}>Number of articles</label>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {opts.counts.map((c) => {
            const active = config.count === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => onSelectionChange('count', c as RelatedArticlesCount)}
                aria-pressed={active}
                style={{
                  flex: 1, padding: '0.5rem', borderRadius: '0.5rem',
                  border: `2px solid ${active ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.outlineVariant}55`}`,
                  background: active ? `${ADMIN_COLORS.cerulean}22` : ADMIN_COLORS.surfaceContainerLow,
                  color: ADMIN_COLORS.onSurface, fontFamily: fontHead, fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      <p style={{ fontFamily: fontBody, fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}88`, margin: '1rem 0 0', lineHeight: 1.5 }}>
        {config.mode === 'newest'
          ? 'The newest published articles are shown automatically.'
          : config.mode === 'category'
            ? 'Pick categories (and optional backfill) in the block below. Changes save with the page.'
            : 'Pick the articles in the block below. Changes save with the page.'}
      </p>
    </div>
  );
}
