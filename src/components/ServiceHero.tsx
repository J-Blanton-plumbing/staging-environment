import Link from 'next/link';
import { Phone } from 'lucide-react';
import { SITE } from '@/lib/site';
import type { ServiceContent } from '@/types/service';

/**
 * §1 — full-width image hero for a sub-service page (brief-11 §1).
 * H1 + intro + phone CTA over the dark hero image. All copy/image come from
 * the data file; the phone value comes from `site.ts`.
 *
 * Plain `<img>` per the brief (the CDN host is not in next/image's
 * remotePatterns and the live page serves a raw <img> here).
 */
export default function ServiceHero({ hero }: { hero: ServiceContent['hero'] }) {
  return (
    <section className="service-hero relative w-full h-[420px] md:h-[520px] overflow-hidden bg-navy-900">
      {hero.image && (
        <img
          src={hero.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-[1]"
        />
      )}
      {/* Midnight scrim so white text stays legible over the photo (no #000) */}
      <div className="absolute inset-0 z-[2] bg-navy-900/55" />

      <div className="service-hero-contents absolute inset-0 z-[3] flex items-end">
        <div className="w-[90%] lg:w-[81%] mx-auto mb-[60px] md:mb-[80px] max-w-3xl">
          <h1 className="font-display font-bold text-white text-[32px] md:text-[40px] leading-[1.05] tracking-tight">
            {hero.heading}
          </h1>
          <p className="mt-4 font-sans text-white text-[16px] leading-[24px] max-w-2xl">
            {hero.intro}
          </p>
          <Link
            href={SITE.phoneHref}
            className="mt-6 inline-flex items-center gap-2.5 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-[16px] tracking-wide px-7 py-3.5 rounded-full transition-colors"
          >
            <Phone className="h-5 w-5" strokeWidth={2.5} />
            {SITE.phone}
          </Link>
        </div>
      </div>
    </section>
  );
}
