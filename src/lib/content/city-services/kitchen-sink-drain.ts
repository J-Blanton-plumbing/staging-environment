import type { CityServiceContent } from '@/types/city-service';

const CDN = 'https://d1rplazj5a80fb.cloudfront.net';

export const KITCHEN_SINK_DRAIN: CityServiceContent = {
  serviceSlug: 'kitchen-sink-drain',
  serviceTitle: 'Kitchen Sink Drain',

  heroCallout:
    'Experienced Plumbers with 30+ Years in {city} for Kitchen Sink Drain Repair and Clearing. Same-Day Service Available.',

  serviceHeroImage: `${CDN}/images/Kitchen-Sink-Drain.webp`,

  seo: {
    title: 'Kitchen Sink Drain Service in {city} | J. Blanton Plumbing',
    description:
      'Professional kitchen sink drain cleaning and repair in {city}. Clear slow drains, repair leaking drain connections, and prevent recurring clogs. Call (773) 724-9272.',
  },

  serviceIntro: {
    heading: 'Kitchen Sink Drain Service in {city}',
    paragraphs: [
      'A slow or clogged kitchen sink drain is one of the most common plumbing problems in {city} homes. J. Blanton Plumbing clears and repairs kitchen sink drains throughout {city} — restoring full flow fast.',
      'Kitchen sink drains clog primarily from grease, cooking oils, food particles, and soap residue that accumulate in the P-trap and drain line over time. Our licensed plumbers in {city} use professional snaking and hydro jetting to remove blockages completely — not just temporarily.',
      'Beyond clearing clogs, we repair and replace leaking drain components: the strainer basket, P-trap, drain tailpiece, and drain line connections. A leaking kitchen drain connection can silently cause cabinet damage and mold growth before it is noticed.',
      'Recurring kitchen sink drain clogs are a sign that buildup exists deeper in the drain line than snaking alone can reach. We use hydro jetting to scour the pipe walls clean and video camera inspection to verify the drain is fully clear.',
      'J. Blanton Plumbing has been clearing kitchen sink drains for {city} homeowners for over 30 years — with same-day service, upfront pricing, and results that last.',
    ],
    image: `${CDN}/images/Kitchen-Sink-Drain.webp`,
  },

  secondarySection: {
    heading: 'Kitchen Sink Drain Services in {city}: Clearing, Repair, and Prevention',
    image: '/images/manplumber.webp',
    paragraphs: [
      'When {city} homeowners call about a clogged kitchen sink drain, J. Blanton Plumbing does more than poke a hole through the clog. We clear the drain completely and inspect the drain plumbing to ensure there are no related issues that will cause future problems.',
      'We also address the drain hardware under the sink: a loose or corroded strainer basket that allows debris to bypass the drain can accelerate clogging, and deteriorated P-trap fittings often leak even when the drain appears to be functioning.',
      'For {city} households with a garbage disposal, we inspect the disposal drain connection as part of every kitchen sink service — a commonly overlooked source of slow drainage and leaks.',
    ],
  },

  faqs: [
    {
      question: 'Why does my kitchen sink drain slowly even though nothing is visibly wrong?',
      answer:
        'Slow kitchen drains are usually caused by accumulated grease and soap residue in the drain line — not a visible clog at the strainer. The buildup occurs gradually and eventually restricts flow. Professional drain cleaning removes it completely.',
    },
    {
      question: 'Can I use a plunger on a kitchen sink drain?',
      answer:
        'A plunger can help dislodge a soft clog close to the drain opening, but it cannot remove grease buildup deeper in the line. If plunging does not restore full flow, professional drain clearing is the next step.',
    },
    {
      question: 'My kitchen drain smells bad — is that a plumbing problem?',
      answer:
        'A foul-smelling kitchen drain usually indicates food particle and grease buildup in the P-trap or drain line. Professional cleaning removes the source of the odor. Persistent sewer smells may indicate a venting issue that requires further inspection.',
    },
    {
      question: 'Why is water leaking under my kitchen sink near the drain?',
      answer:
        'Leaks under the kitchen sink typically originate from a loose or deteriorated P-trap, a failed drain gasket at the strainer, or a cracked drain tailpiece. These components are inexpensive to replace and the repair usually takes less than an hour.',
    },
  ],
};
