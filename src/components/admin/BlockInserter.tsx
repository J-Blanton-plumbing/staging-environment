'use client';

/**
 * Brief 99 — extracted + generalized from the sub-service editor's inline
 * `BlockInserter`/`InserterTile` (Brief 90 Track D) so any registry-driven
 * editor can reuse the exact same "+" popover. Generalized from
 * `SubServiceBlockType` to the general `BlockType`, and page-type-aware via
 * the Brief 97/99 registry (`insertableBlocksFor`/`insertableBlocksByCategoryFor`
 * + `flagsFor`) so the same component serves sub-service AND City V2 without
 * a fork. Behavior for sub-service is unchanged — it's the same lookups the
 * old local copy used, just parameterized by `pageType: 'sub-service'`.
 */

import { useState, useEffect } from 'react';
import { ADMIN_COLORS, ADMIN_SHADOWS } from '@/lib/admin/theme';
import {
  type BlockType,
  type PageType,
  BLOCK_CATALOGUE,
  flagsFor,
  insertableBlocksFor,
  insertableBlocksByCategoryFor,
} from '@/lib/cms/block-catalogue';

const INPUT: React.CSSProperties = {
  display: 'block', width: '100%', padding: '0.5rem',
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`, borderRadius: '0.5rem',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '0.9rem', color: ADMIN_COLORS.onSurface,
  background: ADMIN_COLORS.surfaceContainerLow, boxSizing: 'border-box',
};

function InserterTile({
  label, variant, disabled, onClick,
}: {
  label: string; variant: string; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `${label} — already on this page` : `Insert ${label}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: '0.15rem', textAlign: 'left',
        padding: '0.6rem 0.7rem', borderRadius: '0.6rem',
        border: `1px solid ${ADMIN_COLORS.outlineVariant}55`,
        background: ADMIN_COLORS.surfaceContainerLow,
        color: disabled ? `${ADMIN_COLORS.onSurfaceVariant}66` : ADMIN_COLORS.onSurface,
        cursor: disabled ? 'not-allowed' : 'pointer', width: '100%',
        fontFamily: 'var(--font-nunito), system-ui, sans-serif',
      }}
    >
      <span style={{ fontSize: '13px', fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: '11px', color: `${ADMIN_COLORS.onSurfaceVariant}aa` }}>{variant}</span>
    </button>
  );
}

export default function BlockInserter({
  pageType, open, onOpen, onClose, onInsert, presentTypes, recent, defaultRecent,
}: {
  pageType: PageType;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onInsert: (type: BlockType) => void;
  presentTypes: Set<BlockType>;
  recent: BlockType[];
  /** Fallback shown in "Recently used" before the editor has any localStorage history. */
  defaultRecent: BlockType[];
}) {
  const [query, setQuery] = useState('');
  const [browseAll, setBrowseAll] = useState(false);

  useEffect(() => {
    if (!open) { setQuery(''); setBrowseAll(false); }
  }, [open]);

  const insertable = insertableBlocksFor(pageType);
  const disabledFor = (t: BlockType) => !flagsFor(BLOCK_CATALOGUE[t], pageType).allowMultiple && presentTypes.has(t);

  const q = query.trim().toLowerCase();
  const searchResults = q
    ? insertable.filter((b) => `${b.label} ${b.variant} ${b.description}`.toLowerCase().includes(q))
    : [];

  const recentDefs = (recent.length ? recent : defaultRecent)
    .map((t) => BLOCK_CATALOGUE[t])
    .filter((d) => d && d.pageTypes.includes(pageType) && flagsFor(d, pageType).isInsertable)
    .slice(0, 4);

  return (
    <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '0.5rem 0', zIndex: open ? 5 : 1 }}>
      <button
        type="button"
        onClick={open ? onClose : onOpen}
        aria-label="Add a block"
        aria-expanded={open}
        style={{
          width: '30px', height: '30px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: '0.4rem', border: 'none', background: ADMIN_COLORS.cerulean, color: '#fff',
          fontSize: '20px', lineHeight: 1, cursor: 'pointer', boxShadow: ADMIN_SHADOWS.md,
        }}
      >
        +
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <div
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'transparent' }}
          />
          <div
            style={{
              position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
              zIndex: 11, width: 'min(340px, calc(100vw - 3rem))', marginTop: '0.25rem',
              background: ADMIN_COLORS.surfaceContainer, border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
              borderRadius: '0.9rem', boxShadow: ADMIN_SHADOWS.xl, padding: '0.85rem',
            }}
          >
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              style={{ ...INPUT, marginBottom: '0.75rem', background: ADMIN_COLORS.surfaceContainerLow }}
            />

            {q ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                {searchResults.length === 0 ? (
                  <p style={{ gridColumn: '1 / -1', fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '12px', color: ADMIN_COLORS.onSurfaceVariant, margin: 0 }}>
                    No blocks match “{query}”.
                  </p>
                ) : (
                  searchResults.map((b) => (
                    <InserterTile key={b.type} label={b.label} variant={b.variant} disabled={disabledFor(b.type)} onClick={() => onInsert(b.type)} />
                  ))
                )}
              </div>
            ) : browseAll ? (
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {insertableBlocksByCategoryFor(pageType).map((g) => (
                  <div key={g.category} style={{ marginBottom: '0.75rem' }}>
                    <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: '0 0 0.4rem' }}>
                      {g.label}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {g.blocks.map((b) => (
                        <InserterTile key={b.type} label={b.label} variant={b.variant} disabled={disabledFor(b.type)} onClick={() => onInsert(b.type)} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p style={{ fontFamily: 'var(--font-nunito), system-ui, sans-serif', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: `${ADMIN_COLORS.onSurfaceVariant}99`, margin: '0 0 0.4rem' }}>
                  Recently used
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {recentDefs.map((b) => (
                    <InserterTile key={b.type} label={b.label} variant={b.variant} disabled={disabledFor(b.type)} onClick={() => onInsert(b.type)} />
                  ))}
                </div>
              </>
            )}

            {!q && (
              <button
                type="button"
                onClick={() => setBrowseAll((v) => !v)}
                style={{
                  marginTop: '0.85rem', width: '100%', padding: '0.55rem', borderRadius: '0.5rem', border: 'none',
                  background: ADMIN_COLORS.surfaceContainerHighest, color: ADMIN_COLORS.onSurface,
                  fontFamily: 'var(--font-outfit), system-ui, sans-serif', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                }}
              >
                {browseAll ? 'Show recent' : 'Browse all'}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
