'use client';

/**
 * Insert-variable control for a plain `<input>`/`<textarea>` field (Brief 77,
 * Feature B) — used next to heading/CTA fields so tokens can go into any text or
 * headline, not just rich-text bodies.
 *
 * Give it a ref to the target field plus the field's current value/onChange. On
 * selection it splices the token syntax at the caret (or appends if the field
 * isn't focused) and restores the caret after React re-renders.
 */

import type { RefObject } from 'react';
import { tokenSyntax, type CmsToken } from '@/lib/cms/tokens';
import InsertVariableMenu from './InsertVariableMenu';

export default function InsertVariableButton({
  targetRef,
  value,
  onChange,
}: {
  targetRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
}) {
  function insert(token: CmsToken) {
    const syntax = tokenSyntax(token.token);
    const el = targetRef.current;
    if (!el) {
      onChange(value + syntax);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + syntax + value.slice(end);
    onChange(next);
    // Restore focus + caret position after the controlled value updates.
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + syntax.length;
      try {
        el.setSelectionRange(pos, pos);
      } catch {
        /* setSelectionRange is unsupported on some input types — ignore. */
      }
    });
  }

  return <InsertVariableMenu onSelect={insert} />;
}
