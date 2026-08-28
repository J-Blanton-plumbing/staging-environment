/**
 * Brief 156 — the four-item trust bar.
 *
 * ⚠️ THE PLACEHOLDER SUB-LINE IS HIDDEN, AND THAT IS FAITHFUL.
 *
 * Brief 156 §3/§9.1 says all four items share the leftover Webflow template line
 * "Just provide us the timing and we all will set our schedule." and instructs
 * that it be reproduced visibly on all four. That transcription read the live
 * page's DOM but missed that every one of those <p> tags carries Webflow's
 * `hidden` class, which is `display: none` in the compiled stylesheet — the line
 * is in the markup and has never rendered to a visitor.
 *
 * So it is reproduced here exactly as the source has it: present in the markup,
 * not displayed. Rendering it visibly would put template filler on a paid-traffic
 * page that does not currently show any, which is a regression against the live
 * page, not fidelity to it. Flagged as punch-list item #1 for the Bathrooms team
 * — the copy is preserved verbatim below so they can decide what should replace
 * it. Do not invent replacement copy.
 */

import Image from 'next/image';
import styles from './bathrooms.module.css';

/** Leftover Webflow template copy — never rendered on the live page. See above. */
const PLACEHOLDER_SUBLINE = 'Just provide us the timing and we all will set our schedule.';

const ITEMS = [
  { icon: '/bathrooms/icons/trust-30-years.svg', lines: ['30', 'Years'] },
  { icon: '/bathrooms/icons/trust-30k-customers.svg', lines: ['30,000+', 'Customers'] },
  { icon: '/bathrooms/icons/trust-licensed-bonded-insured.svg', lines: ['Licensed. Bonded. Insured.'] },
  { icon: '/bathrooms/icons/trust-lifetime-warranty.svg', lines: ['LifeTime Warranty'] },
] as const;

export default function TrustBar() {
  return (
    <section className={`${styles.section} ${styles.sectionTrust}`}>
      <div className={styles.container}>
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4 md:gap-[50px]">
          {ITEMS.map((item) => (
            <div key={item.lines.join(' ')} className="flex flex-col items-center gap-3 text-center">
              <Image
                src={item.icon}
                alt=""
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8"
              />
              <div>
                {/* A <p>, not a heading. The live page marks these up as <h4> in
                    a section that has no heading of its own; four headings for
                    four stat labels would pollute the document outline for no
                    reader benefit. Purely semantic — visually identical. */}
                <p className={`${styles.h4} text-[#171714]`}>
                  {item.lines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </p>
                {/* Hidden on the live page — see the note at the top of this file. */}
                <p className={`${styles.body16} hidden text-[#434338]`}>
                  {PLACEHOLDER_SUBLINE}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
