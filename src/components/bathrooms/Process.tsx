/**
 * Brief 156 — "How the Process Works": three numbered steps in white cards.
 *
 * The number badges here ARE visible on the live page (unlike the Materials
 * section's, which are display:none). Badge fill is Carmine — the live page uses
 * `#9B0D0D`, which is not an approved brand value and is snapped (§4.2/§9.2).
 */

import styles from './bathrooms.module.css';
import CtaBand from './CtaBand';

const HEADING = 'How the Process Works';

const STEPS = [
  {
    number: '1',
    title: 'Free In-Home Design Consultation',
    paragraphs: [
      'In about an hour, our design consultant will create a custom shower plan tailored to your space, style, and safety needs.',
      'We bring real samples of the wall system, shower base, and fixtures so you can touch, compare, and choose what feels right for your home.',
      'Before we leave, you’ll receive a precise, down-to-the-penny quote—no surprises later.',
    ],
    bullets: [],
  },
  {
    number: '2',
    title: 'Expert Installation in as Little as 2 Days',
    paragraphs: [
      'Our certified installers and licensed plumbing technicians handle everything—from the demolition to the final finishing touches.',
      'Most tub-to-shower conversions are completed in just two days, so you can enjoy your new shower without weeks of disruption.',
    ],
    bullets: [
      'Clean, professional job sites',
      'Precise plumbing work by licensed pros',
      'Built for long-term durability and safety',
    ],
  },
  {
    number: '3',
    title: 'Care for Life',
    paragraphs: [
      'Your new shower is built to last—and backed by real protection.',
      'Enjoy total peace of mind with:',
    ],
    bullets: [
      'Workmanship warranty on installation',
      'Lifetime material warranty on core shower components',
    ],
  },
] as const;

export default function Process() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        {/* The margin sits on a wrapper, never on the heading itself: the type
            classes zero heading margins with the `margin` SHORTHAND, which beats
            a Tailwind `mb-*` longhand in the cascade and silently collapses to 0.
            This also matches the source, which spaces the block with
            `.content-text-top.bm-48`, and the Gallery/Team sections here. */}
        <div className="mb-12 text-center">
          <h2 className={`${styles.h2} text-[#171714]`}>{HEADING}</h2>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-12 lg:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.number} className="flex flex-col gap-6 rounded-xl bg-white p-6">
              <div
                className="mx-auto flex h-[70px] w-[70px] items-center justify-center rounded-full bg-[#BC0E0E]"
                aria-hidden="true"
              >
                <span className={`${styles.h3} text-white`}>{step.number}</span>
              </div>

              <h3 className={`${styles.size24} text-center text-[#171714]`}>{step.title}</h3>

              <div className="flex flex-col gap-4">
                {step.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className={`${styles.body18} text-[#434338]`}
                  >
                    {paragraph}
                  </p>
                ))}

                {step.bullets.length > 0 && (
                  <ul className="list-disc pl-5 text-[#171714] marker:text-[#171714]">
                    {step.bullets.map((bullet) => (
                      <li key={bullet} className="pl-3">
                        <p className={`${styles.body18} text-[#434338]`}>{bullet}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        <CtaBand layout="horizontal" />
      </div>
    </section>
  );
}
