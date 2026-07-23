import { cache } from 'react';
import pool from '@/lib/db';
import { SITE } from '@/lib/site';
import type { CmsOffice } from './offices';

// Re-exported so existing DB-side consumers of this module keep working — the
// type/formatter themselves live in `./offices` (a DB-free module public
// components can safely import instead; see that file's docblock for why).
export type { CmsOffice } from './offices';
export { formatOfficeAddress } from './offices';

export interface GlobalSettings {
  id: number;
  phoneDisplay: string;
  phoneHref: string;
  /** Call-tracking number shown ONLY in the navbar header (see SITE.headerPhone). */
  headerPhone: string;
  /** tel: link for the header number — derived from headerPhone. */
  headerPhoneHref: string;
  ctaPrimaryLabel: string;
  taglineTurning: string;
  hoursLabel: string;
  /** No Drip Club price, backing the {{ndc_price}} token — e.g. "$29.97". */
  ndcPrice: string;
  /**
   * Brief 67 (Track F) — service-category descriptions shown under each card in
   * the Local Office V2 Services Grid. Keyed by service registry slug. Same copy
   * across all cities, edited in one place.
   */
  serviceDesc: {
    emergency: string;
    plumbing: string;
    sewer: string;
    drain: string;
    'water-heater': string;
    'water-quality': string;
    commercial: string;
  };
  /** Office/service-center locations (Brief 102, Track C) — single source of truth for every address on the site. */
  offices: CmsOffice[];
  updatedAt: string | null;
}

// Only these columns are user-editable via /admin/global-settings.
export type GlobalSettingsUpdate = Partial<
  Pick<GlobalSettings, 'phoneDisplay' | 'phoneHref' | 'headerPhone' | 'ctaPrimaryLabel' | 'taglineTurning' | 'hoursLabel' | 'ndcPrice' | 'serviceDesc' | 'offices'>
>;

/**
 * Static fallback, sourced from site.ts. Used when the DB is unreachable (e.g. at
 * build time in an environment without DATABASE_URL) so the build never crashes and
 * the site renders the same values it did before Brief 66 wired the DB in.
 */
