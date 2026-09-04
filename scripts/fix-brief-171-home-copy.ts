/**
 * Brief 171, Track E2 — put the store locator's approved heading and intro in
 * the CMS row, not just in the code.
 *
 * ─── Why a script is needed at all ─────────────────────────────────────────
 * `src/app/page.tsx` resolves the section's copy as
 *
 *     m(d.find_us_heading, HOME.findUs.heading)
 *     paragraphs(d.find_us_body, HOME.findUs.body)
 *
 * — a non-empty DB value ALWAYS wins over the static fallback. `find_us_heading`
 * and `find_us_body` are real editable fields on /admin/home, and the live
 * `main_pages` row for `home` carries the old "FIND US" heading. So editing
 * `src/lib/content/home.ts` alone changes the fallback and renders nowhere. This
 * is the standing "CMS overrides static" gotcha; the brief's copy change is only
 * real once the row moves too.
 *
 * ─── What the copy change is for ───────────────────────────────────────────
 * The old body was Chicagoland-only ("We've proudly served the Chicagoland area
 * for 30+ years." / "Contact us or use the site map to find the location that's
 * nearest to you."). It sat directly under `RegionChooser`, which advertises
 * both Chicagoland and Central Ohio on the same page — a live content
 * contradiction on the site's highest-traffic page. It also told the visitor to
 * "use the site map", describing a block that listed no locations at all.
 *
 * ─── Safety ────────────────────────────────────────────────────────────────
 * Guarded and idempotent, same shape as
 * `scripts/fix-brief-04-home-trust-statement.ts`. It rewrites a field ONLY if
 * that field still holds a value this script recognises — the exact old string,
 * or blank/absent. If it holds anything else, that is copy a human wrote: the
 * script PRINTS IT AND LEAVES IT ALONE, and the run exits 3 so the difference
 * between "applied" and "declined to overwrite Marketing's words" cannot be
 * missed in a log. Re-running after a successful apply is a no-op.
 *
 * It APPLIES BY DEFAULT. `--dry-run` prints a loud banner and exits 2 — a
 * previous brief's content port silently no-op'd because its script defaulted to
 * dry-run and nobody passed the apply flag.
 *
 * `version` / `base_version` are deliberately NOT bumped. They are compared
 * against each other by the optimistic-concurrency check, so moving one without
 * the other reproduces the false "changed by someone else" conflict Brief 147
 * fixed.
 *
 * ─── Run it per environment ────────────────────────────────────────────────
 * Staging and production each have their OWN Postgres; a local run reaches
 * neither:
 *
 *   npx ts-node --project tsconfig.scripts.json scripts/fix-brief-171-home-copy.ts
 *   npx ts-node --project tsconfig.scripts.json scripts/fix-brief-171-home-copy.ts --dry-run
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import { verdict } from './lib/run-mode';

interface FieldFix {
  field: string;
  /** Values safe to overwrite: the old copy, plus blank/absent. */
  old: string[];
  /** Must stay identical to the matching value in `HOME.findUs`. */
  next: string;
}

const OLD_BODY = [
  'We’ve proudly served the Chicagoland area for 30+ years.',
  'Contact us or use the site map to find the location that’s nearest to you.',
].join('\n\n');

/** What this script wrote on its first run, superseded by Marketing's paragraph. */
const INTERIM_BODY = 'Search your city to find your nearest J. Blanton service center.';

/**
 * The approved intro, supplied by Marketing 2026-09-03. Must stay byte-identical
 * to `HOME.findUs.body[0]` in `src/lib/content/home.ts`, or the static fallback
 * and the CMS row say different things on different environments.
 *
 * One paragraph, no blank line: `page.tsx`'s `paragraphs()` splits the textarea
 * on blank lines, so this renders as a single `<p>`.
 */
const APPROVED_BODY =
  'J. Blanton Plumbing has local offices throughout Chicagoland and, more recently, ' +
  'in Columbus, serving homeowners across Central Ohio. Every office is staffed by ' +
  'plumbers who work in your area — not a call center routing you to a subcontractor.';

