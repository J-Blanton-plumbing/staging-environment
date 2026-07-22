export interface FaqItem {
  question: string;
  answer: string;
}

export interface KnowledgeHubContent {
  hero: {
    heading: string;
    image: string;
  };
  intro: {
    label: string;
    body: string;
    cta: string;
    ctaHref: string;
  };
  faqs: {
    label: string;
    body: string;
    items: FaqItem[];
  };
  /** Elfsight Google Reviews widget UUID (Brief 96 — bare ID, not a class name). */
  reviewsWidgetId: string;
}

export const KNOWLEDGE_HUB: KnowledgeHubContent = {
  hero: {
    heading: 'KNOWLEDGE HUB',
    image: 'https://d1rplazj5a80fb.cloudfront.net/images/kh-hero.jpg',
  },
  intro: {
    label: 'HELPFUL ARTICLES',
    body: 'Our team of tenacious plumbers are always ready to leap into action to save your day, no matter how light or severe the situation.',
    cta: 'VIEW SERVICES',
    ctaHref: '/services',
  },
  faqs: {
    label: 'FAQ',
    body: "Got questions? Whether you're curious about our services, need tips for maintaining your plumbing, or want to know what sets J. Blanton Plumbing apart, you'll find the answers right here.",
    items: [
      {
        question: 'How often should I have my drains professionally cleaned?',
        answer:
          'For most households, annual drain cleaning is a good rule of thumb — more frequently if you notice slow drains, recurring clogs, or unpleasant odors. Our team can assess your system and recommend a schedule that makes sense for your home.',
      },
      {
        question: 'What should I do if I have a burst pipe?',
        answer:
          'Shut off your main water supply immediately, then call us. While you wait, move valuables away from the affected area and document damage for insurance purposes. Do not attempt to use electrical outlets or appliances near standing water.',
      },
      {
        question: 'How do I know if I need to replace my water heater?',
        answer:
          'Signs include rusty or discolored hot water, rumbling or popping noises during heating, a unit older than 10–12 years, or inconsistent hot water supply. If your heater is leaking around the tank itself, replacement is typically the only safe option.',
      },
    ],
  },
  reviewsWidgetId: '67911321-4b72-4209-b157-fc9812eadd3b',
};
