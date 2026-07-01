import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const WATER_FILTRATION_SYSTEMS: CityServiceContent = {
  serviceSlug: 'water-filtration-systems',
  serviceTitle: 'Water Filtration Systems',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Water Filtration System Installation. Clean Water for Your Whole Home.',

  serviceHeroImage: `${CDN}/images/img_water-filtration-system.webp`,

  seo: {
    title: 'Water Filtration System Installation in {city} | J. Blanton Plumbing',
    description:
      'Professional water filtration system installation in {city}. Whole-home filters, reverse osmosis, and water softeners installed by licensed plumbers. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Water Filtration System Installation in {city}',
    paragraphs: [
      'The quality of your home\'s water affects everything from the taste of your drinking water to the lifespan of your plumbing fixtures and appliances. J. Blanton Plumbing installs water filtration systems throughout {city} that improve water quality at the tap and throughout your home.',
      'We install all types of water filtration systems for {city} homes: whole-home sediment and carbon filters, water softeners for hard water treatment, reverse osmosis systems for drinking water purification, and combination filter and softener systems.',
      'Chicagoland water supplies vary by municipality. Some {city} homes receive water with elevated chlorine, sediment, minerals, or chloramines that affect taste, odor, and appliance performance. Water testing reveals exactly what is present — and what type of filtration system will address it most effectively.',
      'Our licensed plumbers in {city} handle the complete filtration installation: locating the best point of entry for whole-home systems, installing the filter housing, connecting supply lines, and setting up any bypass valves needed for maintenance access.',
      'J. Blanton Plumbing has been improving water quality in {city} homes for over 30 years. We help homeowners choose the right system for their water and their budget — not the most expensive option.',
    ],
    image: `${CDN}/images/img_water-filtration-system.webp`,
  },

  secondarySection: {
    heading: 'Water Filtration Systems in {city}: Better Water at Every Tap',
    image: '/images/manplumber.webp',
    paragraphs: [
      '{city} homeowners who install whole-home water filtration systems notice the difference quickly — softer skin, better-tasting water, cleaner fixtures, and extended appliance life. Hard water scale and sediment buildup are among the leading causes of premature water heater failure and appliance inefficiency.',
      'For {city} households concerned specifically about drinking water quality, we install under-sink reverse osmosis systems that remove up to 99 percent of dissolved contaminants — providing bottled water quality from the kitchen tap.',
      'Water softeners are particularly valuable in {city} areas with high mineral content. By removing calcium and magnesium, softeners prevent scale buildup in pipes, water heaters, dishwashers, and washing machines — extending the life of every water-using appliance in your home.',
    ],
  },

  faqs: [
    {
      question: 'What type of water filtration system is right for my {city} home?',
      answer:
        'The right system depends on what is in your water. A whole-home carbon filter addresses chlorine and odor. A water softener treats hard water. A reverse osmosis system provides the highest level of drinking water purification. We recommend water testing before selecting a system.',
    },
    {
      question: 'How often does a water filtration system need maintenance?',
      answer:
        'Carbon filter cartridges typically need replacement every 6 to 12 months. Reverse osmosis membrane replacement varies by water quality but is typically every 2 to 3 years. Water softener systems require periodic salt refilling. We provide a complete maintenance schedule with every installation.',
    },
    {
      question: 'Can you install a water softener to reduce scale buildup in my pipes?',
      answer:
        'Yes. Water softener installation is one of our most common water quality services in {city}. Hard water scale reduces pipe flow capacity over time and accelerates appliance wear. Softening the water throughout your home prevents new buildup and is especially beneficial for homes with older pipe systems.',
    },
    {
      question: 'Is reverse osmosis water safe for cooking and drinking?',
      answer:
        'Yes. Reverse osmosis removes the vast majority of dissolved contaminants including heavy metals, chlorine, chloramines, nitrates, and other impurities. It is widely considered one of the safest and most effective drinking water purification methods available.',
    },
  ],
};
