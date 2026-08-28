/**
 * Brief 156 — "See the Bathrooms We've Transformed": nine before/after sliders.
 *
 * Each pair is rendered ONCE and made responsive (Brief 156 §1, §9.5). The live
 * page ships a desktop and a mobile markup block and hides one with CSS — 18
 * `<img>` tags for 9 pairs.
 *
 * Source resolutions vary and several pairs are only 480×640; that is the
 * source's own resolution, not a fetch error, and they are not upscaled
 * (§9.4). Two "before" photos (pairs 8 and 9) are landscape at source and are
 * centre-cropped into the shared 3:4 frame — see the punch list.
 */

import styles from './bathrooms.module.css';
import BeforeAfterSlider, { type BeforeAfterPair } from './BeforeAfterSlider';
import CtaBand from './CtaBand';

const HEADING = 'See the Bathrooms We’ve Transformed';
const SUBHEADING = 'Explore our Before and After Gallery';

const PAIRS: BeforeAfterPair[] = [
  { beforeSrc: '/bathrooms/gallery/pair-1-before.jpg', afterSrc: '/bathrooms/gallery/pair-1-after.png', label: 'Bathroom remodel, before and after — project 1' },
  { beforeSrc: '/bathrooms/gallery/pair-2-before.jpg', afterSrc: '/bathrooms/gallery/pair-2-after.jpg', label: 'Bathroom remodel, before and after — project 2' },
  { beforeSrc: '/bathrooms/gallery/pair-3-before.png', afterSrc: '/bathrooms/gallery/pair-3-after.png', label: 'Bathroom remodel, before and after — project 3' },
  { beforeSrc: '/bathrooms/gallery/pair-4-before.jpg', afterSrc: '/bathrooms/gallery/pair-4-after.jpg', label: 'Bathroom remodel, before and after — project 4' },
  { beforeSrc: '/bathrooms/gallery/pair-5-before.jpg', afterSrc: '/bathrooms/gallery/pair-5-after.jpg', label: 'Bathroom remodel, before and after — project 5' },
  { beforeSrc: '/bathrooms/gallery/pair-6-before.jpg', afterSrc: '/bathrooms/gallery/pair-6-after.jpg', label: 'Bathroom remodel, before and after — project 6' },
  { beforeSrc: '/bathrooms/gallery/pair-7-before.jpg', afterSrc: '/bathrooms/gallery/pair-7-after.jpg', label: 'Bathroom remodel, before and after — project 7' },
  { beforeSrc: '/bathrooms/gallery/pair-8-before.jpg', afterSrc: '/bathrooms/gallery/pair-8-after.jpg', label: 'Bathroom remodel, before and after — project 8' },
  { beforeSrc: '/bathrooms/gallery/pair-9-before.jpg', afterSrc: '/bathrooms/gallery/pair-9-after.jpg', label: 'Bathroom remodel, before and after — project 9' },
];

export default function BeforeAfterGallery() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className="mb-12 flex flex-col items-center gap-3 text-center md:mb-16">
          <h2 className={`${styles.h2} text-[#171714]`}>{HEADING}</h2>
          <h3 className={`${styles.h3} text-[#171714]`}>{SUBHEADING}</h3>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
          {PAIRS.map((pair) => (
            <BeforeAfterSlider key={pair.beforeSrc} {...pair} />
          ))}
        </div>

        <CtaBand layout="horizontal" />
      </div>
    </section>
  );
}
