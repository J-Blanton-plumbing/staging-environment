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
            ref={previewRef}
            className="rte-preview rte-field"
            contentEditable
            suppressContentEditableWarning
            onInput={handlePreviewInput}
            style={{
              ...FIELD,
              borderTop: 'none',
              borderRadius: '0 0.5rem 0.5rem 0.5rem',
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
