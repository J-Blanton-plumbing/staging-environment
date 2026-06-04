import type { ServiceContent } from '@/types/service';

/**
 * §3 — "Experts You Should Call" intro (brief-11 §3).
 * Two-column alternating text/imagery on a Cream `#F9F3EC` background.
 * Heading is Carmine H2; body paragraphs are Midnight Nunito 16/24.
 *
 * Interior images are lazy-loaded on live and their CDN filenames are
 * unconfirmed (brief-11 §1 note): when `image1`/`image2` are empty the photo
 * slots render a Cream placeholder block rather than a broken image.
 */
export default function ServiceIntro({
  expert,
}: {
  expert: ServiceContent['expertSection'];
}) {
  return (
    <section className="bg-cream-100 py-[70px] md:py-[100px]">
      <div className="w-[90%] lg:w-[81%] mx-auto">
        <h2 className="font-display font-bold text-brand-600 text-[28px] md:text-[32px] leading-tight tracking-tight mb-10">
          {expert.heading}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-[60px] items-center">
          {/* Left — primary service photo */}
          <ServiceImage src={expert.image1} className="aspect-[4/3] w-full" />

          {/* Right — three body paragraphs */}
          <div className="text-navy-800 space-y-5">
            {expert.paragraphs.map((p, i) => (
              <p key={i} className="font-sans text-[16px] leading-[24px]">
                {p}
              </p>
            ))}
          </div>
        </div>

        {/* Second staggered image row (image → text → image stagger on live) */}
        {expert.image2 && (
          <div className="mt-10 lg:mt-[60px]">
            <ServiceImage src={expert.image2} className="aspect-[21/9] w-full" />
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Service photo with a Cream placeholder fallback. Used across the template's
 * Cream sections until the CDN filenames are confirmed (brief-11 §1 / flag 3).
 * Plain `<img>` — the CDN host isn't in next/image's remotePatterns.
 */
export function ServiceImage({
  src,
  className = '',
}: {
  src: string;
  className?: string;
}) {
  if (!src) {
    // Placeholder: Cream block (no broken image, no #000)
    return (
      <div
        className={`rounded-[5px] bg-cream-200 ${className}`}
        aria-hidden="true"
      />
    );
  }
  return (
    <img
      src={src}
      alt=""
      className={`rounded-[5px] object-cover ${className}`}
    />
  );
}
