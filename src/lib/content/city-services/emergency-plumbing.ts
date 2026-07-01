import type { CityServiceContent } from '@/types/city-service';

export const EMERGENCY_PLUMBING: CityServiceContent = {
  serviceSlug: 'emergency-plumbing',
  serviceTitle: 'Emergency Plumbing',

  heroCallout:
    '24/7 Emergency Plumbers in {city} — Fast Response When You Need It Most. Call Now.',

  serviceHeroImage: '/images/img_emergency-plumbing.webp',

  seo: {
    title: '24/7 Emergency Plumbing in {city} | J. Blanton Plumbing',
    description:
      '24/7 emergency plumbing service in {city}. Burst pipes, sewer backups, gas leaks, flooding — our licensed plumbers respond fast. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: '24/7 Emergency Plumbing Service in {city}',
    paragraphs: [
      'Plumbing emergencies do not wait for business hours. J. Blanton Plumbing provides 24/7 emergency plumbing service throughout {city} — with real licensed plumbers dispatched any time of day or night, including weekends and holidays.',
      'We respond to all types of plumbing emergencies in {city}: burst pipes, major water leaks, sewer backups, gas line issues, failed sump pumps, basement flooding, and water heater failures. When you call, you reach a real person — not an answering service.',
      'Our emergency plumbers in {city} arrive in fully equipped trucks stocked with the parts and tools needed to handle most emergencies in a single visit. We diagnose the problem, explain your options clearly, and get to work immediately.',
      'A plumbing emergency that is left unaddressed for even a few hours can result in tens of thousands of dollars in structural damage. Fast response is not just about convenience — it is about protecting your home.',
      'J. Blanton Plumbing has been {city}\'s trusted emergency plumbing service for over 30 years. We offer upfront pricing even in emergency situations — no inflated after-hours rates, no surprise fees.',
    ],
    image: '/images/img_emergency-plumbing.webp',
  },

  secondarySection: {
    heading: 'Emergency Plumbing in {city}: Fast Response, Licensed Plumbers',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When a plumbing emergency strikes your {city} home, you need a team that acts as fast as the situation demands. J. Blanton Plumbing maintains 24/7 dispatch so a licensed plumber can be on the way within minutes of your call.',
      'Our {city} emergency plumbing team handles the full range of urgent situations: we stop active leaks, clear major sewer backups, restore water service after pipe failures, and address gas line concerns — all with the licensing and insurance your situation requires.',
      'After the emergency is resolved, we provide a complete assessment of your plumbing system to identify any related issues that should be addressed before they become the next emergency. Our goal is to leave your {city} home more secure than we found it.',
    ],
  },

  faqs: [
    {
      question: 'What counts as a plumbing emergency?',
      answer:
        'Any plumbing situation that poses an immediate risk to your home, health, or safety is an emergency. This includes burst or leaking pipes, sewer backups, gas leaks, complete loss of water service, flooding, and water heater failures that leave your home without hot water.',
    },
    {
      question: 'Do you charge extra for after-hours emergency service?',
      answer:
        'We provide upfront pricing before any work begins, including after-hours calls. We do not inflate emergency service rates — the price you are quoted is the price you pay.',
    },
    {
      question: 'What should I do while waiting for the emergency plumber?',
      answer:
        'Turn off the main water supply if you have an active leak. For gas leaks, leave the building immediately and call 911 before calling a plumber. For sewer backups, avoid running water or flushing toilets until the plumber arrives.',
    },
    {
      question: 'Can you respond to plumbing emergencies in commercial buildings?',
      answer:
        'Yes. We respond to commercial plumbing emergencies in {city} including restaurants, apartment buildings, offices, and retail properties. We understand the urgency of keeping a business operational.',
    },
  ],
};
