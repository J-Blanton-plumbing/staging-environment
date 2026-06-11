import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CITY_REGISTRY, getCity } from '@/lib/content/cities';
import { getCityService, getAllServiceSlugs } from '@/lib/content/city-services';
import CityServicePageTemplate, { replaceCityTokens } from '@/components/CityServicePageTemplate';

export const dynamicParams = false;

export function generateStaticParams() {
  const serviceSlugs = getAllServiceSlugs();
  return CITY_REGISTRY.flatMap((city) =>
    serviceSlugs.map((service) => ({ city: city.slug, service })),
  );
}

export function generateMetadata({
  params,
}: {
  params: { city: string; service: string };
}): Metadata {
  const cityEntry = getCity(params.city);
  const serviceData = getCityService(params.service);
  if (!cityEntry || !serviceData) return {};
  return {
    title: replaceCityTokens(serviceData.seo.title, cityEntry.name),
    description: replaceCityTokens(serviceData.seo.description, cityEntry.name),
  };
}

export default function CityServicePage({
  params,
}: {
  params: { city: string; service: string };
}) {
  const cityEntry = getCity(params.city);
  const serviceData = getCityService(params.service);
  if (!cityEntry || !serviceData) notFound();
  return <CityServicePageTemplate city={cityEntry} service={serviceData} />;
}
