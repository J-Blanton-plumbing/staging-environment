/**
 * Brief 229 (Track B) — the 7 Tier 3 town pages of the City Pruning Phase 1 Pilot.
 *
 * Copy: data/city-pruning/phase1-pilot/towns/{slug}.json, extracted byte-for-byte from the package MDs
 * by scripts/city-pruning/extract-phase1-copy.mjs (the MD frontmatter and research "Sources" tables
 * are not carried over; the only change is the City Hub ’ convention). Titles and metas:
 * data/city-pruning/phase1-pilot/tier3_titles_metas.csv (rendered EXACTLY, no brand suffix).
 *
 * The page renders from this code data; its `city_pages` row (template 'tier3-town', created by
 * scripts/city-pruning/apply-phase1-pilot.ts) is the publish gate and the sitemap's lastmod — an
 * unpublished row 404s the page, as on every other city template. (No /admin editor for this template
 * yet — a Phase 2 follow-up.)
 */
import frankfort from '../../../data/city-pruning/phase1-pilot/towns/frankfort-il.json';
import orlandPark from '../../../data/city-pruning/phase1-pilot/towns/orland-park-il.json';
import parkForest from '../../../data/city-pruning/phase1-pilot/towns/park-forest-il.json';
import parkRidge from '../../../data/city-pruning/phase1-pilot/towns/park-ridge-il.json';
import niles from '../../../data/city-pruning/phase1-pilot/towns/niles-il.json';
import mortonGrove from '../../../data/city-pruning/phase1-pilot/towns/morton-grove-il.json';
import lincolnwood from '../../../data/city-pruning/phase1-pilot/towns/lincolnwood-il.json';
import data from './phase1-data.json';
import { pruneHref } from './phase1';

export interface TownPage {
  url: string;
  town: string;
  state: string;
  hub: string;
  hubUrl: string;
  featuredService: string;
  region: string;
  hero: { eyebrow: string; h1: string; intro: string };
  services: {
    eyebrow: string;
    h2: string;
    intro: string;
    cards: Array<{ tag: string; h3: string; paragraph: string; cta: string; href: string }>;
    redBar: { label: string; href: string };
  };
  office: {
    eyebrow: string;
    h2: string;
    body: string;
    addressName: string;
    address: string;
    license: string;
    panelHeading: string;
    communities: Array<{ label: string; href?: string }>;
    closing: string;
  };
  why: { h2: string; intro: string; items: Array<{ h3: string; body: string }> };
  reviews: { h2: string; items: Array<{ text: string; name: string }> };
  faq: Array<{ q: string; a: string }>;
  ndc: { h2: string; body: string };
  final: { h2: string; body: string };
}

const TOWNS: Readonly<Record<string, TownPage>> = {
  'frankfort-il': frankfort as TownPage,
  'orland-park-il': orlandPark as TownPage,
  'park-forest-il': parkForest as TownPage,
  'park-ridge-il': parkRidge as TownPage,
  'niles-il': niles as TownPage,
  'morton-grove-il': mortonGrove as TownPage,
  'lincolnwood-il': lincolnwood as TownPage,
};

/**
 * The town's copy, with every service link normalised to the hub's NEW pages (README §2: cards link to
 * `/{hub}-il/{service}` — the Frankfort MD's buttons still read `/mokena/…`, the 301 source).
 */
export function getTownPage(slug: string): TownPage | null {
  const t = TOWNS[slug];
  if (!t) return null;
  return {
    ...t,
    services: {
      ...t.services,
      cards: t.services.cards.map((c) => ({ ...c, href: pruneHref(c.href) })),
      redBar: { ...t.services.redBar, href: pruneHref(t.services.redBar.href) },
    },
  };
}

/** Title + meta from tier3_titles_metas.csv. The title renders exactly as written (no brand suffix). */
export function townMeta(slug: string): { title: string; description: string } | null {
  return (data.townMeta as Record<string, { title: string; description: string }>)[`/${slug}`] ?? null;
}

/**
 * Shared Sections v2 (Shared_Sections_v2_Changes.md §1): the financing band's fixed copy, the same on
 * every template that uses it (the 7 town pages here).
 */
export const FIN2 = {
  labelTop: 'As low as',
  labelValue: '0%',
  eyebrow: 'Financing',
  h2Desktop: 'Fix It Today Before It Turns Into Costly Damage',
  h2Mobile: 'Fix It With Financing As Low As 0%',
  body: 'A big plumbing repair never comes at a good time. We’ve partnered with trusted lenders, so you can get it fixed now and pay over time.',
  cta: 'Ask about financing options',
  fine: 'Subject to credit approval. Rates and terms vary.',
} as const;

/** Shared Sections v2 §2: the No Drip Club band's fixed copy (the H2 and body come from each page). */
export const NDC2 = {
  eyebrowDesktop: 'Annual Protection Plan',
  eyebrowMobile: 'No Drip Club',
  cta: 'See All No Drip Club Perks',
  href: '/no-drip-club',
  /** H2 → the benefit it promotes, removed from the list (the table in Shared_Sections_v2 §2). */
  promoted: {
    'Join and Get 2 Free Maintenance Visits a Year': 'Two Free Professional Maintenance Visits per Year',
    'Join and Save 10% on Plumbing and Sewer Services': '10% Discount on All General Plumbing & Sewer Services',
    'Join and Skip the Line When You Need Us': 'VIP Priority Scheduling Status (Skip the Queue)',
    'Join and Get a 5-Year Warranty on Approved Projects': '5-Year Parts and Labor Warranty on Approved Projects',
  } as Readonly<Record<string, string>>,
} as const;
