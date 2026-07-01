import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const BASEMENT_FLOODING: CityServiceContent = {
  serviceSlug: 'basement-flooding',
  serviceTitle: 'Basement Flooding',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} Offering Emergency Basement Flooding Services. Same-Day Service Available.',

  serviceHeroImage: `${CDN}/images/Basement-flooding.webp`,

  seo: {
    title: 'Basement Flooding Services in {city} | J. Blanton Plumbing',
    description:
      'Emergency basement flooding service in {city}. Fast water removal, sump pump repair, and flood control solutions. 24/7 availability. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Fast Basement Flooding Response in {city}',
    paragraphs: [
      'A flooded basement can cause thousands of dollars in damage within hours. J. Blanton Plumbing provides emergency basement flooding services in {city} so you can get help fast — any time of day or night.',
      'Basement flooding is often caused by sump pump failure, backed-up floor drains, sewer line surges, or foundation cracks. Our licensed plumbers in {city} quickly identify the source of the water and stop the flooding before it spreads further.',
      'We offer comprehensive flood response: water extraction, sump pump repair or replacement, drain clearing, and installation of flood control systems designed to prevent future incidents.',
      'Signs you may need immediate help include standing water in your basement, a sump pump that is running constantly or not activating at all, gurgling floor drains, or sewage odors following heavy rain.',
      'J. Blanton Plumbing has been protecting {city} homes from flooding for over 30 years. Our team arrives fully equipped and works quickly to restore safety and dry out your space.',
    ],
    image: `${CDN}/images/Basement-flooding.webp`,
  },

  secondarySection: {
    heading: 'Basement Flooding Solutions in {city}: Prevention and Emergency Response',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When {city} homeowners face a flooded basement, every minute counts. J. Blanton Plumbing dispatches licensed plumbers fast with the equipment needed to stop water intrusion and protect your property.',
      'Beyond emergency response, we install and maintain flood control systems — overhead sewers, backwater valves, and sump pump systems — that dramatically reduce the risk of future flooding in {city} homes.',
      'Whether your basement floods during heavy rain or due to a plumbing failure, our {city} team provides honest diagnostics, clear options, and lasting repairs that give you peace of mind year-round.',
    ],
  },

  faqs: [
    {
      question: 'What should I do first when my basement starts flooding?',
      answer:
        'Turn off electrical power to the basement if it is safe to do so, avoid walking through the water, and call a licensed plumber immediately. Do not attempt to operate a sump pump or electrical equipment while standing in water.',
    },
    {
      question: 'What causes basement flooding in Chicagoland homes?',
      answer:
        'Common causes include sump pump failure, clogged or overwhelmed floor drains, sewer backups during heavy rain, cracked foundation walls, and sump pits without battery backup systems. Our plumbers diagnose the root cause before recommending repairs.',
    },
    {
      question: 'Can J. Blanton Plumbing install flood control systems to prevent future flooding?',
      answer:
        'Yes. We install overhead sewer systems, backwater valves, battery backup sump pumps, and other flood control solutions specifically designed for Chicagoland homes prone to basement flooding.',
    },
    {
      question: 'How quickly can you respond to a basement flooding emergency?',
      answer:
        'We offer 24/7 emergency service with same-day response in most cases. Call us at (773) 724-9272 and our dispatch team will get a licensed plumber to your {city} home as quickly as possible.',
    },
  ],
};
