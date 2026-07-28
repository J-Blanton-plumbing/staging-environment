'use client';

/**
 * Shared tabbed visual/HTML rich-text field (Brief 77, Feature A).
 *
 * Extracted from the article editor's original `BodyField` so every large CMS
 * text field (About Us, No Drip Club, article body, …) uses ONE editor — no
 * second editor library. Editors get an "HTML" tab (raw markup) and a "Preview"
 * tab (a `contentEditable` visual surface) so they can add line breaks and basic
 * formatting without knowing HTML.
 *
 * The toolbar carries an "Insert variable" menu (Feature B) that drops Global
 * Settings tokens (`{{phone}}`, `{{ndc_price}}`) at the caret.
 *
 * Storage/render sanitization is NOT done here — it happens on the write path
 * (`sanitizeMainPageContent` / article route) and defensively at render
 * (`renderCmsInline` / `sanitizeCmsHtml`), both using the shared Brief 73
 * allow-list.
 */

import { useEffect, useRef, useState } from 'react';
import { tokenSyntax, type CmsToken } from '@/lib/cms/tokens';
import InsertVariableMenu from './InsertVariableMenu';
import { ADMIN_COLORS } from '@/lib/admin/theme';

// Brief 117 — real formatting toolbar. `execCommand` is deprecated but still the
// only cross-browser way to drive a `contentEditable` surface without pulling in
// a second editor library (the ONE-editor rule in the header comment above) — the
// standards-track `contentEditable`-replacement APIs (e.g. `EditContext`) aren't
// broadly supported yet. Every command below only ever produces a tag already on
// the Brief 73 allow-list (`CMS_ALLOWED_TAGS` in `src/lib/cms/sanitize.ts`): bold →
// `<b>` or `<strong>` (browser-dependent — both are allowed), italic → `<i>` or
// `<em>` (same), lists → `<ul>`/`<ol>` + `<li>`, headings → `<h2>`/`<h3>`, link →
// `<a href>`.
const ALLOWED_LINK_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

/**
 * Mirrors the write-path scheme check in `CMS_ALLOWED_SCHEMES`/`allowProtocolRelative`
 * (`src/lib/cms/sanitize.ts`) so a rejected link never round-trips through save just
 * to get silently stripped later — this is a client-side UX guard, not the security
 * boundary (the server sanitizer is, and still runs unchanged).
 */
function isSafeLinkUrl(raw: string): boolean {
  const url = raw.trim();
  if (!url) return false;
  if (url.startsWith('//')) return false; // protocol-relative — blocked (allowProtocolRelative: false)
  const schemeMatch = /^([a-z][a-z0-9+.-]*):/i.exec(url);
  if (!schemeMatch) return true; // relative path / anchor (e.g. "/no-drip-club", "#section") — no scheme to check
  return ALLOWED_LINK_SCHEMES.includes(`${schemeMatch[1].toLowerCase()}:`);
}

const PREVIEW_STYLES = `
  .rte-preview h1 { font-size: 32px; font-weight: 700; color: ${ADMIN_COLORS.onSurface}; margin: 0 0 20px; line-height: 1.2; }
  .rte-preview h2 { font-size: 24px; font-weight: 700; color: ${ADMIN_COLORS.onSurface}; margin: 24px 0 14px; line-height: 1.3; }
  .rte-preview h3 { font-size: 20px; font-weight: 600; color: ${ADMIN_COLORS.onSurface}; margin: 20px 0 12px; line-height: 1.4; }
  .rte-preview p  { font-size: 15px; line-height: 1.65; color: ${ADMIN_COLORS.onSurface}; margin-bottom: 14px; }
  .rte-preview ul { padding-left: 22px; margin-bottom: 14px; list-style-type: disc; }
  .rte-preview li { font-size: 15px; line-height: 1.65; color: ${ADMIN_COLORS.onSurface}; margin-bottom: 6px; }
  .rte-preview strong { font-weight: 700; }
  .rte-preview a  { color: ${ADMIN_COLORS.cerulean}; text-decoration: none; }
  .rte-preview a:hover { color: ${ADMIN_COLORS.secondaryContainer}; text-decoration: underline; }
`;