const FALLBACK: GlobalSettings = {
  id: 0,
  phoneDisplay: SITE.phone,
  phoneHref: SITE.phoneHref,
  headerPhone: SITE.headerPhone,
  headerPhoneHref: SITE.headerPhoneHref,
  ctaPrimaryLabel: 'MAKE A GOOD CALL',
  taglineTurning: 'J Blanton Plumbing - Turning Bad Calls to Good Calls',
  hoursLabel: '24 hours',
  ndcPrice: '$29.97',
  serviceDesc: {
    emergency: 'Fast response for plumbing emergencies, day or night.',
    plumbing: 'Licensed plumbers for any residential or commercial job.',
    sewer: 'Sewer inspections, repairs, and full line replacements.',
    drain: 'Drain cleaning and clearing for all drain types.',
    'water-heater': 'Water heater installation, repair, and maintenance.',
    'water-quality': 'Water filtration, testing, and treatment solutions.',
    commercial: 'Commercial plumbing built for business reliability.',
  },
  offices: [
    { slug: 'northbrook', name: 'Northbrook (Corporate)', streetAddress: '1945 Techny Road, #11', city: 'Northbrook', state: 'IL', zip: '60062', mapUrl: 'https://maps.app.goo.gl/pCmmYeescW7Mf6B2A', lat: 42.1278, lng: -87.8451 },
    { slug: 'algonquin', name: 'Algonquin', streetAddress: '2390 Esplanade Dr #200f', city: 'Algonquin', state: 'IL', zip: '60102', mapUrl: 'https://maps.app.goo.gl/egVEqHQJkzFG8Qo56', lat: 42.1656, lng: -88.2942 },
    { slug: 'geneva', name: 'Geneva', streetAddress: '115 Campbell St #201C', city: 'Geneva', state: 'IL', zip: '60134', mapUrl: 'https://maps.app.goo.gl/mfdpSC3BSGkQKdQ39', lat: 41.8875, lng: -88.3054 },
    { slug: 'arlington-heights', name: 'Arlington Heights', streetAddress: '1204 E. Central Road, Suite 3', city: 'Arlington Heights', state: 'IL', zip: '60005', mapUrl: 'https://maps.app.goo.gl/Qq4qPYJT8bCgash26', lat: 42.0884, lng: -87.9806 },
    { slug: 'chicago-lincoln-park', name: 'Chicago Lincoln Park', streetAddress: '800 W Diversey Pkwy', city: 'Chicago', state: 'IL', zip: '60614', mapUrl: 'https://maps.app.goo.gl/ninFDe3tVj7U5sYx6', lat: 41.9325, lng: -87.6437 },
    { slug: 'chicago-ravenswood', name: 'Chicago Ravenswood', streetAddress: '5126 N Ravenswood Ave', city: 'Chicago', state: 'IL', zip: '60640', mapUrl: 'https://maps.app.goo.gl/k2RpBwmEiq1iir1x9', lat: 41.9745, lng: -87.6745 },
    { slug: 'elgin', name: 'Elgin', streetAddress: '964 N McLean Blvd', city: 'Elgin', state: 'IL', zip: '60123-2039', mapUrl: 'https://maps.app.goo.gl/5J1K7ZVgFeNwy8VJ8', lat: 42.0354, lng: -88.2826 },
    { slug: 'elmhurst', name: 'Elmhurst', streetAddress: '130 S York St', city: 'Elmhurst', state: 'IL', zip: '60126', mapUrl: '', lat: 41.8995, lng: -87.9403 },
    { slug: 'evanston', name: 'Evanston', streetAddress: '1603 Orrington Ave #600-1085', city: 'Evanston', state: 'IL', zip: '60201', mapUrl: 'https://maps.app.goo.gl/rqmTxHMcicWhz1yV7', lat: 42.0451, lng: -87.6877 },
    { slug: 'hinsdale', name: 'Hinsdale', streetAddress: '15 Spinning Wheel Rd #216a', city: 'Hinsdale', state: 'IL', zip: '60521', mapUrl: 'https://maps.app.goo.gl/UfWAoTRbWkAPR6WYA', lat: 41.8009, lng: -87.9370 },
    { slug: 'mchenry', name: 'McHenry', streetAddress: '3406 W Elm St', city: 'Mchenry', state: 'IL', zip: '60050', mapUrl: 'https://maps.app.goo.gl/DQ4fP5QXZr7TpBJ48', lat: 42.3334, lng: -88.2670 },
    { slug: 'naperville', name: 'Naperville', streetAddress: '200 S Main Street, Suite 3', city: 'Naperville', state: 'IL', zip: '60540', mapUrl: 'https://maps.app.goo.gl/9ou5MAtuAMjG6XfN8', lat: 41.7508, lng: -88.1535 },
    { slug: 'skokie', name: 'Skokie', streetAddress: '8001 Lincoln Ave, Suite 301', city: 'Skokie', state: 'IL', zip: '60077-3695', mapUrl: '', lat: 42.0334, lng: -87.7334 },
    // ⚠️ Live theme bug (pre-existing, reproduced verbatim) — Joliet has no office
    // of its own; both the footer and the /joliet NAP block show the Ravenswood
    // office's address. Lat/lng left blank on purpose rather than pairing
    // Joliet's real coordinates with Ravenswood's street address.
    { slug: 'joliet', name: 'Joliet', streetAddress: '5126 N Ravenswood Ave', city: 'Chicago', state: 'IL', zip: '60640', mapUrl: 'https://maps.app.goo.gl/k2RpBwmEiq1iir1x9', lat: null, lng: null },
  ],
  updatedAt: null,
};

/**
 * Raw DB read. Returns null if the settings row is missing. Used by the admin API
 * route (which wants to distinguish "not found" and surface a 404).
 */
