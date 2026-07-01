import type { CityServiceContent } from '@/types/city-service';

export const WATER_HEATER_REPAIR: CityServiceContent = {
  serviceSlug: 'water-heater-repair',
  serviceTitle: 'Water Heater Repair',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Water Heater Repair. Restore Hot Water Fast — Same-Day Service Available.',

  serviceHeroImage: '/images/manplumber.webp',

  seo: {
    title: 'Water Heater Repair in {city} | J. Blanton Plumbing',
    description:
      'Fast water heater repair in {city}. No hot water, leaks, strange noises, pilot light failures — our licensed plumbers diagnose and fix it same day. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Fast Water Heater Repair in {city}',
    paragraphs: [
      'No hot water is one of the most disruptive plumbing problems a {city} household can face. J. Blanton Plumbing provides fast water heater repair throughout {city} — diagnosing the problem accurately and restoring hot water as quickly as possible.',
      'Our licensed plumbers in {city} repair all water heater types: gas and electric tank heaters, power-vent and direct-vent models, and tankless systems. We service all major brands and carry common repair parts on our trucks for same-day repairs in most cases.',
      'Common water heater problems we fix in {city} include: no hot water or insufficient hot water, inconsistent water temperature, a water heater that runs out of hot water too quickly, pilot light failure on gas units, tripped high-limit switch on electric units, a leaking T&P relief valve, and unusual popping or rumbling noises.',
      'We diagnose the root cause before recommending any repair — whether that is a failed thermocouple, a burned-out heating element, a faulty thermostat, a sediment-laden tank, or a leaking fitting. We give you honest repair-versus-replace guidance based on the unit\'s age and condition.',
      'J. Blanton Plumbing has been repairing water heaters for {city} homeowners for over 30 years. We arrive prepared, diagnose fast, and get your hot water restored — with upfront pricing and no surprise charges.',
    ],
    image: '/images/manplumber.webp',
  },

  secondarySection: {
    heading: 'Water Heater Repair in {city}: Accurate Diagnosis, Fast Restoration',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When {city} homeowners call J. Blanton Plumbing about a water heater problem, we ask the right diagnostic questions before we arrive — what type of unit, the symptoms, and the unit\'s age — so our plumber arrives with the most likely repair parts already on the truck.',
      'We do not recommend replacement just because a repair is needed. If your {city} water heater is under 10 years old and the repair is cost-effective, we fix it. If the unit is aging and the repair cost approaches replacement cost, we give you a straight comparison so you can make the best decision.',
      'After completing a water heater repair in your {city} home, we run the unit through a full recovery cycle to confirm it is heating correctly, check all connections for leaks, and verify the T&P valve operates safely. We do not leave until we are confident the repair is complete.',
    ],
  },

  faqs: [
    {
      question: 'Why do I have no hot water all of a sudden?',
      answer:
        'Sudden loss of hot water on a gas water heater is most often caused by a failed thermocouple or pilot light outage. On an electric water heater, a tripped high-limit switch or burned-out heating element is the typical cause. Both are repairable in most cases without replacement.',
    },
    {
      question: 'Why is my water heater leaking?',
      answer:
        'Leaks can occur at the T&P relief valve (often indicates excessive pressure or temperature), at supply connections (a fitting issue), or from the tank body itself (corrosion). Tank body leaks cannot be repaired — they require replacement. Supply line and fitting leaks are repairable.',
    },
    {
      question: 'How long does water heater repair take?',
      answer:
        'Most common water heater repairs — thermocouple replacement, heating element replacement, thermostat replacement — are completed in 1 to 2 hours. More complex repairs or those requiring ordered parts may take longer.',
    },
    {
      question: 'Is it worth repairing a 12-year-old water heater?',
      answer:
        'It depends on the repair cost and the unit\'s condition. A 12-year-old unit with a simple, inexpensive repair may be worth fixing. If the tank shows corrosion or the repair cost exceeds 50 percent of a new unit, replacement is usually the better investment. We give you honest guidance.',
    },
  ],
};
