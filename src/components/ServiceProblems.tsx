import Image from 'next/image';
import Link from 'next/link';
import { Phone } from 'lucide-react';
import { SITE } from '@/lib/site';
import type { ServiceContent } from '@/types/service';

/**
 * §4 — common-problems block (brief-11 §4).
 * Carmine `#BC0E0E` background, white H2, styled problem rows, the J. Blanton
 * character, and a phone CTA. Because the section sits on Carmine, the CTA is
 * the white-pill / Carmine-text treatment (the §8 "JOIN NOW" pattern), not the
 * blue hero pill.
 *
 * The character is shared brand chrome (local asset), not per-service data.
 */
export default function ServiceProblems({
  problems,
}: {
  problems: ServiceContent['problemsSection'];
}) {
  return (
    <section className="bg-brand-600 text-white py-[70px] md:py-[90px]">
      <div className="w-[90%] lg:w-[81%] mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-[60px]">
        {/* Character — decorative brand mascot (empty alt) */}
        <div className="shrink-0 hidden lg:block">
          <Image
            src="/images/jbcharacter.webp"
            alt=""
            width={280}
            height={360}
            className="w-[280px] h-auto object-contain"
          />
        </div>

        <div className="flex-1 w-full">
          <h2 className="font-display font-bold text-white text-[28px] md:text-[32px] leading-tight tracking-tight mb-8">
            {problems.heading}
          </h2>

          {/* Problem rows — styled line items (not <ul> bullets), arrow-prefixed */}
          <ul className="space-y-3 mb-9">
            {problems.problems.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 font-sans text-[16px] leading-[24px] text-cream-100"
              >
                <span
                  aria-hidden="true"
                  className="mt-[3px] shrink-0 font-display font-bold text-white"
                >
                  ›
                </span>
                {item}
              </li>
            ))}
          </ul>

          {/* White pill, Carmine text (legible on the Carmine block) */}
          <Link
            href={SITE.phoneHref}
            className="inline-flex items-center gap-2.5 bg-white hover:bg-cream-100 text-brand-600 font-display font-bold text-[16px] tracking-wide px-7 py-3.5 rounded-full transition-colors"
          >
            <Phone className="h-5 w-5" strokeWidth={2.5} />
            MAKE A GOOD CALL
          </Link>
        </div>
      </div>
    </section>
  );
}
