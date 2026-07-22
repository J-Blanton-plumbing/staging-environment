import Link from 'next/link';
import type { ResolvedBlockStyle } from '@/lib/cms/sub-service-blocks';

/**
 * Brief 91 — presentational (client-safe) body of the No Drip Club `.f2` block,
 * extracted from `NoDripClubSimple`. It takes ALREADY-RESOLVED props (title token-
 * resolved, `bodyHtml` pre-sanitized on the server), so it has no server/DB
 * dependency and renders in BOTH the public server tree and the admin live
 * preview (Track D) — one shared source of markup, no drift.
 *
 * `style` unset → the historical Cream band: Carmine label, navy body, the
 * `preventative.webp` photo in the right column. `style` set → a remix from the
 * closed brand list: the combo background across the band, combo text color, the
 * chosen J pose in the image column, and (optionally) that column flipped left.
 */

/** Photo (object-cover) — mirrors ServiceIntro's ServiceImage exactly for parity. */
function Photo({ src, className }: { src: string; className: string }) {
  if (!src) return <div className={`rounded-[5px] bg-cream-200 ${className}`} aria-hidden="true" />;
  return <img src={src} alt="" className={`rounded-[5px] object-cover ${className}`} />;
}

/** J character illustration (object-contain), shown in style mode instead of the photo. */
function Illustration({ src, label, className }: { src: string; label: string; className: string }) {
  return <img src={src} alt={`J. Blanton — ${label}`} className={`object-contain object-bottom ${className}`} />;
}

export default function NoDripClubView({
  title,
  bodyHtml,
  image,
  style,
}: {
  title: string;
  /** Pre-rendered, sanitized inline HTML for the body copy. */
  bodyHtml: string;
  /** Photo used when no style override is set. */
  image: string;
  style?: ResolvedBlockStyle | null;
}) {
  const fg = style?.background.fg;
  const bg = style?.background.bg;
  // Default (and legacy) = image on the RIGHT. `position: 'left'` flips the columns.
  const imageLeft = style?.position === 'left';

  // Order classes only appear in style mode (flip), so the no-style output keeps
  // the exact original class strings and DOM shape — byte-for-byte identical.
  const imageNode = (extra: string) => {
    const cls = `aspect-[4/3] w-full ${extra}`;
    return style ? (
      <Illustration src={style.illustration.src} label={style.illustration.label} className={cls} />
    ) : (
      <Photo src={image} className={cls} />
    );
  };

  return (
    <section
      className={style ? 'py-[70px] md:py-[100px]' : 'bg-cream-100 py-[70px] md:py-[100px]'}
      style={bg ? { backgroundColor: bg } : undefined}
    >
      <div className="w-[90%] lg:w-[81%] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-[60px] items-center">
          {/* Left — red label, mobile-only image, copy, JOIN NOW */}
          <div className={imageLeft ? 'lg:order-2' : undefined}>
            <p
              className={`red-text font-display font-bold ${style ? '' : 'text-brand-600'} text-[28px] md:text-[32px] leading-tight tracking-tight mb-8`}
              style={fg ? { color: fg } : undefined}
            >
              {title}
            </p>

            {/* Mobile: image inside the text column (hidden on desktop) */}
            {imageNode('mb-8 lg:hidden')}

            <p
              className={`font-sans ${style ? '' : 'text-navy-800'} text-[16px] leading-[24px] mb-7`}
              style={fg ? { color: fg } : undefined}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />

            <Link
              href="/no-drip-club"
              className="link-button inline-flex items-center gap-2 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded-full transition-colors duration-150"
            >
              JOIN NOW
            </Link>
          </div>

          {/* Right — desktop-only image column (hidden on mobile) */}
          {imageNode(`hidden lg:block${imageLeft ? ' lg:order-1' : ''}`)}
        </div>
      </div>
    </section>
  );
}
