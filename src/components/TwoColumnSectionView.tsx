import Link from 'next/link';
import type { BlockPosition } from '@/lib/cms/sub-service-blocks';

/**
 * Brief 93 — presentational (client-safe) body of the "2 Column Section" block
 * (the generalized `intro` type, which Final CTA now merges into). It takes
 * ALREADY-RESOLVED props (heading token-resolved, `paragraphs` pre-sanitized inline
 * HTML), so it has no server/DB dependency and renders in BOTH the public server
 * tree (via <ServiceIntro> / <ServiceClosingCTA>) and the admin live preview
 * (the sub-service editor's Block tab) — one shared source of markup, no drift.
 *
 * Layout: a Cream `#F9F3EC` band, heading + body in the text column and the photo
 * in the image column. `position` is the IMAGE side on desktop — 'right' (default)
 * is the historical intro layout (text left, image right); 'left' flips them (the
 * old Final CTA `.f3-left` arrangement). MOBILE ALWAYS STACKS TEXT-FIRST regardless
 * of `position`: the text column is always first in the DOM (with the photo embedded
 * inside it for mobile), and only desktop `lg:order-*` classes flip the columns.
 *
 * With no button and the default position, the output is byte-for-byte identical to
 * the pre-Brief-93 <ServiceIntro> render.
 */

/** Service photo with a Cream placeholder fallback (mirrors ServiceIntro's ServiceImage). */
function SectionImage({ src, className }: { src: string; className: string }) {
  if (!src) {
    return <div className={`rounded-[5px] bg-cream-200 ${className}`} aria-hidden="true" />;
  }
  return <img src={src} alt="" className={`rounded-[5px] object-cover ${className}`} />;
}

export default function TwoColumnSectionView({
  heading,
  paragraphs,
  image,
  position = 'right',
  button,
}: {
  heading: string;
  /** Pre-rendered, sanitized inline HTML for each body paragraph. */
  paragraphs: string[];
  image: string;
  /** Which side the image sits on (desktop only). Default 'right' = intro layout. */
  position?: BlockPosition;
  /** Optional CTA — rendered only when present (label already trimmed non-empty). */
  button?: { label: string; href: string } | null;
}) {
  const imageLeft = position === 'left';

  return (
    <section className="bg-cream-100 py-[70px] md:py-[100px]">
      <div className="w-[90%] lg:w-[81%] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-[60px] items-center">
          {/* Text column — always first in the DOM so mobile stacks text-first.
              `lg:order-2` only flips it to the right on desktop when image is left. */}
          <div className={imageLeft ? 'lg:order-2' : undefined}>
            <h2 className="font-display font-bold text-brand-600 text-[28px] md:text-[32px] leading-tight tracking-tight mb-8">
              {heading}
            </h2>

            {/* Mobile: photo inside the text column (hidden on desktop) */}
            <SectionImage src={image} className="aspect-[4/3] w-full mb-8 lg:hidden" />

            <div className="text-navy-800 space-y-5">
              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  className="font-sans text-[16px] leading-[24px]"
                  dangerouslySetInnerHTML={{ __html: p }}
                />
              ))}
            </div>

            {button && (
              <Link
                href={button.href || '#'}
                className="link-button inline-flex items-center gap-2 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded-full transition-colors duration-150 mt-7"
              >
                {button.label}
              </Link>
            )}
          </div>

          {/* Image column — desktop only. `lg:order-1` puts it on the left when flipped. */}
          <SectionImage
            src={image}
            className={`aspect-[4/3] w-full hidden lg:block${imageLeft ? ' lg:order-1' : ''}`}
          />
        </div>
      </div>
    </section>
  );
}
