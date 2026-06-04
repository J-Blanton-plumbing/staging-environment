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
 */
export default function FaqAccordion({ faqs }: { faqs: CityFaq[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
              <p className="ml-[20px] text-[15px] font-semibold leading-snug md:text-base">
                {faq.question}
              </p>
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
