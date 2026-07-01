import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const CLOGGED_DRAINS: CityServiceContent = {
  serviceSlug: 'clogged-drains',
  serviceTitle: 'Clogged Drains',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} Clearing Clogged Drains Fast. Same-Day Service Available.',

  serviceHeroImage: `${CDN}/images/img_clogged-drains.webp`,

  seo: {
    title: 'Clogged Drain Service in {city} | J. Blanton Plumbing',
    description:
      'Professional clogged drain clearing in {city}. Fast, effective drain cleaning for sinks, showers, toilets, and main sewer lines. Same-day service. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Clear Clogged Drains in {city} — Fast and Done Right',
    paragraphs: [
      'A clogged drain is more than an annoyance — it can signal a deeper problem in your plumbing system. J. Blanton Plumbing clears clogged drains throughout {city} with professional tools and techniques that go beyond what a plunger or store-bought chemical can do.',
      'We clear clogs in every type of drain: kitchen sinks, bathroom sinks, showers, bathtubs, floor drains, laundry drains, and main sewer lines. Our licensed plumbers in {city} use drain snaking and hydro jetting to fully remove blockages — not just punch a temporary hole through them.',
      'Recurring clogs in the same drain are a warning sign. They often indicate grease accumulation, tree root intrusion in the main sewer line, or a partially collapsed pipe. We use camera inspection to diagnose stubborn or repeated clogs so you get a fix that lasts.',
      'Common causes of clogged drains in {city} homes include hair and soap scum in bathroom drains, grease and food particles in kitchen drains, and mineral scale or debris in older galvanized pipes.',
      'With over 30 years serving {city} and the greater Chicagoland area, J. Blanton Plumbing delivers fast, lasting drain clearing with upfront pricing and no hidden fees.',
    ],
    image: `${CDN}/images/img_clogged-drains.webp`,
  },

  secondarySection: {
    heading: 'Clogged Drain Services in {city}: From Sink Clogs to Main Line Backups',
    image: '/images/manplumber.webp',
    paragraphs: [
      '{city} homeowners trust J. Blanton Plumbing for clogged drain service because we fix the problem completely, not temporarily. Our plumbers bring the right equipment for every type of clog — from a simple bathroom sink blockage to a full main sewer line backup.',
      'For stubborn or recurring clogs, we offer video camera inspection to see exactly what is causing the problem inside your pipes. This lets us recommend the right solution — whether that is hydro jetting to scour pipe walls clean or a pipe repair for a damaged section.',
      'Our {city} drain clearing team is available same-day and can handle residential and commercial properties. We explain our findings clearly and give you options before any work begins.',
    ],
  },

  faqs: [
    {
      question: 'When should I call a plumber instead of trying to clear a clogged drain myself?',
      answer:
        'Call a plumber if the clog does not respond to a plunger, if multiple drains are slow or backing up simultaneously, if you notice gurgling sounds in other fixtures when water drains, or if the same drain keeps clogging despite repeated clearing.',
    },
    {
      question: 'Are chemical drain cleaners safe to use?',
      answer:
        'Chemical drain cleaners can damage older pipes, particularly galvanized steel and PVC, and are generally not effective on severe clogs. They also pose a safety risk and contribute to environmental pollution. Professional drain clearing is safer and more effective.',
    },
    {
      question: 'What is the difference between drain snaking and hydro jetting?',
      answer:
        'Drain snaking breaks up or retrieves a clog using a rotating cable. Hydro jetting uses high-pressure water to scour the entire pipe wall clean, removing grease, scale, and debris that snaking leaves behind. Jetting provides a more thorough clean for recurring problems.',
    },
    {
      question: 'How long does it take to clear a clogged drain?',
      answer:
        'Most simple drain clogs are cleared in 30 to 60 minutes. Main sewer line clogs or clogs that require camera inspection may take 1 to 2 hours. We give you a time estimate when we arrive.',
    },
  ],
};
