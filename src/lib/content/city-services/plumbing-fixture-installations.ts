import type { CityServiceContent } from '@/types/city-service';

export const PLUMBING_FIXTURE_INSTALLATIONS: CityServiceContent = {
  serviceSlug: 'plumbing-fixture-installations',
  serviceTitle: 'Plumbing Fixture Installations',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Plumbing Fixture Installation. Expert Work on Every Fixture.',

  serviceHeroImage: '/images/manplumber.webp',

  seo: {
    title: 'Plumbing Fixture Installation in {city} | J. Blanton Plumbing',
    description:
      'Professional plumbing fixture installation in {city}. Toilets, sinks, faucets, showers, tubs, and more — installed correctly by licensed plumbers. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Expert Plumbing Fixture Installation in {city}',
    paragraphs: [
      'From a single faucet replacement to a full bathroom fixture package, J. Blanton Plumbing installs plumbing fixtures throughout {city} with the precision and licensing that guarantees the job is done right.',
      'Our licensed plumbers in {city} install all types of plumbing fixtures: toilets, pedestal sinks, vessel sinks, vanity sinks, faucets, showerheads, shower valves, bathtubs, utility sinks, laundry connections, and outdoor hose bibs.',
      'Fixture installation requires proper connection to supply lines and drain plumbing, correct sealing, and in some cases adjustment of rough-in dimensions or installation of new shutoff valves. Our plumbers handle all of this — not just the fixture itself.',
      'Whether you are updating a single bathroom fixture or outfitting a newly remodeled space in your {city} home, we work from your fixture selections and ensure every installation is leak-free, code-compliant, and finished professionally.',
      'J. Blanton Plumbing has been installing plumbing fixtures for {city} homeowners and contractors for over 30 years — with the expertise to handle everything from standard installations to custom configurations.',
    ],
    image: '/images/manplumber.webp',
  },

  secondarySection: {
    heading: 'Plumbing Fixture Installations in {city}: Every Fixture, Done Right',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When {city} homeowners remodel a bathroom or kitchen, the fixture installation phase is where plumbing expertise matters most. J. Blanton Plumbing coordinates with your project timeline to ensure all fixtures are installed correctly before tile work, countertops, or cabinetry close in around them.',
      'We inspect the rough-in connections before each installation and identify any adjustments needed — correcting drain alignment, adding supply stop valves, or rerouting supply lines that are not properly positioned for the new fixture.',
      'After installation, we test every fixture under full water pressure, check all connections for leaks, and verify that drains flow correctly. Our {city} plumbers do not consider a fixture installation complete until it has been tested and confirmed problem-free.',
    ],
  },

  faqs: [
    {
      question: 'Can you install fixtures I already purchased?',
      answer:
        'Yes. We install customer-supplied fixtures. We recommend confirming rough-in dimensions before purchasing a toilet, and checking sink hole configurations before selecting a faucet to ensure compatibility with your existing plumbing.',
    },
    {
      question: 'Do you handle fixture installation for contractors and remodelers?',
      answer:
        'Yes. We work with general contractors, kitchen and bath remodelers, and construction companies in {city} for fixture trim-out — installing fixtures after the rough plumbing and tile work are complete.',
    },
    {
      question: 'Do you install fixtures in new construction?',
      answer:
        'Yes. We handle plumbing fixture installation in new construction and additions, including rough-in plumbing and fixture trim-out. We coordinate with your general contractor and pull required permits.',
    },
    {
      question: 'How long does toilet installation take?',
      answer:
        'Standard toilet replacement takes 30 to 60 minutes. Installations requiring new closet flange repair, wax ring replacement on an older flange, or shutoff valve replacement may take up to 2 hours.',
    },
  ],
};
