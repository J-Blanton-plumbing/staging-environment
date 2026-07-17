import Link from 'next/link';
import { Phone } from 'lucide-react';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { resolveTokens } from '@/lib/cms/tokens';
import type { ServiceContent } from '@/types/service';

/**
 * §1 — split image hero for a sub-service page (brief-11 §1, QA brief-60 Fix 1).
 *
 * Mirrors CategoryHero / the shared `.hero` pattern: a ~45% image column
 * (`.img-s`) beside a ~55% `.hero-contents` column holding the H1, intro and
 * phone CTA. The Carmine #BC0E0E background + tiled wrench pattern come from the
 * shared `.hero .hero-contents` rule in globals.css — this component only has to
 * use the matching class names (the previous `service-hero` / `service-hero-contents`
 * names never matched that selector, so the column fell back to a flat navy hero).
 *
 * On mobile (≤900px / below lg) the image column hides and `.hero-contents`
 * fills full width, per the shared `.hero` responsive rules in globals.css.
 *
 * Plain `<img>` (not next/image) per the original hero: `hero.image` may be a
 * local path or a CDN URL, and a raw <img> serves both without remotePatterns.
 */
export default async function ServiceHero({ hero }: { hero: ServiceContent['hero'] }) {
  const settings = await getGlobalSettingsCached();
  return (
    <section className="hero relative w-full flex flex-col lg:flex-row min-h-[420px] lg:min-h-[520px]">
      {/* Image column (~45%) — hidden on mobile (matches CategoryHero / live site). */}
      {hero.image && (
        <div className="img-s hidden lg:block relative lg:w-[45%] lg:h-auto lg:min-h-[520px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.image}
            alt={hero.heading}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      )}

      {/* Carmine content column (~55%, full-width when no image). The Carmine
          background + tiled wrench pattern are supplied by `.hero .hero-contents`
          in globals.css — do not set an inline background here. */}
      <div
        className={`hero-contents relative overflow-hidden ${
          hero.image ? 'w-full lg:w-[55%]' : 'w-full'
        }`}
      >
        <div className="w relative z-[2] mx-auto flex h-full max-w-[600px] w-[85%] lg:w-[80%] flex-col justify-center py-16 text-white lg:py-0">
          <h1 className="font-display font-bold uppercase text-white text-[32px] md:text-[40px] lg:text-[48px] leading-[1.05] tracking-tight">
            {resolveTokens(hero.heading, settings)}
          </h1>
          <p className="hero-desc text-white/90 text-[15px] md:text-base leading-[1.5] tracking-[0.5px] mt-5 mb-7 max-w-2xl">
            {resolveTokens(hero.intro, settings)}
          </p>
          <Link
            href={settings.phoneHref}
            className="hero-link-button inline-flex items-center self-start bg-accent-500 hover:bg-brand-600 text-white font-display font-bold h-[45px] px-[35px] rounded-[10px] transition-colors"
          >
            <Phone className="h-5 w-5 mr-2" strokeWidth={2.5} />
            <span className="text-base lg:text-lg tracking-wide">{settings.phoneDisplay}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
