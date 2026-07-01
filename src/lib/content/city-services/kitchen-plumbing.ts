import type { CityServiceContent } from '@/types/city-service';

export const KITCHEN_PLUMBING: CityServiceContent = {
  serviceSlug: 'kitchen-plumbing',
  serviceTitle: 'Kitchen Plumbing',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} Offering Expert Kitchen Plumbing Services. Same-Day Service Available.',

  serviceHeroImage: '/images/sub-kitchen-plumbing.webp',

  seo: {
    title: 'Kitchen Plumbing Services in {city} | J. Blanton Plumbing',
    description:
      'Professional kitchen plumbing in {city}. Faucet repair, drain clearing, garbage disposal, leak repair, and kitchen remodel plumbing. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Expert Kitchen Plumbing Services in {city}',
    paragraphs: [
      'The kitchen is the heart of your home — and its plumbing works harder than almost any other system. J. Blanton Plumbing provides comprehensive kitchen plumbing services throughout {city}, handling everything from a dripping faucet to full remodel rough-in.',
      'Our licensed plumbers in {city} repair and install kitchen faucets, garbage disposals, dishwasher connections, sink drains, supply lines, shutoff valves, water filtration connections, and pot filler faucets. We handle both minor repairs and complete fixture overhauls.',
      'Kitchen drain clogs are among the most common plumbing calls we receive in {city}. Grease, food particles, and soap residue accumulate in kitchen drain lines over time, eventually causing slow drains or complete backups. Our drain snaking and hydro jetting services clear these clogs completely.',
      'If you are remodeling your {city} kitchen, our plumbers handle all rough-in plumbing for new sink locations, island plumbing, added fixture connections, and appliance hookups — coordinating with your general contractor to keep the project on schedule.',
      'J. Blanton Plumbing has served {city} homeowners and businesses for over 30 years with honest kitchen plumbing service, upfront pricing, and same-day availability for most calls.',
    ],
    image: '/images/sub-kitchen-plumbing.webp',
  },

  secondarySection: {
    heading: 'Kitchen Plumbing in {city}: Repairs, Installations, and Remodels',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When {city} homeowners need kitchen plumbing help, J. Blanton Plumbing is the team they call. We handle every kitchen plumbing need from a simple faucet repair to a complete kitchen plumbing overhaul during a renovation.',
      'We inspect all components of your kitchen plumbing system during every service call — not just the immediate issue. Corroded supply lines, aging shutoff valves, and deteriorated p-traps are easy to address when caught early and costly when they fail unexpectedly.',
      'For commercial kitchens in {city}, we provide grease trap service, high-flow drain clearing, commercial faucet installation, and dish machine plumbing — all from licensed plumbers who understand the demands of a professional kitchen environment.',
    ],
  },

  faqs: [
    {
      question: 'Why does my kitchen sink drain slowly even after I cleared the visible clog?',
      answer:
        'A slow kitchen drain that persists after clearing often indicates grease buildup further down the drain line, where simple snaking cannot reach. Hydro jetting thoroughly cleans the pipe walls and is the most effective solution for recurring kitchen drain slowdowns.',
    },
    {
      question: 'My dishwasher is not draining — is that a plumbing issue?',
      answer:
        'Often yes. A dishwasher that does not drain can indicate a clogged drain line connection, a problem with the drain hose routing, or a clogged garbage disposal knockout plug (on new disposal installations). Our plumbers diagnose the cause and fix it.',
    },
    {
      question: 'Can you add a second sink or a pot filler during a kitchen remodel?',
      answer:
        'Yes. We run new supply and drain lines for additional kitchen fixtures during remodels. Pot fillers require a dedicated hot water supply line behind the wall above the range. We handle both the rough-in and the finished installation.',
    },
    {
      question: 'How do I prevent kitchen drain clogs?',
      answer:
        'Avoid pouring grease or cooking oils down the drain. Use a strainer to catch food particles. Run hot water for 30 seconds after each use. Annual professional drain cleaning removes the gradual buildup that causes emergency clogs.',
    },
  ],
};
