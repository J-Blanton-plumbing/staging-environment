import type { CityServiceContent } from '@/types/city-service';

export const GAS_LINE_INSTALLATION: CityServiceContent = {
  serviceSlug: 'gas-line-installation',
  serviceTitle: 'Gas Line Installation',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Licensed Gas Line Installation. Code-Compliant, Pressure-Tested Service.',

  serviceHeroImage: '/images/sub-gas-lines.webp',

  seo: {
    title: 'Gas Line Installation in {city} | J. Blanton Plumbing',
    description:
      'Licensed gas line installation in {city}. New gas line runs for appliances, outdoor grills, generators, and more. Code-compliant, pressure-tested. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Licensed Gas Line Installation in {city}',
    paragraphs: [
      'Adding a new gas appliance — a range, dryer, generator, outdoor grill, or fireplace — requires a properly sized and installed gas line. J. Blanton Plumbing provides licensed gas line installation throughout {city}, ensuring every connection is code-compliant and pressure-tested for safety.',
      'Gas line work is regulated in Illinois and requires a licensed plumber. Our team in {city} pulls the required permits, installs the correct pipe material and sizing for your appliance\'s BTU demand, and completes a pressure test before any appliance is connected.',
      'We run gas lines in all configurations: through finished walls, unfinished basements, crawlspaces, or underground to outdoor appliances. Every installation includes the correct shutoff valve and flexible gas connector for the appliance.',
      'If your {city} home is converting from electric to gas appliances, we assess your existing gas supply capacity and determine whether the main line into your home can support the additional load — or whether a service upgrade is needed.',
      'J. Blanton Plumbing has been installing gas lines in {city} homes for over 30 years. We deliver precise, professional installation that passes inspection the first time.',
    ],
    image: '/images/sub-gas-lines.webp',
  },

  secondarySection: {
    heading: 'Gas Line Installation in {city}: Expert Work from Licensed Plumbers',
    image: '/images/manplumber.webp',
    paragraphs: [
      'Installing a gas line is not a DIY project — and in {city}, it is not legal without a licensed plumber. J. Blanton Plumbing handles gas line installation with the proper licensing, permits, and pressure testing that protect your home and family.',
      'Our {city} plumbers size gas lines correctly for the appliances they will serve. An undersized gas line causes performance problems and appliance inefficiency. An oversized line wastes money on materials. We calculate the correct pipe diameter for your specific installation.',
      'After installation, we pressure-test every fitting and connection using calibrated gauges. A passed pressure test — not just a visual inspection — is the only way to confirm a gas line is completely leak-free before use.',
    ],
  },

  faqs: [
    {
      question: 'What type of pipe is used for gas line installation?',
      answer:
        'Most residential gas lines use black iron pipe, corrugated stainless steel tubing (CSST), or copper depending on the application and local code. Our plumbers select the appropriate material for your {city} installation.',
    },
    {
      question: 'How long does gas line installation take?',
      answer:
        'A single gas line run for one appliance typically takes 2 to 4 hours. Larger projects involving multiple runs or underground installation take longer. We provide a clear timeline before work begins.',
    },
    {
      question: 'Do you pull permits for gas line installation?',
      answer:
        'Yes. Gas line installation in most {city} municipalities requires a permit and inspection. We handle the permit process and schedule the inspection — ensuring your installation is fully legal and documented.',
    },
    {
      question: 'Can you install a gas line for an outdoor kitchen or generator?',
      answer:
        'Yes. We install underground gas lines for outdoor appliances including grills, outdoor kitchens, fire pits, and standby generators. Outdoor installations require specialized pipe materials and proper burial depth per local code.',
    },
  ],
};
