'use client';

/**
 * Brief 99 — extracted verbatim from the sub-service editor (Briefs 89–91) so
 * City V2 (and future rollouts) can reuse the exact same reorder/remove/gear
 * chrome instead of forking it. No block-type-specific logic lives here.
 */

import { ADMIN_COLORS } from '@/lib/admin/theme';

function ShellButton({
  label, onClick, disabled, danger, active, children,
}: {
  label: string; onClick: () => void; disabled?: boolean; danger?: boolean; active?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      style={{
        width: '28px', height: '28px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '0.5rem',
        border: `1px solid ${active ? ADMIN_COLORS.cerulean : `${ADMIN_COLORS.outlineVariant}66`}`,
        background: disabled ? 'transparent' : active ? `${ADMIN_COLORS.cerulean}22` : ADMIN_COLORS.surfaceContainerHigh,
        color: disabled
          ? `${ADMIN_COLORS.onSurfaceVariant}55`
          : danger ? ADMIN_COLORS.error : ADMIN_COLORS.cerulean,
        cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '13px', lineHeight: 1, padding: 0,
      }}
    >
      {children}
    </button>
  );
}

export default function BlockShell({
  index, total, removable, selected, onMove, onRemove, onSelect, children,
}: {
  index: number; total: number; removable: boolean; selected: boolean;
  onMove: (index: number, dir: -1 | 1) => void; onRemove: (index: number) => void; onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '0.35rem', zIndex: 2 }}>
        <ShellButton label="Move block up" onClick={() => onMove(index, -1)} disabled={index === 0}>▲</ShellButton>
        <ShellButton label="Move block down" onClick={() => onMove(index, 1)} disabled={index === total - 1}>▼</ShellButton>
        {/* Brief 91 (Track B): select this block → sidebar Block tab. */}
        <ShellButton label="Block settings" onClick={onSelect} active={selected}>⚙</ShellButton>
        {removable && (
          <ShellButton label="Remove block" onClick={() => onRemove(index)} danger>✕</ShellButton>
        )}
      </div>
      {children}
    </div>
  );
}
