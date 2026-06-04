export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  image: string; // /images/...
  href: string; // /knowledge-hub/<slug>
}

export const ARTICLES: Article[] = [
  {
    slug: 'prepare-your-home-plumbing-for-the-chicago-cold-snap',
    title: 'Prepare Your Home Plumbing for the Chicago Cold Snap',
    excerpt:
      'Prepare Your Home Plumbing for the Chicago Cold Snap With the recent forecast predicting a significant drop in temperatures and snow…',
    image: '/images/article-coldsnap.webp',
    href: '/knowledge-hub/prepare-your-home-plumbing-for-the-chicago-cold-snap',
  },
  {
    slug: 'brown-friday-plumbing-drain-clog-emergency',
    title:
      'It’s Brown Friday: Is Your Plumbing Paying the Price for Yesterday’s Feast?',
    excerpt:
      'It’s Brown Friday: Is Your Plumbing Paying the Price for Yesterday’s Feast? Today is Brown Friday, historically one of the busiest…',
    image: '/images/article-garbage-disposal.webp',
    href: '/knowledge-hub/brown-friday-plumbing-drain-clog-emergency',
  },
  {
    slug: 'sewer-replacement-old-homes-chicagoland',
    title:
      'Is Your Old House Sewer a Ticking Time Bomb? Why Chicagoland Homeowners Should Consider Replacement',
    excerpt:
      'Is Your Old House Sewer a Ticking Time Bomb? Why Chicagoland Homeowners Should Consider Replacement For homeowners in older Chicagoland properties,…',
    image: '/images/article-sewer-lining.webp',
    href: '/knowledge-hub/sewer-replacement-old-homes-chicagoland',
  },
  {
    slug: 'where-did-those-pink-stains-in-your-bathroom-come-from',
    title: 'Where Do Pink Water Stains in Your Bathroom Come From?',
    excerpt:
      "If you scrub your bathroom only to discover slimy pink stains returning a few weeks later, you're not alone. These stubborn marks can appear around sink basins, inside toilet bowls, on shower curtains, and around tub drains…",
    image: '/images/article-pink-stains.webp',
    href: '/knowledge-hub/where-did-those-pink-stains-in-your-bathroom-come-from',
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

/** Resolve a list of slugs to Articles, preserving order. Unknown slugs are dropped. */
export function getArticles(slugs: string[]): Article[] {
  return slugs
    .map((slug) => getArticle(slug))
    .filter((a): a is Article => Boolean(a));
}
