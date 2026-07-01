import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const SEWER_REPAIR: CityServiceContent = {
  serviceSlug: 'sewer-repair',
  serviceTitle: 'Sewer Repair',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Professional Sewer Repair. Same-Day Service and Emergency Response Available.',

  serviceHeroImage: `${CDN}/images/img_sewer-repair.webp`,

  seo: {
    title: 'Sewer Repair in {city} | J. Blanton Plumbing',
    description:
      'Professional sewer line repair in {city}. Traditional and trenchless sewer repair for cracked, collapsed, or root-damaged sewer lines. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Expert Sewer Repair Services in {city}',
    paragraphs: [
      'A damaged sewer line is not something that gets better on its own. J. Blanton Plumbing provides professional sewer repair throughout {city} — diagnosing line damage with video camera inspection and repairing it with the most effective and least invasive method available.',
      'Sewer line damage in {city} homes takes many forms: cracked or fractured clay pipe from soil movement, collapsed sections from deterioration, root intrusion that has grown through pipe walls, offset pipe joints from ground settling, or corrosion in older cast iron lines.',
      'We offer both traditional open-cut sewer repair and trenchless repair methods — CIPP (cured-in-place pipe lining) and pipe bursting — depending on the location, depth, and extent of the damage. Trenchless methods restore the sewer line without major excavation of your yard.',
      'Every sewer repair begins with a thorough video camera inspection to map the damage and determine the right repair approach. We explain the options clearly — including the trade-offs in cost, disruption, and longevity — before any work begins.',
      'J. Blanton Plumbing has been repairing sewer lines in {city} for over 30 years. Our licensed plumbers pull the required permits, coordinate inspections, and restore your yard or landscaping after the repair.',
    ],
    image: `${CDN}/images/img_sewer-repair.webp`,
  },

  secondarySection: {
    heading: 'Sewer Repair in {city}: Diagnosis, Options, and Lasting Solutions',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When {city} homeowners discover they have a damaged sewer line, the first question is always: how bad is it, and what will it take to fix it? J. Blanton Plumbing answers that question with a camera inspection before recommending any repair — so you know exactly what you are dealing with.',
      'For sewer line repairs that can be addressed trenchlessly, we can often complete the project with minimal disruption to your {city} yard or landscaping. Pipe lining and pipe bursting restore the line\'s full function without the cost and disruption of full excavation.',
      'When traditional repair is the right approach — particularly for severely collapsed sections or deep mainline damage — our {city} crew manages the excavation, pipe replacement, and site restoration professionally and efficiently.',
    ],
  },

  faqs: [
    {
      question: 'How do I know if my sewer line needs repair versus just cleaning?',
      answer:
        'A video camera inspection reveals the difference. A sewer line that clears with rodding but clogs again quickly likely has structural damage — root intrusion through pipe walls, a partially collapsed section, or a badly offset joint that traps debris. These require repair, not just cleaning.',
    },
    {
      question: 'What is trenchless sewer repair and is it available in {city}?',
      answer:
        'Trenchless sewer repair restores a damaged pipe from the inside without major excavation. CIPP lining installs a new pipe liner inside the old one; pipe bursting pulls a new pipe through while breaking the old one. Both methods are available in {city} and require only small access holes.',
    },
    {
      question: 'How long does sewer repair take?',
      answer:
        'Traditional excavation and pipe replacement typically takes 1 to 3 days. Trenchless repair can often be completed in a single day for a standard residential sewer line. We provide a detailed timeline before work begins.',
    },
    {
      question: 'Will my homeowner\'s insurance cover sewer line repair?',
      answer:
        'Standard homeowner\'s insurance typically does not cover sewer line repair caused by age or root intrusion. However, some policies include sewer line coverage as an add-on, and some utility companies offer sewer line protection programs. We provide documentation of the damage and repair for any insurance filing.',
    },
  ],
};
