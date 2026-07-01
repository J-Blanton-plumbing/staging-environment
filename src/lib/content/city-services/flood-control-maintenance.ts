import type { CityServiceContent } from '@/types/city-service';

export const FLOOD_CONTROL_MAINTENANCE: CityServiceContent = {
  serviceSlug: 'flood-control-maintenance',
  serviceTitle: 'Flood Control Maintenance',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} Maintaining Flood Control Systems. Keep Your System Ready Before the Next Storm.',

  serviceHeroImage: '/images/manplumber.webp',

  seo: {
    title: 'Flood Control Maintenance in {city} | J. Blanton Plumbing',
    description:
      'Professional flood control system maintenance in {city}. Sump pump testing, backwater valve inspection, and overhead sewer service. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Flood Control Maintenance Services in {city}',
    paragraphs: [
      'Flood control systems are only effective if they are properly maintained. J. Blanton Plumbing provides comprehensive flood control maintenance services throughout {city} — ensuring your sump pumps, backwater valves, overhead sewers, and drainage systems are ready to perform when heavy rain arrives.',
      'Chicagoland\'s combined sewer system frequently overwhelms city capacity during major storms, sending water back up through floor drains and toilets in {city} homes without proper flood control protection. Annual maintenance is the best way to ensure your system does not fail when you need it most.',
      'Our flood control maintenance visits in {city} include: sump pump testing and float inspection, battery backup system verification, backwater valve cleaning and operation test, check valve inspection, catch basin cleaning, and a complete system evaluation.',
      'We also identify system components that are approaching the end of their service life so you can replace them proactively — before a storm reveals a problem at the worst possible time.',
      'J. Blanton Plumbing has been protecting {city} homes from basement flooding for over 30 years. Our maintenance service gives you confidence heading into every storm season.',
    ],
    image: '/images/manplumber.webp',
  },

  secondarySection: {
    heading: 'Flood Control Maintenance in {city}: Protect Your Home Before the Storm',
    image: '/images/manplumber.webp',
    paragraphs: [
      'Many {city} homeowners invest in a flood control system and then forget about it — until a major storm reveals that the sump pump battery is dead or the backwater valve is jammed. J. Blanton Plumbing offers annual and semi-annual maintenance plans to prevent exactly that scenario.',
      'Our maintenance service is not a quick visual check — it is a thorough operational test of every component. We run the sump pump, verify the backup system activates, test the backwater valve, and inspect the entire system for wear, corrosion, or debris.',
      'If we find components that need replacement during a maintenance visit in {city}, we provide an immediate quote and can often complete the repair the same day — so your flood control system is back to full strength before you need it.',
    ],
  },

  faqs: [
    {
      question: 'How often should a flood control system be maintained?',
      answer:
        'Annual maintenance is recommended for most {city} homes. Homes in low-lying areas or with older systems benefit from semi-annual inspections, particularly before spring storm season and before winter.',
    },
    {
      question: 'What is included in a flood control maintenance visit?',
      answer:
        'Our maintenance visits include sump pump testing, float switch inspection, battery backup verification, backwater valve cleaning and function test, check valve inspection, and a complete system evaluation with a written report.',
    },
    {
      question: 'My sump pump ran during the last storm — does it still need maintenance?',
      answer:
        'Yes. A pump that ran during a storm may have experienced motor stress, and its battery backup may have depleted charge it has not recovered. A post-storm inspection confirms the system is ready for the next event.',
    },
    {
      question: 'Can you maintain flood control systems you did not install?',
      answer:
        'Yes. We service all flood control system brands and configurations, regardless of who installed them. Our plumbers assess the existing system, document its components, and provide recommendations based on its current condition.',
    },
  ],
};
