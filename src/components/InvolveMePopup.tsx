/**
 * involve.me popup trigger — extracted from `app/no-drip-club/page.tsx` (Brief 141)
 * so the shared page shell and both template variants use ONE trigger instead of
 * copying the attribute set into each variant component.
 *
 * The global `<InvolveMeScript />` (mounted in layout) binds every
 * `.involveme_popup` element on click, and `<InvolveMePopupBinder />` (Brief 108)
 * catches the ones that appear after a client-side navigation — so this stays a
 * plain element and the page can remain a server component.
 *
 * The default `div` rendering is byte-identical to the helper it replaced
 * (class → role → tabIndex → data-* attribute order included), which is what
 * keeps the `classic` variant's served HTML unchanged. `as="button"` renders a
 * real `<button type="button">` for the Brief 141 price cards, matching the
 * approved design's markup; a native button needs no `role`/`tabIndex`.
 */

import type { InvolveMeConfig } from '@/lib/content/ndc';

export default function InvolveMePopup({
  label,
  className = '',
  cfg,
  as = 'div',
}: {
  label: string;
  className?: string;
  cfg: InvolveMeConfig;
  as?: 'div' | 'button';
}) {
  const cls = `involveme_popup${className ? ` ${className}` : ''}`;

  if (as === 'button') {
    return (
      <button
        type="button"
        className={cls}
        data-project={cfg.project}
        data-embed-mode={cfg.embedMode}
        data-trigger-event={cfg.triggerEvent}
        data-popup-size={cfg.popupSize}
        data-organization-url={cfg.organizationUrl}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      className={cls}
      role="button"
      tabIndex={0}
      data-project={cfg.project}
      data-embed-mode={cfg.embedMode}
      data-trigger-event={cfg.triggerEvent}
      data-popup-size={cfg.popupSize}
      data-organization-url={cfg.organizationUrl}
    >
      {label}
    </div>
  );
}
