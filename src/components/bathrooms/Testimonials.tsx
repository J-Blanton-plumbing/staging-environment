/**
 * Brief 156 — "See what our clients say": two Google reviews plus the review
 * count badge, each card linking out to a full review screenshot in a lightbox.
 *
 * `items-start` on the card row is load-bearing. Flex's default `stretch` made
 * John Moreno's shorter card grow to the full height of Alma Tate's (which is
 * taller because it carries the two screenshots) and left a large dead area
 * under his review. The source uses `align-items: flex-start`, so each card is
 * only as tall as its own content.
 *
 * The "87" review count is a <p> here, not the <h1> the live page uses. That is
 * one of four H1s on the source page; the standing rule (CLAUDE.md gotcha #3) is
 * one H1 per page and a number is not a heading. Visually identical.
 *
 * Review text is verbatim, including its original spelling and punctuation —
 * these are real customer reviews and are not ours to tidy.
 */

import Image from 'next/image';
import styles from './bathrooms.module.css';
import ReviewLightbox, { type ReviewScreenshot } from './ReviewLightbox';

const HEADING = 'See what our clients say';
const INTRO_LINE_1 = 'Join thousands of Chicagoland homeowners who love their new bathrooms.';
const INTRO_LINE_2 =
  'Every week, more families choose us for safer, better-built bathrooms. See why our schedule stays full.';

const SCREENSHOTS: ReviewScreenshot[] = [
  {
    src: '/bathrooms/testimonials/review-screenshot-1.webp',
    alt: 'Google review screenshot',
    width: 810,
    height: 1080,
  },
  {
    src: '/bathrooms/testimonials/review-screenshot-2.webp',
    alt: 'Google review screenshot',
    width: 810,
    height: 1080,
  },
];

const REVIEWS = [
  {
    name: 'Alma Tate',
    meta: '2 reviews',
    avatar: '/bathrooms/testimonials/avatar-alma-tate.png',
    body:
      'Walk in shower excellent Paul was great n so was the installer wonderful jon very pleased with the company',
    showScreenshots: true,
  },
  {
    name: 'John Moreno',
    meta: '6 reviews',
    avatar: '/bathrooms/testimonials/avatar-john-moreno.png',
    body:
      "I've hired J. Blanton for numerous plumbing projects. This is the first remodel. I was pleasantly surprised, not only by the quick turnaround, but the help I received from Anne regarding the interior design. The crew was efficient, friendly and a pleasure to work with. I will always consider J Blanton for plumbing and bathroom updates. Hopefully, they'll start remodeling kitchens.",
    showScreenshots: false,
  },
] as const;

function Stars() {
  return (
    <div className="flex gap-1" role="img" aria-label="5 out of 5 stars">
      {[0, 1, 2, 3, 4].map((i) => (
        <Image
          key={i}
          src="/bathrooms/icons/star.svg"
          alt=""
          width={20}
          height={20}
          unoptimized
          className="h-5 w-5"
        />
      ))}
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className={styles.section}>
      <div className={`${styles.container} flex flex-col gap-12`}>
        <div className="flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-end">
          <div className="flex flex-col gap-4 lg:max-w-[60%]">
            <h2 className={`${styles.h2} text-[#171714]`}>{HEADING}</h2>
            <p className={`${styles.body18} text-[#434338]`}>
              {INTRO_LINE_1}
              <br />
              {INTRO_LINE_2}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2">
            <Image
              src="/bathrooms/testimonials/google-review-logo.png"
              alt="Google Reviews"
              width={3840}
              height={2160}
              sizes="200px"
              className="h-auto w-[200px]"
            />
            <div className="flex items-baseline gap-3">
              <p className={`${styles.display} text-[#ADAD9F]`}>87</p>
              <p className={`${styles.body16} ${styles.semibold} text-[#171714]`}>5-Star Reviews</p>
            </div>
          </div>
        </div>

        {/* items-start: each card sizes to its own content — see the note above. */}
        <div className="flex flex-col items-stretch gap-6 lg:flex-row lg:items-start">
          {REVIEWS.map((review) => (
            <div
              key={review.name}
              className="flex flex-1 flex-col gap-[30px] rounded-2xl bg-white p-6 md:p-10"
            >
              <div className="flex items-center gap-4">
                <Image
                  src={review.avatar}
                  alt=""
                  width={70}
                  height={70}
                  className="h-[70px] w-[70px] shrink-0 rounded-full object-cover"
                />
                <div className="flex flex-col gap-1">
                  <p className={`${styles.body18} ${styles.bold} text-[#171714]`}>{review.name}</p>
                  <p className={`${styles.body16} text-[#434338]`}>{review.meta}</p>
                  <Stars />
                </div>
              </div>

              <p className={`${styles.body18} text-[#171714]`}>{review.body}</p>

              {review.showScreenshots && <ReviewLightbox screenshots={SCREENSHOTS} />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
