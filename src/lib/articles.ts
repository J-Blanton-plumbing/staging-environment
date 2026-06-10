export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  image: string; // /images/...
  href: string; // /knowledge-hub/<slug>
  heroImage: string; // Full CDN URL or '' for Cream placeholder
  subtitle: string;
  readTime: string;
  body: string; // Rich HTML string
}

export const ARTICLES: Article[] = [
  {
    slug: 'prepare-your-home-plumbing-for-the-chicago-cold-snap',
    title: 'Prepare Your Home Plumbing for the Chicago Cold Snap',
    subtitle: 'Everything you need to know, directly from the experts.',
    heroImage: '',
    readTime: '2 minutes',
    excerpt:
      'Prepare Your Home Plumbing for the Chicago Cold Snap With the recent forecast predicting a significant drop in temperatures and snow…',
    image: '/images/article-coldsnap.webp',
    href: '/knowledge-hub/prepare-your-home-plumbing-for-the-chicago-cold-snap',
    body: `<p>With the recent forecast predicting a significant drop in temperatures and snow for the Chicago area, now is the critical time to prepare your home's plumbing system against the harsh cold. Frozen pipes are one of the most common and costly winter emergencies. A little preparation today can save you from a major headache tomorrow.</p>
<p>Here are a few essential steps you can take right now to protect your pipes:</p>
<ul>
  <li><strong>Insulate Exposed Pipes:</strong> Focus on pipes located in unheated areas like basements, crawl spaces, attics, and garages. Use pipe sleeves or heat tape to provide an extra layer of protection.</li>
  <li><strong>Disconnect Outdoor Hoses:</strong> Remove all garden hoses from outdoor spigots. Turn off the water supply to exterior faucets and drain the lines to prevent freezing and bursting.</li>
  <li><strong>Keep Water Moving:</strong> For pipes that are vulnerable to freezing, allow a small trickle of cold water to run from a faucet. Moving water is less likely to freeze.</li>
  <li><strong>Open Cabinet Doors:</strong> For kitchen and bathroom sinks on exterior walls, open the cabinet doors to allow warmer air from the room to circulate around the pipes.</li>
  <li><strong>Maintain Indoor Heat:</strong> Even if you plan to be away, keep your thermostat set to at least 55°F (13°C) to ensure pipes in walls and floors stay warm enough.</li>
</ul>
<h2>We're Here When You Need Us</h2>
<p>At J. Blanton Plumbing, your peace of mind is our priority. As the cold weather settles in, we want to remind you that we are here to help with all your plumbing needs, from routine maintenance to emergency situations.</p>
<h3>Need a Hand with Winterization?</h3>
<p>If you're unsure about your home's readiness or need professional assistance with pipe insulation or winterizing your system, don't hesitate to call us.</p>
<h3>Plumbing Emergency?</h3>
<p>If you experience a burst pipe or any other plumbing crisis, know that we are ready to respond quickly. <strong>Do not wait.</strong> Shut off your main water supply immediately and call J. Blanton Plumbing right away.</p>
<p>Stay warm, stay safe, and let us take care of the rest.</p>`,
  },
  {
    slug: 'brown-friday-plumbing-drain-clog-emergency',
    title:
      'It’s Brown Friday: Is Your Plumbing Paying the Price for Yesterday’s Feast?',
    subtitle: '',
    heroImage: '',
    readTime: '',
    excerpt:
      'It’s Brown Friday: Is Your Plumbing Paying the Price for Yesterday’s Feast? Today is Brown Friday, historically one of the busiest…',
    image: '/images/article-garbage-disposal.webp',
    href: '/knowledge-hub/brown-friday-plumbing-drain-clog-emergency',
    body: '',
  },
  {
    slug: 'sewer-replacement-old-homes-chicagoland',
    title:
      'Is Your Old House Sewer a Ticking Time Bomb? Why Chicagoland Homeowners Should Consider Replacement',
    subtitle: '',
    heroImage: '',
    readTime: '',
    excerpt:
      'Is Your Old House Sewer a Ticking Time Bomb? Why Chicagoland Homeowners Should Consider Replacement For homeowners in older Chicagoland properties,…',
    image: '/images/article-sewer-lining.webp',
    href: '/knowledge-hub/sewer-replacement-old-homes-chicagoland',
    body: '',
  },
  {
    slug: 'where-did-those-pink-stains-in-your-bathroom-come-from',
    title: 'Where Do Pink Water Stains in Your Bathroom Come From?',
    subtitle: '',
    heroImage: '',
    readTime: '',
    excerpt:
      "If you scrub your bathroom only to discover slimy pink stains returning a few weeks later, you're not alone. These stubborn marks can appear around sink basins, inside toilet bowls, on shower curtains, and around tub drains…",
    image: '/images/article-pink-stains.webp',
    href: '/knowledge-hub/where-did-those-pink-stains-in-your-bathroom-come-from',
    body: '',
  },
  {
    slug: '4-headaches-you-can-avoid-with-plumbing-maintenance',
    title: '4 Headaches You Can Avoid With Plumbing Maintenance',
    subtitle: '',
    heroImage: '',
    readTime: '',
    excerpt:
      'Regular plumbing maintenance can save you from costly emergency repairs. Discover four common headaches — from clogged drains to water heater failures — that a simple preventive check can keep at bay.',
    image: '/images/clogged-drains.webp',
    href: '/knowledge-hub/4-headaches-you-can-avoid-with-plumbing-maintenance',
    body: '',
  },
  {
    slug: 'pvc-vs-abs-pipes',
    title: 'PVC vs ABS Pipes: Which Is Right for Your Home?',
    subtitle: '',
    heroImage: '',
    readTime: '',
    excerpt:
      'Both PVC and ABS are popular drain pipe materials, but they perform differently depending on temperature, local codes, and installation method. Here\'s what every homeowner should know before a re-pipe.',
    image: '/images/article-sewer-lining.webp',
    href: '/knowledge-hub/pvc-vs-abs-pipes',
    body: '',
  },
  {
    slug: '45532-boost-your-water-heaters-efficiency-the-role-of-ventilation-in-arlington-heights-homes',
    title: "Boost Your Water Heater's Efficiency: The Role of Ventilation in Arlington Heights Homes",
    subtitle: '',
    heroImage: '',
    readTime: '',
    excerpt:
      'Poor ventilation is one of the leading causes of water heater inefficiency and early failure. Learn how proper venting protects your system and keeps energy bills in check for Arlington Heights homeowners.',
    image: '/images/article-coldsnap.webp',
    href: '/knowledge-hub/45532-boost-your-water-heaters-efficiency-the-role-of-ventilation-in-arlington-heights-homes',
    body: '',
  },
];

// Lowercase alias for generateStaticParams imports in article page
export const articles = ARTICLES;

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

/** Resolve a list of slugs to Articles, preserving order. Unknown slugs are dropped. */
export function getArticles(slugs: string[]): Article[] {
  return slugs
    .map((slug) => getArticle(slug))
    .filter((a): a is Article => Boolean(a));
}
