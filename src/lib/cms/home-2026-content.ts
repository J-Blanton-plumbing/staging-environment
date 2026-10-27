/**
 * Brief 220 — the content model of "Homepage 2026" (Real Jobs, no Elfsight): every piece of copy and
 * every image the design shows, stored as flat keys in `main_pages.content` for the row `home-2026`
 * (the Brief 219 `home-content.ts` pattern: snake_case scalars, one array per repeatable set, stable
 * item ids, array position = order).
 *
 * The ONE list of fields. The /admin/home "Homepage 2026" editor, the sanitizer
 * (`sanitizeHome2026Content` in `@/lib/cms/sanitize`), the seed (`scripts/seed-brief-220-home-2026.ts`)
 * and the page all read it.
 *
 * Client-safe on purpose: no DB, no sanitize-html. The page runs `sanitizeHome2026Content` (server)
 * and then `resolveHome2026Content` (here), so a preview renders exactly what a publish would store.
 *
 * What is NOT here, by design (it comes from data the site already holds): the phone number (Global
 * Settings), the offices and their addresses (Global Settings), region names / counties / community
 * counts (`locations-regions.ts`), the services directory (`service-taxonomy.ts`), the Knowledge Hub
 * card text (the articles themselves), the hero pills (the shared `HeroNav` links).
 *
 * Layout is locked: sections can't be added, removed or reordered. Only the items inside a set can.
 */

/** The `main_pages` slug of the Homepage 2026 record. It has NO public URL of its own. */
export const HOME_2026_SLUG = 'home-2026';
/** Its `page_drafts.page_type` (an alias of canonical `main`, like 'city-hub-shared'). */
export const HOME_2026_PAGE_TYPE = 'home-2026';
/** The template marker stamped on every Homepage 2026 version (`page_drafts.template_type`) and
 *  carried in its content as `template`, so Classic and 2026 content can never cross editors. */
export const HOME_2026_TEMPLATE = 'home-2026';

export type Home2026FieldKind =
  | 'text' // one line, plain text
  | 'textarea' // plain text, may wrap
  | 'paragraphs' // plain text, paragraphs separated by a blank line
  | 'image' // rendered through next/image: a site path or an allowed https host
  | 'media' // a <video> source or poster: a site path or any https URL
  | 'url' // a link: a site path or an https URL
  | 'youtube'; // a YouTube video id (a pasted watch / embed / youtu.be URL is reduced to the id)

export interface H26TextItem {
  id: string;
  text: string;
}
export interface H26ServiceCard {
  id: string;
  title: string;
  href: string;
  description: string;
  image: string;
  alt: string;
}
export interface H26Photo {
  id: string;
  image: string;
  alt: string;
}
export interface H26Job {
  id: string;
  tab_title: string;
  tab_city: string;
  title: string;
  location: string;
  /** 1–5 (stored as a number; a string is accepted and parsed). */
  stars: number;
  quote: string;
  author: string;
  author_label: string;
  /** Optional: blank hides "Read on Google". */
  review_url: string;
  photos: H26Photo[];
}
export interface H26FeaturedItem {
  id: string;
  slug: string;
}

const IMG = '/images/home-2026';

/**
 * Every scalar field: its kind and its default (= the approved prototype, 2026-10-27).
 * Key order is section order, top to bottom. `{rating}` / `{review_count}` in any text are replaced
 * by the one rating pair (B2 + B5 share it: one edit updates both places).
 */
