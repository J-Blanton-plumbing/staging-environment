import { cache } from 'react';
import pool from '@/lib/db';

export interface GlobalSettings {
  id: number;
  phoneDisplay: string;
  phoneHref: string;
  ctaPrimaryLabel: string;
  taglineTurning: string;
  hoursLabel: string;
  updatedAt: string | null;
}

export type GlobalSettingsUpdate = Partial<Omit<GlobalSettings, 'id' | 'updatedAt'>>;

export async function getGlobalSettings(): Promise<GlobalSettings | null> {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT * FROM global_settings WHERE id = 1`);
    if (!res.rows[0]) return null;
    const r = res.rows[0];
    return {
      id: r.id,
      phoneDisplay: r.phone_display,
      phoneHref: r.phone_href,
      ctaPrimaryLabel: r.cta_primary_label,
      taglineTurning: r.tagline_turning,
      hoursLabel: r.hours_label,
      updatedAt: r.updated_at ?? null,
    };
  } finally {
    client.release();
  }
}

// React cache() variant for server components — deduplicated per request
export const getGlobalSettingsCached = cache(getGlobalSettings);

export async function updateGlobalSettings(data: GlobalSettingsUpdate): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO global_settings (id, phone_display, phone_href, cta_primary_label, tagline_turning, hours_label)
       VALUES (1, $1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         phone_display     = COALESCE($1, global_settings.phone_display),
         phone_href        = COALESCE($2, global_settings.phone_href),
         cta_primary_label = COALESCE($3, global_settings.cta_primary_label),
         tagline_turning   = COALESCE($4, global_settings.tagline_turning),
         hours_label       = COALESCE($5, global_settings.hours_label),
         updated_at        = NOW()`,
      [
        data.phoneDisplay ?? null,
        data.phoneHref ?? null,
        data.ctaPrimaryLabel ?? null,
        data.taglineTurning ?? null,
        data.hoursLabel ?? null,
      ]
    );
  } finally {
    client.release();
  }
}
