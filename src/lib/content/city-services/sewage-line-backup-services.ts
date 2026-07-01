import type { CityServiceContent } from '@/types/city-service';

export const SEWAGE_LINE_BACKUP_SERVICES: CityServiceContent = {
  serviceSlug: 'sewage-line-backup-services',
  serviceTitle: 'Sewage Line Backup Services',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Emergency Sewage Line Backup Service. 24/7 Response Available.',

  serviceHeroImage: '/images/manplumber.webp',

  seo: {
    title: 'Sewage Line Backup Service in {city} | J. Blanton Plumbing',
    description:
      'Emergency sewage line backup service in {city}. Fast response to clear sewer backups, protect your home, and restore proper drainage. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Sewage Line Backup Services in {city}',
    paragraphs: [
      'A sewage line backup is one of the most urgent plumbing emergencies a {city} homeowner can face — and one of the messiest. J. Blanton Plumbing provides 24/7 sewage line backup response throughout {city}, clearing the blockage fast and identifying the underlying cause.',
      'Sewage backups in {city} homes are often triggered by a combination of factors: a partially blocked main sewer line that gets overwhelmed during heavy rain, tree root intrusion that has built up over years, or a grease accumulation that finally closes the line completely.',
      'When a sewage backup occurs, every drain in your home is affected. Running water from any fixture makes the situation worse. Our first priority is getting a licensed plumber to your {city} home quickly to stop the backup and restore drainage before additional damage occurs.',
      'We clear sewage line backups using professional drain rodding and hydro jetting. After clearing the immediate blockage, we perform a video camera inspection to determine the underlying cause — whether that is root intrusion, a collapsed pipe section, or a chronic grease problem that requires a cleaning schedule.',
      'J. Blanton Plumbing has been responding to sewage line backups in {city} for over 30 years. We treat every backup call as the emergency it is — with fast dispatch and the right equipment.',
    ],
    image: '/images/manplumber.webp',
  },

  secondarySection: {
    heading: 'Sewage Backup Services in {city}: Emergency Response and Root Cause Resolution',
    image: '/images/manplumber.webp',
    paragraphs: [
      '{city} homeowners who call J. Blanton Plumbing for a sewage backup get more than a cleared drain — they get a full assessment of why the backup occurred and what can be done to prevent it from happening again.',
      'Many sewage backups in {city} are preventable with the right combination of annual drain cleaning, camera inspection, and flood control upgrades like overhead sewer systems or backwater valves. We help homeowners understand their risk and take action before the next storm.',
      'After clearing the sewage backup, we provide thorough documentation of our findings — including camera footage of the sewer line — which can be valuable for insurance claims and for understanding the long-term condition of your {city} home\'s sewer system.',
    ],
  },

  faqs: [
    {
      question: 'What should I do immediately when I notice a sewage backup?',
      answer:
        'Stop using all water in the home — do not run faucets, flush toilets, or use appliances that drain. Call a licensed plumber immediately. If sewage is visible in the basement, avoid contact and call for cleanup assistance along with the plumber.',
    },
    {
      question: 'Why does my basement backup during heavy rain?',
      answer:
        'During heavy rain, the city sewer system can become overwhelmed and surcharge — pushing water back through the lowest drains in your home. This is a common problem in older Chicagoland neighborhoods. Flood control systems like backwater valves and overhead sewers prevent this.',
    },
    {
      question: 'How do you clear a major sewage line backup?',
      answer:
        'We use professional drain rodding to break up and remove the primary blockage, followed by hydro jetting to thoroughly clean the pipe walls. A video camera inspection after clearing confirms the line is fully open and identifies any structural issues.',
    },
    {
      question: 'Can sewage backups damage my home\'s plumbing system?',
      answer:
        'Repeated sewage backups can cause pipe erosion and accelerate deterioration of older clay and cast iron sewer lines. They also create health hazards from sewage exposure. Addressing the root cause prevents future incidents and protects your home.',
    },
  ],
};