export const H26_SCALAR_FIELDS: Record<string, { kind: Home2026FieldKind; def: string }> = {
  hero_eyebrow: { kind: 'text', def: 'Serving Homeowners for 30+ Years' },
  hero_h1: { kind: 'text', def: 'Plumbers in Chicagoland and Columbus, OH' },
  hero_intro: {
    kind: 'textarea',
    def: 'From clogged drains to full sewer line work, we always answer your call and all your questions. Our technicians will walk you through your options and give you a flat rate before work begins. No surprises.',
  },
  hero_cta: { kind: 'text', def: 'Make a Good Call' },
  hero_poster: { kind: 'media', def: '/images/hero-poster.webp' },
  hero_video_desktop: { kind: 'media', def: '/videos/homepage-hero-desktop.webm' },
  hero_video_mobile: { kind: 'media', def: '/videos/homepage-hero-mobile.webm' },

  rating: { kind: 'text', def: '4.7' },
  review_count: { kind: 'text', def: '5,669+' },
  trust_label: { kind: 'text', def: 'Why homeowners trust J. Blanton' },

  services_eyebrow: { kind: 'text', def: 'What We Fix' },
  services_heading: { kind: 'text', def: 'Services' },
  services_intro: {
    kind: 'textarea',
    def: 'Our team of tenacious plumbers are always ready to leap into action to save your day, no matter how light or severe the situation.',
  },
  services_card_cta: { kind: 'text', def: 'Read More' },
  services_dir_title: { kind: 'text', def: 'Explore all our plumbing services' },
  services_dir_count: { kind: 'text', def: '{count} services' },

  areas_eyebrow: { kind: 'text', def: 'Where We Work' },
  areas_heading: { kind: 'text', def: 'Areas We Service' },
  areas_intro: { kind: 'textarea', def: 'Choose your region to see every city and neighborhood we cover.' },
  areas_stat_template: { kind: 'text', def: '{tenure}, {count} communities' },
  areas_image_chicagoland: { kind: 'image', def: '/images/region-chicagoland.webp' },
  areas_image_alt_chicagoland: { kind: 'text', def: 'The Chicago skyline at dusk, seen across the lakefront' },
  areas_cta_chicagoland: { kind: 'text', def: 'See Chicagoland Areas' },
  areas_image_columbus: { kind: 'image', def: '/images/region-central-ohio.webp' },
  areas_image_alt_columbus: { kind: 'text', def: 'The Columbus, Ohio skyline at night, reflected in the Scioto River' },
  areas_cta_columbus: { kind: 'text', def: 'See Central Ohio Areas' },

  reviews_eyebrow: { kind: 'text', def: 'Customer Stories' },
  reviews_heading: { kind: 'text', def: 'Real Jobs, Real Reviews' },
  reviews_intro: {
    kind: 'textarea',
    def: 'The plumbing industry has a problem: over 600,000 one-star reviews on Google, nationwide. No-shows, inflated quotes, and unlicensed work happen often enough to be the norm. We set out to be the exception. Here’s what our customers say happens when we show up instead.',
  },
  proof_sub: { kind: 'text', def: '{review_count} Google reviews across all locations' },
  bbb_url: { kind: 'url', def: 'https://www.bbb.org/us/il/morton-grove/profile/plumber/j-blanton-plumbing-0654-88664305/#sealclick' },
  bbb_seal: { kind: 'image', def: `${IMG}/bbb-seal.webp` },
  bbb_seal_alt: { kind: 'text', def: 'BBB Accredited Business seal' },
  bbb_label: { kind: 'text', def: 'Accredited business. View our BBB profile' },
  jobs_label: { kind: 'text', def: 'Recent jobs' },
  jobs_photos_label: { kind: 'text', def: 'photos from this job' },
  jobs_read_on_google: { kind: 'text', def: 'Read on Google' },

  why_eyebrow: { kind: 'text', def: 'Since 1993' },
  why_heading: { kind: 'text', def: 'Why J. Blanton' },
  why_body: {
    kind: 'paragraphs',
    def:
      'At J. Blanton, we understand the importance of an owner’s home. We know that when disaster strikes, you need more than just a plumber; you need a problem solver who can bring fast relief to unexpected chaos.' +
      '\n\n' +
      'For more than 30 years, our professionals have raced through heat, rain, snow, and hail to restore order and peace back into the homes of many Chicagoland families.',
  },
  why_cta_call: { kind: 'text', def: 'Make a Good Call' },
  why_cta_label: { kind: 'text', def: 'Why J. Blanton' },
  why_video_id: { kind: 'youtube', def: 'ZDFzUtjBUCk' },
  why_video_title: { kind: 'text', def: 'Turning Bad Calls to Good Calls' },

  ndc_mark: { kind: 'text', def: 'No Drip Club' },
  ndc_body: {
    kind: 'textarea',
    def: 'There are Good Calls, and then there’s the No Drip Club. Members enjoy significant annual savings on home checkups, emergency repairs, and unlock exclusive perks, including VIP treatment whenever they call for service.',
  },
  ndc_cta: { kind: 'text', def: 'Join the No Drip Club' },
  ndc_image: { kind: 'image', def: '/images/jbcharacter.webp' },
  ndc_image_alt: { kind: 'text', def: 'J. Blanton Character' },

  kh_eyebrow: { kind: 'text', def: 'Tips & Answers' },
  kh_heading: { kind: 'text', def: 'Knowledge Hub' },
  kh_intro: { kind: 'textarea', def: 'Check out the Knowledge Hub for FAQs and helpful tips on all things plumbing.' },
  kh_card_cta: { kind: 'text', def: 'Read More' },
  kh_cta: { kind: 'text', def: 'View All Articles' },

  loc_eyebrow: { kind: 'text', def: 'Local Offices' },
  loc_heading: { kind: 'text', def: 'Where to Find Us' },
  loc_intro: {
    kind: 'textarea',
    def: 'J. Blanton Plumbing has local offices throughout Chicagoland and, more recently, in Columbus, serving homeowners across Central Ohio. Every office is staffed by plumbers who work in your area, not a call center routing you to a subcontractor.',
  },
  loc_search_label: { kind: 'text', def: 'Search for your city or town' },
  loc_search_placeholder: { kind: 'text', def: 'Search by city, neighborhood, or ZIP' },
  loc_count: { kind: 'text', def: '{count} Locations' },
  loc_match: { kind: 'text', def: 'Serves {cities}' },
  loc_empty: { kind: 'text', def: 'No office matches that search.' },
  loc_empty_link: { kind: 'text', def: 'See all the areas we serve' },
  loc_map_title: { kind: 'text', def: 'Map of J. Blanton Plumbing office locations' },
  loc_map_button: { kind: 'text', def: 'Show the interactive map' },
  loc_open_maps: { kind: 'text', def: 'Open in Maps' },
};

