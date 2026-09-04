/**
 * Brief 171, Track A5 — patch the four broken office records in the live
 * `global_settings.offices` JSONB row.
 *
 * ─── What it changes, and why a script is needed ───────────────────────────
 * The 15 offices exist in THREE hand-synced places: this DB column, the
 * `FALLBACK_OFFICES` literal in `src/lib/cms/global-settings.ts`, and
 * `SEED_OFFICES` in `scripts/migrate-global-settings.ts`. The DB row is the one
 * a running site actually renders, and the literals are only its build-time
 * fallback and its fresh-install seed. So editing the code alone changes
 * nothing on staging or production — this script is the third leg.
 *
 *   joliet    address/city/zip  Ravenswood's, not Joliet's (a live theme bug
 *                               reproduced on purpose) -> Marketing's real address
 *             mapUrl            Ravenswood's short link -> Joliet's real GBP link
 *             lat/lng           null -> geocoded (see build-locator-maps.ts)
 *   columbus  mapUrl            a google.com/maps/search placeholder -> real GBP link
 *             lat/lng           null -> geocoded
 *   skokie    mapUrl            '' -> real GBP link
 *   elmhurst  mapUrl            '' -> real GBP link
 *
 * ─── READ-MODIFY-WRITE, by slug. Never a whole-array overwrite ─────────────
 * It reads the current `offices` array, patches ONLY the four records named in
 * `PATCHES` and only the fields listed there, and writes the array back.
 * Overwriting the column with a copy of `FALLBACK_OFFICES` would be shorter and
 * would silently discard every edit Marketing has made in
 * /admin/global-settings since the last sync — including `showInFooter`
 * toggles and any office added there. Do not "simplify" it that way.
 *
 * ─── It APPLIES BY DEFAULT ─────────────────────────────────────────────────
 * A previous brief's content port silently no-op'd because its script defaulted
 * to dry-run and nobody passed the apply flag. This one writes unless you pass
 * `--dry-run`, and a dry run prints a loud banner and exits 2 so it can never be
 * mistaken for a successful apply in a deploy log.
 *
 * ─── Idempotent, and it will not clobber a different value ─────────────────
 * Each field patch carries the value it EXPECTS to find. If a field already
 * holds the new value it reports OK and skips; if it holds something this script
 * does not recognise it reports SKIP, leaves it alone, and the run exits 3 —
 * because "Marketing typed a different address" and "the patch worked" must not
 * look the same. Re-running after a successful apply is a clean no-op.
 *
 * ─── Run it per environment ────────────────────────────────────────────────
 * Staging and production each have their OWN Postgres and a local run reaches
 * neither. Run it against each box's DATABASE_URL:
 *
 *   npx ts-node --project tsconfig.scripts.json scripts/fix-brief-171-office-data.ts
 *   npx ts-node --project tsconfig.scripts.json scripts/fix-brief-171-office-data.ts --dry-run
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { verdict } from './lib/run-mode';

type Primitive = string | number | null;

interface FieldPatch {
  /** Values this script is willing to overwrite. Anything else is a SKIP. */
  from: Primitive[];
  to: Primitive;
}

/** slug -> field -> patch. Only these slugs and only these fields are touched. */
const PATCHES: Record<string, Record<string, FieldPatch>> = {
  joliet: {
    streetAddress: { from: ['5126 N Ravenswood Ave'], to: '311 N Ottawa St Ste 2' },
    city: { from: ['Chicago'], to: 'Joliet' },
    zip: { from: ['60640'], to: '60432' },
    mapUrl: {
      from: ['', 'https://maps.app.goo.gl/k2RpBwmEiq1iir1x9'],
      to: 'https://maps.app.goo.gl/NuV5DBoswtStbX9L6',
    },
    lat: { from: [null], to: 41.5299 },
    lng: { from: [null], to: -88.0832 },
  },
  columbus: {
    mapUrl: {
      from: [
        '',
        'https://www.google.com/maps/search/?api=1&query=1387+W.+Goodale+Blvd%2C+Columbus%2C+OH+43212',
      ],
      to: 'https://maps.app.goo.gl/rKAUdjbg7a6YBKPY8',
    },
    lat: { from: [null], to: 39.9762 },
    lng: { from: [null], to: -83.0416 },
  },
  skokie: {
    mapUrl: { from: [''], to: 'https://maps.app.goo.gl/xWEGzo5YNDTERu797' },
  },
  elmhurst: {
    mapUrl: { from: [''], to: 'https://maps.app.goo.gl/d4UQqyQkuhjk4wNv8' },
  },
};

const DRY_RUN = process.argv.includes('--dry-run');
/**
 * `commit` — the deploy-pipeline mode, matching the argv convention every other
 * seed/fix script in `.github/workflows/deploy.yml` uses.
 *
 * It changes exactly one thing: a guard trip exits 0 instead of 3. The write
 * behaviour is identical, and a guard trip is still printed loudly.
 *
 * ⚠️ Why that matters. The deploy step runs with `script_stop: true`, so any
 * non-zero exit aborts the deploy. Without this, the first time Marketing edits
 * one of these fields in the admin the script would stop recognising the value,
 * exit 3, and BLOCK EVERY SUBSEQUENT DEPLOY of the whole site — turning a
 * successful content edit into a broken pipeline. Same reasoning as the Brief 145
 * fix scripts, which exit 0 on guard trips for exactly this reason.
 *
 * Run WITHOUT `commit` by hand and a guard trip still exits 3, because there the
 * non-zero code is the useful signal.
 */
