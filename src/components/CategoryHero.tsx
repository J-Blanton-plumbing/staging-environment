import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone } from 'lucide-react';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';

interface Props {
  /** Page-specific hero image — fills the ~45% image column. Omit to hide the image column. */
  image?: string;
  heading: string;
  intro: string;
  /** Override the default phone-link CTA with custom content (e.g. a SCHEDULE NOW button). */
  cta?: React.ReactNode;
}

/**
 * Category-page hero — the theme's split `.hero` (page-service.php ~185–204): a
 * ~45% image column (`.img-s`) beside a ~55% dark `.contents` column holding the
 * H1, description and phone CTA. This is the shared template for every service
 * category page. (The home page keeps its own full-bleed video hero and does not
 * use this component.)
 */
export default async function CategoryHero({ image, heading, intro, cta }: Props) {
  const settings = await getGlobalSettingsCached();
  return (
    <section className="hero relative w-full flex flex-col lg:flex-row min-h-[560px] lg:min-h-[600px]">
      {/* Image column (~45%) — hidden on mobile (matches live site), visible lg+. */}
      {image && (
        <div className="img-s hidden lg:block relative lg:w-[45%] lg:h-auto lg:min-h-[600px]">
          <Image src={image} alt={heading} fill priority className="object-cover" />
        </div>
      )}

      {/* Dark content column (~55%, or full-width when no image). NB: the class is
          `hero-contents`, not the theme's bare `contents` — Tailwind reserves
          `.contents` for `display:contents`, which would collapse this column. */}
      <div className={`hero-contents relative bg-navy-900 overflow-hidden ${image ? 'w-full lg:w-[55%]' : 'w-full'}`}>
        {/* Faint wrench-pattern overlay */}
        <Image
          src="/images/wrench-pattern.webp"
          alt=""
          width={600}
          height={600}
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-[0.06] z-[1] pointer-events-none"
        />
        <div className="w relative z-[2] mx-auto flex h-full max-w-[600px] w-[85%] lg:w-[80%] flex-col justify-center py-16 text-white lg:py-0">
          <h1 className="font-display font-bold uppercase text-white text-[32px] md:text-[40px] lg:text-[48px] leading-[1.05] tracking-tight">
            {heading}
          </h1>
          <p className="hero-desc text-white/90 text-[15px] md:text-base leading-[1.5] tracking-[0.5px] mt-5 mb-7">
            {intro}
          </p>
          {cta ?? (
            <Link
              href={settings.headerPhoneHref}
              className="hero-link-button inline-flex items-center self-start bg-accent-500 hover:bg-brand-600 text-white font-display font-bold h-[45px] px-[35px] rounded-[10px] transition-colors"
            >
              <Phone className="h-5 w-5 mr-2" strokeWidth={2.5} />
              <span className="text-base lg:text-lg tracking-wide">{settings.headerPhone}</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
