/**
 * `FAQPage` JSON-LD (Brief 176, Track E).
 *
 * ⚠️ REFERENCE IMPLEMENTATION. Brief 167 (site-wide structured data) is still
 * unstarted; this is the first FAQ markup on the site and is written to be
 * copied. Four rules are baked in — keep them when you reuse it:
 *
 *  1. **`name` must match the VISIBLE question, character for character.**
 *     Pass the same constant the page renders as its `<h3>`; never re-type the
 *     string. Two copies drift, one cannot. (`src/lib/content/consumer-rights.ts`
 *     holds its questions in `HEADINGS` and the body reads the same object.)
 *  2. **The answer must actually be on the page.** `acceptedAnswer.text` is a
 *     summary of the section beneath the heading, not extra content that exists
 *     only in the markup — Google treats invisible answers as a violation.
 *  3. **Exactly ONE `FAQPage` node per page.** Two nodes is not "more FAQs", it
 *     is invalid. A page mounting this must not also render a component that
 *     emits its own — which is why `/consumer-rights` omits the shared
 *     `FaqAccordion` (it carries `WATER_TESTING_FAQS`).
 *  4. Emission matches the site's existing JSON-LD components
 *     (`LocalBusinessSchema`, `Breadcrumbs`): a single
 *     `<script type="application/ld+json">` written with
 *     `dangerouslySetInnerHTML` so Next does not escape the JSON.
 *
 * Answer text is plain text. `<` is escaped defensively so a stray angle
 * bracket in copy can never close the script element early.
 */

export interface FaqPageSchemaEntry {
  /** Exactly the visible question text (usually an <h2>/<h3> on the page). */
  question: string;
  /** Plain-text answer summarizing the visible section beneath that question. */
  answer: string;
}

export default function FaqPageSchema({ entries }: { entries: readonly FaqPageSchemaEntry[] }) {
  if (entries.length === 0) return null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((e) => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: e.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  );
}
