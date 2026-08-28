/**
 * Brief 156 — "Built with Patented, High-Performance Materials": three photos on
 * the left, four feature blocks on the right, CTA pair beneath the photos.
 *
 * The live page wraps each feature in a numbered circular badge (1–4) that is
 * `display: none` — and whose fourth badge reads "3", a duplicate. The badges are
 * not reproduced: unlike the hidden copy elsewhere on this page there is nothing
 * to preserve for the Bathrooms team (they carry no words), and shipping a known
 * mis-numbered sequence in the markup helps nobody. Noted in the punch list.
 *
 * SolidSone™ keeps its trademark symbol — it is a trademark claim, not styling
 * (Brief 156 §7).
 */

import Image from 'next/image';
import styles from './bathrooms.module.css';
import CtaBand from './CtaBand';

const HEADING = 'Built with Patented, High-Performance Materials';
const INTRO =
  'After your design consultation, you’ll see—and feel—the difference. Most homeowners tell us they wouldn’t want anything else in their shower.';

const FEATURES = [
  {
    title: 'SolidSone™ Engineered Shower Base',
    paragraphs: [
      'The shower base is the most important part of any shower. It supports your weight every day and takes the brunt of Chicago’s hard water.',
      'That’s why we developed our proprietary SolidSone™ shower base, engineered for exceptional strength, durability, and long-term performance.',
      'Experience it in person during your consultation—you’ll instantly notice the difference.',
    ],
  },
  {
    title: 'Mold-Resistant Wall System',
    paragraphs: [
      'Seamless wall panels with no exposed grout lines create a truly waterproof surface that resists mold, mildew, and stains.',
    ],
  },
  {
    title: 'Easy to Clean',
    paragraphs: [
      'Smooth, non-porous surfaces wipe clean effortlessly—even in homes with hard water—so your shower stays looking fresh with minimal maintenance.',
    ],
  },
  {
    title: 'Built for Long-Term Durability',
    paragraphs: [
      'Engineered finishes stand up to daily use and changing temperatures, helping prevent chips, cracks, discoloration, and water damage over time.',
    ],
  },
] as const;

export default function Materials() {
  return (
    <section className={styles.section}>
      <div className={`${styles.container} flex flex-col items-start gap-12 lg:flex-row lg:gap-16`}>
        <div className="flex w-full flex-col gap-6 lg:w-1/2 lg:shrink-0">
          <Image
            src="/bathrooms/materials/work-1-dusty-blue.jpg"
            alt="Completed walk-in shower with dusty blue wall panels"
            width={1600}
            height={1068}
            sizes="(max-width: 1023px) 100vw, 493px"
            className="h-auto w-full rounded-lg object-cover lg:ml-9 lg:h-[291px] lg:w-[493px]"
          />
          <div className="grid grid-cols-2 gap-6">
            <Image
              src="/bathrooms/materials/work-2-silver-grey-marble.jpg"
              alt="Silver grey marble shower wall system"
              width={1200}
              height={1697}
              sizes="(max-width: 1023px) 50vw, 298px"
              className="h-full w-full rounded-lg object-cover lg:h-[404px]"
            />
            <Image
              src="/bathrooms/materials/work-3-black-marble.jpg"
              alt="Black marble shower wall system"
              width={1131}
              height={1600}
              sizes="(max-width: 1023px) 50vw, 294px"
              className="h-full w-full rounded-lg object-cover lg:h-[404px]"
            />
          </div>
          <CtaBand className="mt-2" layout="stacked" />
        </div>

        <div className="flex w-full flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h2 className={`${styles.size48} text-[#171714]`}>{HEADING}</h2>
            <p className={`${styles.body18} text-[#434338]`}>{INTRO}</p>
          </div>

          <div className="flex flex-col gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-3">
                <h3 className={`${styles.h4} text-[#171714]`}>{feature.title}</h3>
                {feature.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className={`${styles.body16} text-[#434338]`}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