/** Text fields where `{rating}` / `{review_count}` are filled in. */
const RATING_TOKEN_FIELDS = new Set(['proof_sub']);

export const H26_LIMITS = { trust: 3, cards: 8, jobs: 8, photos: 8, featured: 6 } as const;

const photo = (folder: string, file: string, alt: string): H26Photo => ({
  id: file.replace(/\.[a-z]+$/, ''),
  image: `${IMG}/jobs/${folder}/${file}`,
  alt,
});

/** The repeatable sets' defaults: the prototype, in its order (copy, photo order, alt text). */
export const H26_LIST_DEFAULTS: {
  trust_items: H26TextItem[];
  services_cards: H26ServiceCard[];
  jobs: H26Job[];
  kh_featured: H26FeaturedItem[];
} = {
  trust_items: [
    { id: 'trust-1', text: 'In business since 1993' },
    { id: 'trust-2', text: 'Flat-rate price before work begins' },
    { id: 'trust-3', text: '{rating} stars · {review_count} Google reviews' },
  ],
  services_cards: [
    { id: 'emergency', title: 'Emergency', href: '/emergency-plumbing', description: 'We offer fast drain and plumbing services for emergencies.', image: `${IMG}/cards/svc-emergency.webp`, alt: 'Homeowner on the phone while water leaks from the pipe under her kitchen sink into a bucket' },
    { id: 'plumbing', title: 'Plumbing', href: '/services/plumbing', description: 'Our Illinois-certified plumbers are trained and skilled for complex plumbing tasks.', image: `${IMG}/cards/plumbing.webp`, alt: 'J. Blanton plumber working on the faucet of a basement utility sink' },
    { id: 'sewer', title: 'Sewer', href: '/services/sewer', description: 'Sewer services ensure clogs are resolved and plumbing stays smooth.', image: `${IMG}/cards/sewer.webp`, alt: 'J. Blanton plumber running sewer lining equipment in a backyard' },
    { id: 'drain', title: 'Drain', href: '/services/drain', description: 'Drain services keep your home’s plumbing running smoothly.', image: `${IMG}/cards/drains.webp`, alt: 'J. Blanton plumber working on the drain under a kitchen sink' },
    { id: 'water-heater', title: 'Water Heater', href: '/services/water-heater', description: 'Ensure consistent hot water with J. Blanton Plumbing’s.', image: `${IMG}/cards/water-heater.webp`, alt: 'J. Blanton plumber measuring for a water heater installation' },
    { id: 'water-quality', title: 'Water Quality', href: '/services/water-quality', description: 'Water filtration ensures clean, safe water and protects your health and plumbing.', image: `${IMG}/cards/svc-water-quality.webp`, alt: 'Under-sink water filtration system installed by J. Blanton Plumbing' },
    { id: 'commercial', title: 'Commercial', href: '/services/commercial', description: 'Reliable and efficient plumbing solutions tailored to meet the needs of your business.', image: `${IMG}/cards/commercial.webp`, alt: 'J. Blanton plumber checking a commercial pump system' },
  ],
  jobs: [
    {
      id: 'sewer-lining',
      tab_title: 'Sewer Lining',
      tab_city: 'Joliet',
      title: 'Sewer Lining',
      location: 'Joliet, IL',
      stars: 5,
      quote: 'Kurt, Jacob, Colton, and Nick from J Blanton plumbing completed our sewer lining after their team identified root intrusion during a regular inspection. They arrived on time, worked diligently throughout the day, and took the time to review the completed lining video when done. They identified a branching line that others had missed previously and called in the necessary support to address the issue. Great work by the team.',
      author: 'Matthew McBain',
      author_label: 'Verified Customer',
      review_url: 'https://maps.app.goo.gl/YDX1DfXyfowUVQ1g6',
      photos: [
        photo('sewer-lining', 'sewer-lining03.webp', 'J. Blanton plumber reviewing the sewer camera feed on a monitor outside a Joliet home'),
        photo('sewer-lining', 'sewer-lining02.webp', 'Sewer cleanout opened in the yard with camera and jetting equipment set up beside it'),
        photo('sewer-lining', 'sewer-lining01.webp', 'Sewer camera reel and lining equipment staged next to the home'),
        photo('sewer-lining', 'sewer-lining04.webp', 'Lining equipment and inversion drum set up on the front walk'),
        photo('sewer-lining', 'sewer-lining05.webp', 'Lining resin buckets and curing gear inside the J. Blanton trailer'),
        photo('sewer-lining', 'sewer-lining06.jpg', 'J. Blanton plumber preparing the sewer liner on the trailer workbench'),
      ],
    },
    {
      id: 'wh-installation',
      tab_title: 'Water Heater Installation',
      tab_city: 'Chicago',
      title: 'Water Heater Installation',
      location: 'Chicago, IL',
      stars: 5,
      quote: 'Okay, first things first: the technicians? Absolute rockstars. 10/10. Personable, friendly, great folks. The team that came out to install our water heater was quick, efficient, super communicative, and honestly just a pleasure to work with. They explained everything clearly, got in, got it done, and made the whole process feel easy. If I could request the same crew every time, I absolutely would. […]',
      author: 'Mary Catherine Nedbalski',
      author_label: 'Verified Customer',
      review_url: '',
      photos: [
        photo('wh-installation', 'wh-installation02.webp', 'J. Blanton plumber connecting the gas control on a new water heater'),
        photo('wh-installation', 'wh-installation01.webp', 'J. Blanton plumber working at the base of the water heater in a basement utility area'),
        photo('wh-installation', 'wh-installation05.webp', 'New water heater installed in the basement utility area'),
        photo('wh-installation', 'wh-installation06.jpg', 'Gas control valve and burner access on the newly installed water heater'),
        photo('wh-installation', 'wh-installation04.webp', 'Gas line and water connections next to the new water heater'),
        photo('wh-installation', 'wh-installation03.jpg', 'Copper water lines and venting above a basement water heater'),
      ],
    },
    {
      id: 'ndc-01',
      tab_title: 'No Drip Club',
      tab_city: 'Joliet',
      title: 'No Drip Club',
      location: 'Joliet, IL',
      stars: 5,
      quote: 'Christian and Julian recently came by as part of the no-drip club’s preventative maintenance team. They inspected the pipes in my home that were having issues and diagnosed the issue quickly and in a way that was easy to understand. On top of being friendly and funny, they listened to my needs and recommended the best course of action according to my home situation. I highly recommend J Blanton for their service and Christian and Julian for their expertise, kindness, and for being genuine.',
      author: 'Cesar De La Rosa',
      author_label: 'Verified Customer',
      review_url: 'https://maps.app.goo.gl/uUPsvid9r5uWgMEv8',
      photos: [
        photo('ndc-01', 'ndc04.webp', 'J. Blanton plumber checking the plumbing under a bathroom vanity'),
        photo('ndc-01', 'ndc01.webp', 'J. Blanton plumber testing the drain on a bathroom sink'),
        photo('ndc-01', 'ndc02.webp', 'Drain trap and supply lines under a bathroom sink'),
        photo('ndc-01', 'ndc03.webp', 'J. Blanton plumber inspecting copper water lines in a basement'),
        photo('ndc-01', 'ndc05.webp', 'Plumber checking the shutoff valves under a sink'),
        photo('ndc-01', 'ndc06.webp', 'Water draining in a laundry tub during the maintenance visit'),
      ],
    },
    {
      id: 'ndc-02',
      tab_title: 'Water Heater Maintenance',
      tab_city: 'McHenry',
      title: 'Water Heater Maintenance',
      location: 'McHenry, IL',
      stars: 5,
      quote: 'This was a maintenance visit. Christian was the lead on the team. He drained the water heater and checked kitchen and bathroom plumbing. He effectively explained what they were doing and offered maintenance suggestions for our plumbing systems, explaining why such suggestions would be good for us. He listened to us and our questions and then set up an appointment to get estimates. He was overall a very effective communicator with a pleasant professional demeanor the entire appointment.',
      author: 'Mark Netherland',
      author_label: 'Verified Customer',
      review_url: 'https://maps.app.goo.gl/YMCPNyjRjP2LkcAS9',
      photos: [
        photo('ndc-02', 'ndc02-01.webp', 'J. Blanton plumber draining a basement water heater'),
        photo('ndc-02', 'ndc02-06.webp', 'Drain hose running from the water heater to the floor drain'),
        photo('ndc-02', 'ndc02-02.webp', 'J. Blanton plumber checking a toilet tank in the bathroom'),
        photo('ndc-02', 'ndc02-03.webp', 'Shower head and fixtures checked during the visit'),
        photo('ndc-02', 'ndc02-04.webp', 'J. Blanton plumber reviewing a camera inspection screen'),
        photo('ndc-02', 'ndc02-05.webp', 'Plumber working at the basement floor drain'),
      ],
    },
    {
      id: 'sewer-inspection',
      tab_title: 'Camera Inspection',
      tab_city: 'Geneva',
      title: 'Camera Inspection',
      location: 'Geneva, IL',
      stars: 5,
      quote: 'Andreas was very professional and showed me what was in my sewer. […]',
      author: 'Reginald Lawrence',
      author_label: 'Verified Customer',
      review_url: 'https://maps.app.goo.gl/Vq46rMGdhFwGKTtv9',
      photos: [
        photo('sewer-inspection', 'sewer-inspection02.webp', 'J. Blanton plumber showing the sewer camera footage on the monitor'),
        photo('sewer-inspection', 'sewer-inspection01.webp', 'J. Blanton plumber feeding the sewer camera into the line in a basement'),
        photo('sewer-inspection', 'sewer-inspection05.webp', 'Open sewer access in the basement floor'),
        photo('sewer-inspection', 'sewer-inspection04.webp', 'J. Blanton plumber locating the sewer line from the sidewalk'),
        photo('sewer-inspection', 'sewer-inspection03.webp', 'J. Blanton service truck parked outside the job'),
      ],
    },
  ],
  kh_featured: [
    { id: 'article-1', slug: 'prepare-your-home-plumbing-for-the-chicago-cold-snap' },
    { id: 'article-2', slug: 'brown-friday-plumbing-drain-clog-emergency' },
    { id: 'article-3', slug: 'sewer-replacement-old-homes-chicagoland' },
  ],
};

