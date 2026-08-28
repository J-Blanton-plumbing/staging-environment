/**
 * Brief 156 — "Chicagoland's Trusted Bathroom Remodeling Experts" / value props.
 *
 * ⚠️ THE FIFTH VALUE PROP IS HIDDEN, AND THAT IS FAITHFUL.
 *
 * Brief 156 §3/§5 lists five value props. On the live page the fifth ("Affordable
 * Monthly Options") sits on a `.singel-service-card.left.hidden` — Webflow's
 * `hidden` class is `display: none` in the compiled stylesheet, so only four have
 * ever rendered to a visitor. It is reproduced here the way the source has it:
 * in the markup, not displayed. Making it visible would add a financing promise
 * to a paid-traffic page that does not currently make one — a content change, not
 * a clone. Flagged as a punch-list item; flip the `hidden` class to restore it if
 * the Bathrooms team wants it back.
 *
 * This section's CTA pair is the ONE place the live page's responsive markup
 * duplication is kept, because the pair genuinely moves between parents: inside
 * the left column at desktop, below the whole two-column grid at tablet/mobile.
 * No CSS reorder spans different parents, so it is two nodes with one visible at
 * any width — matching the live page exactly. Everything else the source ships
 * twice (all 18 gallery images, every photo) is rendered once here per §1/§9.5.
 *
 * The `.tablet-visible` copy is also the one that links to a non-existent
 * `/services` on the live page; every CTA here opens the modal (§9.3).
 */

import Image from 'next/image';
import styles from './bathrooms.module.css';
import CtaBand from './CtaBand';

const EYEBROW = 'Chicagoland’s Trusted Bathroom Remodeling Experts';
const HEADING_LEAD = 'Why Homeowners Choose Bathrooms by';
const HEADING_TAIL = 'J. Blanton';

const BODY_PARAGRAPHS = [
  'We’re a family-owned, local company that has proudly served the Chicagoland area for more than 30 years.',
  'Over that time, more than 30,000 customers have trusted us with their homes—and we’re grateful for every single one.',
  'Our mission is simple: deliver safer, better-built showers with honest service, premium materials, and expert installation you can rely on.',
];

const VALUE_PROPS = [
  {
    icon: '/bathrooms/icons/why-customer-education.svg',
    title: 'Customer Education',
    body:
      'We empower homeowners with clear information about products, safety features, and financing—so you can make confident, stress-free decisions.',
    hiddenOnSource: false,
  },
  {
    icon: '/bathrooms/icons/why-transparent-quoting.svg',
    title: 'Accurate & Transparent Quoting',
    body: 'You receive a precise, upfront quote with no hidden fees or last-minute surprises.',
    hiddenOnSource: false,
  },
  {
    icon: '/bathrooms/icons/why-licensed-plumbers.svg',
    title: 'Only Remodeler with Licensed Plumbers',
    body:
      'Unlike most remodelers, we’re the only company in Chicagoland with a full plumbing license. That means every installation is done by qualified professionals—not subcontractors.',
    hiddenOnSource: false,
  },
  {
    icon: '/bathrooms/icons/why-customer-satisfaction.svg',
    title: '100% Customer Satisfaction',
    body:
      'Your satisfaction is our top priority. Enjoy peace of mind with our lifetime material warranty and dependable workmanship. 5-year workmanship warranty.',
    hiddenOnSource: false,
  },
  {
    icon: '/bathrooms/icons/why-affordable-monthly.svg',
    title: 'Affordable Monthly Options',
    body: 'We offer flexible financing plans designed to fit your specific situation and budget.',
    // display:none on the live page — see the note at the top of this file.
    hiddenOnSource: true,
  },
] as const;

export default function WhyUs() {
  return (
    <section className={`${styles.section} ${styles.sectionFlush}`}>
      <div className={`${styles.container} flex flex-col items-start gap-12 lg:flex-row lg:gap-24`}>
        <div className="flex w-full flex-col gap-6 lg:w-[496px] lg:shrink-0">
          <p className={styles.eyebrow}>{EYEBROW}</p>
          <h2 className={`${styles.size30} text-[#171714]`}>
            {HEADING_LEAD} <span className="whitespace-nowrap">{HEADING_TAIL}</span>
          </h2>
          <div className="flex flex-col gap-4">
            {BODY_PARAGRAPHS.map((paragraph) => (
              <p
                key={paragraph}
                className={`${styles.body16} text-[#434338]`}
              >
                {paragraph}
              </p>
            ))}
          </div>
          {/* Desktop position. The show/hide sits on a wrapper, not on CtaBand:
              its own display comes from the CSS module, and a Tailwind display
              utility on the same element would be a source-order coin flip. */}
          <div className="mt-2 hidden lg:block">
            <CtaBand layout="stacked" />
          </div>
        </div>

        <div className="flex w-full flex-col gap-9">
          {VALUE_PROPS.map((prop) => (
            <div
              key={prop.title}
              className={`flex flex-col items-start gap-3 text-left ${prop.hiddenOnSource ? 'hidden' : ''}`}
            >
              <Image
                src={prop.icon}
                alt=""
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8"
              />
              <h3 className={`${styles.h4} text-[#171714]`}>{prop.title}</h3>
              <p className={`${styles.body16} text-[#434338]`}>{prop.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tablet/mobile position for the same CTA pair. */}
      <div className="mx-auto mt-12 w-full max-w-[1240px] lg:hidden">
        <CtaBand layout="stacked" />
      </div>
    </section>
  );
}
