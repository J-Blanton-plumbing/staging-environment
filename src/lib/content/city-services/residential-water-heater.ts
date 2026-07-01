import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const RESIDENTIAL_WATER_HEATER: CityServiceContent = {
  serviceSlug: 'residential-water-heater',
  serviceTitle: 'Residential Water Heater',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Residential Water Heater Repair and Installation. Same-Day Service Available.',

  serviceHeroImage: `${CDN}/images/img_residential-water-heater.webp`,

  seo: {
    title: 'Residential Water Heater Services in {city} | J. Blanton Plumbing',
    description:
      'Residential water heater repair and installation in {city}. Fast hot water restoration, new unit installation, and same-day service. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Residential Water Heater Repair and Installation in {city}',
    paragraphs: [
      'When your {city} home runs out of hot water, J. Blanton Plumbing responds fast. We provide expert residential water heater repair and installation throughout {city} — restoring hot water quickly and helping you choose the right replacement unit when the time comes.',
      'Our licensed plumbers in {city} service all residential water heater types: standard tank water heaters (gas and electric), power-vent models, direct-vent units, and heat pump water heaters. We service all major brands and work within your existing installation space.',
      'Common water heater problems we fix for {city} homeowners include: no hot water, inconsistent water temperature, a water heater that runs out of hot water too quickly, strange popping or rumbling noises (sediment buildup), a leaking tank, and pilot light or ignition failures.',
      'When a water heater reaches the end of its life — typically 10 to 15 years for a tank unit — replacement is more cost-effective than continued repairs. We help {city} homeowners select the right capacity and efficiency rating for their household\'s needs and install the new unit quickly.',
      'J. Blanton Plumbing has been replacing and repairing residential water heaters in {city} for over 30 years. We offer same-day service on most calls and carry common water heater models for immediate installation.',
    ],
    image: `${CDN}/images/img_residential-water-heater.webp`,
  },

  secondarySection: {
    heading: 'Residential Water Heater Service in {city}: Fast, Professional, Reliable',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When {city} homeowners call us about a water heater problem, we prioritize the call — because no hot water is not a minor inconvenience. J. Blanton Plumbing dispatches a licensed plumber who arrives prepared to diagnose and repair or replace your water heater the same day in most cases.',
      'We do not push unnecessary replacements. If your {city} water heater can be repaired cost-effectively — a failed thermocouple, a burned-out heating element, or a faulty pressure relief valve — we repair it and give you more life from the unit.',
      'When replacement is the right call, we explain the options clearly: tank versus tankless, capacity sizing for your household, energy efficiency ratings, and available rebates. Our {city} plumbers install the new unit, properly dispose of the old one, and test the system before leaving.',
    ],
  },

  faqs: [
    {
      question: 'How long does a residential water heater last?',
      answer:
        'Standard tank water heaters typically last 10 to 15 years. Tankless water heaters can last 20 years or more with proper maintenance. Units in areas with hard water may have shorter lifespans due to mineral scale buildup.',
    },
    {
      question: 'Why is my water heater making a rumbling noise?',
      answer:
        'Rumbling or popping sounds from a water heater are typically caused by sediment buildup on the tank floor. As water heats, it percolates through the sediment layer, causing the noise. Flushing the tank annually reduces sediment buildup and extends heater life.',
    },
    {
      question: 'How long does water heater installation take?',
      answer:
        'Standard residential water heater replacement typically takes 2 to 3 hours — removing the old unit, installing the new one, connecting water and gas or electrical lines, and testing. We carry common models on our trucks for same-day installation.',
    },
    {
      question: 'Should I repair or replace my water heater?',
      answer:
        'If your water heater is under 8 years old and the repair is less than half the cost of replacement, repair is usually the right choice. If it is over 10 years old, requires expensive parts, or has a leaking tank, replacement is typically more economical.',
    },
  ],
};