export const H26_LIST_KEYS = Object.keys(H26_LIST_DEFAULTS) as Array<keyof typeof H26_LIST_DEFAULTS>;
export const H26_CONTENT_KEYS: string[] = ['template', ...Object.keys(H26_SCALAR_FIELDS), ...H26_LIST_KEYS];

/** A deep copy of the default content — what the seed writes and the editor shows for a blank record. */
export function home2026Defaults(): Record<string, unknown> {
  return {
    template: HOME_2026_TEMPLATE,
    ...Object.fromEntries(Object.entries(H26_SCALAR_FIELDS).map(([k, f]) => [k, f.def])),
    ...JSON.parse(JSON.stringify(H26_LIST_DEFAULTS)),
  };
}

/** True when stored / draft content is Homepage 2026 content (carries the template marker). */
export function isHome2026Content(c: unknown): boolean {
  return !!c && typeof c === 'object' && !Array.isArray(c) && (c as Record<string, unknown>).template === HOME_2026_TEMPLATE;
}

// ── Validation (shared by the page, the seed gate and the editor's warnings) ──────────────────────

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|ogv)(\?|#|$)/i;
const isSitePath = (v: string) => v.startsWith('/') && !v.startsWith('//') && !/\s/.test(v);
const httpsHost = (v: string): string | null => {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' ? u.hostname : null;
  } catch {
    return null;
  }
};
export function isUsableImage(v: string, imageHosts: readonly string[]): boolean {
  if (!v || VIDEO_EXT.test(v)) return false;
  if (isSitePath(v)) return true;
  const host = httpsHost(v);
  return !!host && imageHosts.includes(host);
}
export const isUsableMedia = (v: string) => !!v && (isSitePath(v) || !!httpsHost(v));
export const isUsableUrl = (v: string) => !!v && (isSitePath(v) || !!httpsHost(v));
export function youtubeId(v: string): string | null {
  const s = v.trim();
  if (/^[A-Za-z0-9_-]{6,20}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,20})/);
  return m ? m[1] : null;
}
export const isArticleSlug = (v: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v);
/** A DOM-safe token for a job id (used in `id="job-…"`). */
export const domToken = (v: string, fallback: string) => {
  const t = v.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return t || fallback;
};

