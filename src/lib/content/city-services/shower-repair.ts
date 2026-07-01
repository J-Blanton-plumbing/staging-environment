import type { CityServiceContent } from '@/types/city-service';

export const SHOWER_REPAIR: CityServiceContent = {
  serviceSlug: 'shower-repair',
  serviceTitle: 'Shower Repair',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Shower Repair and Installation. Same-Day Service Available.',

  serviceHeroImage: '/images/manplumber.webp',

  seo: {
    title: 'Shower Repair in {city} | J. Blanton Plumbing',
    description:
      'Professional shower repair in {city}. Fix leaking valves, low pressure, slow drains, showerhead problems, and more. Licensed plumbers, same-day service. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Expert Shower Repair Services in {city}',
    paragraphs: [
      'A leaking or malfunctioning shower is more than an inconvenience — it wastes water, raises your utility bill, and can cause significant water damage inside your walls. J. Blanton Plumbing handles all types of shower repair throughout {city} with licensed plumbers who solve the problem right the first time.',
      'Common shower problems we fix for {city} homeowners include: leaking or dripping shower valves, difficulty controlling temperature or pressure, a showerhead with poor flow, a slow or clogged shower drain, leaks at the shower pan or tub surround, and shower valve cartridge replacement.',
      'Many shower leaks originate inside the wall — from a failing shower valve, deteriorated supply connections, or a compromised shower pan — rather than at the showerhead or visible drain. Our plumbers diagnose the actual source of the leak before recommending any repair.',
      'We work on all shower types: alcove showers, walk-in showers, combination shower/tub units, and shower stalls. We service and replace valves from all major brands — Moen, Delta, Kohler, American Standard, and others.',
      'J. Blanton Plumbing has been repairing showers for {city} homeowners for over 30 years — with same-day availability on most shower repair calls and upfront pricing before any work begins.',
    ],
    image: '/images/manplumber.webp',
  },

  secondarySection: {
    heading: 'Shower Repair in {city}: From Valve Repairs to Drain Clearing',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When {city} homeowners call about shower problems, J. Blanton Plumbing diagnoses the full picture — not just the most visible symptom. A shower that drips when off, fluctuates in temperature, or has low pressure often points to a failing valve cartridge or pressure-balancing issue that is easy to fix when caught early.',
      'Shower drain clogs — typically caused by hair and soap accumulation — can usually be cleared without removing the drain assembly. For more stubborn clogs or odor issues, we clean the drain fully and inspect the P-trap to ensure the system is functioning properly.',
      'For {city} homeowners planning a bathroom remodel, we handle shower valve rough-in and trim installation as part of a full bathroom plumbing service.',
    ],
  },

  faqs: [
    {
      question: 'Why does my shower drip after I turn it off?',
      answer:
        'A shower that drips after shutoff usually has a worn cartridge or faulty valve seat inside the shower valve. The cartridge seals the water flow when the handle is turned off — when it wears out, water continues to seep past. Cartridge replacement is a straightforward repair.',
    },
    {
      question: 'Why does my shower run hot or cold unexpectedly?',
      answer:
        'Temperature fluctuations in a shower are typically caused by a failing pressure-balancing valve cartridge or a thermostatic valve that has reached the end of its service life. These components can be replaced without opening walls in most cases.',
    },
    {
      question: 'How do I know if my shower is leaking inside the wall?',
      answer:
        'Signs of an in-wall shower leak include: water stains or soft spots on the wall or ceiling adjacent to the shower, a musty odor in the bathroom, or visible mold near the shower surround. These indicate water is getting past the shower pan or valve connections.',
    },
    {
      question: 'Can you repair a shower without replacing the tile?',
      answer:
        'In most cases, yes. Valve and cartridge replacements are performed through the existing valve access or through a small tile cutout that can be patched. We minimize any tile disruption whenever possible.',
    },
  ],
};
