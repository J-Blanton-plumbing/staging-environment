import type { CityServiceContent } from '@/types/city-service';

export const WATER_TESTING: CityServiceContent = {
  serviceSlug: 'water-testing',
  serviceTitle: 'Water Testing',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Professional Water Testing. Know What Is in Your Water.',

  serviceHeroImage: '/images/manplumber.webp',

  seo: {
    title: 'Water Testing Services in {city} | J. Blanton Plumbing',
    description:
      'Professional water testing in {city}. Test your home\'s water for contaminants, hardness, and quality to make informed filtration decisions. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Professional Water Testing in {city}',
    paragraphs: [
      'You cannot improve your water quality without knowing what is in it. J. Blanton Plumbing provides professional water testing services throughout {city}, giving homeowners an accurate picture of their water\'s content so they can make informed decisions about filtration and treatment.',
      'Our water testing for {city} homes screens for the most common concerns in residential water supplies: water hardness (calcium and magnesium content), chlorine and chloramine levels, pH, iron, manganese, total dissolved solids (TDS), and bacterial presence.',
      'Water quality varies across {city} and surrounding communities depending on the source — municipal treatment plant, local aquifer, or private well — and the age of your home\'s interior plumbing. Older homes with copper or lead-solder joints may have elevated lead levels not present in the incoming water supply.',
      'After testing, we review the results with you and recommend the appropriate treatment solution — whether that is a whole-home water softener, a carbon filter system, a reverse osmosis drinking water filter, or in some cases no treatment at all. We do not recommend filtration products you do not need.',
      'J. Blanton Plumbing has been helping {city} homeowners understand and improve their water quality for over 30 years. Water testing is the smart first step before investing in any filtration system.',
    ],
    image: '/images/manplumber.webp',
  },

  secondarySection: {
    heading: 'Water Testing in {city}: Understanding Your Water Before Treating It',
    image: '/images/manplumber.webp',
    paragraphs: [
      'Many {city} homeowners purchase water filters based on taste or appearance rather than testing. This often results in buying a system that does not address the actual contaminants present — or one that is overkill for water that is already relatively clean.',
      'Water testing gives you and your {city} plumber the information needed to select the right treatment approach. A home with hard water but low contaminant levels, for example, needs a softener — not an expensive multi-stage filter system.',
      'For {city} homeowners with private wells, annual water testing is especially important. Well water composition can change over time due to agricultural runoff, nearby construction, or shifts in the aquifer — making periodic testing a critical part of home maintenance.',
    ],
  },

  faqs: [
    {
      question: 'How can water testing help identify issues with my household water supply?',
      answer:
        'Water testing detects contaminants and conditions not visible to the naked eye — bacteria, heavy metals, pesticides, high mineral content, pH imbalance, and other factors that affect taste, safety, and plumbing system performance. Testing is the only accurate way to know what is actually in your water.',
    },
    {
      question: 'How often should I have my water tested?',
      answer:
        'For {city} homes on municipal water, testing every 1 to 2 years is a reasonable interval — particularly if you notice changes in taste, odor, or staining. Homes on private wells should test annually. Testing is also recommended after any significant plumbing changes or local environmental events.',
    },
    {
      question: 'What contaminants does water testing detect?',
      answer:
        'Our water testing screens for hardness, iron, manganese, pH, total dissolved solids, chlorine and chloramines, and bacterial contamination. More comprehensive testing can detect lead, nitrates, pesticides, and other specific contaminants on request.',
    },
    {
      question: 'If my municipal water is treated, do I still need to test?',
      answer:
        'Municipal treatment addresses bacteria and many contaminants at the treatment plant, but water can pick up minerals, lead (from service lines or interior plumbing), and other issues between the plant and your tap. Testing your household water gives you the actual picture at the point of use.',
    },
  ],
};