export async function getGlobalSettings(): Promise<GlobalSettings | null> {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT * FROM global_settings WHERE id = 1`);
    if (!res.rows[0]) return null;
    const r = res.rows[0];
    const headerPhone = r.header_phone ?? SITE.headerPhone;
    return {
      id: r.id,
      phoneDisplay: r.phone_display,
      phoneHref: r.phone_href,
      headerPhone,
      headerPhoneHref: `tel:${headerPhone}`,
      ctaPrimaryLabel: r.cta_primary_label,
      taglineTurning: r.tagline_turning,
      hoursLabel: r.hours_label,
      ndcPrice: r.ndc_price ?? FALLBACK.ndcPrice,
      serviceDesc: {
        emergency: r.service_desc_emergency ?? FALLBACK.serviceDesc.emergency,
        plumbing: r.service_desc_plumbing ?? FALLBACK.serviceDesc.plumbing,
        sewer: r.service_desc_sewer ?? FALLBACK.serviceDesc.sewer,
        drain: r.service_desc_drain ?? FALLBACK.serviceDesc.drain,
        'water-heater': r.service_desc_water_heater ?? FALLBACK.serviceDesc['water-heater'],
        'water-quality': r.service_desc_water_quality ?? FALLBACK.serviceDesc['water-quality'],
        commercial: r.service_desc_commercial ?? FALLBACK.serviceDesc.commercial,
      },
      offices: Array.isArray(r.offices) ? r.offices : FALLBACK.offices,
      updatedAt: r.updated_at ?? null,
    };
  } finally {
    client.release();
  }
}

/**
 * Front-end getter for server components. Always resolves to a full GlobalSettings
 * object: DB values when available, else the site.ts FALLBACK — it never throws and
 * never returns null, so a DB hiccup can't take the site down. `cache()` dedupes to a
 * single query per request across all components that call it (Navbar, heroes, etc.).
 */
export const getGlobalSettingsCached = cache(async (): Promise<GlobalSettings> => {
  try {
    const settings = await getGlobalSettings();
    return settings ?? FALLBACK;
  } catch (err) {
    console.error('getGlobalSettingsCached: DB unreachable, using site.ts fallback:', err);
    return FALLBACK;
  }
});

export async function updateGlobalSettings(data: GlobalSettingsUpdate): Promise<void> {
  const client = await pool.connect();
  try {
    const sd = data.serviceDesc;
    await client.query(
      `INSERT INTO global_settings (id, phone_display, phone_href, header_phone, cta_primary_label, tagline_turning, hours_label, ndc_price,
         service_desc_emergency, service_desc_plumbing, service_desc_sewer, service_desc_drain, service_desc_water_heater, service_desc_water_quality, service_desc_commercial,
         offices)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (id) DO UPDATE SET
         phone_display              = COALESCE($1, global_settings.phone_display),
         phone_href                 = COALESCE($2, global_settings.phone_href),
         header_phone               = COALESCE($3, global_settings.header_phone),
         cta_primary_label          = COALESCE($4, global_settings.cta_primary_label),
         tagline_turning            = COALESCE($5, global_settings.tagline_turning),
         hours_label                = COALESCE($6, global_settings.hours_label),
         ndc_price                  = COALESCE($7, global_settings.ndc_price),
         service_desc_emergency     = COALESCE($8, global_settings.service_desc_emergency),
         service_desc_plumbing      = COALESCE($9, global_settings.service_desc_plumbing),
         service_desc_sewer         = COALESCE($10, global_settings.service_desc_sewer),
         service_desc_drain         = COALESCE($11, global_settings.service_desc_drain),
         service_desc_water_heater  = COALESCE($12, global_settings.service_desc_water_heater),
         service_desc_water_quality = COALESCE($13, global_settings.service_desc_water_quality),
         service_desc_commercial    = COALESCE($14, global_settings.service_desc_commercial),
         offices                    = COALESCE($15::jsonb, global_settings.offices),
         updated_at                 = NOW()`,
      [
        data.phoneDisplay ?? null,
        data.phoneHref ?? null,
        data.headerPhone ?? null,
        data.ctaPrimaryLabel ?? null,
        data.taglineTurning ?? null,
        data.hoursLabel ?? null,
        data.ndcPrice ?? null,
        sd?.emergency ?? null,
        sd?.plumbing ?? null,
        sd?.sewer ?? null,
        sd?.drain ?? null,
        sd?.['water-heater'] ?? null,
        sd?.['water-quality'] ?? null,
        sd?.commercial ?? null,
        data.offices ? JSON.stringify(data.offices) : null,
      ]
    );
  } finally {
    client.release();
  }
}
