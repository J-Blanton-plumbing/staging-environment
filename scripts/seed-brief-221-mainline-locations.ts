/**
 * Brief 221 (Track B2) — seed `global_settings.office_mainline_locations`: which Mainline GBP location
 * each office's Google rating is read from (the brief's §0.3 table, measured on /admin/gbp 2026-10-28).
 *
 * FILL-GAPS ONLY: an office that already has a location (set here before, or edited in
 * /admin/global-settings) is never touched. It NEVER writes a rating — only scripts/sync-gbp-ratings.ts
 * writes `office_ratings` (the deploy-seed trap: a seed that wrote numbers would roll the live ratings
 * back to 2026-10-28 on every deploy).
 *
 * Only offices that exist in Global Settings are seeded (by slug, a leading "/" ignored — the live
 * Hanover Park record is "/hanover-park").
 *
 * ⚠ Highland Park's Mainline location was on page 2 of the GBP list and could not be read for this
 * brief; "highland-park" is the expected key (every other office's key is its own city name). If it
 * is wrong, the sync records "location not in the Mainline response" for that office and the page
 * keeps its pre-token copy — correct it in /admin/global-settings.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-brief-221-mainline-locations.ts          # preview
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/seed-brief-221-mainline-locations.ts commit   # apply
 * Content state is never a failure (Brief 186): exit 1 only for a code/schema fault.
 */
import { existsSync, readFileSync } from 'fs';

if (!process.env.DATABASE_URL && existsSync('.env.local')) {
  const m = readFileSync('.env.local', 'utf8').match(/^DATABASE_URL=(.*)$/m);
  if (m) process.env.DATABASE_URL = m[1].trim();
}

/* eslint-disable import/first */
import pool from '../src/lib/db';
import { cleanMainlineLocations, normOfficeSlug } from '../src/lib/cms/office-ratings';
import { announceMode, resolveRunMode, verdict } from './lib/run-mode';

const SCRIPT = 'seed-brief-221-mainline-locations';
const mode = resolveRunMode(SCRIPT);

/** Brief 221 §0.3: hub / office slug → Mainline `?location=` key. */
export const BRIEF_221_MAINLINE_LOCATIONS: Readonly<Record<string, string>> = {
  evanston: 'evanston',
  skokie: 'skokie',
  'chicago-ravenswood': 'ravenswood',
  geneva: 'geneva',
  'arlington-heights': 'arlington-heights',
  hinsdale: 'hinsdale',
  mchenry: 'mchenry',
  elmhurst: 'elmhurst',
  northbrook: 'northbrook',
  'chicago-lincoln-park': 'lincoln-park',
  naperville: 'naperville',
  elgin: 'elgin',
  algonquin: 'algonquin',
  joliet: 'joliet',
  'tinley-park': 'tinley-park',
  mokena: 'mokena',
  columbus: 'columbus-grandview-heights',
  'hanover-park': 'hanover-park',
  'highland-park': 'highland-park', // ⚠ unconfirmed — see the header
};

async function main() {
  announceMode(SCRIPT, mode);
  const row = (await pool.query<{ offices: Array<{ slug?: string }> | null; m: unknown }>(`SELECT offices, to_jsonb(g) -> 'office_mainline_locations' AS m FROM global_settings g WHERE id = 1`)).rows[0];
  if (!row) {
    verdict(SCRIPT, 'NOT-APPLIED (guard tripped)', 'no global_settings row');
    return;
  }
  const current = cleanMainlineLocations(row.m);
  const offices = new Set((row.offices ?? []).map((o) => normOfficeSlug(String(o.slug ?? ''))).filter(Boolean));
  const next = { ...current };
  const added: string[] = [];
  for (const [slug, loc] of Object.entries(BRIEF_221_MAINLINE_LOCATIONS)) {
    if (!offices.has(slug)) {
      console.log(`  skipped  ${slug} — not an office in Global Settings`);
      continue;
    }
    if (current[slug]) {
      console.log(`  kept     ${slug} → ${current[slug]}${current[slug] !== loc ? ` (the brief's table says ${loc}; an edited value is never overwritten)` : ''}`);
      continue;
    }
    next[slug] = loc;
    added.push(`${slug} → ${loc}`);
    console.log(`  ${mode === 'commit' ? 'set' : 'would set'}      ${slug} → ${loc}`);
  }
  if (!added.length) {
    verdict(SCRIPT, 'ALREADY-APPLIED', `${Object.keys(current).length} office(s) mapped`);
    return;
  }
  if (mode !== 'commit') {
    verdict(SCRIPT, 'NOT-APPLIED (dry run)', `${added.length} office(s) would be mapped`);
    return;
  }
  // Re-read inside the write so a concurrent /admin save is never overwritten: fill gaps only.
  await pool.query(
    `UPDATE global_settings SET office_mainline_locations = $1::jsonb || COALESCE(office_mainline_locations, '{}'::jsonb) WHERE id = 1`,
    [JSON.stringify(Object.fromEntries(added.map((a) => a.split(' → '))))]
  );
  verdict(SCRIPT, 'APPLIED', `${added.length} office(s) mapped`);
}

main()
  .catch((e) => {
    console.error('FAILED:', e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
