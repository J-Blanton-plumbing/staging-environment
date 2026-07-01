import type { CityServiceContent } from '@/types/city-service';

export const LEAK_REPAIRS: CityServiceContent = {
  serviceSlug: 'leak-repairs',
  serviceTitle: 'Leak Repairs',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Water Leak Detection and Repair. Same-Day Service Available.',

  serviceHeroImage: '/images/manplumber.webp',

  seo: {
    title: 'Water Leak Repair in {city} | J. Blanton Plumbing',
    description:
      'Professional water leak detection and repair in {city}. Fix leaking pipes, fixtures, and connections fast before water damage spreads. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Water Leak Detection and Repair in {city}',
    paragraphs: [
      'Even a small water leak can cause significant damage to your {city} home — rotting wood, promoting mold growth, and raising your water bill month after month. J. Blanton Plumbing provides fast leak detection and repair throughout {city} to stop water damage before it spreads.',
      'Our licensed plumbers in {city} locate and repair leaks in supply lines, drain pipes, fixture connections, shutoff valves, appliance hoses, and sewer laterals. We use pressure testing and, where needed, specialized leak detection equipment to find hidden leaks in walls, ceilings, and under slabs.',
      'Common signs of a hidden water leak in your {city} home include: an unexpectedly high water bill, water stains on walls or ceilings, warped flooring or cabinets, musty odors in rooms without obvious moisture, or a water meter that runs when all fixtures are off.',
      'We repair leaks in all pipe materials: copper, galvanized steel, PVC, CPVC, and PEX. Depending on the extent of damage, we repair the specific leak point or replace the affected pipe section entirely to prevent recurrence.',
      'J. Blanton Plumbing has been repairing water leaks for {city} homeowners for over 30 years. We work quickly, minimize any necessary wall or floor access, and leave your home clean when the job is done.',
    ],
    image: '/images/manplumber.webp',
  },

  secondarySection: {
    heading: 'Leak Repair Services in {city}: Find It, Fix It, Protect Your Home',
    image: '/images/manplumber.webp',
    paragraphs: [
      'Water leaks that go undetected in {city} homes are the source of the most preventable — and most expensive — plumbing damage. J. Blanton Plumbing makes leak detection and repair a priority, using professional methods to locate hidden leaks before water damage compounds.',
      'For leaks inside walls or under slabs, we use acoustic leak detection and thermal imaging referrals to narrow down the leak location before opening any surface. This minimizes the amount of wall, floor, or ceiling access required to reach and repair the pipe.',
      'After completing a leak repair in your {city} home, we test the repaired section and inspect surrounding pipes for additional wear. We also provide recommendations for preventing future leaks based on what we observe during the repair.',
    ],
  },

  faqs: [
    {
      question: 'How do I know if I have a hidden water leak?',
      answer:
        'Signs of a hidden leak include: a water bill that has increased without explanation, the sound of running water when all fixtures are off, water stains or bubbling paint on walls or ceilings, soft or buckled flooring, and musty smells in enclosed spaces.',
    },
    {
      question: 'Can you find a leak without cutting into my walls?',
      answer:
        'We use non-invasive methods whenever possible — pressure testing, acoustic detection, and in some cases thermal imaging — to narrow down leak location before any wall access is required. Most leaks can be found and isolated before we need to open a surface.',
    },
    {
      question: 'How quickly should I address a water leak?',
      answer:
        'As quickly as possible. Even a small, slow leak causes cumulative damage — saturating insulation, rotting framing, and creating conditions for mold within 24 to 48 hours in enclosed spaces. Call us when you first notice a sign of a leak.',
    },
    {
      question: 'Will my insurance cover the leak repair and resulting damage?',
      answer:
        'Most homeowner\'s insurance policies cover sudden and accidental water damage from a pipe failure. Gradual leaks that were ignored over time may not be covered. We can provide documentation of the repair to support your insurance claim.',
    },
  ],
};