const LABEL: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  fontSize: '13px',
  fontWeight: 600,
  color: ADMIN_COLORS.onSurface,
  marginBottom: '0.25rem',
};

const FIELD: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '0.5rem',
  background: ADMIN_COLORS.surfaceContainerLow,
  border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
  borderRadius: '0.5rem',
  fontFamily: 'var(--font-nunito), system-ui, sans-serif',
  fontSize: '0.9rem',
  color: ADMIN_COLORS.onSurface,
  boxSizing: 'border-box',
};

const FIELD_FOCUS_STYLE = `
  .rte-field:focus { outline: none; box-shadow: 0 0 0 1px ${ADMIN_COLORS.primary}66; }
`;

export default function RichTextField({
  label,
  value,
  onChange,
  rows = 10,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  /** Optional helper line under the label; a sensible default is used if omitted. */
  help?: string;
}) {
  const [view, setView] = useState<'html' | 'preview'>('preview');
  const previewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    ul: false,
    ol: false,
    h2: false,
    h3: false,
  });

  // When switching to preview, stamp the current HTML into the contentEditable
  // div. innerHTML is managed via ref (not dangerouslySetInnerHTML) so React
  // doesn't clobber user edits on re-render. Intentionally omit `value` from the
  // deps — sync only on tab switch, not on every keystroke.
  useEffect(() => {
    if (view === 'preview' && previewRef.current) {
      previewRef.current.innerHTML =
        value || `<p style="color:${ADMIN_COLORS.onSurfaceVariant};font-style:italic">Nothing to preview yet — switch to HTML and add some content.</p>`;
    }
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePreviewInput() {
    if (previewRef.current) onChange(previewRef.current.innerHTML);
  }

  // Reflects the caret's current formatting onto the toolbar buttons (Bold
  // highlighted while inside `<strong>`, etc.) — nice-to-have per the brief, not
  // load-bearing. `queryCommandState`/`queryCommandValue` are the same
  // (deprecated-but-universal) API family as `execCommand`; if either throws in
  // some browser/command combination, the buttons just stay un-highlighted.
  function updateActiveFormats() {
    if (typeof document.queryCommandState !== 'function') return;
    try {
      const block = document.queryCommandValue('formatBlock').toUpperCase();
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        ul: document.queryCommandState('insertUnorderedList'),
        ol: document.queryCommandState('insertOrderedList'),
        h2: block === 'H2',
        h3: block === 'H3',
      });
    } catch {
      // Degrade silently — see comment above.
    }
  }

  function focusPreview() {
    previewRef.current?.focus();
  }

  /**
   * `execCommand('insertUnorderedList'/'insertOrderedList')`, when the whole
   * editable region is a single top-level `<p>`, wraps the new `<ul>`/`<ol>`
   * INSIDE that `<p>` instead of replacing it — a documented cross-browser
   * execCommand quirk, reproduced directly in this codebase's dev browser.
   * `<p><ul><li>…</li></ul></p>` is invalid nesting; a browser parsing that
   * string fresh (exactly what happens the next time this value is loaded, or
   * when the public page injects it via `dangerouslySetInnerHTML`) silently
   * auto-closes the `<p>` where the `<ul>` starts, LEAVING two empty, blank-
   * looking `<p></p>` tags stranding the list — confirmed by round-tripping
   * the dirty string through a scratch element. Unwrap any `<p>` whose only
   * child is a block element, and drop any `<p>` left empty, before the value
   * ever reaches `onChange`, so the stored HTML is valid to begin with.
   */
  function normalizePreviewDom() {
    const root = previewRef.current;
    if (!root) return;
    const BLOCK_TAGS = new Set(['UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'DIV', 'P']);
    let changed = true;
    while (changed) {
      changed = false;
      for (const p of Array.from(root.querySelectorAll('p'))) {
        if (p.childNodes.length === 0) {
          p.remove();
          changed = true;
          break;
        }
        if (p.childNodes.length === 1 && p.firstElementChild && BLOCK_TAGS.has(p.firstElementChild.tagName)) {
          p.replaceWith(p.firstElementChild);
          changed = true;
          break;
        }
      }
    }
  }

  /** Bold / Italic / Bullet List / Numbered List — `execCommand` passthrough + nesting cleanup. */
  function execFormat(command: string) {
    focusPreview();
    document.execCommand(command, false);
    normalizePreviewDom();
    handlePreviewInput();
    updateActiveFormats();
  }

  /** H2 / H3 — toggles: clicking the already-active heading returns the block to a plain paragraph. */
  function toggleHeading(tag: 'H2' | 'H3') {
    focusPreview();
    const current = document.queryCommandValue('formatBlock').toUpperCase();
    document.execCommand('formatBlock', false, current === tag ? 'P' : tag);
    normalizePreviewDom();
    handlePreviewInput();
    updateActiveFormats();
  }

  /**
   * Prompts for a URL, validates its scheme client-side (mirrors the write-path
   * check in `CMS_ALLOWED_SCHEMES`/`allowProtocolRelative` — a UX guard, not the
   * security boundary; the server sanitizer still runs unchanged on save), then
   * applies it to the current selection. The selection is saved before
   * `window.prompt` steals focus and restored after, since `execCommand` only
   * acts on the live selection.
   */
  function applyLink() {
    const el = previewRef.current;
    if (!el) return;
    el.focus();
    const selection = window.getSelection();
    const savedRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;
    const input = window.prompt('Link URL (https://…, mailto:…, tel:…, or a relative path like /no-drip-club):', 'https://');
    if (input === null) return; // cancelled
    const url = input.trim();
    if (!url) return;
    if (!isSafeLinkUrl(url)) {
      window.alert('That link type isn’t allowed here. Use http://, https://, mailto:, tel:, or a relative path (e.g. /no-drip-club).');
      return;
    }
    el.focus();
    if (savedRange) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange);
    }
    document.execCommand('createLink', false, url);
    handlePreviewInput();
    updateActiveFormats();
  }

  function insertToken(token: CmsToken) {
    const syntax = tokenSyntax(token.token);
    if (view === 'preview') {
      // Insert at the caret in the contentEditable surface, then sync back.
      const el = previewRef.current;
      if (el) {
        el.focus();
        const ok = document.execCommand('insertText', false, syntax);
        if (!ok) el.innerHTML = el.innerHTML + syntax;
        handlePreviewInput();
      }
      return;
    }
    // HTML mode: splice into the textarea at the caret.
    const el = textareaRef.current;
    if (!el) {
      onChange(value + syntax);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + syntax + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + syntax.length;
      el.setSelectionRange(pos, pos);
    });
  }

  const tabBtn = (text: string, v: 'html' | 'preview') => (
    <button
      type="button"
      onClick={() => setView(v)}
      style={{
        padding: '0.3rem 0.9rem',
        fontSize: '12px',
        fontFamily: 'var(--font-nunito), system-ui, sans-serif',
        fontWeight: 700,
        border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
        borderRadius: '0.5rem 0.5rem 0 0',
        borderBottom: view === v ? `1px solid ${ADMIN_COLORS.surfaceContainerLow}` : undefined,
        background: view === v ? ADMIN_COLORS.surfaceContainerLow : ADMIN_COLORS.surfaceContainer,
        color: ADMIN_COLORS.onSurface,
        cursor: 'pointer',
        marginRight: '2px',
        position: 'relative',
        bottom: '-1px',
      }}
    >
      {text}
    </button>
  );

  const toolbarBtn = (label: string, onClick: () => void, opts?: { active?: boolean; title?: string }) => (
    <button
      type="button"
      title={opts?.title ?? label}
      aria-pressed={opts?.active ?? false}
      // `onMouseDown` + `preventDefault` (not `onClick`) so the click never steals
      // focus/selection away from the contentEditable surface first — by the time
      // a plain `onClick` fired, `execCommand` would have nothing selected to act on.
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      style={{
        padding: '0.3rem 0.55rem',
        fontSize: '12px',
        fontFamily: 'var(--font-nunito), system-ui, sans-serif',
        fontWeight: 700,
        border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
        borderRadius: '0.35rem',
        background: opts?.active ? ADMIN_COLORS.primary : ADMIN_COLORS.surfaceContainer,
        color: opts?.active ? ADMIN_COLORS.onPrimary : ADMIN_COLORS.onSurface,
        cursor: 'pointer',
        lineHeight: 1.2,
        minWidth: '2rem',
      }}
    >
      {label}
    </button>
  );

  const toolbarDivider = (
    <span
      aria-hidden="true"
      style={{ width: '1px', alignSelf: 'stretch', background: `${ADMIN_COLORS.outlineVariant}66`, margin: '0 0.15rem' }}
    />
  );

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={LABEL}>{label}</label>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '0.75rem',
          marginBottom: '0.35rem',
        }}
      >
        <p style={{ fontSize: '12px', color: `${ADMIN_COLORS.onSurfaceVariant}99`, fontFamily: 'var(--font-nunito), system-ui, sans-serif', margin: 0 }}>
          {help ??
            (view === 'html'
              ? 'Edit raw HTML below, or switch to Preview to edit visually.'
              : 'Editing in preview — changes sync back to HTML automatically.')}
        </p>
        <InsertVariableMenu onSelect={insertToken} />
      </div>

      <div style={{ borderBottom: `1px solid ${ADMIN_COLORS.outlineVariant}66` }}>
        {tabBtn('HTML', 'html')}
        {tabBtn('Preview', 'preview')}
      </div>

      <style>{FIELD_FOCUS_STYLE}</style>

      {view === 'html' ? (
        <textarea
          ref={textareaRef}
          className="rte-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          style={{
            ...FIELD,
            resize: 'vertical',
            lineHeight: 1.6,
            borderTop: 'none',
            borderRadius: '0 0.5rem 0.5rem 0.5rem',
          }}
        />
      ) : (
        <>
          <style>{PREVIEW_STYLES}</style>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.4rem 0.5rem',
              background: ADMIN_COLORS.surfaceContainerLow,
              border: `1px solid ${ADMIN_COLORS.outlineVariant}66`,
              borderTop: 'none',
              borderBottom: 'none',
              borderRadius: '0 0.5rem 0 0',
            }}
          >
            {toolbarBtn('B', () => execFormat('bold'), { active: activeFormats.bold, title: 'Bold' })}
            {toolbarBtn('I', () => execFormat('italic'), { active: activeFormats.italic, title: 'Italic' })}
            {toolbarDivider}
            {toolbarBtn('H2', () => toggleHeading('H2'), { active: activeFormats.h2, title: 'Heading 2' })}
            {toolbarBtn('H3', () => toggleHeading('H3'), { active: activeFormats.h3, title: 'Heading 3' })}
            {toolbarDivider}
            {toolbarBtn('• List', () => execFormat('insertUnorderedList'), { active: activeFormats.ul, title: 'Bullet list' })}
            {toolbarBtn('1. List', () => execFormat('insertOrderedList'), { active: activeFormats.ol, title: 'Numbered list' })}
            {toolbarDivider}
            {toolbarBtn('Link', applyLink, { title: 'Insert link' })}
          </div>
          <div
            ref={previewRef}
            className="rte-preview rte-field"
            contentEditable
            suppressContentEditableWarning
            onInput={handlePreviewInput}
            onKeyUp={updateActiveFormats}
            onMouseUp={updateActiveFormats}
            onFocus={updateActiveFormats}
            style={{
              ...FIELD,
              borderTop: 'none',
              borderRadius: '0 0 0.5rem 0.5rem',
              minHeight: `${Math.max(rows * 22, 180)}px`,
              padding: '1rem',
              lineHeight: 1.6,
              fontFamily: 'var(--font-nunito), system-ui, sans-serif',
              background: ADMIN_COLORS.surfaceContainer,
              overflowY: 'auto',
              outline: 'none',
              cursor: 'text',
            }}
          />
        </>
      )}
    </div>
  );
}
