'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CityFaq } from '@/lib/content/cities/evanston';

/**
 * v2 FAQ accordion — theme `.faqs` (city.css 403–440). Each item is a Carmine
 * card whose `.head` (question + ＋/－ toggle) expands a `.faq-content` answer.
 *
 * The theme animates height with a small inline `<script>` that measures DOM
 * heights; per brief-09 §10 we do this declaratively in React with state + a
 * `grid-template-rows: 0fr → 1fr` transition (no DOM measuring). The ＋ icon
 * swaps to － when open, matching the theme's add/minus toggle.
 *
 * Font sizing: the theme uses a cascade of viewport-relative sizes (`1.1vw` …
 * `4vw`) that all resolve to roughly 15–18px across breakpoints; reproduced
 * here as a readable fixed scale.
 *
 * ── `questionHeadingLevel` (Brief 181, D2) ─────────────────────────────────
 * ADDITIVE, and the default is load-bearing.
 *
 * Each question renders as a `<p>` inside the toggle `<button>`, which means it
 * appears in no heading outline. `LocalOfficeCityV3` sits its accordion under a
 * real `Frequently Asked Questions` H2 and needs the questions to be H3s, so
 * this prop swaps the element — and NOTHING ELSE. Omitting it reproduces the old
 * markup byte for byte, so the pages that already render this component
 * (`/geneva` and the other coverage-area cities, `/no-drip-club`,
 * `/privacy-policy`, `/j-blanton-is-hiring`) are untouched. Brief 181 diffed
 * their served HTML before and after to prove it.
 *
 * ⚠ THE HEADING CARRIES ITS OWN COLOUR, and it has to. `globals.css` sets
 * `h1..h5 { … tracking-tight text-navy-800 }` inside `@layer base`, ON THE
 * ELEMENT — so an `<h3>` here would render navy on the Carmine card while the
 * `<p>` it replaced inherited white. That is Brief 179's Defect 2 and Brief
 * 163's `@layer base` trap in one place. `text-white` and `tracking-normal` are
 * therefore applied to the heading element itself, never to a parent.
 *
 * Brief 164 promotes these questions to H2 sitewide, correctly: on every other
 * page nothing labels the accordion, so H2 is the level that skips nothing. The
 * two are compatible — the level differs because the context does.
 */
export default function FaqAccordion({
  faqs,
  questionHeadingLevel,
}: {
  faqs: CityFaq[];
  /** Render each question as this heading element. Omit for today's `<p>`. */
  questionHeadingLevel?: 'h2' | 'h3';
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // `undefined` → `<p>`, i.e. exactly what every existing caller gets.
  const QuestionTag = questionHeadingLevel ?? 'p';

  /*
   * Built by concatenation rather than through `cn()` on purpose: the default
   * branch must emit the SAME `class` attribute, character for character, as
   * before this prop existed. `cn()` runs tailwind-merge, which is free to
   * reorder or drop what it considers redundant, and "probably identical" is not
   * a property worth betting five live pages on.
   *
   * The two extra classes exist only for the heading branch — they undo the
   * `@layer base` `h1..h5 { tracking-tight text-navy-800 }` rule, which would
   * otherwise render the question navy on the Carmine card. A `<p>` never
   * matched that rule, so it must not gain them.
   */
  const BASE_QUESTION_CLASS = 'ml-[20px] text-[15px] font-semibold leading-snug md:text-base';
  const questionClass = questionHeadingLevel
    ? `${BASE_QUESTION_CLASS} text-white tracking-normal`
    : BASE_QUESTION_CLASS;

  return (
    <div className="faqs mt-[50px] pb-[100px]">
      {faqs.map((faq, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={faq.question}
            className="faq mb-[10px] overflow-hidden rounded-[10px] bg-brand-600 text-white"
          >
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="head flex w-full cursor-pointer select-none items-center justify-between py-[20px] text-left"
            >
              <QuestionTag className={questionClass}>{faq.question}</QuestionTag>
              <span className="mr-[20px] flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center">
                {isOpen ? (
                  <Minus className="h-[30px] w-[30px]" strokeWidth={2} />
                ) : (
                  <Plus className="h-[30px] w-[30px]" strokeWidth={2} />
                )}
              </span>
            </button>

            <div
              className={cn(
                'faq-content grid transition-[grid-template-rows] duration-300 ease-out',
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              )}
            >
              <div className="overflow-hidden">
                <p className="px-[20px] pb-[20px] text-[15px] leading-relaxed md:text-base">
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
