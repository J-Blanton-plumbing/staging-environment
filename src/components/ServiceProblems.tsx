import Link from 'next/link';
import { Phone, Check } from 'lucide-react';
import { getGlobalSettingsCached } from '@/lib/cms/global-settings';
import { resolveTokens } from '@/lib/cms/tokens';
import CharacterPanel from '@/components/CharacterPanel';
import type { ServiceContent } from '@/types/service';

/**
 * §4 — common-problems block (brief-11 §4 / brief-61 fix). Uses the shared
 * <CharacterPanel> — the same "Problems We Solve" treatment as the service
 * category pages (`/services/[slug]`): the `no-drip-club.webp` red background,
 * the J. Blanton character sitting flush at the bottom-left (400×520,
 * `object-bottom`), check-circle problem rows, and the Cerulean "MAKE A GOOD
 * CALL" pill. The character is shared brand chrome, not per-service data.
 */
export default async function ServiceProblems({
  problems,
}: {
  problems: ServiceContent['problemsSection'];
}) {
  const settings = await getGlobalSettingsCached();
  return (
    // Cream gutter so the panel sits as a contained, centered block.
    <section className="bg-cream-100 py-[50px] md:py-[80px]">
      <div className="w-[90%] lg:w-[81%] mx-auto">
        <CharacterPanel
          className="ep-card ndc-section"
          characterClassName="char hidden lg:block relative lg:w-[400px] lg:h-[520px] flex-shrink-0 self-end"
        >
          <div className="a flex-1 w-full px-8 md:px-12 lg:px-8 lg:pr-16 py-10 lg:py-16 text-white">
            <div className="r">
              <h2 className="label font-display font-bold text-white text-[28px] md:text-[36px] lg:text-[42px] leading-tight tracking-tight mb-6 uppercase">
                {resolveTokens(problems.heading, settings)}
              </h2>

              <ul className="space-y-3 mb-8">
                {problems.problems.map((item, i) => (
                  <li
                    key={i}
                    className="service flex items-start gap-3 font-sans text-[16px] md:text-[18px] leading-[24px] text-white"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-brand-600 flex-shrink-0 mt-0.5">
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                    <span>{resolveTokens(item, settings)}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={settings.phoneHref}
                className="link-button inline-flex items-center gap-2 bg-accent-500 hover:bg-brand-600 text-white font-display font-bold text-sm tracking-wider px-6 py-3.5 rounded-full transition-colors duration-150"
              >
                <Phone className="h-4 w-4" strokeWidth={2.5} />
                {settings.ctaPrimaryLabel}
              </Link>
            </div>
          </div>
        </CharacterPanel>
      </div>
    </section>
  );
}