const FIXES: FieldFix[] = [
  {
    field: 'find_us_heading',
    old: ['', 'FIND US'],
    next: 'WHERE TO FIND US',
  },
  {
    field: 'find_us_body',
    // The body was blank in the row this brief measured, but the two Chicagoland
    // lines are listed so an environment that DID save them is patched rather
    // than skipped. Both the joined form and the single-line variants are
    // recognised, because /admin/home's textarea round-trips whatever
    // whitespace the editor typed.
    //
    // `INTERIM_BODY` is the one-line search prompt this script itself wrote on
    // its first run, before Marketing supplied the approved paragraph. It has to
    // stay in this list: any environment already patched once holds that value,
    // and without it here the script would report SKIP and exit 3 on exactly the
    // boxes it had already updated.
    old: [
      '',
      OLD_BODY,
      'We’ve proudly served the Chicagoland area for 30+ years.',
      'Contact us or use the site map to find the location that’s nearest to you.',
      INTERIM_BODY,
    ],
    next: APPROVED_BODY,
  },
];

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
const norm = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

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
  let changed = 0;
  let skipped = 0;

  /**
   * Both the live row AND every published draft that mirrors it. Skipping the
   * draft would mean the next publish from /admin/home silently restored the old
   * heading from the draft's own content.
   */
  const targets: Array<{ label: string; table: 'main_pages' | 'page_drafts'; id?: number }> = [];

  try {
    await client.query('BEGIN');

    const live = await client.query(
      `SELECT id, content FROM main_pages WHERE slug = 'home'`
    );
    if (live.rows.length === 0) {
      console.log('SKIP  main_pages: no row for slug=home (the home.ts fallback already renders the new copy).');
    } else {
      targets.push({ label: 'main_pages (live)', table: 'main_pages' });
    }

    const drafts = await client.query(
      `SELECT id FROM page_drafts
        WHERE page_type = 'main' AND page_slug = 'home' AND is_published = true
        ORDER BY id`
    );
    for (const d of drafts.rows) {
      targets.push({ label: `page_drafts #${d.id} (published)`, table: 'page_drafts', id: d.id });
    }

    for (const t of targets) {
      const read =
        t.table === 'main_pages'
          ? await client.query(`SELECT content FROM main_pages WHERE slug = 'home'`)
          : await client.query(`SELECT content FROM page_drafts WHERE id = $1`, [t.id]);
      const content = (read.rows[0]?.content ?? {}) as Record<string, unknown>;

      console.log(`── ${t.label}`);
      for (const fix of FIXES) {
        const current = content[fix.field];
        if (norm(current) === fix.next) {
          console.log(`  OK    ${fix.field}: already the approved copy.`);
          continue;
        }
        if (!fix.old.includes(norm(current))) {
          skipped++;
          console.log(
            `  SKIP  ${fix.field}: copy this script does not recognise — LEFT UNTOUCHED.\n` +
              `        found: ${show(current)}`
          );
          continue;
        }
        console.log(`  WRITE ${fix.field}: ${show(current)}\n              ->  ${show(fix.next)}`);
        if (!DRY_RUN) {
          if (t.table === 'main_pages') {
            await client.query(
              `UPDATE main_pages
                  SET content = jsonb_set(content, $1::text[], to_jsonb($2::text), true),
                      updated_at = now(),
                      updated_by = 'brief-171-store-locator'
                WHERE slug = 'home'`,
              [`{${fix.field}}`, fix.next]
            );
          } else {
            await client.query(
              `UPDATE page_drafts
                  SET content = jsonb_set(content, $1::text[], to_jsonb($2::text), true)
                WHERE id = $3`,
              [`{${fix.field}}`, fix.next, t.id]
            );
          }
        }
        changed++;
      }
    }

    if (DRY_RUN) await client.query('ROLLBACK');
    else await client.query('COMMIT');

    console.log('');
    console.log(
      `BRIEF-171 HOME COPY: ${changed} field(s) ${DRY_RUN ? 'WOULD BE' : ''} updated across ` +
        `${targets.length} row(s), ${skipped} left untouched.`
    );

    /* One greppable line per script, the Brief 147 convention — deploy.yml
       collects these into a PIPELINE VERDICT block at the end of the step so
       APPLIED / ALREADY-APPLIED / NOT-APPLIED is readable at a glance instead of
       buried in the log. NOT-APPLIED is the line that used to be invisible. */
    verdict(
      'fix-brief-171-home-copy',
      DRY_RUN
        ? 'NOT-APPLIED (dry run)'
        : skipped > 0
          ? 'NOT-APPLIED (guard tripped)'
          : changed > 0
            ? 'APPLIED'
            : 'ALREADY-APPLIED',
      `${changed} field(s) written, ${skipped} left untouched`
    );

    if (DRY_RUN) process.exit(2);
    if (skipped > 0) {
      console.log(
        '\nAt least one field holds copy this script does not recognise — almost certainly a\n' +
          'Marketing edit. STOP and check with them; set it from /admin/home rather than\n' +
          'forcing it here. Exiting 3.'
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
