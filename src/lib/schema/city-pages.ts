/**
 * Brief 216 — the structured data the City Hub and City Service V2 templates DERIVE from their own
 * visible fields at render (never stored, so a JSONB round trip can't reorder a key — the Brief 212
 * §3.3 trap). Pure and client-safe; the views and the batch importer's gates share it, so what the
 * gate checks is exactly what the page emits.
 *
 * FAQPage (Marketing 2026-10-21, decision 1): allowed on these two templates ONLY. Every other page
 * type stays FAQPage-free (Brief 164; `FORBIDDEN_TYPES` in jsonld-assert.ts still lists it).
 */
import { mdPlain } from '@/lib/cms-v2/shared';

/** `773-724-9272` → `+1-773-724-9272` (the format every approved schema uses). */
export function schemaPhone(display: string): string {
  const d = display.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
  return d.length === 10 ? `+1-${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : display;
}

/** A visible FAQ answer as schema text: `[label](href)` → label, `**` removed, whitespace trimmed. */
export function faqAnswerText(answer: string): string {
  return mdPlain(answer).replace(/\*\*/g, '').trim();
}

/** One FAQPage from the page's own FAQ list, in visible order (question = the visible question text). */
export function faqPageJsonLd(items: ReadonlyArray<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q.replace(/\*\*/g, '').trim(),
      acceptedAnswer: { '@type': 'Answer', text: faqAnswerText(f.a) },
    })),
  };
}

/** A JSON-LD object as the body of a `<script type="application/ld+json">` (`<` escaped). */
export const ldJson = (o: unknown) => ({ __html: JSON.stringify(o).replace(/</g, '\\u003c') });
