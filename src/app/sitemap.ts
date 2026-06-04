import { MetadataRoute } from 'next';
import { SERVICES } from '@/lib/services';
import { LOCATIONS } from '@/lib/locations';

const BASE = 'https://jblantonplumbing.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const serviceUrls = SERVICES.map((s) => ({
    url: `${BASE}/services/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [
    { url: BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/services`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    ...serviceUrls,
    { url: `${BASE}/booking`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/emergency`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/no-drip-club`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/locations`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/reviews`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/why-us`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];
}
