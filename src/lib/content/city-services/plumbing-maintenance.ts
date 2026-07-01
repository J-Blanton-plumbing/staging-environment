import type { CityServiceContent } from '@/types/city-service';

export const PLUMBING_MAINTENANCE: CityServiceContent = {
  serviceSlug: 'plumbing-maintenance',
  serviceTitle: 'Plumbing Maintenance',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} Offering Preventive Plumbing Maintenance. Protect Your Home Year-Round.',

  serviceHeroImage: '/images/manplumber.webp',

  seo: {
    title: 'Plumbing Maintenance in {city} | J. Blanton Plumbing',
    description:
      'Professional plumbing maintenance services in {city}. Annual inspections, drain cleaning, and preventive care that prevents costly emergency repairs. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Professional Plumbing Maintenance in {city}',
    paragraphs: [
      'Routine plumbing maintenance is the most cost-effective way to keep your {city} home\'s plumbing system in reliable condition. J. Blanton Plumbing provides comprehensive plumbing maintenance services that identify minor issues before they become major — and expensive — repairs.',
      'Our licensed plumbers in {city} perform thorough maintenance visits that include: inspection of all visible supply lines and shutoff valves, drain flow testing, water heater inspection, sump pump testing, toilet and faucet checks, outdoor hose bib winterization, and an overall assessment of your system\'s condition.',
      'Many {city} homeowners wait until something fails before calling a plumber — which is when repair costs are highest and water damage has often already occurred. Annual maintenance visits catch deteriorating supply lines, corroding fittings, and slow leaks before they fail completely.',
      'We also provide drain cleaning as part of our maintenance service, removing the gradual buildup in kitchen and main sewer lines that leads to backup emergencies if left unaddressed.',
      'J. Blanton Plumbing\'s No Drip Club gives {city} homeowners access to scheduled maintenance visits, priority emergency scheduling, and member discounts — a smarter way to own a home.',
    ],
    image: '/images/manplumber.webp',
  },

  secondarySection: {
    heading: 'Plumbing Maintenance in {city}: Prevention Is Always Less Expensive Than Repair',
    image: '/images/preventative.webp',
    paragraphs: [
      'The most common and costly plumbing emergencies in {city} homes are predictable — corroded supply lines, aging water heaters, and sewer lines clogged by years of unaddressed buildup. Routine maintenance catches all of these before they become disasters.',
      'J. Blanton Plumbing\'s maintenance visits in {city} are thorough, documented, and delivered by the same licensed plumbers who handle emergency repairs. You receive a written report of everything we find and recommendations for any repairs that should be addressed.',
      'For {city} homeowners with older homes — particularly those built before 1970 with galvanized pipes or cast iron drain lines — proactive maintenance is especially important. These systems age in ways that are predictable and manageable with the right professional oversight.',
    ],
  },

  faqs: [
    {
      question: 'How often should I schedule professional plumbing maintenance?',
      answer:
        'Annual plumbing maintenance is recommended for most {city} homes. Homes with aging pipes, mature trees near the sewer line, or a history of plumbing problems may benefit from semi-annual visits.',
    },
    {
      question: 'What is the No Drip Club?',
      answer:
        'The No Drip Club is J. Blanton Plumbing\'s annual maintenance membership. Members receive scheduled plumbing inspections, priority scheduling for service calls, and member discounts — keeping their {city} home\'s plumbing running smoothly year-round.',
    },
    {
      question: 'What does a plumbing maintenance visit include?',
      answer:
        'Our maintenance visits include inspection of supply lines, shutoff valves, faucets, toilets, drains, water heater, sump pump (if present), and outdoor hose bibs. We also perform drain flow testing and document all findings in a written report.',
    },
    {
      question: 'Can I skip maintenance if nothing seems wrong with my plumbing?',
      answer:
        'Many of the most damaging plumbing failures — corroded supply lines, slow sewer line clogs, water heater deterioration — show no visible signs until they fail. The absence of obvious problems is not the same as a healthy system.',
    },
  ],
};
