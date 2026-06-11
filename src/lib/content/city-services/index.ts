import type { CityServiceContent } from '@/types/city-service';
import { HYDRO_JETTING } from './hydro-jetting';

const SERVICE_REGISTRY: Record<string, CityServiceContent> = {
  'hydro-jetting': HYDRO_JETTING,
};

export function getCityService(serviceSlug: string): CityServiceContent | undefined {
  return SERVICE_REGISTRY[serviceSlug];
}

export function getAllServiceSlugs(): string[] {
  return Object.keys(SERVICE_REGISTRY);
}
