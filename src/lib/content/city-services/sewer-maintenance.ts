import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const SEWER_MAINTENANCE: CityServiceContent = {
  serviceSlug: 'sewer-maintenance',
  serviceTitle: 'Sewer Maintenance',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Professional Sewer Maintenance. Prevent Backups Before They Happen.',

  serviceHeroImage: `${CDN}/images/img_sewer-maintenance.webp`,

  seo: {
    title: 'Sewer Maintenance in {city} | J. Blanton Plumbing',
    description:
      'Professional sewer line maintenance in {city}. Annual rodding, camera inspection, and hydro jetting to keep your sewer system clear and functioning. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Professional Sewer Maintenance in {city}',
    paragraphs: [
      'Your home\'s sewer system works silently every day — until it doesn\'t. Routine sewer maintenance is the most effective way to prevent the backup emergencies that cause the most damage and disruption for {city} homeowners.',
      'J. Blanton Plumbing provides professional sewer maintenance services throughout {city}: annual or periodic drain rodding, hydro jetting, video camera inspection, and sewer line assessment. We keep your sewer system clear, identify developing problems early, and help you understand your line\'s long-term condition.',
      'Many sewer problems that become emergencies were developing for months or years — tree root intrusion growing slowly, grease accumulating in a kitchen drain line, or a deteriorating pipe section that eventually collapses. Proactive maintenance catches these issues while they are still manageable.',
      'We tailor our maintenance recommendations to your {city} home\'s specific situation: age and material of your sewer line, history of backups, proximity of mature trees to the sewer path, and the number of occupants. Not every home needs the same maintenance frequency.',
      'J. Blanton Plumbing has been maintaining sewer systems for {city} homeowners for over 30 years — preventing more emergencies than we respond to.',
    ],
    image: `${CDN}/images/img_sewer-maintenance.webp`,
  },

  secondarySection: {
    heading: 'Sewer Maintenance in {city}: Proactive Care That Prevents Costly Emergencies',
    image: '/images/manplumber.webp',
    paragraphs: [
      'The cost of annual sewer maintenance in {city} is a fraction of the cost of a sewer backup cleanup and emergency repair. J. Blanton Plumbing\'s maintenance service gives homeowners peace of mind heading into every storm season and every winter.',
      'Our sewer maintenance visits in {city} document the condition of your sewer line over time. When we see progressive root growth or gradual pipe deterioration in annual camera footage, we can plan a repair during a convenient time — rather than responding to an emergency at the worst possible moment.',
      'For {city} homeowners enrolled in the No Drip Club, sewer maintenance is part of a comprehensive plumbing care plan that also covers drain cleaning, water heater inspection, and overall system assessment.',
    ],
  },

  faqs: [
    {
      question: 'How often should I have my sewer line maintained?',
      answer:
        'Annual sewer rodding and inspection is recommended for most {city} homes, especially those with older clay or cast iron sewer lines, mature trees near the sewer path, or a history of backups. Some homes can extend to every 18 to 24 months.',
    },
    {
      question: 'What is included in a sewer maintenance visit?',
      answer:
        'Our sewer maintenance visits include drain rodding to clear any developing buildup, video camera inspection of the sewer line, a written report of the line\'s condition, and recommendations for any repairs identified during the inspection.',
    },
    {
      question: 'Can sewer maintenance prevent all backups?',
      answer:
        'Regular maintenance significantly reduces — but cannot completely eliminate — the risk of a sewer backup. Heavy rain events that overwhelm the city sewer system can still cause backups regardless of line condition. Flood control upgrades provide additional protection.',
    },
    {
      question: 'What is the life expectancy of a sewer line?',
      answer:
        'Clay sewer pipes common in older {city} homes typically last 50 to 60 years. Cast iron lines can last 75 to 100 years. PVC lines installed in newer homes can last 100 years or more. Condition varies based on soil conditions, root activity, and usage history.',
    },
  ],
};
