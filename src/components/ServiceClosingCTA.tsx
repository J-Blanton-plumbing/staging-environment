import Link from 'next/link';
import { Phone } from 'lucide-react';
import { SITE } from '@/lib/site';
import type { ServiceContent } from '@/types/service';

/**
 * §11 — closing CTA band (brief-11 §11). Full-width Carmine `#BC0E0E`
 * background, centered white H2 + body, and the blue phone-pill CTA
 * (hover → Carmine). Copy comes from the data file; phone from `site.ts`.
 */
export default function ServiceClosingCTA({
  cta,
}: {
  cta: ServiceContent['closingCTA'];
}) {
  return (
    <section className="bg-brand-600 text-white py-[70px] md:py-[90px]">
      <div className="w-[90%] lg:w-[81%] mx-auto max-w-3xl text-center">
        <h2 className="font-display font-bold text-white text-[28px] md:text-[32px] leading-tight tracking-tight">
          {cta.heading}
        </h2>
        <p className="mt-5 font-sans text-white text-[16px] leading-[24px]">
          {cta.body}
        </p>
        <Link
          href={SITE.phoneHref}
          className="mt-7 inline-flex items-center gap-2.5 bg-accent-500 hover:bg-brand-700 text-white font-display font-bold text-[16px] tracking-wide px-7 py-3.5 rounded-full transition-colors"
        >
          <Phone className="h-5 w-5" strokeWidth={2.5} />
          MAKE A GOOD CALL
        </Link>
      </div>
    </section>
  );
}
