import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const TANKLESS_WATER_HEATER: CityServiceContent = {
  serviceSlug: 'tankless-water-heater',
  serviceTitle: 'Tankless Water Heater',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Tankless Water Heater Installation and Service. Endless Hot Water, Greater Efficiency.',

  serviceHeroImage: `${CDN}/images/img_tankless-water-heater.webp`,

  seo: {
    title: 'Tankless Water Heater Services in {city} | J. Blanton Plumbing',
    description:
      'Professional tankless water heater installation and repair in {city}. On-demand hot water, lower energy bills, and 20+ year lifespan. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Tankless Water Heater Installation and Service in {city}',
    paragraphs: [
      'Tankless water heaters provide hot water on demand — no storage tank, no standby heat loss, and no running out of hot water mid-shower. J. Blanton Plumbing installs and services tankless water heaters throughout {city}, helping homeowners make the switch to a more efficient hot water system.',
      'Unlike conventional tank water heaters that keep a reservoir of water constantly heated, tankless units activate only when hot water is needed — heating water instantly as it flows through the unit. This eliminates standby energy loss and can reduce water heating costs by 24 to 34 percent for the average {city} home.',
      'Our licensed plumbers in {city} handle the complete tankless installation: selecting the correct unit capacity for your household\'s simultaneous hot water demand, installing the gas line upgrade or dedicated electrical circuit if required, mounting the unit, and connecting the water supply.',
      'We service all major tankless water heater brands: Navien, Rinnai, Noritz, Rheem, Bradford White, and others. Tankless units require annual descaling in {city}\'s moderately hard water to maintain peak performance and protect the heat exchanger.',
      'J. Blanton Plumbing has been installing and servicing tankless water heaters in {city} homes for over 30 years. We guide you through the selection process and handle the installation from start to finish.',
    ],
    image: `${CDN}/images/img_tankless-water-heater.webp`,
  },

  secondarySection: {
    heading: 'Tankless Water Heater Service in {city}: Expert Installation and Ongoing Care',
    image: '/images/manplumber.webp',
    paragraphs: [
      'Switching from a tank to a tankless water heater in {city} requires more than just swapping the unit. Our plumbers assess your home\'s gas supply capacity (tankless units draw a higher BTU rate than tanks), ventilation requirements, and water flow demand to ensure the system performs as expected.',
      'For {city} homes converting from electric tank to gas tankless — a common upgrade — we handle the gas line work, venting installation, and the permit process from start to finish.',
      'Annual maintenance for tankless water heaters in {city} includes descaling to remove mineral buildup from the heat exchanger, filter cleaning, and a full operational check. This service keeps your unit performing efficiently and extends its 20+ year lifespan.',
    ],
  },

  faqs: [
    {
      question: 'Is a tankless water heater worth it for a {city} home?',
      answer:
        'For most {city} households, yes — particularly for families with high hot water demand, homes where the tank water heater is due for replacement, and homeowners who plan to stay in the home for 5 or more years. The energy savings, longer lifespan, and elimination of tank failures make the higher upfront cost worthwhile.',
    },
    {
      question: 'Will a tankless water heater provide enough hot water for my whole house?',
      answer:
        'Properly sized, yes. We calculate your household\'s peak simultaneous hot water demand — showers, dishwasher, washing machine — and size the unit to handle it. Undersized units are the most common cause of dissatisfaction with tankless systems.',
    },
    {
      question: 'How long does tankless water heater installation take?',
      answer:
        'A standard tankless installation replacing an existing tank water heater typically takes 3 to 5 hours. Installations requiring gas line upgrades, new venting, or electrical work take longer. We provide a complete timeline before starting.',
    },
    {
      question: 'How often does a tankless water heater need maintenance?',
      answer:
        'Annual descaling is recommended in the greater Chicagoland area due to moderately hard water. We flush the heat exchanger with a descaling solution to remove mineral buildup that reduces efficiency and can eventually damage the unit.',
    },
  ],
};
