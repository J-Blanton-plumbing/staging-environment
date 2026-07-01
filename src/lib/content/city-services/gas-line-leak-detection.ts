import type { CityServiceContent } from '@/types/city-service';

export const GAS_LINE_LEAK_DETECTION: CityServiceContent = {
  serviceSlug: 'gas-line-leak-detection',
  serviceTitle: 'Gas Line Leak Detection',

  heroCallout:
    '24/7 Gas Line Leak Detection in {city} — Do Not Wait. Licensed Plumbers, Emergency Response Available.',

  serviceHeroImage: '/images/sub-gas-lines.webp',

  seo: {
    title: 'Gas Line Leak Detection in {city} | J. Blanton Plumbing',
    description:
      'Professional gas line leak detection in {city}. If you smell gas, call immediately. 24/7 emergency response, licensed plumbers, electronic leak detection. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Gas Line Leak Detection in {city} — Safety First',
    paragraphs: [
      'A gas leak is one of the most serious emergencies in any home. If you smell rotten eggs or sulfur in your {city} home, leave immediately and call for help. J. Blanton Plumbing provides 24/7 emergency gas line leak detection throughout {city} with licensed plumbers and professional detection equipment.',
      'Our licensed plumbers in {city} use electronic gas detectors and pressure testing to locate leaks precisely — including leaks too small to detect by smell alone. We find the leak, shut off the affected line, make the repair, and confirm the system is safe before restoring gas service.',
      'Gas leaks can occur at joints, fittings, corroded pipe sections, or flexible connector points. Older homes in {city} with aging iron pipe systems are particularly susceptible to small leaks that develop gradually over time.',
      'Even a small, slow gas leak creates risk of fire, explosion, and carbon monoxide exposure. If your gas bill has increased without explanation, or if you notice dead patches in your lawn above the gas line path, contact us for a leak inspection.',
      'J. Blanton Plumbing treats every gas leak call as the emergency it is — with fast dispatch, professional detection, and a licensed repair that restores your {city} home to safe operation.',
    ],
    image: '/images/sub-gas-lines.webp',
  },

  secondarySection: {
    heading: 'Gas Leak Detection in {city}: Electronic Diagnosis and Licensed Repair',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When {city} homeowners suspect a gas leak, J. Blanton Plumbing responds as a true emergency. We arrive quickly, assess the situation safely, and use professional leak detection equipment to pinpoint the problem without guesswork.',
      'Our plumbers pressure-test the entire gas system to identify all leaks — not just the obvious one. It is common for a gas line to develop multiple small leaks along corroded sections, and we address all of them in a single visit.',
      'After repair, we perform a final pressure test and confirm all gas appliances are operating safely before leaving your {city} home. We document the work for your records and can provide a gas system condition report if needed for insurance purposes.',
    ],
  },

  faqs: [
    {
      question: 'What should I do if I smell gas in my home?',
      answer:
        'Leave the home immediately without turning any switches on or off. Do not use your phone inside the home. Once outside, call 911 and then call your gas utility\'s emergency line. Only re-enter after emergency responders have cleared the home.',
    },
    {
      question: 'Can a gas leak be too small to smell?',
      answer:
        'Yes. Small leaks may be below the detectable threshold for the human nose, particularly in well-ventilated areas. Electronic gas detectors can find leaks that smell does not reveal. We use these instruments on every leak detection service call.',
    },
    {
      question: 'How do I know if I have a gas leak if there is no smell?',
      answer:
        'Signs of a slow gas leak include: an unexplained increase in your gas bill, dead or dying grass above buried gas lines, hissing sounds near gas appliances or pipes, or a persistent headache that improves when you leave the home.',
    },
    {
      question: 'Do you repair gas leaks after detection?',
      answer:
        'Yes. We detect and repair gas leaks in a single visit whenever possible. After the repair, we pressure-test the entire system to confirm no additional leaks remain and verify all appliances are operating safely.',
    },
  ],
};
