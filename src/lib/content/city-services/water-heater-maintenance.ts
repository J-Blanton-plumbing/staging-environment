import type { CityServiceContent } from '@/types/city-service';

export const WATER_HEATER_MAINTENANCE: CityServiceContent = {
  serviceSlug: 'water-heater-maintenance',
  serviceTitle: 'Water Heater Maintenance',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Water Heater Maintenance. Extend Your Heater\'s Life and Prevent Failures.',

  serviceHeroImage: '/images/manplumber.webp',

  seo: {
    title: 'Water Heater Maintenance in {city} | J. Blanton Plumbing',
    description:
      'Professional water heater maintenance in {city}. Annual flushing, anode rod inspection, and safety check to extend your water heater\'s life. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Professional Water Heater Maintenance in {city}',
    paragraphs: [
      'Regular water heater maintenance extends the life of your unit, maintains efficiency, and prevents the kind of failures that leave your {city} home without hot water. J. Blanton Plumbing provides professional water heater maintenance throughout {city} — for tank and tankless systems.',
      'Annual tank water heater maintenance in {city} includes: flushing sediment from the tank bottom, inspecting the anode rod (the sacrificial component that prevents tank corrosion), testing the T&P relief valve, checking the burner or heating element, and verifying thermostat accuracy.',
      'Sediment buildup is the most common cause of premature water heater failure in {city} homes. Minerals in the water supply settle at the bottom of the tank over time — reducing efficiency, causing the rumbling sounds homeowners often hear, and accelerating corrosion of the tank floor.',
      'Tankless water heater maintenance in {city} focuses on descaling the heat exchanger, cleaning inlet filters, and testing all safety controls. In Chicagoland\'s moderately hard water, annual descaling is essential to prevent mineral buildup that reduces performance and can permanently damage the heat exchanger.',
      'J. Blanton Plumbing has been maintaining water heaters for {city} homeowners for over 30 years. Our maintenance service is affordable insurance against the expense and inconvenience of a failed water heater.',
    ],
    image: '/images/manplumber.webp',
  },

  secondarySection: {
    heading: 'Water Heater Maintenance in {city}: Prevent Failures, Extend Life',
    image: '/images/manplumber.webp',
    paragraphs: [
      'Water heaters that receive annual maintenance in {city} routinely last several years longer than neglected units. The annual anode rod inspection alone — an inexpensive procedure — can add 5 to 10 years to the life of a tank water heater by preventing internal corrosion.',
      'Our {city} maintenance visits also serve as an early warning system. Our plumbers inspect for signs of early-stage tank corrosion, failing components, or potential code compliance issues — finding problems when they are easy and inexpensive to address rather than after they cause a failure.',
      'For {city} homeowners enrolled in the No Drip Club, water heater maintenance is part of a comprehensive annual plumbing service that also covers drain inspection and overall system assessment.',
    ],
  },

  faqs: [
    {
      question: 'How often should a water heater be flushed?',
      answer:
        'Annual flushing is recommended for most {city} homes. Homes with very hard water or older water heaters may benefit from flushing every 6 months. Flushing removes sediment that reduces efficiency and accelerates tank deterioration.',
    },
    {
      question: 'What is an anode rod and why does it matter?',
      answer:
        'An anode rod is a magnesium or aluminum rod inside the tank that sacrifices itself to corrosion — protecting the steel tank walls. When the anode rod is depleted, the tank begins to corrode from the inside. Inspecting and replacing the anode rod every 3 to 5 years can double your water heater\'s lifespan.',
    },
    {
      question: 'My water heater makes a popping sound — does it need maintenance?',
      answer:
        'Yes. Popping or rumbling sounds from a water heater indicate sediment buildup on the tank floor. As water heats and percolates through the sediment layer, it creates the noise. Annual flushing removes the sediment and quiets the unit.',
    },
    {
      question: 'Can maintenance prevent my water heater from leaking?',
      answer:
        'Regular maintenance cannot prevent a tank that has already corroded through from leaking, but it significantly delays the corrosion process. A water heater that is properly maintained from installation will reach the end of its designed lifespan before leaking — rather than failing prematurely.',
    },
  ],
};
