import type { CityServiceContent } from '@/types/city-service';

export const CATCH_BASIN: CityServiceContent = {
  serviceSlug: 'catch-basin',
  serviceTitle: 'Catch Basin',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} Offering Catch Basin Cleaning and Repair. Same-Day Service Available.',

  serviceHeroImage: '/images/manplumber.webp',

  seo: {
    title: 'Catch Basin Cleaning & Repair in {city} | J. Blanton Plumbing',
    description:
      'Professional catch basin cleaning and repair in {city}. Prevent yard flooding and drainage failures with expert service. Licensed plumbers. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Catch Basin Cleaning and Repair in {city}',
    paragraphs: [
      'Catch basins — the underground drainage structures in your yard or driveway — play a critical role in keeping your {city} property free from standing water and flooding. When they become clogged with debris, silt, and sediment, water has nowhere to go.',
      'J. Blanton Plumbing provides professional catch basin cleaning and repair services throughout {city}. Our plumbers remove accumulated debris, clear the outlet line, and inspect the basin structure for cracks, root intrusion, or damage that could cause drainage failures.',
      'A neglected catch basin can overflow during heavy rain, causing yard flooding, basement intrusion, driveway damage, and erosion. Regular cleaning — typically every one to three years — keeps your drainage system working as intended.',
      'Signs your {city} catch basin needs service include: standing water in your yard after rain that takes longer than 24 hours to drain, visible debris or sediment buildup in the grate opening, a foul odor from the basin, or water pooling near your driveway or foundation.',
      'J. Blanton Plumbing has been maintaining drainage systems for {city} homeowners for over 30 years. Our team arrives with the right equipment to clean and inspect your catch basin thoroughly in a single visit.',
    ],
    image: '/images/manplumber.webp',
  },

  secondarySection: {
    heading: 'Catch Basin Services in {city}: Cleaning, Repair, and Inspection',
    image: '/images/manplumber.webp',
    paragraphs: [
      'Catch basin maintenance is an often-overlooked part of home plumbing care in {city}. J. Blanton Plumbing helps homeowners stay ahead of drainage problems with thorough cleaning and structural inspections that identify issues before they become emergencies.',
      'We use high-pressure water jetting to clean the outlet pipe and remove compacted sediment from the basin floor. If we find cracks, deteriorated walls, or root intrusion during inspection, we provide repair options to restore the basin to full function.',
      'Our {city} plumbers also evaluate the overall drainage grade of your property and recommend improvements if your catch basin is undersized for your yard\'s runoff volume — a common issue in older Chicagoland neighborhoods.',
    ],
  },

  faqs: [
    {
      question: 'How often should a catch basin be cleaned?',
      answer:
        'Most residential catch basins should be cleaned every one to three years, depending on the volume of debris your yard generates. Properties with mature trees or that experience heavy rainfall runoff may need annual cleaning.',
    },
    {
      question: 'What happens if I ignore a clogged catch basin?',
      answer:
        'A clogged catch basin can cause yard flooding, erosion, and water pooling near your foundation — which can lead to basement moisture issues and structural damage over time. It can also overflow into the municipal storm sewer system.',
    },
    {
      question: 'Can you repair a cracked or deteriorated catch basin?',
      answer:
        'Yes. We repair catch basin walls, replace damaged grates and frames, and re-line outlet pipes. In cases of severe structural failure, we can replace the entire basin structure.',
    },
    {
      question: 'Is catch basin cleaning covered by homeowner\'s insurance?',
      answer:
        'Routine catch basin cleaning is generally considered maintenance and is not covered by standard homeowner\'s insurance. However, damage caused by a failed catch basin — such as basement flooding — may be covered depending on your policy.',
    },
  ],
};
