import type { CityServiceContent } from '@/types/city-service';

export const FAUCET_INSTALLATION_REPAIR: CityServiceContent = {
  serviceSlug: 'faucet-installation-repair',
  serviceTitle: 'Faucet Installation & Repair',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Faucet Installation and Repair. Same-Day Service Available.',

  serviceHeroImage: '/images/manplumber.webp',

  seo: {
    title: 'Faucet Installation & Repair in {city} | J. Blanton Plumbing',
    description:
      'Professional faucet installation and repair in {city}. Fix leaks, replace old faucets, or upgrade to a new fixture. Licensed plumbers, upfront pricing. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Expert Faucet Installation and Repair in {city}',
    paragraphs: [
      'A dripping faucet is more than an annoyance — a single leaking faucet can waste thousands of gallons of water per year. J. Blanton Plumbing handles all faucet installation and repair needs in {city}, from fixing a drip to upgrading to a new fixture.',
      'Our licensed plumbers in {city} repair and install all types of faucets: kitchen faucets, bathroom sink faucets, shower and tub faucets, outdoor hose bibs, and utility sink faucets. We work with all brands and finishes.',
      'Common faucet problems we resolve for {city} homeowners include: dripping or running faucets, low water pressure, handles that spin without shutting off water, corroded or mineral-stained fixtures, and faucets that have simply reached the end of their lifespan.',
      'Faucet replacement is also a fast, affordable way to update a bathroom or kitchen\'s appearance. We can install a fixture you select in advance, or help you choose a quality option that fits your home and budget.',
      'J. Blanton Plumbing has provided expert faucet services to {city} homeowners for over 30 years — always with honest assessments, upfront pricing, and quality workmanship.',
    ],
    image: '/images/manplumber.webp',
  },

  secondarySection: {
    heading: 'Faucet Services in {city}: From Quick Repairs to Full Fixture Upgrades',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When {city} homeowners call J. Blanton Plumbing for a faucet repair, we do not just fix the immediate symptom — we inspect the supply lines, shutoff valves, and nearby pipes to make sure the entire fixture installation is sound.',
      'Older faucets in {city} homes often develop internal wear in the cartridge, O-rings, or seat washers. In many cases, these internal components can be replaced at a fraction of the cost of a full fixture replacement — restoring a quality faucet to like-new condition.',
      'For {city} homeowners planning a kitchen or bathroom remodel, our plumbers provide faucet installation as part of a broader fixture package — coordinating with your timeline to ensure new faucets are installed correctly the first time.',
    ],
  },

  faqs: [
    {
      question: 'How do I know if my faucet can be repaired or should be replaced?',
      answer:
        'A licensed plumber can assess the faucet\'s condition and repair cost versus replacement cost. Generally, a quality faucet less than 15 years old is worth repairing if the underlying issue is a worn cartridge or O-ring. Older or low-quality faucets are often more economical to replace.',
    },
    {
      question: 'Can you install a faucet I purchased myself?',
      answer:
        'Yes. We install customer-supplied faucets. We recommend confirming the faucet is compatible with your sink\'s existing holes and configuration before purchasing.',
    },
    {
      question: 'Why does my faucet have low water pressure after a recent repair?',
      answer:
        'Low pressure after a repair often indicates aerator clogging from dislodged mineral deposits, or a partially closed shutoff valve. Our plumbers check both before concluding any faucet service.',
    },
    {
      question: 'How long does faucet installation take?',
      answer:
        'Standard faucet replacement — removing the old fixture and installing a new one — typically takes 1 to 2 hours. Installations requiring new supply line connections or shutoff valve replacement may take slightly longer.',
    },
  ],
};