/** "{a} and {b}" style token fill; unknown tokens stay as typed. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
}

// ── Resolution: stored content → what the page renders ───────────────────────────────────────────

export interface Home2026Resolved {
  hero: { eyebrow: string; h1: string; intro: string; ctaLabel: string; poster: string; videoDesktop: string; videoMobile: string };
  rating: string;
  reviewCount: string;
  trust: { label: string; items: H26TextItem[] };
  services: { eyebrow: string; heading: string; intro: string; cardCta: string; cards: H26ServiceCard[]; dirTitle: string; dirCount: string };
  areas: {
    eyebrow: string;
    heading: string;
    intro: string;
    statTemplate: string;
    regions: Record<'chicagoland' | 'columbus', { image: string; alt: string; cta: string }>;
  };
  reviews: {
    eyebrow: string;
    heading: string;
    intro: string;
    proofSub: string;
    bbbUrl: string;
    bbbSeal: string;
    bbbSealAlt: string;
    bbbLabel: string;
    jobsLabel: string;
    photosLabel: string;
    readOnGoogle: string;
    jobs: H26Job[];
  };
  why: { eyebrow: string; heading: string; body: string[]; ctaCall: string; ctaLabel: string; videoId: string; videoTitle: string };
  ndc: { mark: string; body: string; cta: string; image: string; imageAlt: string };
  kh: { eyebrow: string; heading: string; intro: string; cardCta: string; cta: string; featuredSlugs: string[] };
  loc: {
    eyebrow: string;
    heading: string;
    intro: string;
    searchLabel: string;
    searchPlaceholder: string;
    count: string;
    match: string;
    empty: string;
    emptyLink: string;
    mapTitle: string;
    mapButton: string;
    openMaps: string;
  };
  /** Every field / set that fell back to its default (blank, missing or unusable). The seed's gate. */
  fallbacks: string[];
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown) => (Array.isArray(v) ? v : []);

