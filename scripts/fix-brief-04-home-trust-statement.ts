/**
 * Columbus Integration Brief 04, Track A — put the approved trust statement in
 * the CMS row, not just in the code.
 *
 * ─── Why a script is needed at all ─────────────────────────────────────────
 * `src/app/page.tsx` resolves the hero tagline as
 *
 *     m(d.hero_tagline, HOME.hero.headingTagline)
 *
 * — a non-empty DB string ALWAYS wins over the static value. Both the live
 * `main_pages` row for `home` and its published `page_drafts` version carry the
 * old Chicago-only line, so editing `src/lib/content/home.ts` alone changes the
 * fallback and renders nowhere. This is the standing "CMS overrides static"
 * gotcha; the brief's copy change is only real once both rows move.
 *
 * ─── Safety ────────────────────────────────────────────────────────────────
 * Guarded and idempotent. It rewrites a row ONLY if that row still holds the
 * exact old string, so it cannot clobber a later Marketing edit and re-running
 * it is a no-op. If either row holds something else it reports and exits 0
 * WITHOUT writing — a script that silently overwrote unknown copy on the
 * highest-traffic page on the site would be worse than one that does nothing.
 *
 * `version` / `base_version` are deliberately NOT bumped. They are already in
 * sync (0/0) and the optimistic-concurrency check compares the two; moving one
 * without the other reproduces the false "changed by someone else" conflict
 * Brief 147 fixed. The copy is Marketing's to overwrite from /admin/home
 * afterwards, which is exactly what leaving the version alone preserves.
 *
 * ─── Run it per environment ────────────────────────────────────────────────
 * Staging and production each have their OWN Postgres; a local run does not
 * reach them. Run against each box's DATABASE_URL (or have Marketing paste the
 * approved line into /admin/home there) or the trust statement will silently
 * stay Chicago-only on that environment:
 *
 *     npx ts-node --project tsconfig.scripts.json scripts/fix-brief-04-home-trust-statement.ts
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';

const OLD = 'Proudly Serving Chicago and Suburbs for Over 30 Years';
/** Marketing-locked wording (Brief 04). Must stay identical to `HOME.hero.headingTagline`. */
const NEW = '30+ years in Chicagoland. Now also serving Central Ohio.';

const envFile = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const envVar = (k: string) =>
  process.env[k] || (envFile.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

async function main() {
  const pool = new Pool({ connectionString: envVar('DATABASE_URL') });
  const client = await pool.connect();
  let changed = 0;
  let skipped = 0;

  try {
    await client.query('BEGIN');

    // 1. The live row the public page reads.
    const live = await client.query(
      `SELECT id, content->>'hero_tagline' AS tagline FROM main_pages WHERE slug = 'home'`
    );
    if (live.rows.length === 0) {
      console.log('SKIP  main_pages: no row for slug=home (static fallback is already correct).');
    } else if (live.rows[0].tagline === NEW) {
      console.log('OK    main_pages: already carries the approved statement.');
    } else if (live.rows[0].tagline !== OLD) {
      skipped++;
      console.log(`SKIP  main_pages: hero_tagline is neither the old nor the new string — left untouched.\n      found: ${JSON.stringify(live.rows[0].tagline)}`);
    } else {
      await client.query(
        `UPDATE main_pages
            SET content = jsonb_set(content, '{hero_tagline}', to_jsonb($1::text), true),
                updated_at = now(),
                updated_by = 'brief-04-trust-statement'
          WHERE slug = 'home' AND content->>'hero_tagline' = $2`,
        [NEW, OLD]
      );
      changed++;
      console.log('WROTE main_pages.content.hero_tagline');
    }

    // 2. The published draft that mirrors it — otherwise the next publish from
    //    /admin/home would restore the old line from the draft's own content.
    const drafts = await client.query(
      `SELECT id, content->>'hero_tagline' AS tagline
         FROM page_drafts
        WHERE page_type = 'main' AND page_slug = 'home' AND is_published = true`
    );
    for (const d of drafts.rows) {
      if (d.tagline === NEW) {
        console.log(`OK    page_drafts #${d.id}: already carries the approved statement.`);
      } else if (d.tagline !== OLD) {
        skipped++;
        console.log(`SKIP  page_drafts #${d.id}: unexpected hero_tagline — left untouched.\n      found: ${JSON.stringify(d.tagline)}`);
      } else {
        await client.query(
          `UPDATE page_drafts
              SET content = jsonb_set(content, '{hero_tagline}', to_jsonb($1::text), true)
            WHERE id = $2 AND content->>'hero_tagline' = $3`,
          [NEW, d.id, OLD]
        );
        changed++;
        console.log(`WROTE page_drafts #${d.id}.content.hero_tagline`);
      }
    }

    await client.query('COMMIT');
    console.log(`\nBRIEF-04 TRUST STATEMENT: ${changed} row(s) updated, ${skipped} left untouched.`);
    if (skipped > 0) {
      console.log('At least one row holds copy this script does not recognise. Set it from /admin/home instead of forcing it here.');
    }
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
