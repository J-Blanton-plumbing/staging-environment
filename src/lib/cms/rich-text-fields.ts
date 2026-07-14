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
};

/** True if `field` on the given main-page slug is a rich-text (HTML) field. */
export function isRichTextField(slug: string, field: string): boolean {
  return (MAIN_PAGE_RICH_TEXT_FIELDS[slug] ?? []).includes(field);
}
