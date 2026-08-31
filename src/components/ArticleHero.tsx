import Image from 'next/image';
import ScheduleTrigger from './schedule/ScheduleTrigger';

interface Props {
  /** Article title — rendered as H1. */
  heading: string;
  /** Optional hero image — fills the right column. Omitted = content spans full width. */
  image?: string;
}

/**
 * Article-page hero — Carmine (#BC0E0E) background, wrench-pattern overlay,
 * image column on the RIGHT (~45%), centred text column on the LEFT (~55%).
 * Stacks column-reverse on mobile (image on top, content below).
 * Tagline and CTA are hardcoded per the WordPress single.php template.
 */
export default function ArticleHero({ heading, image }: Props) {
  return (
    <section className="flex flex-col-reverse lg:flex-row-reverse w-full min-h-[300px] pt-[70px]">
      {/* Right column — hero image (~45%) */}
      {image && (
        <div className="relative w-full lg:w-[45%] min-h-[220px] lg:min-h-[300px]">
          <Image src={image} alt={heading} fill priority className="object-cover" />
        </div>
      )}

      {/* Left column — Carmine content area (~55%, or full-width when no image) */}
      <div
        className={`relative flex items-center justify-center bg-[#BC0E0E] min-h-[300px] ${image ? 'w-full lg:w-[55%]' : 'w-full'}`}
      >
        {/* Wrench-pattern texture */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/wrench-pattern.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover z-[1] pointer-events-none"
        />

        {/* Text content */}
        <div className="relative z-[2] flex flex-col items-center text-center w-[85%] lg:w-[80%] max-w-[600px] py-14 lg:py-16">
          <h1
            className="font-display font-bold italic uppercase text-white leading-[1.1] text-[32px] md:text-[40px] lg:text-[48px] tracking-tight mb-4"
            style={{
              textShadow:
                '3px 3px 0 #0A1B2E, -1px -1px 0 #0A1B2E, 1px -1px 0 #0A1B2E, -1px 1px 0 #0A1B2E, 2px 2px 0 #0A1B2E',
            }}
          >
            {heading}
          </h1>

          <p className="font-display font-medium italic text-white text-base lg:text-lg leading-[1.4] mb-6">
            Everything you need to know, directly from the experts.
          </p>

          {/* Brief 169: opens the first-party schedule popup. Class string is
              carried over byte-for-byte from the involve.me trigger. */}
          <ScheduleTrigger
            className="inline-flex items-center justify-center bg-[#1560E6] hover:bg-[#0d4ab8] text-white font-display font-bold text-base lg:text-lg uppercase px-10 py-3.5 rounded-full cursor-pointer transition-colors"
            label="SCHEDULE NOW"
          />
        </div>
      </div>
    </section>
  );
}
