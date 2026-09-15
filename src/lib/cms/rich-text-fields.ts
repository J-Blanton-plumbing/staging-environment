/**
 * Registry of which `main_pages` content fields are rich text (Brief 77, Feature A).
 *
 * These are the large body fields whose admin editors use the tabbed
 * visual/HTML `RichTextField` and whose live pages render the value as HTML.
 * The write paths sanitize exactly these keys through the shared Brief 73
 * allow-list (`sanitizeMainPageContent` in `@/lib/cms/sanitize`).
 *
 * Pure data (no imports) so it is safe to reference from both server write paths
 * and client editors.
 */
export const MAIN_PAGE_RICH_TEXT_FIELDS: Record<string, string[]> = {
  'no-drip-club': ['hero_description', 'wait_body'],
  'why-j-blanton': [
    'hero_description',
    'about_us_body',
    'what_to_expect_body',
    'meet_our_team_body',
    'our_locations_body',
    'join_our_team_body',
  ],
  // Brief 89 (A1): large marketing body fields upgraded from plain textareas to
  // RichTextField. Only fields whose public page renders the value from the DB
  // (via renderCmsInline) are listed — static-only / short-intro fields are not.
  financing: [
    'hero_description',
    'financing_ready_body',
    'coverage_body',
    'surprise_bills_body',
    'bottom_cta_body',
  ],
  'customer-stories': ['hero_description', 'cta_body'],
  locations: ['hero_description', 'intro_body'],
  'help-and-support': [
    'hero_description',
    'customer_service_body',
    'billing_questions_body',
    'plumbing_issue_body',
  ],
  'knowledge-hub': ['intro_body'],
  // Brief 110: the Terms of Use & Privacy Policy long-form legal body. Rendered
  // as block HTML on the public page via `renderCmsBlock`.
  'privacy-policy': ['body_html'],
  /*
   * Brief 176: the /consumer-rights body prose. Every field is rendered as block
   * HTML via `renderCmsBlock`.
   *
   * This page is a HYBRID by design: the shared Brief 73 allow-list admits no
   * table tags, so the three tables and the six warning-sign cards are React
   * components fed by structured data, and the two verbatim statutory blocks are
   * static constants — none of them is a CMS field, so none of them appears
   * here. The list mirrors CONSUMER_RIGHTS_RICH_TEXT_FIELDS in
   * src/lib/content/consumer-rights.ts; keep the two in sync. (It is re-typed
   * rather than imported because this module is deliberately import-free data,
   * safe to reference from both server write paths and client editors.)
   */
  'consumer-rights': [
    'intro_body',
    'scope_note',
    'before_sign_intro',
    'precautions_html',
    'cancellation_intro',
    'cancellation_after_table',
    'cancellation_after_callout',
    'contract_after_table',
    'sworn_statement_body',
    'liens_body',
    'fraud_intro',
    'complaint_intro',
    'file_complaint_body',
    'roofing_body',
    'download_body',
    'footnote_html',
  ],
};

/** True if `field` on the given main-page slug is a rich-text (HTML) field. */
export function isRichTextField(slug: string, field: string): boolean {
  return (MAIN_PAGE_RICH_TEXT_FIELDS[slug] ?? []).includes(field);
}
