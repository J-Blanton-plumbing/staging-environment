import { cache } from 'react';
import pool from '@/lib/db';
import { SITE } from '@/lib/site';

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
  /** No Drip Club membership price line, e.g. "All for just $29.97/month**". */
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
  updatedAt: string | null;
}

// Only these columns are user-editable via /admin/global-settings.
export type GlobalSettingsUpdate = Partial<
  Pick<GlobalSettings, 'phoneDisplay' | 'phoneHref' | 'headerPhone' | 'ctaPrimaryLabel' | 'taglineTurning' | 'hoursLabel' | 'ndcPrice' | 'serviceDesc'>
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
  ndcPrice: 'All for just $29.97/month**',
  serviceDesc: {
    emergency: 'Fast response for plumbing emergencies, day or night.',
    plumbing: 'Licensed plumbers for any residential or commercial job.',
    sewer: 'Sewer inspections, repairs, and full line replacements.',
    drain: 'Drain cleaning and clearing for all drain types.',
    'water-heater': 'Water heater installation, repair, and maintenance.',
    'water-quality': 'Water filtration, testing, and treatment solutions.',
    commercial: 'Commercial plumbing built for business reliability.',
  },
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
         service_desc_emergency, service_desc_plumbing, service_desc_sewer, service_desc_drain, service_desc_water_heater, service_desc_water_quality, service_desc_commercial)
       VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
      ]
    );
  } finally {
    client.release();
  }
}
