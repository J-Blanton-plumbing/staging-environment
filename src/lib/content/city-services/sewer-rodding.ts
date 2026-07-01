import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const SEWER_RODDING: CityServiceContent = {
  serviceSlug: 'sewer-rodding',
  serviceTitle: 'Sewer Rodding',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Professional Sewer Rodding. Clear Sewer Blockages Fast — Same-Day Service Available.',

  serviceHeroImage: `${CDN}/images/img_sewer-rodding.webp`,

  seo: {
    title: 'Sewer Rodding in {city} | J. Blanton Plumbing',
    description:
      'Professional sewer rodding in {city}. Clear main sewer line blockages fast with expert rodding service from licensed plumbers. Same-day available. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Professional Sewer Rodding Services in {city}',
    paragraphs: [
      'When your main sewer line backs up, every drain in your {city} home stops working. J. Blanton Plumbing provides fast, professional sewer rodding throughout {city} — clearing blockages in the main sewer line and restoring drainage to your home.',
      'Sewer rodding uses a motorized cable — a "rod" — to break up or retrieve the blockage causing your sewer backup. Our licensed plumbers in {city} carry professional rodding equipment capable of clearing blockages deep in the sewer line, including grease accumulations, debris, and root intrusion.',
      'We perform sewer rodding for all residential and commercial properties in {city}. Whether the backup is in a 4-inch residential sewer line or a larger commercial connection, we have the right equipment for the job.',
      'After clearing the blockage, we test drainage from multiple fixtures to confirm the sewer line is fully open. For stubborn or recurring blockages, we recommend hydro jetting or a video camera inspection to identify the underlying cause.',
      'J. Blanton Plumbing has been providing sewer rodding service to {city} homeowners and businesses for over 30 years — with same-day availability and upfront pricing on every call.',
    ],
    image: `${CDN}/images/img_sewer-rodding.webp`,
  },

  secondarySection: {
    heading: 'Sewer Rodding in {city}: Fast Response, Professional Equipment',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When {city} homeowners need their sewer line cleared fast, J. Blanton Plumbing delivers. Our licensed plumbers arrive with professional rodding equipment and the experience to clear most residential sewer blockages efficiently in a single visit.',
      'Sewer rodding is often the first response to a main line backup. For lines with significant root intrusion or grease buildup that rodding alone cannot fully address, we follow with hydro jetting to scour the pipe walls clean and significantly reduce the chance of a repeat blockage.',
      'If recurring sewer backups in your {city} home are caused by structural damage to the sewer line — not just buildup — our plumbers identify this during inspection and provide repair options that solve the problem permanently.',
    ],
  },

  faqs: [
    {
      question: 'How long does sewer rodding take?',
      answer:
        'Most residential sewer rodding services are completed in 1 to 2 hours. Longer sewer lines, major root intrusion, or lines that require multiple passes may take longer. We give you a time estimate when we arrive.',
    },
    {
      question: 'Does sewer rodding damage my pipes?',
      answer:
        'Professional sewer rodding is designed to clear blockages without damaging your pipe. Our plumbers use the correct cable diameter and cutting head for your pipe size and material. We inspect the line if there is any concern about pipe condition before rodding.',
    },
    {
      question: 'How often should a main sewer line be rodded?',
      answer:
        'Homes with a history of sewer backups or mature trees near the sewer path typically benefit from annual rodding as a preventive measure. Homes without these risk factors may only need occasional service when problems arise.',
    },
    {
      question: 'What is the difference between sewer rodding and hydro jetting?',
      answer:
        'Rodding breaks up or removes the blockage using a rotating cable. Hydro jetting uses high-pressure water to scour the entire pipe wall clean — removing grease, scale, and root material that rodding leaves on the pipe surface. For recurring problems, jetting provides a more thorough and lasting result.',
    },
  ],
};
