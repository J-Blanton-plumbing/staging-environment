import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const COMMERCIAL_WATER_HEATER: CityServiceContent = {
  serviceSlug: 'commercial-water-heater',
  serviceTitle: 'Commercial Water Heater',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} Servicing Commercial Water Heaters. Fast Response for Business-Critical Repairs.',

  serviceHeroImage: `${CDN}/images/img_commercial-water-heater.webp`,

  seo: {
    title: 'Commercial Water Heater Services in {city} | J. Blanton Plumbing',
    description:
      'Commercial water heater repair and installation in {city}. Fast service for restaurants, offices, and multi-unit buildings. Licensed plumbers. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Commercial Water Heater Repair and Installation in {city}',
    paragraphs: [
      'A failing water heater can shut down a restaurant, hotel, or commercial facility fast. J. Blanton Plumbing provides expert commercial water heater services in {city} — repair, replacement, and installation — with the urgency your business demands.',
      'Commercial water heaters work harder than residential units. They operate at higher demand volumes, run longer hours, and require more specialized service. Our licensed plumbers in {city} are experienced with large-capacity tank heaters, commercial tankless systems, and indirect water heaters for multi-unit and high-demand applications.',
      'We service all major commercial water heater brands and work with gas, electric, and heat pump water heating systems. Whether your {city} business needs a same-day repair or a planned replacement, we respond quickly and work around your schedule to minimize downtime.',
      'Signs your commercial water heater needs service: inconsistent water temperature, higher than expected utility bills, discolored or rusty water, unusual noises from the unit, or visible corrosion and leaking.',
      'J. Blanton Plumbing has been the trusted plumbing partner for {city} businesses for over 30 years — delivering licensed, insured service with upfront pricing and no surprise charges.',
    ],
    image: `${CDN}/images/img_commercial-water-heater.webp`,
  },

  secondarySection: {
    heading: 'Commercial Water Heater Service in {city}: Keeping Your Business Running',
    image: '/images/manplumber.webp',
    paragraphs: [
      'For {city} businesses, a water heater failure is not just an inconvenience — it can mean lost revenue, failed health inspections, or unhappy guests and tenants. J. Blanton Plumbing prioritizes commercial calls and dispatches experienced plumbers who understand the stakes.',
      'We handle commercial water heater projects of all sizes: single-unit restaurants, multi-story apartment buildings, office complexes, and industrial facilities. Our {city} team sizes systems correctly for your actual hot water demand so you are never left short.',
      'Preventive maintenance contracts are available for {city} businesses that want to avoid emergency breakdowns. Regular flushing, anode rod inspection, and component checks extend heater life and keep your system compliant with health and safety codes.',
    ],
  },

  faqs: [
    {
      question: 'How is a commercial water heater different from a residential one?',
      answer:
        'Commercial water heaters have higher BTU ratings, larger storage capacity, faster recovery rates, and are built for continuous high-demand use. They require more specialized installation and maintenance than residential units.',
    },
    {
      question: 'Can you repair our commercial water heater the same day we call?',
      answer:
        'In most cases, yes. We prioritize commercial service calls and carry common commercial water heater parts on our trucks. For complex repairs or parts that need to be ordered, we provide a clear timeline.',
    },
    {
      question: 'How often should a commercial water heater be serviced?',
      answer:
        'Commercial water heaters should be inspected and flushed at least annually. High-use environments like restaurants and hotels benefit from semi-annual maintenance to prevent sediment buildup, corrosion, and premature failure.',
    },
    {
      question: 'What size commercial water heater does my business need?',
      answer:
        'Sizing depends on your peak hourly hot water demand, the type of business, and the number of fixtures. Our plumbers perform a load calculation to recommend the correct unit — preventing both undersized systems that can\'t keep up and oversized units that waste energy.',
    },
  ],
};
