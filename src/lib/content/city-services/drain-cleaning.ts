import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const DRAIN_CLEANING: CityServiceContent = {
  serviceSlug: 'drain-cleaning',
  serviceTitle: 'Drain Cleaning',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} Offering Professional Drain Cleaning Services. Same-Day Service Available.',

  serviceHeroImage: `${CDN}/images/img_clogged-drains.webp`,

  seo: {
    title: 'Drain Cleaning Services in {city} | J. Blanton Plumbing',
    description:
      'Professional drain cleaning in {city}. Thorough drain and sewer cleaning using snaking and hydro jetting. Same-day service available. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Professional Drain Cleaning Services in {city}',
    paragraphs: [
      'Regular drain cleaning is one of the best investments you can make in your home\'s plumbing system. J. Blanton Plumbing provides professional drain cleaning services throughout {city} — clearing everything from a slow kitchen sink to a backed-up main sewer line.',
      'Our licensed plumbers in {city} use professional drain snaking for most clogs and hydro jetting for thorough pipe cleaning that removes grease, mineral scale, and root intrusion from the pipe walls — not just the center of the pipe.',
      'We clean all residential and commercial drain lines: kitchen drains, bathroom drains, floor drains, laundry drains, roof drains, and main sewer lines. Every job is performed by a licensed plumber who can identify and address underlying problems beyond the immediate clog.',
      'Routine drain cleaning prevents the slow buildup that eventually leads to emergency backups. Many {city} homeowners schedule annual drain cleaning as part of their preventive maintenance — especially for kitchen drains prone to grease accumulation.',
      'With over 30 years of experience serving {city} and Chicagoland, J. Blanton Plumbing delivers thorough, professional drain cleaning with honest recommendations and upfront pricing.',
    ],
    image: `${CDN}/images/img_clogged-drains.webp`,
  },

  secondarySection: {
    heading: 'Drain Cleaning in {city}: Thorough, Professional, Long-Lasting',
    image: '/images/manplumber.webp',
    paragraphs: [
      'J. Blanton Plumbing is the drain cleaning service {city} homeowners and businesses call when they want the job done right. We do not just poke a hole through a clog — we clear the drain completely and inspect it to ensure it stays that way.',
      'For commercial kitchens and restaurant clients in {city}, we recommend quarterly or semi-annual drain cleaning to prevent grease trap overflow and health code violations. Our team works around your schedule to minimize disruption.',
      'After every drain cleaning service, we run water to confirm full flow has been restored and check nearby drains to ensure no connected line is affected. Our {city} plumbers do not consider the job done until everything is working properly.',
    ],
  },

  faqs: [
    {
      question: 'How often should I have my drains professionally cleaned?',
      answer:
        'For most {city} homes, annual drain cleaning for kitchen and main sewer lines is a good preventive measure. Homes with older cast iron pipes, mature trees in the yard, or a history of backups may benefit from more frequent service.',
    },
    {
      question: 'What is the difference between drain cleaning and drain clearing?',
      answer:
        'Drain clearing typically means removing an immediate clog to restore flow. Drain cleaning goes further — using hydro jetting or thorough snaking to remove buildup from pipe walls, reducing the chance of future clogs.',
    },
    {
      question: 'Can drain cleaning damage old pipes?',
      answer:
        'Professional drain cleaning is calibrated to your pipe material and condition. Our plumbers assess your pipes before recommending a method. Hydro jetting pressure is adjusted for older or fragile pipe systems to avoid any risk of damage.',
    },
    {
      question: 'Do you offer drain cleaning maintenance plans?',
      answer:
        'Yes. Through our No Drip Club, {city} homeowners receive scheduled drain maintenance, priority service, and member discounts. Regular cleanings prevent the kind of emergency backups that disrupt daily life.',
    },
  ],
};
