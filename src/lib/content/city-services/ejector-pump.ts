import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const EJECTOR_PUMP: CityServiceContent = {
  serviceSlug: 'ejector-pump',
  serviceTitle: 'Ejector Pump',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} Offering Ejector Pump Repair and Installation. Same-Day Service Available.',

  serviceHeroImage: `${CDN}/images/img_ejector-pump.webp`,

  seo: {
    title: 'Ejector Pump Repair & Installation in {city} | J. Blanton Plumbing',
    description:
      'Professional ejector pump repair and installation in {city}. Keep your below-grade bathroom and laundry functioning with expert service. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Ejector Pump Repair and Installation in {city}',
    paragraphs: [
      'If your {city} home has a basement bathroom, laundry room, or any plumbing fixture below the main sewer line, it relies on an ejector pump to move waste upward to the city sewer. When that pump fails, sewage backs up fast.',
      'J. Blanton Plumbing provides expert ejector pump repair and installation throughout {city}. Our licensed plumbers diagnose pump failures quickly — whether the issue is a burned-out motor, a clogged impeller, a failed float switch, or a cracked pit seal — and restore your system the same day in most cases.',
      'We install and service all major ejector pump brands and can upgrade an undersized or aging system to one matched to your home\'s actual waste volume and basement configuration.',
      'Common signs your {city} ejector pump needs service include: sewage odors from the basement, gurgling sounds from the pit, the pump running constantly, slow drainage in basement fixtures, or an alarm signal from your pump system.',
      'J. Blanton Plumbing has been serving {city} homeowners for over 30 years. We offer upfront pricing, same-day service on most ejector pump calls, and installation backed by our satisfaction guarantee.',
    ],
    image: `${CDN}/images/img_ejector-pump.webp`,
  },

  secondarySection: {
    heading: 'Ejector Pump Services in {city}: Protecting Your Below-Grade Plumbing',
    image: '/images/manplumber.webp',
    paragraphs: [
      'Ejector pumps in {city} homes work silently in the background — until they stop. J. Blanton Plumbing responds quickly to ejector pump failures because sewage backup is not a situation that can wait.',
      'Our {city} plumbers inspect the entire ejector system: the pump, the pit, the check valve, the vent line, and the float switch. A failing check valve, for example, can cause the pump to cycle repeatedly and burn out prematurely — something that is easy to overlook without a thorough inspection.',
      'We also install battery backup systems for ejector pumps, so your basement fixtures continue to drain even during a power outage — a smart upgrade for any {city} home with a finished basement.',
    ],
  },

  faqs: [
    {
      question: 'What is the difference between an ejector pump and a sump pump?',
      answer:
        'A sump pump removes groundwater from the sump pit to prevent flooding. An ejector pump handles sewage and wastewater from below-grade plumbing fixtures (basement toilets, sinks, and laundry) and pumps it up to the main sewer line.',
    },
    {
      question: 'How long does an ejector pump last?',
      answer:
        'A quality ejector pump typically lasts 7 to 10 years with normal use. Pumps in homes with heavy basement fixture use or that handle laundry water may have a shorter lifespan. Annual inspection helps catch wear before failure.',
    },
    {
      question: 'Why does my basement smell like sewage near the ejector pit?',
      answer:
        'Sewage odors near the ejector pit usually indicate a cracked or improperly sealed pit cover, a failed vent line, or a pit that needs cleaning. Our plumbers inspect and seal the system to eliminate the odor.',
    },
    {
      question: 'Can I install a battery backup on my existing ejector pump?',
      answer:
        'In most cases, yes. We can add a battery backup system to your existing ejector pump setup, giving you protection during power outages when basement flooding risk is highest.',
    },
  ],
};
