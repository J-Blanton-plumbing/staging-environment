/**
 * Brief 204 — the server's sanitisers for Sewer v2 content, plugged into `conform.ts`.
 *
 *   - plain leaves  → `sanitizeCmsPlainText` (Brief 190's plain-text rule: no markup survives,
 *                     `<script>`/`<style>`/`<iframe>` dropped WITH their contents).
 *   - rich leaves   → the inline nodes are serialised to HTML, passed through
 *                     `sanitizeCmsInlineHtml` (the inline subset of the Brief 73 `sanitizeCmsHtml`
 *                     allow-list — never wider), and parsed back to nodes.
 *
 * The sanitiser is the GATE, not the stored form: its output is parsed back into the tree, because
 * storing it would drop the approved inline styles and add `rel` to every link (Brief 204 Track A §3;
 * the Brief 100 lesson "use sanitizeCmsHtml as a gate, never as a transform on a stored body").
 */
import type { Sanitizers } from '@/lib/sewer-v2-cms/conform';
import { htmlToInlineNodes, inlineNodesToHtml } from '@/lib/sewer-v2-cms/rich';
import { sanitizeCmsInlineHtml, sanitizeCmsPlainText } from '@/lib/cms/sanitize';

export const SEWER_V2_SANITIZERS: Sanitizers = {
  plain: (s) => sanitizeCmsPlainText(s),
  richGate: (nodes) => htmlToInlineNodes(sanitizeCmsInlineHtml(inlineNodesToHtml(nodes))),
};
