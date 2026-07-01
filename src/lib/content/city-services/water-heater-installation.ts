import type { CityServiceContent } from '@/types/city-service';

export const WATER_HEATER_INSTALLATION: CityServiceContent = {
  serviceSlug: 'water-heater-installation',
  serviceTitle: 'Water Heater Installation',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Water Heater Installation. Same-Day Installation Available.',

  serviceHeroImage: '/images/manplumber.webp',

  seo: {
    title: 'Water Heater Installation in {city} | J. Blanton Plumbing',
    description:
      'Professional water heater installation in {city}. Tank and tankless water heater installation, replacement, and upgrades by licensed plumbers. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Expert Water Heater Installation in {city}',
    paragraphs: [
      'Whether you are replacing a failed water heater or upgrading to a more efficient system, J. Blanton Plumbing provides expert water heater installation throughout {city} — with same-day service available on most installation calls.',
      'Our licensed plumbers in {city} install all types of water heaters: standard tank water heaters (gas and electric), power-vent and direct-vent models, tankless on-demand systems, hybrid heat pump water heaters, and high-efficiency condensing units.',
      'Water heater installation involves more than connecting the unit — proper installation requires correctly sizing the supply and relief connections, installing a new T&P valve, confirming proper venting, setting the thermostat, and pressure-testing all connections before the unit is put into service.',
      'When replacing an existing water heater in your {city} home, we assess the existing installation for code compliance and recommend upgrades if needed — such as a seismic strap, proper clearances, or an expansion tank required by newer local codes.',
      'J. Blanton Plumbing carries popular water heater models on our trucks for same-day installation in {city}. We remove and properly dispose of the old unit and leave the installation site clean.',
    ],
    image: '/images/manplumber.webp',
  },

  secondarySection: {
    heading: 'Water Heater Installation in {city}: The Right Unit, Installed Right',
    image: '/images/manplumber.webp',
    paragraphs: [
      'Choosing the right water heater for your {city} home is about more than the upfront price. Capacity, fuel type, efficiency rating, and available space all factor into which unit is the best long-term choice for your household. J. Blanton Plumbing helps you navigate these decisions clearly.',
      'We install water heaters for all {city} household sizes — from a compact 30-gallon unit for a small home to a high-capacity 80-gallon tank or a whole-home tankless system for large families with simultaneous hot water demands.',
      'After installation, we test the unit through a full heating cycle, verify temperature setting, check all connections, and confirm that the T&P valve operates correctly before leaving your {city} home. We also register the manufacturer warranty on your behalf.',
    ],
  },

  faqs: [
    {
      question: 'How do I choose between a tank and tankless water heater?',
      answer:
        'Tank water heaters have a lower upfront cost and are simpler to install. Tankless units cost more initially but have lower operating costs, a 20+ year lifespan versus 10 to 15 years for tanks, and provide endless hot water. Our plumbers help you compare total cost of ownership for your {city} household.',
    },
    {
      question: 'What size water heater do I need?',
      answer:
        'Sizing depends on household size and peak hot water usage. A 40 to 50 gallon tank is suitable for most 2 to 4 person households. Larger families or homes with multiple simultaneous hot water demands benefit from 75 to 80 gallon tanks or a properly sized tankless unit.',
    },
    {
      question: 'How long does water heater installation take?',
      answer:
        'Standard water heater replacement typically takes 2 to 3 hours. Tankless installation, which often requires gas line modifications and new venting, typically takes 4 to 6 hours. We provide a timeline before starting.',
    },
    {
      question: 'Is a permit required for water heater installation in {city}?',
      answer:
        'Many {city} municipalities require permits for water heater replacement, particularly for gas units and for new water heater installations in locations where one did not previously exist. Our plumbers handle the permit process when required.',
    },
  ],
};