const CI = process.argv.includes('commit');


const envFile = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const envVar = (k: string) =>
  process.env[k] || (envFile.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

const show = (v: unknown) => JSON.stringify(v ?? null);

async function main() {
  if (DRY_RUN) {
    console.log('');
    console.log('###############################################################');
    console.log('##                                                           ##');
    console.log('##   DRY RUN — NOTHING WAS WRITTEN TO THE DATABASE.          ##');
    console.log('##   Re-run WITHOUT --dry-run to apply. Exits 2 so a CI       ##');
    console.log('##   step can never mistake this for a successful apply.      ##');
    console.log('##                                                           ##');
    console.log('###############################################################');
    console.log('');
  }

  const pool = new Pool({ connectionString: envVar('DATABASE_URL') });
  const client = await pool.connect();
  let changedFields = 0;
  let skippedFields = 0;
  const changedSlugs = new Set<string>();

  try {
    await client.query('BEGIN');

    const res = await client.query(`SELECT offices FROM global_settings WHERE id = 1`);
    if (res.rows.length === 0) {
      console.log('SKIP  global_settings: no row with id = 1. Run migrate-global-settings.ts first.');
      await client.query('ROLLBACK');
      return;
    }
    const offices = res.rows[0].offices as Array<Record<string, unknown>> | null;
    if (!Array.isArray(offices)) {
      throw new Error('global_settings.offices is not an array — refusing to write.');
    }
    console.log(`Read ${offices.length} office record(s) from global_settings.offices.\n`);

    for (const [slug, fields] of Object.entries(PATCHES)) {
      const office = offices.find((o) => o.slug === slug);
      if (!office) {
        skippedFields++;
        console.log(`SKIP  ${slug}: no record with this slug — nothing patched.`);
        continue;
      }
      console.log(`── ${slug}`);
      for (const [field, patch] of Object.entries(fields)) {
        const current = office[field] ?? null;
        if (current === patch.to) {
          console.log(`  OK    ${field}: already ${show(patch.to)}`);
          continue;
        }
        if (!patch.from.includes(current as Primitive)) {
          skippedFields++;
          console.log(
            `  SKIP  ${field}: unrecognised value, left untouched.\n` +
              `        found:    ${show(current)}\n` +
              `        expected: one of ${patch.from.map(show).join(' | ')}`
          );
          continue;
        }
        console.log(`  WRITE ${field}: ${show(current)}  ->  ${show(patch.to)}`);
        office[field] = patch.to;
        changedFields++;
        changedSlugs.add(slug);
      }
    }

    if (changedFields > 0 && !DRY_RUN) {
      await client.query(
        `UPDATE global_settings SET offices = $1::jsonb, updated_at = now() WHERE id = 1`,
        [JSON.stringify(offices)]
      );
    }

    // Track A4's assertion, checked rather than asserted in prose: after this
    // run no office may have a blank mapUrl or a generated Maps *search* URL, so
    // nothing renders through `officeMapUrl()`'s fallback branch.
    const bad = offices.filter((o) => {
      const url = String(o.mapUrl ?? '').trim();
      return url === '' || url.includes('google.com/maps/search');
    });

    if (DRY_RUN) await client.query('ROLLBACK');
    else await client.query('COMMIT');

    console.log('');
    console.log(
      `BRIEF-171 OFFICE DATA: ${changedFields} field(s) across ${changedSlugs.size} record(s) ` +
        `${DRY_RUN ? 'WOULD BE' : ''} updated, ${skippedFields} left untouched.`
    );
    if (changedSlugs.size) console.log(`  touched: ${[...changedSlugs].join(', ')}`);
    console.log(
      bad.length === 0
        ? `  mapUrl check: all ${offices.length} offices have a real link (no blanks, no maps/search URLs). ✓`
        : `  mapUrl check: ${bad.length} office(s) still blank or a maps/search URL: ${bad.map((o) => o.slug).join(', ')}`
    );

    /* One greppable line per script, the Brief 147 convention — deploy.yml
       collects these into a PIPELINE VERDICT block at the end of the step so
       APPLIED / ALREADY-APPLIED / NOT-APPLIED is readable at a glance instead of
       buried in the log. NOT-APPLIED is the line that used to be invisible. */
    verdict(
      'fix-brief-171-office-data',
      DRY_RUN
        ? 'NOT-APPLIED (dry run)'
        : skippedFields > 0
          ? 'NOT-APPLIED (guard tripped)'
          : changedFields > 0
            ? 'APPLIED'
            : 'ALREADY-APPLIED',
      `${changedFields} field(s) written, ${skippedFields} left untouched`
    );

    if (DRY_RUN) process.exit(2);
    if (skippedFields > 0) {
      console.log(
        '\nAt least one field holds a value this script does not recognise — probably a Marketing\n' +
          'edit. Set it from /admin/global-settings rather than forcing it here. Exiting 3.'
      );
      if (!CI) process.exit(3);
      console.log('Running with `commit` (deploy pipeline), so exiting 0 — a guard trip must not block the deploy.');
    }
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
