import type { CityServiceContent } from '@/types/city-service';

export const SUMP_PUMPS: CityServiceContent = {
  serviceSlug: 'sump-pumps',
  serviceTitle: 'Sump Pumps',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Sump Pump Installation and Repair. Same-Day Service Available.',

  serviceHeroImage: '/images/manplumber.webp',

  seo: {
    title: 'Sump Pump Services in {city} | J. Blanton Plumbing',
    description:
      'Professional sump pump installation, repair, and replacement in {city}. Keep your basement dry with expert sump pump service. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Sump Pump Installation and Repair in {city}',
    paragraphs: [
      'Your sump pump is the last line of defense between a dry basement and thousands of dollars in water damage. J. Blanton Plumbing provides expert sump pump installation, repair, and replacement throughout {city} — with the fast response this critical system demands.',
      'We install and service all types of sump pumps: pedestal pumps, submersible pumps, and battery backup systems. Our licensed plumbers in {city} assess your sump pit, your basement\'s water intrusion history, and your home\'s needs to recommend the right pump size and type.',
      'Battery backup sump pumps are an essential upgrade for {city} homes — power outages often coincide with the heavy rain storms that cause the most basement flooding. A battery backup system keeps your pump running even when the grid goes down.',
      'Common signs your {city} sump pump needs service include: the pump runs constantly or cycles on and off rapidly, the pump runs during a storm but the basement still floods, the pump does not activate when water enters the pit, or you can hear the motor straining or making unusual sounds.',
      'J. Blanton Plumbing has been protecting {city} basements with professional sump pump service for over 30 years. We offer same-day service and 24/7 emergency response for sump pump failures during active storm events.',
    ],
    image: '/images/manplumber.webp',
  },

  secondarySection: {
    heading: 'Sump Pump Services in {city}: Keeping Your Basement Dry Year-Round',
    image: '/images/manplumber.webp',
    paragraphs: [
      'In Chicagoland, where heavy rain events are common and basements are standard, a properly functioning sump pump is not optional — it is essential. J. Blanton Plumbing helps {city} homeowners maintain, upgrade, and repair their sump pump systems before storms reveal a problem.',
      'Our annual sump pump maintenance service includes: pump operation test, float switch inspection, discharge line check, pit cleaning, and battery backup verification. This 30-minute visit can prevent the kind of failure that leaves a basement with two feet of water.',
      'When sump pumps fail beyond repair, we replace them quickly — often the same day. We carry quality submersible pump models and battery backup systems on our trucks for immediate installation.',
    ],
  },

  faqs: [
    {
      question: 'How long do sump pumps last?',
      answer:
        'A quality submersible sump pump typically lasts 7 to 10 years with normal use and annual maintenance. Pumps in areas with high water table or frequent cycling may have shorter lifespans. Battery backup systems should have their batteries replaced every 3 to 5 years.',
    },
    {
      question: 'Why is my sump pump running when it has not rained?',
      answer:
        'A sump pump that runs during dry weather may be responding to groundwater seeping up from below — common in areas with a high water table. It could also indicate a stuck float switch, a malfunctioning check valve allowing discharged water to return to the pit, or a discharge line that drains back into the pit.',
    },
    {
      question: 'Do I need a battery backup sump pump?',
      answer:
        'Yes, if your basement is finished or contains valuables. Power outages and sump pump failures are most likely to occur during the exact storms that produce the most groundwater. A battery backup system provides protection when your primary pump cannot.',
    },
    {
      question: 'Can you install a sump pump in a basement that does not have one?',
      answer:
        'Yes. We install complete sump pump systems in basements that currently lack one — including cutting the sump pit, installing the liner and pump, running the discharge line to the exterior, and installing the appropriate check valve.',
    },
  ],
};
