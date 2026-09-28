import { sanitizeCmsInlineHtml, sanitizeCmsPlainText } from '@/lib/cms/sanitize';
import {
  V2_COMPONENT_FIELDS,
  V2_MAX_CHECKLIST,
  V2_MAX_COMPONENTS,
  V2_MAX_COMPONENT_ITEMS,
  isSafeComponentUrl,
  normalizeArticleV2,
  slugifyComponentName,
  type ArticleV2Component,
  type ArticleV2Content,
} from '@/lib/cms/article-v2';

/**
 * Brief 192 (Track B) — the content components, every string leaf by declared
 * type (hard rule 3; the Brief 168 lesson — arrays of objects are where a
 * per-key sanitizer silently misses a field):
 *   name                → slug ([a-z0-9-], ≤40), made unique (-2, -3…)
 *   title, checklist[], link_label, text (promises/services) → plain text
 *   text (cards)        → the inline subset (bold / italic / link)
 *   link_url            → http(s) or a site path, else the link is dropped
 * Fields a type does not use are cleared, so nothing hidden is ever stored.
 * Items with nothing in them are dropped; an empty component is KEPT (the editor
 * may still be filling it) and renders nothing.
 */
function sanitizeComponents(list: ArticleV2Component[]): ArticleV2Component[] {
  const taken = new Set<string>();
  return list.slice(0, V2_MAX_COMPONENTS).map((c) => {
    const f = V2_COMPONENT_FIELDS[c.type];
    let name = slugifyComponentName(sanitizeCmsPlainText(c.name)) || c.type;
    if (taken.has(name)) {
      let n = 2;
      while (taken.has(`${name}-${n}`)) n++;
      name = `${name}-${n}`;
    }
    taken.add(name);
    const items = c.items
      .slice(0, V2_MAX_COMPONENT_ITEMS)
      .map((i) => {
        const url = sanitizeCmsPlainText(i.link_url).trim();
        const label = sanitizeCmsPlainText(i.link_label).trim();
        const linkOk = f.link && !!label && isSafeComponentUrl(url);
        return {
          title: sanitizeCmsPlainText(i.title).trim(),
          text: (f.inlineText ? sanitizeCmsInlineHtml(i.text) : sanitizeCmsPlainText(i.text)).trim(),
          checklist: f.checklist
            ? i.checklist.slice(0, V2_MAX_CHECKLIST).map((x) => sanitizeCmsPlainText(x).trim()).filter(Boolean)
            : [],
          link_label: linkOk ? label : '',
          link_url: linkOk ? url : '',
        };
      })
      .filter((i) => i.title || i.text || i.checklist.length || i.link_label);
    return { name, type: c.type, items };
  });
}

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
 *   limited     faqs[].a                         → sanitizeCmsInlineHtml (the inline
 *                                                   subset of the Brief 73 list)
 *   enum / slug office, service_area             → normalizeArticleV2 (allow-list)
 *   components  (Brief 192)                      → sanitizeComponents (above)
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
      .map((f) => ({ q: sanitizeCmsPlainText(f.q).trim(), a: sanitizeCmsInlineHtml(f.a).trim() }))
      .filter((f) => f.q !== '' || f.a !== ''),
    components: sanitizeComponents(v.components),
  };
}
