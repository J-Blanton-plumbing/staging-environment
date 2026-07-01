import type { CityServiceContent } from '@/types/city-service';

export const GAS_LINE_REPAIR: CityServiceContent = {
  serviceSlug: 'gas-line-repair',
  serviceTitle: 'Gas Line Repair',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Licensed Gas Line Repair. 24/7 Emergency Service Available.',

  serviceHeroImage: '/images/sub-gas-lines.webp',

  seo: {
    title: 'Gas Line Repair in {city} | J. Blanton Plumbing',
    description:
      'Licensed gas line repair in {city}. Leaks, corroded pipe, damaged fittings — fast and safe gas line repair by licensed plumbers. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Licensed Gas Line Repair in {city}',
    paragraphs: [
      'Gas line damage is not something to wait on. J. Blanton Plumbing provides fast, licensed gas line repair throughout {city} — restoring safe gas service to your home or business with the professional expertise gas work demands.',
      'Our licensed plumbers in {city} repair all types of gas line problems: corroded or pitted pipe sections, leaking joints and fittings, damaged flexible connectors, improperly supported pipe runs, and gas lines damaged by renovation or construction work.',
      'We assess the full extent of the damage before recommending a repair approach. In some cases, a localized repair is appropriate. In others — particularly with older corroded iron pipe — we recommend repiping the affected section entirely to prevent repeat issues.',
      'Every gas line repair we perform in {city} includes a pressure test after completion to confirm the repaired section and surrounding fittings are completely leak-free. We do not restore gas service until the test confirms it is safe.',
      'J. Blanton Plumbing has been repairing gas lines in {city} for over 30 years. Our licensed plumbers hold the required Illinois certifications, carry proper insurance, and pull permits when required by local code.',
    ],
    image: '/images/sub-gas-lines.webp',
  },

  secondarySection: {
    heading: 'Gas Line Repair in {city}: Precise, Code-Compliant, Pressure-Tested',
    image: '/images/manplumber.webp',
    paragraphs: [
      'Gas line repair in {city} requires more than patching the visible problem. J. Blanton Plumbing inspects the full gas system for related wear or corrosion that could create additional leaks — especially in older homes with aging iron pipe.',
      'Our plumbers are equipped with electronic gas detectors to verify no gas is escaping after repair. This is the professional standard — not just sniffing for leaks or applying soapy water — and it ensures we confirm complete safety before leaving your home.',
      'For {city} homeowners dealing with repeated gas line issues, we can evaluate the entire system and recommend a partial or full repipe with modern CSST or black iron to provide long-term reliability.',
    ],
  },

  faqs: [
    {
      question: 'How do I know if my gas line needs repair vs. replacement?',
      answer:
        'A single localized leak in otherwise sound pipe can be repaired. Extensive corrosion, multiple leaks, or pipe that is cracked or severely deteriorated warrants replacement of the affected section. Our plumbers assess the condition of your entire line and give you honest guidance.',
    },
    {
      question: 'Will my gas service be off during the repair?',
      answer:
        'Yes, the gas must be shut off during any gas line repair. We work as efficiently as possible to minimize the time your appliances are without gas. In most cases, gas service is restored the same day.',
    },
    {
      question: 'Do gas line repairs require permits?',
      answer:
        'Depending on the scope of work and your {city} municipality\'s requirements, permits may be required. Our plumbers handle the permit process when it applies and ensure the work passes inspection.',
    },
    {
      question: 'What pipe material do you use for gas line repairs?',
      answer:
        'We match the existing pipe material when making repairs to a specific section. For full repipes or new runs, we use black iron pipe or CSST depending on the application, local code requirements, and installation conditions.',
    },
  ],
};