/**
 * Stored content → render values. Never throws and never returns undefined: a blank, missing or
 * unusable value falls back to its default, so a half-filled row, a malformed array or a bad URL
 * can't break the page. `imageHosts` = the https hosts next.config allows for next/image.
 */
export function resolveHome2026Content(raw: unknown, imageHosts: readonly string[] = []): Home2026Resolved {
  const d = obj(raw);
  const fallbacks: string[] = [];
  const usable = (kind: Home2026FieldKind, s: string): string | null => {
    const t = s.trim();
    if (!t) return null;
    if (kind === 'image') return isUsableImage(t, imageHosts) ? t : null;
    if (kind === 'media') return isUsableMedia(t) ? t : null;
    if (kind === 'url') return isUsableUrl(t) ? t : null;
    if (kind === 'youtube') return youtubeId(t);
    return s;
  };
  const v = (key: string): string => {
    const f = H26_SCALAR_FIELDS[key];
    const out = usable(f.kind, str(d[key]));
    if (out === null) {
      fallbacks.push(key);
      return f.def;
    }
    return out;
  };

  const rating = v('rating').trim();
  const reviewCount = v('review_count').trim();
  const ratingValues = { rating, review_count: reviewCount };
  const rv = (key: string) => (RATING_TOKEN_FIELDS.has(key) ? fill(v(key), ratingValues) : v(key));
  const paragraphs = (key: string): string[] => {
    const parts = v(key).split('\n\n').map((p) => p.trim()).filter(Boolean);
    return parts.length ? parts : H26_SCALAR_FIELDS[key].def.split('\n\n');
  };

  // Trust stripe: 1–3 plain lines; `{rating}` / `{review_count}` come from the pair above.
  let trust = arr(d.trust_items)
    .map((x, i) => ({ id: str(obj(x).id) || `trust-${i + 1}`, text: str(obj(x).text).trim() }))
    .filter((x) => x.text)
    .slice(0, H26_LIMITS.trust);
  if (!trust.length) {
    fallbacks.push('trust_items');
    trust = H26_LIST_DEFAULTS.trust_items.map((x) => ({ ...x }));
  }
  trust = trust.map((x) => ({ ...x, text: fill(x.text, ratingValues) }));

  // Service photo cards: a card needs a title, a usable link and a usable image.
  let cards = arr(d.services_cards)
    .map((x, i): H26ServiceCard => {
      const c = obj(x);
      return {
        id: str(c.id) || `card-${i + 1}`,
        title: str(c.title).trim(),
        href: usable('url', str(c.href)) ?? '',
        description: str(c.description).trim(),
        image: usable('image', str(c.image)) ?? '',
        alt: str(c.alt).trim(),
      };
    })
    .filter((c) => c.title && c.href && c.image)
    .slice(0, H26_LIMITS.cards);
  if (!cards.length) {
    fallbacks.push('services_cards');
    cards = H26_LIST_DEFAULTS.services_cards.map((x) => ({ ...x }));
  }

  // Jobs: a job needs a tab title, a quote, an author and at least one usable photo.
  let jobs = arr(d.jobs)
    .map((x, i): H26Job => {
      const j = obj(x);
      const starsRaw = typeof j.stars === 'number' ? j.stars : parseInt(str(j.stars), 10);
      const photos = arr(j.photos)
        .map((p, k): H26Photo => ({ id: str(obj(p).id) || `photo-${k + 1}`, image: usable('image', str(obj(p).image)) ?? '', alt: str(obj(p).alt).trim() }))
        .filter((p) => p.image)
        .slice(0, H26_LIMITS.photos);
      return {
        id: domToken(str(j.id), `job-${i + 1}`),
        tab_title: str(j.tab_title).trim(),
        tab_city: str(j.tab_city).trim(),
        title: str(j.title).trim() || str(j.tab_title).trim(),
        location: str(j.location).trim(),
        stars: Number.isFinite(starsRaw) ? Math.min(5, Math.max(1, Math.round(starsRaw))) : 5,
        quote: str(j.quote).trim(),
        author: str(j.author).trim(),
        author_label: str(j.author_label).trim() || 'Verified Customer',
        review_url: httpsHost(str(j.review_url).trim()) ? str(j.review_url).trim() : '',
        photos,
      };
    })
    .filter((j) => j.tab_title && j.quote && j.author && j.photos.length)
    .slice(0, H26_LIMITS.jobs);
  // Two jobs must never share a DOM id.
  const seen = new Set<string>();
  jobs = jobs.map((j, i) => {
    const id = seen.has(j.id) ? `${j.id}-${i + 1}` : j.id;
    seen.add(id);
    return { ...j, id };
  });
  if (!jobs.length) {
    fallbacks.push('jobs');
    jobs = JSON.parse(JSON.stringify(H26_LIST_DEFAULTS.jobs));
  }

  let featuredSlugs = arr(d.kh_featured)
    .map((x) => str(obj(x).slug).trim().toLowerCase())
    .filter((s, i, all) => isArticleSlug(s) && all.indexOf(s) === i)
    .slice(0, H26_LIMITS.featured);
  if (!featuredSlugs.length) {
    fallbacks.push('kh_featured');
    featuredSlugs = H26_LIST_DEFAULTS.kh_featured.map((x) => x.slug);
  }

  return {
    hero: {
      eyebrow: v('hero_eyebrow'),
      h1: v('hero_h1'),
      intro: v('hero_intro'),
      ctaLabel: v('hero_cta'),
      poster: v('hero_poster'),
      videoDesktop: v('hero_video_desktop'),
      videoMobile: v('hero_video_mobile'),
    },
    rating,
    reviewCount,
    trust: { label: v('trust_label'), items: trust },
    services: {
      eyebrow: v('services_eyebrow'),
      heading: v('services_heading'),
      intro: v('services_intro'),
      cardCta: v('services_card_cta'),
      cards,
      dirTitle: v('services_dir_title'),
      dirCount: v('services_dir_count'),
    },
    areas: {
      eyebrow: v('areas_eyebrow'),
      heading: v('areas_heading'),
      intro: v('areas_intro'),
      statTemplate: v('areas_stat_template'),
      regions: {
        chicagoland: { image: v('areas_image_chicagoland'), alt: v('areas_image_alt_chicagoland'), cta: v('areas_cta_chicagoland') },
        columbus: { image: v('areas_image_columbus'), alt: v('areas_image_alt_columbus'), cta: v('areas_cta_columbus') },
      },
    },
    reviews: {
      eyebrow: v('reviews_eyebrow'),
      heading: v('reviews_heading'),
      intro: v('reviews_intro'),
      proofSub: rv('proof_sub'),
      bbbUrl: v('bbb_url'),
      bbbSeal: v('bbb_seal'),
      bbbSealAlt: v('bbb_seal_alt'),
      bbbLabel: v('bbb_label'),
      jobsLabel: v('jobs_label'),
      photosLabel: v('jobs_photos_label'),
      readOnGoogle: v('jobs_read_on_google'),
      jobs,
    },
    why: {
      eyebrow: v('why_eyebrow'),
      heading: v('why_heading'),
      body: paragraphs('why_body'),
      ctaCall: v('why_cta_call'),
      ctaLabel: v('why_cta_label'),
      videoId: v('why_video_id'),
      videoTitle: v('why_video_title'),
    },
    ndc: { mark: v('ndc_mark'), body: v('ndc_body'), cta: v('ndc_cta'), image: v('ndc_image'), imageAlt: v('ndc_image_alt') },
    kh: {
      eyebrow: v('kh_eyebrow'),
      heading: v('kh_heading'),
      intro: v('kh_intro'),
      cardCta: v('kh_card_cta'),
      cta: v('kh_cta'),
      featuredSlugs,
    },
    loc: {
      eyebrow: v('loc_eyebrow'),
      heading: v('loc_heading'),
      intro: v('loc_intro'),
      searchLabel: v('loc_search_label'),
      searchPlaceholder: v('loc_search_placeholder'),
      count: v('loc_count'),
      match: v('loc_match'),
      empty: v('loc_empty'),
      emptyLink: v('loc_empty_link'),
      mapTitle: v('loc_map_title'),
      mapButton: v('loc_map_button'),
      openMaps: v('loc_open_maps'),
    },
    fallbacks,
  };
}
