import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const BURST_PIPE_REPAIR: CityServiceContent = {
  serviceSlug: 'burst-pipe-repair',
  serviceTitle: 'Burst Pipe Repair',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} Offering Emergency Burst Pipe Repair. 24/7 Service Available.',

  serviceHeroImage: `${CDN}/images/img_burst-pipe-repair.webp`,

  seo: {
    title: 'Burst Pipe Repair in {city} | J. Blanton Plumbing',
    description:
      '24/7 emergency burst pipe repair in {city}. Fast response to stop water damage and restore your plumbing. Licensed plumbers, upfront pricing. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Emergency Burst Pipe Repair in {city}',
    paragraphs: [
      'A burst pipe is one of the most urgent plumbing emergencies a {city} homeowner can face. Water gushing from a broken pipe can cause thousands of dollars in structural damage within minutes. J. Blanton Plumbing provides 24/7 emergency burst pipe repair throughout {city} and the greater Chicagoland area.',
      'Pipes burst for several reasons: freezing temperatures in Chicago winters, age-related corrosion, excessive water pressure, or physical damage. Whatever the cause, our licensed plumbers in {city} arrive quickly, locate the break, and make a lasting repair — not a temporary patch.',
      'When you call us for a burst pipe, we first help you identify the main shutoff valve to stop the flow of water. Our plumber then assesses the damage, explains the repair options clearly, and completes the work to restore your water supply safely.',
      'We repair all pipe materials common in {city} homes: copper, galvanized steel, PVC, CPVC, and PEX. Whether the burst is in a wall, under a slab, or in a crawlspace, our team has the equipment and expertise to reach it.',
      'After more than 30 years serving {city}, J. Blanton Plumbing is the trusted name for emergency plumbing repairs. We offer upfront pricing, 24/7 dispatch, and a satisfaction guarantee on every burst pipe repair.',
    ],
    image: `${CDN}/images/img_burst-pipe-repair.webp`,
  },

  secondarySection: {
    heading: 'Burst Pipe Repair in {city}: Stopping Water Damage Fast',
    image: '/images/manplumber.webp',
    paragraphs: [
      'Chicagoland winters are brutal on plumbing. When pipes freeze and burst in {city} homes, J. Blanton Plumbing responds fast — with fully stocked trucks and Illinois-licensed plumbers who handle burst pipe repairs every season.',
      'We do not just patch the break — we inspect the surrounding pipe for additional weak spots, check water pressure, and advise on insulation or heat tape if your home\'s configuration makes pipes vulnerable to future freezing.',
      'After the repair, we confirm full water pressure has returned and check all fixtures to make sure no additional pipes were compromised. Our {city} plumbers document every repair so you have a clear record for insurance purposes if needed.',
    ],
  },

  faqs: [
    {
      question: 'What should I do when I discover a burst pipe?',
      answer:
        'Turn off the main water supply immediately, then call a licensed plumber. If water has reached electrical panels or outlets, do not enter the area and call an electrician. Document the damage with photos for your insurance claim.',
    },
    {
      question: 'Why do pipes burst in winter?',
      answer:
        'Water expands when it freezes. Pipes in exterior walls, unheated crawlspaces, garages, or near poorly insulated areas are especially vulnerable during Chicagoland winters. As the ice inside the pipe expands, pressure builds until the pipe wall gives way.',
    },
    {
      question: 'How long does a burst pipe repair take?',
      answer:
        'Most accessible burst pipe repairs are completed in 1 to 3 hours. Repairs inside walls or under slabs take longer and may require drywall access or concrete cutting, which adds time. We give you a clear timeline before any work begins.',
    },
    {
      question: 'Will my homeowner\'s insurance cover burst pipe damage?',
      answer:
        'Most standard homeowner\'s insurance policies cover sudden and accidental burst pipe damage, including water damage to your home\'s structure and belongings. We can provide documentation of the repair to support your insurance claim.',
    },
  ],
};
