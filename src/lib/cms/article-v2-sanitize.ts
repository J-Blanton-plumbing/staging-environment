import { sanitizeCmsHtml, sanitizeCmsPlainText } from '@/lib/cms/sanitize';
import { normalizeArticleV2, type ArticleV2Content } from '@/lib/cms/article-v2';

/**
 * Brief 190 (hard rule 4) — the ONE sanitizer for Article V2 content, applied
 * on every path that stores it (the version save in /api/cms/drafts and the
 * publish writer) and again at render. Every string leaf is covered, including
 * every string inside the two arrays (Brief 168's lesson: an array of objects is
 * where a per-key sanitizer silently misses a field).
 *
 * By declared type:
 *   plain text  dek, byline_name, image_alt, image_caption, takeaways[],
 *               service_area_label, faqs[].q     → sanitizeCmsPlainText
 *   rich text   faqs[].a                         → sanitizeCmsHtml (Brief 73 list)
 *   enum / slug office, service_area             → normalizeArticleV2 (allow-list)
 *
 * Blank takeaways and blank FAQ rows (no question AND no answer) are dropped,
 * so a half-filled repeater can never render an empty bullet or an empty
 * <details>.
 */
export function sanitizeArticleV2Content(raw: unknown): ArticleV2Content {
  const v = normalizeArticleV2(raw);
  return {
    dek: sanitizeCmsPlainText(v.dek).trim(),
    byline_name: sanitizeCmsPlainText(v.byline_name).trim(),
    image_alt: sanitizeCmsPlainText(v.image_alt).trim(),
    image_caption: sanitizeCmsPlainText(v.image_caption).trim(),
    takeaways: v.takeaways.map((t) => sanitizeCmsPlainText(t).trim()).filter(Boolean),
    office: v.office,
    service_area: v.service_area,
    service_area_label: sanitizeCmsPlainText(v.service_area_label).trim(),
    faqs: v.faqs
      .map((f) => ({ q: sanitizeCmsPlainText(f.q).trim(), a: sanitizeCmsHtml(f.a).trim() }))
      .filter((f) => f.q !== '' || f.a !== ''),
  };
}
