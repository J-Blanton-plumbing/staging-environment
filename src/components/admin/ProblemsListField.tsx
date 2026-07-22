'use client';

/**
 * Back-compat shim (Brief 89, A2).
 *
 * The repeatable one-line list input was generalized from this component into the
 * shared `ListItemsField` (Brief 86 → Brief 89). This file now re-exports that
 * component so existing imports (`ProblemsListField`, `padToMinProblems`) keep
 * working. Prefer importing `ListItemsField` / `padToMin` directly in new code.
 */

import ListItemsField, { padToMin } from './ListItemsField';

/** @deprecated Use `padToMin(items, 3)` from `ListItemsField`. */
export function padToMinProblems(items: string[]): string[] {
  return padToMin(items, 3);
}

export default ListItemsField;
