import type { ServiceContent } from '@/types/service';

/**
 * First sub-service data file (brief-11). The exact copy below is transcribed
 * from the live `jblantonplumbing.com/sewer-rodding` page, section by section
 * (brief-11 §§1–11). This is the template every future service clones:
 * copy-and-fill a new `[slug].ts`, register it in `index.ts`, add a static
 * route folder under `src/app/`.
 *
 * Interior section image CDN filenames are unconfirmed (lazy-loaded on live —
 * brief-11 §1 note + flag 3). Those are left as `''` so the section components
 * fall back to a Cream placeholder; only the hero image URL was visible in the
 * static fetch and is wired below.
 */
export const SEWER_RODDING: ServiceContent = {
  slug: 'sewer-rodding',

  seo: {
    title: 'Sewer Rodding Services in Chicagoland | J. Blanton Plumbing',
    description:
      "Annual or emergency sewer rodding done right the first time. Camera inspection before and after so you see exactly what's cleared. No upsell.",
  },

  // §1 — image hero
  hero: {
    heading: 'Sewer Rodding in Chicagoland',
    intro:
      'Clogged drains, recurring backups, and odors are key signs you may need sewer rodding, and our rodding services deliver fast, safe results with expert sewer rodding services when rodding a blocked drain is the best solution.',
    image: 'https://d1rplazj5a80fb.cloudfront.net/images/hero_image.webp',
  },

  // §3 — expert intro (two-column, Cream) — `.f` dual-image pattern
  expertSection: {
    heading: 'Sewer Rodding Experts You Should Call',
    image1: 'https://d1rplazj5a80fb.cloudfront.net/images/img_sewer-rodding.webp',
    image2: '',
    paragraphs: [
      'Our licensed plumbers provide expert rodding services to clear stubborn blockages deep within your sewer lines.',
      'We use advanced equipment to ensure sewer rodding is thorough and effective without damaging your pipes. From minor clogs to major backups, our sewer rodding services are tailored to your specific situation.',
      'We focus on long-term results, not temporary fixes. When rodding a blocked drain, our goal is to restore full flow and prevent repeat issues.',
    ],
  },

  // §4 — problems (Carmine block)
  problemsSection: {
    heading: 'Reliable Solutions for Common Sewer Rodding Problems',
    problems: [
      'Grease and sludge buildup in sewer lines',
      'Tree root intrusion',
      'Repeated drain backups',
      'Slow or gurgling drains',
    ],
  },

  // §5 — related services cards (always 2, Cream)
  relatedServicesSection: {
    heading: 'More Sewer Rodding Solutions',
    cards: [
      {
        title: 'Drain Cleaning',
        teaser:
          'Professional drain cleaning services in Chicago transform drainage problems into lasting solutions.',
        image: 'https://d1rplazj5a80fb.cloudfront.net/images/image14.webp',
        href: '/drain-cleaning-services-in-chicago',
      },
      {
        title: 'Hydro Jetting',
        teaser:
          'Professional hydro jetting service eliminates stubborn pipe blockages quickly and effectively.',
        image: 'https://d1rplazj5a80fb.cloudfront.net/images/img_hydro-jetting.webp',
        href: '/hydro-jetting',
      },
    ],
  },

  // §6 — secondary content (Cream, text only)
  secondarySection: {
    heading: 'Professional Sewer Line Installation Done Right',
    paragraphs: [
      'In some cases, sewer rodding reveals that aging or damaged pipes are beyond repair. When that happens, a new sewer line installation may be the most reliable solution.',
      'Our plumbers walk you through your options and explain when replacement makes more sense than repeated sewer rodding services.',
      'We install durable, code-compliant piping designed to last for decades. Even when installation is needed, our rodding services help identify the exact problem area first.',
    ],
  },

  // §8 — No Drip Club (Cream, two-column `.f2` variant, white pill JOIN NOW)
  noDropClubSection: {
    title: 'Premium Protection with Our No Drip Club',
    body: 'Our No Drip Club offers premium plumbing protection and added peace of mind for homeowners. Members enjoy priority scheduling and routine inspections to catch small issues before they become costly repairs.',
  },

  // §9 — preventive maintenance (Cream, text + image)
  preventiveSection: {
    heading: 'Preventive Maintenance for Healthier Sewer Lines',
    image: '',
    paragraphs: [
      'Routine maintenance can significantly reduce the need for emergency sewer rodding.',
      'Regular inspections and drain cleaning help prevent debris buildup and root intrusion. Addressing small issues early minimizes the chances of needing rodding a blocked drain unexpectedly. Preventive rodding services also extend the life of your sewer system.',
      'A little maintenance now can save you from major sewer rodding services later.',
    ],
  },

  // §11 — closing CTA (Cream, two-column `.f3.f3-left` with manplumber.webp)
  closingCTA: {
    heading: 'Schedule Sewer Rodding Service Today',
    body: "Don't wait for a minor clog to turn into a major sewer problem. Scheduling professional sewer rodding at the first sign of trouble can save time and money. Our friendly team makes booking easy.",
    image: 'https://d1rplazj5a80fb.cloudfront.net/images/manplumber.webp',
  },
};
