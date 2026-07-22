export const FINANCING = {
  hero: {
    image: 'https://d1rplazj5a80fb.cloudfront.net/images/clogged+drain-4.webp',
    imageAlt: 'Financing Hero',
    heading: "J. BLANTON, LET'S TALK FINANCING OPTIONS",
    description:
      "Flexible Financing Solutions for Your Plumbing Needs. Don't let budget concerns stop you from getting essential repairs. With our easy payment plans and quick approval process, you can get the plumbing service you need today. Call us to learn about our financing options and keep your home running smoothly!",
    // Brief 95 (B.2): phone ctaLabel/ctaHref removed from here — page.tsx merges
    // them from Global Settings (the single source), not from SITE/site.ts.
    patternImage: 'https://d1rplazj5a80fb.cloudfront.net/images/wrench_pattern.webp',
  },
  financingSolutionsReady: {
    label: 'FINANCING SOLUTIONS READY',
    body: "Don't let finances delay essential plumbing work. With J. Blanton's flexible financing options, you can get expert service now and pay over time. Our team works with trusted financial partners to make repairs and replacements affordable for every budget.",
    image: 'https://d1rplazj5a80fb.cloudfront.net/images/clogged+drain-4.webp',
    imageAlt: 'Financing',
  },
  financingMadeSimple: {
    ndcImage: 'https://d1rplazj5a80fb.cloudfront.net/images/no-drip-club.webp',
    characterImage: 'https://d1rplazj5a80fb.cloudfront.net/images/jbcharacter.webp',
    leftImage: 'https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp',
    leftImageAlt: 'Financing',
    label: 'FINANCING MADE SIMPLE',
    items: [
      'Emergency plumbing financing available for kitchen repairs, bathroom fixes, sewer lines, water leaks, and water heater replacements',
      'Flexible payment plans for unexpected plumbing emergencies',
      'Affordable financing options for both emergency and planned plumbing repairs',
      'Easy credit approval to restore your home’s essential plumbing systems',
    ],
    ctaLabel: 'MAKE A GOOD CALL',
    // Brief 95 (B.2): ctaHref merges from Global Settings in page.tsx.
  },
  coverage: {
    heading: "WE'RE ALMOST EVERYWHERE",
    body: 'With more plumbers and more trucks at our disposal, we can cover more ground and reach your home quickly.',
    // Brief 96 follow-up: live site has a separate .ep-gr (Google Reviews)
    // block before .ep-tiktok — this page was missing it entirely, and this
    // field held the Reviews ID instead of the real TikTok one. Fixed to the
    // actual TikTok widget ID; the missing .ep-gr block was added in page.tsx.
    socialWidgetId: '9f370c11-108b-412b-8529-6b3f093f04a3',
  },
  surpriseBills: {
    label: 'WE HATE SURPRISE BILLS TOO',
    leftImage: 'https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp',
    leftImageAlt: 'Plumbing',
    body: "That's why we created the No Drip Club, a complete peace of mind solution that helps you avoid unexpected water quality issues and costly repairs. With flexible financing options, you can maintain your home's water systems without breaking the bank.",
    ctaLabel: 'JOIN NOW',
    ctaHref: '/no-drip-club',
    rightImage: 'https://d1rplazj5a80fb.cloudfront.net/images/preventative.webp',
    rightImageAlt: 'Plumbing',
  },
  articleSlugs: [
    '4-headaches-you-can-avoid-with-plumbing-maintenance',
    'pvc-vs-abs-pipes',
    '45532-boost-your-water-heaters-efficiency-the-role-of-ventilation-in-arlington-heights-homes',
  ],
  bottomCta: {
    leftImage: 'https://d1rplazj5a80fb.cloudfront.net/images/plumbing-hero.jpg',
    leftImageAlt: 'Plumbing',
    label: 'TURN A TIGHT SPOT INTO A SMART PLAN',
    innerImage: 'https://d1rplazj5a80fb.cloudfront.net/images/plumbing-hero.jpg',
    innerImageAlt: 'Plumbing',
    body: 'What are you waiting for? Get the financing you need today and make your plumbing repairs affordable.',
    ctaLabel: 'MAKE A GOOD CALL',
    // Brief 95 (B.2): ctaHref merges from Global Settings in page.tsx.
  },
} as const;
