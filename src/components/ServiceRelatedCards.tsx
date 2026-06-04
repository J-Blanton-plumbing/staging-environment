import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ServiceContent } from '@/types/service';
import { ServiceImage } from './ServiceIntro';

/**
 * §5 — related-services cards (brief-11 §5). Cream `#F9F3EC` background,
 * Carmine H2, and the two sibling service cards from the data file. Each card:
 * photo (Cream placeholder until CDN filename confirmed), Midnight title,
 * Nunito teaser, and a "Read more →" secondary link.
 */
export default function ServiceRelatedCards({
  related,
}: {
  related: ServiceContent['relatedServicesSection'];
}) {
  return (
    <section className="bg-cream-100 py-[70px] md:py-[100px]">
      <div className="w-[90%] lg:w-[81%] mx-auto">
        <h2 className="font-display font-bold text-brand-600 text-[28px] md:text-[32px] leading-tight tracking-tight mb-10">
          {related.heading}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-[30px]">
          {related.cards.map((card) => (
            <article key={card.href} className="flex flex-col">
              <Link href={card.href} className="block">
                <ServiceImage src={card.image} className="aspect-[16/10] w-full" />
              </Link>
              <h3 className="mt-5 font-display font-bold text-navy-800 text-[20px] leading-tight">
                {card.title}
              </h3>
              <p className="mt-2 font-sans text-navy-800 text-[16px] leading-[24px] flex-1">
                {card.teaser}
              </p>
              <Link
                href={card.href}
                className="mt-4 inline-flex items-center gap-2 self-start font-sans text-[16px] text-navy-800 no-underline hover:underline hover:text-brand-600 transition-colors"
              >
                Read more <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
