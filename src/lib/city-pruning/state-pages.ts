/**
 * Brief 229 (Track D) — the two state pages' copy, verbatim from State_Page_Template_v1_Changes.md
 * (§4 hero, §5 trust, §6 finder, §7 areas, §8 head). Titles: the MD's ends with "| J. Blanton Plumbing";
 * `pageTitle()` strips it so the root layout's template adds it exactly once (these two pages keep the
 * automatic suffix — they are not among the 10 suffix-free pages).
 */
import { pageTitle } from '@/lib/seo';
import type { StatePageCopy } from '@/components/city-pruning/LocationsViews';

export const STATE_COPY: Record<'illinois' | 'ohio', StatePageCopy & { title: string; description: string }> = {
  illinois: {
    key: 'illinois',
    name: 'Illinois',
    crumb: 'Illinois',
    eyebrow: 'Serving Homeowners for 30+ Years',
    h1: 'Plumbers in Illinois',
    intro:
      'We have local offices across Chicago and the suburbs, so the plumber who comes to your door works in your area. Find your closest office below, or call us any time, day or night.',
    photo: { src: '/images/locations/hero-chicago-skyline.webp', width: 3000, height: 1686, alt: 'Aerial view of the Chicago skyline and the Lake Michigan shoreline at dusk' },
    licensed: 'Licensed Illinois plumbers',
    finderHeading: 'Find Your Closest Illinois Office',
    areasH2: 'Every Illinois Town and Neighborhood We Cover',
    capsule:
      'J. Blanton Plumbing serves homeowners in Chicago and its suburbs across Cook, Lake, DuPage, McHenry, Will and Kane counties, from the North Shore and the Fox Valley to the southwest suburbs. Search the list below to check your town. Looking for Columbus? See our [Ohio locations](/locations/ohio).',
    title: pageTitle('Plumbers in Illinois | Chicago & Suburbs | J. Blanton Plumbing'),
    description:
      'Find your closest J. Blanton Plumbing office in Chicago and the suburbs. Local plumbers across Cook, Lake, DuPage, McHenry, Kane and Will counties, available 24/7.',
  },
  ohio: {
    key: 'ohio',
    name: 'Ohio',
    crumb: 'Ohio',
    eyebrow: 'Serving Homeowners for 30+ Years',
    h1: 'Plumbers in Ohio',
    intro:
      'Our Columbus office serves homeowners across the city and Central Ohio, so the plumber who comes to your door works in your area. Check if we serve your town below, or call us any time, day or night.',
    // Identical file to the /locations Ohio card photo (state-ohio.webp = the package's hero-columbus-skyline.webp).
    photo: { src: '/images/locations/state-ohio.webp', width: 6000, height: 4000, alt: 'The downtown Columbus skyline and a bridge over the Scioto River' },
    licensed: 'Licensed Ohio plumbers',
    finderHeading: 'Find Your Ohio Office',
    areasH2: 'Every Ohio Town and Neighborhood We Cover',
    capsule:
      'J. Blanton Plumbing serves homeowners in Columbus and Central Ohio, from the city’s neighborhoods to Westerville, Dublin, Hilliard and Lancaster. Search the list below to check your town. Looking for Chicagoland? See our [Illinois locations](/locations/illinois).',
    title: pageTitle('Plumbers in Ohio | Columbus & Central Ohio | J. Blanton Plumbing'),
    description:
      'J. Blanton Plumbing serves Columbus and Central Ohio from our local Columbus office, with plumbers available 24/7. Search by town, neighborhood or ZIP.',
  },
};
