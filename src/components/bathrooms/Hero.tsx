/**
 * Brief 156 — hero: photo background, headline left, offer card right.
 *
 * TWO background images and the framing that goes with them live in
 * `bathrooms.module.css` — including `background-position: 50% 60%`, which is the
 * source's own value. At 50% 50% the crop rides low enough to bring the shower
 * head into the first viewport.
 *
 * `-mt-[92px]` at desktop pulls the section up behind the sticky 92px header, as
 * the live page does (its `margin-top: -92px`); combined with `min-h-screen` and
 * centred content it makes the hero read as full-bleed. The offset is dropped
 * below 992px where the live page drops it too.
 *
 * The right column is a fixed 428px — the width the offer card resolves to on the
 * live page. Sizing it as a plain `0.35fr` made it 412px, and those 16px are the
 * difference between the CTA label sitting on one line and wrapping.
 *
 * THIS PAGE'S ONLY <h1>. The live page ships four (the headline, the "87" review
 * count, and both team member names) — a multiple-H1 defect that is NOT cloned,
 * per the standing rule in CLAUDE.md gotcha #3.
 */

import styles from './bathrooms.module.css';
import CountdownTimer from './CountdownTimer';
import { ConsultationCtaButton, PhoneCtaButton } from './LeadModal';

const HERO = {
  headline: 'Convert Your Tub Into a Walk-In Shower',
  sub: 'Designed for comfort, safety, and easy access.',
  offer: '$1,500 OFF + FREE Shower Door',
  terms: 'No Payments for 12 Months',
  urgency: 'Limited-time offer',
} as const;

export default function Hero() {
  return (
    <section
      className={`${styles.hero} relative flex items-center justify-center px-5 py-10 md:px-[30px] lg:-mt-[92px] lg:min-h-screen lg:py-[35px]`}
    >
      <div className="relative z-[1] mx-auto grid w-full max-w-[1240px] grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_428px] lg:gap-16">
        <div className="flex flex-col gap-[30px] lg:gap-[35px]">
          <h1 className={`${styles.h1} text-white`}>{HERO.headline}</h1>
          <p className={`${styles.body20} text-white`}>{HERO.sub}</p>
        </div>

        <div className="w-full overflow-hidden rounded-lg bg-white">
          {/* Offer banner. Carmine — the live page uses #9B0D0D, which is not an
              approved brand value and is snapped here (Brief 156 §4.2/§9.2). */}
          <div className="flex flex-col items-center justify-center gap-2 rounded-t-lg bg-[#BC0E0E] px-[30px] pb-[42px] pt-10">
            <h2 className={`${styles.size24} text-center text-white`}>{HERO.offer}</h2>
            <p className={`${styles.body18} text-center text-white`}>{HERO.terms}</p>
            <p className={`${styles.body16} ${styles.bold} text-white`}>{HERO.urgency}</p>
            <CountdownTimer />
          </div>

          <div className="p-5">
            <div className={styles.ctaHeroStack}>
              <ConsultationCtaButton variant="hero" />
              <PhoneCtaButton variant="hero" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
