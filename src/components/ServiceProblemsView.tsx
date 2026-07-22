import Link from 'next/link';
import { Phone, Check } from 'lucide-react';
import CharacterPanel from '@/components/CharacterPanel';
import type { ResolvedBlockStyle } from '@/lib/cms/sub-service-blocks';

/**
 * Brief 91 — presentational (client-safe) body of the List Section / "Problems We
 * Solve" block, extracted from `ServiceProblems`. It takes ALREADY-RESOLVED props
 * (tokens resolved, phone/CTA supplied) so it has no server/DB dependency and can
 * render in BOTH the public server tree (via `ServiceProblems`) and the admin
 * live preview (Track D). This shared component is what guarantees the editor
 * preview can't drift from the public page.
 *
 * `style` unset → the historical Carmine character panel with white copy and the
 * legacy `jbcharacter.webp`, flush bottom-left. `style` set → a remix from the
 * closed brand list: solid combo background, combo text color, a chosen J pose,
 * and (optionally) the character flipped to the right.
 */
export default function ServiceProblemsView({
  heading,
  items,
  phoneHref,
  ctaLabel,
  style,
}: {
  heading: string;
  items: string[];
  phoneHref: string;
  ctaLabel: string;
  style?: ResolvedBlockStyle | null;
}) {
  const fg = style?.background.fg;
  const bg = style?.background.bg;
  // The content sits opposite the character, so the bigger gutter belongs on the
  // panel-edge side. Default/character-left → extra right padding; when the
  // character is flipped to the right, mirror it to extra left padding so the copy
  // isn't jammed against the panel's left margin.
  const padSide = style?.position === 'right' ? 'lg:pl-16' : 'lg:pr-16';

  return (
    // Cream gutter so the panel sits as a contained, centered block.
    <section className="bg-cream-100 py-[50px] md:py-[80px]">
      <div className="w-[90%] lg:w-[81%] mx-auto">
        <CharacterPanel
          className="ep-card ndc-section"
          characterClassName="char hidden lg:block relative lg:w-[400px] lg:h-[520px] flex-shrink-0 self-end"
          {...(style
            ? {
                // Only swap the base color, character pose and side. Keep the
                // blended `no-drip-club.webp` texture + red overlay so the panel's
                // signature look survives every color combo (Brief 91 fix).
                bgColor: bg,
                characterSrc: style.illustration.src,
                characterAlt: `J. Blanton — ${style.illustration.label}`,
                reverse: style.position === 'right',
                characterZoom: true,
              }
            : {})}
        >
          <div
            className={`a flex-1 w-full px-8 md:px-12 lg:px-8 ${padSide} py-10 lg:py-16 ${style ? '' : 'text-white'}`}
            style={fg ? { color: fg } : undefined}
          >
            <div className="r">
              <h2
                className={`label font-display font-bold ${style ? '' : 'text-white'} text-[28px] md:text-[36px] lg:text-[42px] leading-tight tracking-tight mb-6 uppercase`}
                style={fg ? { color: fg } : undefined}
              >
                {heading}
              </h2>

              <ul className="space-y-3 mb-8">
                {items.map((item, i) => (
                  <li
                    key={i}
                    className={`service flex items-start gap-3 font-sans text-[16px] md:text-[18px] leading-[24px] ${style ? '' : 'text-white'}`}
                    style={fg ? { color: fg } : undefined}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0 mt-0.5 ${style ? '' : 'bg-white text-brand-600'}`}
                      style={style ? { backgroundColor: fg, color: bg } : undefined}
                    >
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={phoneHref}
                className="link-button inline-flex items-center gap-2 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded-full transition-colors duration-150"
              >
                <Phone className="h-4 w-4" strokeWidth={2.5} />
                {ctaLabel}
              </Link>
            </div>
          </div>
        </CharacterPanel>
      </div>
    </section>
  );
}
