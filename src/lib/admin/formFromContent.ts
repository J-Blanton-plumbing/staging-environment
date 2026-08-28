/**
 * Brief 159 (Track C1) — turn a stored draft payload back into editor form state.
 *
 * WHY THIS EXISTS. Selecting a version in the sidebar has to load THAT VERSION'S
 * content into the form; before this brief it moved a pointer and left the form
 * alone, so every version displayed whatever was on screen and the next Save
 * wrote that content into whichever version happened to be active. Fixing it
 * means every editor needs the inverse of its own `getContent()`.
 *
 * Most editors' `getContent()` is a straight projection of form state — same key
 * names, same value types — so the inverse is mechanical, and writing it out
 * fifteen times is fifteen chances to miss a field. This helper does it from the
 * editor's own `EMPTY` constant, which is already the authoritative list of a
 * form's fields and their types:
 *
 *     onLoadContent: (content) => setForm(f => ({ ...f, ...formFromContent(EMPTY, content) }))
 *
 * Spreading over the current form (rather than replacing it) is deliberate: it
 * preserves display-only fields such as `updated_at` that live in form state but
 * are not part of the content payload.
 *
 * Editors whose form is NOT a straight projection (the city editor's template +
 * block array, sub-service's per-instance blocks) keep their own richer mapper
 * and do not use this.
 */
export function formFromContent<T extends object>(empty: T, data: unknown): T {
  const src = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const out: Record<string, unknown> = {};

  for (const key of Object.keys(empty)) {
    const fallback = (empty as Record<string, unknown>)[key];
    const value = src[key];

    if (Array.isArray(fallback)) {
      // A repeater field: an absent or malformed value is an empty list, never
      // undefined — `form.faqs.map(...)` must not be able to throw.
      out[key] = Array.isArray(value) ? value : [];
    } else if (typeof fallback === 'string') {
      // Nulls are how these columns spell "empty" (meta_title etc. are nullable),
      // and a null in a controlled <input> makes React switch it to uncontrolled.
      out[key] = typeof value === 'string' ? value : value == null ? '' : String(value);
    } else if (typeof fallback === 'number') {
      out[key] = typeof value === 'number' ? value : fallback;
    } else if (typeof fallback === 'boolean') {
      out[key] = typeof value === 'boolean' ? value : fallback;
    } else {
      out[key] = value === undefined ? fallback : value;
    }
  }

  return out as T;
}
