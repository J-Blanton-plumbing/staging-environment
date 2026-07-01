import type { CityServiceContent } from '@/types/city-service';

export const TOILET_INSTALLATION_REPAIR: CityServiceContent = {
  serviceSlug: 'toilet-installation-repair',
  serviceTitle: 'Toilet Installation & Repair',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Toilet Installation and Repair. Same-Day Service Available.',

  serviceHeroImage: '/images/manplumber.webp',

  seo: {
    title: 'Toilet Installation & Repair in {city} | J. Blanton Plumbing',
    description:
      'Professional toilet installation and repair in {city}. Fix running toilets, clogs, leaks, and weak flushes — or install a new toilet. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Expert Toilet Installation and Repair in {city}',
    paragraphs: [
      'A malfunctioning toilet is one of the most disruptive plumbing problems in any {city} home. J. Blanton Plumbing handles all toilet repairs and installations throughout {city} — from a running toilet wasting water to a complete toilet replacement.',
      'Our licensed plumbers in {city} repair every common toilet problem: a constantly running toilet (which can waste hundreds of gallons per day), a toilet that rocks at the base, leaks around the base, clogs frequently, flushes weakly, or will not flush at all.',
      'Many toilet repairs — fill valve replacement, flapper replacement, wax ring replacement for a rocking toilet, or overflow tube adjustment — are completed in under an hour with parts our plumbers carry on their trucks.',
      'When a toilet has cracked porcelain, a failed flange that cannot be repaired, or simply needs to be updated to a more efficient model, we handle the full replacement — removing the old unit, inspecting the flange, and installing the new toilet with a proper wax seal.',
      'J. Blanton Plumbing has been serving {city} homeowners with toilet repair and installation for over 30 years. We offer same-day service on most toilet calls and carry common toilet models for immediate installation.',
    ],
    image: '/images/manplumber.webp',
  },

  secondarySection: {
    heading: 'Toilet Services in {city}: Repairs, Replacements, and Upgrades',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When {city} homeowners call J. Blanton Plumbing for a toilet problem, we diagnose the actual cause — not just replace parts until something works. A toilet that keeps clogging, for example, may indicate a partial obstruction in the drain line rather than a problem with the toilet itself.',
      'We recommend replacing older, high-flow toilets (3.5 to 7 gallons per flush) with modern low-flow models (1.28 gallons per flush) as an effective way to reduce {city} household water consumption and utility costs. The savings often pay for the new toilet within a few years.',
      'For {city} homeowners adding a basement bathroom, we handle the complete toilet rough-in and installation — including the wax ring, supply line, shutoff valve, and connection to either the main drain or ejector pump system.',
    ],
  },

  faqs: [
    {
      question: 'Why does my toilet keep running after I flush?',
      answer:
        'A constantly running toilet is usually caused by a worn flapper that does not seal properly, a fill valve that is set too high or has failed, or an overflow tube problem. These are inexpensive parts that a plumber can diagnose and replace quickly.',
    },
    {
      question: 'Why is there water around the base of my toilet?',
      answer:
        'Water pooling at the toilet base typically indicates a failed wax ring — the seal between the toilet and the closet flange. This requires lifting the toilet, replacing the wax ring, and resetting the toilet. If the flange itself is damaged, it may need repair or replacement first.',
    },
    {
      question: 'How do I know if I should repair or replace my toilet?',
      answer:
        'If your toilet requires frequent repairs, is over 20 years old, uses 3.5 or more gallons per flush, or has cracked porcelain, replacement is usually the better investment. A modern low-flow toilet pays for itself in water savings within a few years.',
    },
    {
      question: 'Can you install a toilet I already purchased?',
      answer:
        'Yes. We install customer-supplied toilets. Before purchasing, confirm the rough-in dimension (typically 12 inches from wall to center of the drain) so the toilet fits your existing flange location.',
    },
  ],
};
