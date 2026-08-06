/**
 * Brief 143 — apply the APPROVED No Drip Club offer copy.
 *
 * The membership changed from $29.97/month to $149/year (or $229/2 years) and
 * several benefits were narrowed or removed. Brief 142 inventoried every live
 * string that still described the old offer; the marketing lead then approved a
 * replacement for each one. This script writes those approved replacements.
 *
 * Every string below is transcribed VERBATIM from Brief 143. Em dashes, the
 * `&amp;` entity, the U+2019 apostrophe in `home’s`, `&` vs `and`, casing and
 * line breaks are all intentional and signed off. Do not "tidy" them.
 *
 * ── What it covers ───────────────────────────────────────────────────────────
 *   Track B  sub_service_pages.ndc_title   6 rows
 *   Track C  sub_service_pages.ndc_body    6 rows
 *   Track D  city_pages.ndc_intro AND city_pages.blocks[noDripClub].data.ndcBody
 *            for `elgin` and `algonquin` — 2 rows, BOTH copies each, because the
 *            same text is stored twice and would otherwise diverge.
 *   Track E  cms_articles.body->>'html'    4 sentence replacements
 *
 * NOT covered, deliberately (see the Brief 143 report):
 *   - Article id 464. Its approved fragment does not substitute grammatically
 *     into the surrounding sentence, so Track E's own instruction is to stop and
 *     report rather than rewrite. Left untouched.
 *   - `commercial-jetting` / `commercial-drain-service`. Their whole section is
 *     suppressed at render by Track A; their content rows stay populated on
 *     purpose so the change is reversible.
 *   - The 174 `city_service_pages` rows, the two hardcoded source strings, all
 *     history tables and `global_settings` — all approved as-is / out of scope.
 *
 * ── Safety ───────────────────────────────────────────────────────────────────
 * SAFE BY DEFAULT: dry run unless invoked with `commit`.
 *
 * BACKUP-FIRST: before the first write, every target's current value is copied
 * into `brief143_ndc_content_backup` (created if absent) AND to a timestamped
 * JSON file under `scripts/backups/`. The DB table is the one that matters on
 * the deploy box, where the JSON file is not easily retrievable.
 *
 * EXACT MATCH, NEVER FUZZY: a row is written only when its current value equals
 * the expected old string byte-for-byte. Anything else is reported and skipped:
 *   - value already equals the approved new string  → `already-applied`
 *   - value is something else entirely              → `skipped-mismatch`
 *     (an editor changed it; this script must not clobber that)
 *   - no row for that slug/id in this database      → `skipped-missing-row`
 * That makes re-running a no-op, and makes it safe on dev and staging alike,
 * which Brief 142 proved hold different data.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-brief-143-ndc-offer-content.ts
 *   # apply:
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-brief-143-ndc-offer-content.ts commit
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const mode = process.argv[2] === 'commit' ? 'commit' : 'dry';

// ── Track B — service page headlines (`sub_service_pages.ndc_title`) ──────────
// Formula A: the membership is named FIRST so the benefit can never be misread
// as the price of the service. No price appears in any headline, deliberately.
// `sewer-rodding` and `water-filtration-systems` make NO frequency claim — their
// benefits are "as needed, only during maintenance visits" on the approved
// sheet. That asymmetry is intentional; do not harmonise it.
const HEADLINES: Array<{ slug: string; from: string; to: string }> = [
  {
    slug: 'sewer-repair',
    from: 'GET A FREE ANNUAL SEWER CAMERA INSPECTION — FOR ONLY $29.97/MO',
    to: 'NO DRIP CLUB MEMBERS GET A FREE SEWER CAMERA INSPECTION EVERY YEAR',
  },
  {
    slug: 'sewer-rodding',
    from: 'GET A FREE ANNUAL DRAIN CLEARING — FOR ONLY $29.97/MO',
    to: 'NO DRIP CLUB MEMBERS GET FREE INTERIOR DRAIN CLEARING',
  },
  {
    slug: 'water-filtration-systems',
    from: 'GET A FREE ANNUAL WATER QUALITY ANALYSIS — FOR ONLY $29.97/MO',
    to: 'NO DRIP CLUB MEMBERS GET A FREE CHEMICAL WATER TEST',
  },
  {
    slug: 'kitchen-plumbing',
    from: 'GET A FREE ANNUAL WHOLE HOME PLUMBING TUNE-UP — FOR ONLY $29.97/MO',
    to: 'NO DRIP CLUB MEMBERS GET A FREE WHOLE HOME PLUMBING TUNE-UP EVERY YEAR',
  },
  {
    slug: 'residential-water-heater',
    from: 'GET A FREE ANNUAL WATER HEATER FLUSH & MAINTENANCE — FOR ONLY $29.97/MO',
    to: 'NO DRIP CLUB MEMBERS GET A FREE WATER HEATER FLUSH EVERY YEAR',
  },
  {
    slug: 'tankless-water-heater',
    from: 'GET AN EXTENDED LABOR WARRANTY — FOR ONLY $29.97/MO',
    to: 'NO DRIP CLUB MEMBERS GET A 5-YEAR LABOR WARRANTY',
  },
];

// ── Track C — service page paragraphs (`sub_service_pages.ndc_body`) ──────────
// One skeleton throughout. Removed vs. the old text: the `(up to $500 per job)`
// discount cap and the `guaranteed within 24 hours` scheduling promise. The lead
// benefit is reframed as part of the two preventative maintenance visits.
// Opening and closing lines are unchanged.
const OPEN = 'The No Drip Club is our membership program. Members get:\n\n';
const CLOSE =
  '\n\nPlus no emergency fees, trip charges, or after-hours or holiday charges — and more benefits for members only.';

const BODIES: Array<{ slug: string; from: string; to: string }> = [
  {
    slug: 'sewer-repair',
    from:
      OPEN +
      '- Free annual sewer camera inspection — catches root intrusion and cracks before they cause a backup\n' +
      '- 10% discount on service and equipment (up to $500 per job)\n' +
      '- VIP priority scheduling — guaranteed within 24 hours' +
      CLOSE,
    to:
      OPEN +
      '- Two preventative maintenance visits a year — including a sewer camera inspection — catches root intrusion and cracks before they cause a backup\n' +
      '- 10% discount on service and equipment\n' +
      '- VIP priority scheduling' +
      CLOSE,
  },
  {
    slug: 'sewer-rodding',
    from:
      OPEN +
      '- Free annual drain clearing — keeps buildup from turning into a full blockage\n' +
      '- Extended labor warranty — from 1 to 5 years\n' +
      '- VIP priority scheduling — guaranteed within 24 hours' +
      CLOSE,
    to:
      OPEN +
      '- Two preventative maintenance visits a year — including an interior drain clearing — keeps buildup from turning into a full blockage\n' +
      '- Extended labor warranty — from 1 to 5 years\n' +
      '- VIP priority scheduling' +
      CLOSE,
  },
  {
    slug: 'water-filtration-systems',
    from:
      OPEN +
      "- Free annual chemical water quality analysis — know exactly what's in your water\n" +
      '- 10% discount on service and equipment (up to $500 per job)\n' +
      '- VIP priority scheduling — guaranteed within 24 hours' +
      CLOSE,
    to:
      OPEN +
      "- Two preventative maintenance visits a year — including a chemical water test — know exactly what's in your water\n" +
      '- 10% discount on service and equipment\n' +
      '- VIP priority scheduling' +
      CLOSE,
  },
  {
    slug: 'kitchen-plumbing',
    from:
      OPEN +
      '- Free annual whole home plumbing tune-up — catches kitchen leaks before they cause damage\n' +
      '- 10% discount on service and equipment (up to $500 per job)\n' +
      '- VIP priority scheduling — guaranteed within 24 hours' +
      CLOSE,
    to:
      OPEN +
      '- Two preventative maintenance visits a year — including a whole home plumbing tune-up — catches kitchen leaks before they cause damage\n' +
      '- 10% discount on service and equipment\n' +
      '- VIP priority scheduling' +
      CLOSE,
  },
  {
    slug: 'residential-water-heater',
    from:
      OPEN +
      "- Free annual water heater flush & maintenance — clears sediment before it shortens your tank's life\n" +
      '- 10% discount on service and equipment (up to $500 per job)\n' +
      '- VIP priority scheduling — guaranteed within 24 hours' +
      CLOSE,
    to:
      OPEN +
      "- Two preventative maintenance visits a year — including a water heater flush & maintenance — clears sediment before it shortens your tank's life\n" +
      '- 10% discount on service and equipment\n' +
      '- VIP priority scheduling' +
      CLOSE,
  },
  {
    // The current row leads with the warranty. The approved rewrite moves it to
    // the second bullet so all six share one shape. Intentional.
    slug: 'tankless-water-heater',
    from:
      OPEN +
      '- Extended labor warranty — from 1 to 5 years\n' +
      '- Free annual water heater flush & maintenance — clears scale buildup before it affects performance\n' +
      '- VIP priority scheduling — guaranteed within 24 hours' +
      CLOSE,
    to:
      OPEN +
      '- Two preventative maintenance visits a year — including a water heater flush & maintenance — clears scale buildup before it affects performance\n' +
      '- Extended labor warranty — from 1 to 5 years\n' +
      '- VIP priority scheduling' +
      CLOSE,
  },
];

// ── Track D — city pages ──────────────────────────────────────────────────────
// Stored TWICE per city: `ndc_intro` and `blocks[<noDripClub>].data.ndcBody`.
// Both are written from this one pair of strings so they cannot diverge. The
// block is located BY TYPE, never by a hardcoded index.
//
// Algonquin keeps the price as the `{{ndc_price_1yr}}` token so it stays driven
// by Global Settings — the resolver chain was traced in Brief 142
// (LocalOfficeCityV2 → renderCmsBlock → resolveTokens → CMS_TOKENS).
// The `&amp;` entity matches how the current rows store it. Keep it.
const CITIES: Array<{ id: number; slug: string; from: string; to: string }> = [
  {
    id: 872,
    slug: 'algonquin',
    from:
      'Members in Algonquin get three services that directly address what this market deals with every year:\n\n' +
      "- Free Annual Water Heater Flush &amp; Maintenance — In hard groundwater territory, this isn't optional maintenance. It's what keeps your unit running at full efficiency and extends its life.\n" +
      '- 1 Free Drain Clearing Per Year — Hard water scale restricts drain lines over time. Annual clearing keeps the lines open before buildup becomes a blockage.\n' +
      "- Free Annual Sewer Camera Inspection — Know what's happening underground before a backup forces the conversation. One inspection per year, no service charge.\n\n" +
      'Membership is $29.97/month and includes 10% off all services, VIP priority scheduling, and no emergency, trip, or holiday fees.',
    to:
      'Members in Algonquin get preventative maintenance built around what this market deals with every year — two visits a year, including:\n\n' +
      "- Water Heater Flush &amp; Maintenance — In hard groundwater territory, this isn't optional maintenance. It's what keeps your unit running at full efficiency and extends its life.\n" +
      '- Interior Drain Clearing — Hard water scale restricts drain lines over time. Clearing keeps the lines open before buildup becomes a blockage.\n' +
      "- Sewer Camera Inspection — Know what's happening underground before a backup forces the conversation, at no service charge.\n\n" +
      'Membership is {{ndc_price_1yr}} a year and includes 10% off all services, VIP priority scheduling, and no emergency, trip, or holiday fees.',
  },
  {
    // The current Elgin row says "Drain Cleaning" where the rest of the site
    // says "Clearing". The approved rewrite standardises on "Clearing".
    id: 2,
    slug: 'elgin',
    from:
      "The No Drip Club is J. Blanton's membership program. Members get: Free Annual Sewer Camera Inspection, Free Annual Water Heater Flush & Maintenance, 1 Free Drain Cleaning Per Year — plus no emergency fees, trip charges, or after-hours markups.",
    to:
      "The No Drip Club is J. Blanton's membership program. Members get two preventative maintenance visits a year — including a Sewer Camera Inspection, a Water Heater Flush &amp; Maintenance, and an Interior Drain Clearing — plus no emergency fees, trip charges, or after-hours markups.",
  },
];

// ── Track E — Knowledge Hub article sentences (`cms_articles.body->>'html'`) ──
// Sentences INSIDE article HTML. The exact sentence is replaced and the rest of
// the body — including the `<a href="/no-drip-club">` links — is left untouched.
// The apostrophe in `home’s` is U+2019, matching the current text.
const ARTICLE_SENTENCES: Array<{ id: number; from: string; to: string }> = [
  {
    id: 476,
    from:
      'Join the <a href="/no-drip-club">No Drip Club</a> Membership to enjoy a free annual sewer camera inspection and regular sewer maintenance services, ensuring your home’s plumbing remains in top condition year-round.',
    to:
      'Join the <a href="/no-drip-club">No Drip Club</a> Membership to enjoy sewer camera inspections and regular sewer maintenance as part of your two preventative maintenance visits each year, keeping your home’s plumbing in top condition.',
  },
  {
    id: 482,
    from:
      'Join the <a href="/no-drip-club">No Drip Club</a> Membership to enjoy VIP Priority Scheduling, exclusive discounts, and a free annual water heater flush and maintenance service to keep your water heater in top condition.',
    to:
      'Join the <a href="/no-drip-club">No Drip Club</a> Membership to enjoy VIP Priority Scheduling, exclusive discounts, and a water heater flush and maintenance service included in your two preventative maintenance visits each year, keeping your water heater in top condition.',
  },
  {
    id: 498,
    from:
      'Join the <a href="/no-drip-club">No Drip Club</a> Membership and enjoy exclusive benefits like VIP Priority Scheduling, annual water heater maintenance, and a 10% discount on services and equipment.',
    to:
      'Join the <a href="/no-drip-club">No Drip Club</a> Membership and enjoy exclusive benefits like VIP Priority Scheduling, water heater maintenance included in your two visits a year, and a 10% discount on services and equipment.',
  },
  {
    id: 500,
    from:
      'Join the <a href="/no-drip-club">No Drip Club</a> Membership and enjoy a free annual water heater flush and maintenance service, along with priority scheduling and discounts on other services.',
    to:
      'Join the <a href="/no-drip-club">No Drip Club</a> Membership and enjoy a water heater flush and maintenance service as part of your two preventative maintenance visits each year, along with priority scheduling and discounts on other services.',
  },
];

type Status = 'applied' | 'already-applied' | 'skipped-mismatch' | 'skipped-missing-row';
interface Result {
  track: string;
  target: string;
  status: Status;
  note?: string;
}
const results: Result[] = [];
const backups: Array<Record<string, unknown>> = [];

function record(track: string, target: string, status: Status, note?: string) {
  results.push({ track, target, status, note });
}

async function main() {
  const client = await pool.connect();
  try {
    console.log(
      mode === 'commit'
        ? 'MODE: COMMIT (writing changes)\n'
        : 'MODE: DRY RUN (no writes — pass "commit" to apply)\n'
    );

    // Backup table. Created in both modes so a dry run proves it will work.
    await client.query(`
      CREATE TABLE IF NOT EXISTS brief143_ndc_content_backup (
        id            SERIAL PRIMARY KEY,
        source_table  TEXT NOT NULL,
        source_id     INTEGER NOT NULL,
        source_slug   TEXT,
        column_path   TEXT NOT NULL,
        old_value     TEXT NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    /** Copy a value into the backup table — once per (table,id,path). */
    async function backup(
      table: string,
      id: number,
      slug: string | null,
      path: string,
      oldValue: string
    ) {
      backups.push({ table, id, slug, path, old_value: oldValue });
      if (mode !== 'commit') return;
      const dup = await client.query(
        'SELECT 1 FROM brief143_ndc_content_backup WHERE source_table=$1 AND source_id=$2 AND column_path=$3',
        [table, id, path]
      );
      if (dup.rowCount) return; // already backed up by an earlier run
      await client.query(
        `INSERT INTO brief143_ndc_content_backup (source_table, source_id, source_slug, column_path, old_value)
         VALUES ($1,$2,$3,$4,$5)`,
        [table, id, slug, path, oldValue]
      );
    }

    // ── Tracks B & C — sub_service_pages named columns ────────────────────────
    for (const [track, column, items] of [
      ['B', 'ndc_title', HEADLINES],
      ['C', 'ndc_body', BODIES],
    ] as const) {
      for (const it of items) {
        const target = `sub_service_pages.${column} [${it.slug}]`;
        const res = await client.query<{ id: number; v: string | null }>(
          `SELECT id, ${column} AS v FROM sub_service_pages WHERE slug = $1`,
          [it.slug]
        );
        const row = res.rows[0];
        if (!row) {
          record(track, target, 'skipped-missing-row', 'no row with this slug in this database');
          continue;
        }
        if (row.v === it.to) {
          record(track, target, 'already-applied');
          continue;
        }
        if (row.v !== it.from) {
          record(track, target, 'skipped-mismatch', 'current value is neither the expected old nor the approved new string — left untouched');
          continue;
        }
        await backup('sub_service_pages', row.id, it.slug, column, row.v);
        if (mode === 'commit') {
          await client.query(`UPDATE sub_service_pages SET ${column} = $1 WHERE id = $2`, [it.to, row.id]);
        }
        record(track, target, 'applied');
      }
    }

    // ── Track D — city_pages: ndc_intro AND the noDripClub block, together ────
    for (const city of CITIES) {
      const res = await client.query<{ id: number; ndc_intro: string | null; blocks: unknown }>(
        'SELECT id, ndc_intro, blocks FROM city_pages WHERE city_slug = $1',
        [city.slug]
      );
      const row = res.rows[0];
      if (!row) {
        record('D', `city_pages [${city.slug}]`, 'skipped-missing-row', 'no row with this city_slug in this database');
        continue;
      }

      // (a) the named column
      const colTarget = `city_pages.ndc_intro [${city.slug}]`;
      if (row.ndc_intro === city.to) {
        record('D', colTarget, 'already-applied');
      } else if (row.ndc_intro !== city.from) {
        record('D', colTarget, 'skipped-mismatch', 'current value is neither the expected old nor the approved new string — left untouched');
      } else {
        await backup('city_pages', row.id, city.slug, 'ndc_intro', row.ndc_intro);
        if (mode === 'commit') {
          await client.query('UPDATE city_pages SET ndc_intro = $1 WHERE id = $2', [city.to, row.id]);
        }
        record('D', colTarget, 'applied');
      }

      // (b) the block copy — located by TYPE, not by index
      const blocks = Array.isArray(row.blocks) ? (row.blocks as Array<Record<string, any>>) : null;
      if (!blocks) {
        record('D', `city_pages.blocks[noDripClub].data.ndcBody [${city.slug}]`, 'skipped-missing-row', 'blocks is null in this database — nothing to write');
        continue;
      }
      const idxs = blocks.map((b, i) => [i, b?.type] as const).filter(([, t]) => t === 'noDripClub').map(([i]) => i);
      if (idxs.length === 0) {
        record('D', `city_pages.blocks[noDripClub].data.ndcBody [${city.slug}]`, 'skipped-missing-row', 'no noDripClub block on this page');
        continue;
      }
      for (const i of idxs) {
        const blockTarget = `city_pages.blocks[${i}].data.ndcBody [${city.slug}]`;
        const cur = blocks[i]?.data?.ndcBody ?? null;
        if (cur === city.to) {
          record('D', blockTarget, 'already-applied');
          continue;
        }
        if (cur !== city.from) {
          record('D', blockTarget, 'skipped-mismatch', 'current value is neither the expected old nor the approved new string — left untouched');
          continue;
        }
        await backup('city_pages', row.id, city.slug, `blocks[${i}].data.ndcBody`, cur);
        if (mode === 'commit') {
          // Targeted JSONB write — only this one leaf changes; the rest of the
          // blocks array (order, ids, styles, every other block) is untouched.
          await client.query(
            `UPDATE city_pages
                SET blocks = jsonb_set(blocks, $1::text[], to_jsonb($2::text), false)
              WHERE id = $3`,
            [`{${i},data,ndcBody}`, city.to, row.id]
          );
        }
        record('D', blockTarget, 'applied');
      }
    }

    // ── Track E — article sentences inside body->>'html' ──────────────────────
    for (const art of ARTICLE_SENTENCES) {
      const target = `cms_articles.body.html [id ${art.id}]`;
      const res = await client.query<{ id: number; slug: string; body: any }>(
        'SELECT id, slug, body FROM cms_articles WHERE id = $1',
        [art.id]
      );
      const row = res.rows[0];
      if (!row) {
        record('E', target, 'skipped-missing-row', 'no article with this id in this database');
        continue;
      }
      const html: string | null = typeof row.body?.html === 'string' ? row.body.html : null;
      if (html === null) {
        record('E', target, 'skipped-mismatch', 'body has no string `html` key');
        continue;
      }
      const hasNew = html.includes(art.to);
      const occurrences = html.split(art.from).length - 1;
      if (hasNew && occurrences === 0) {
        record('E', target, 'already-applied');
        continue;
      }
      if (occurrences !== 1) {
        record(
          'E',
          target,
          'skipped-mismatch',
          `expected exactly 1 occurrence of the approved old sentence, found ${occurrences} — left untouched`
        );
        continue;
      }
      await backup('cms_articles', row.id, row.slug, 'body.html', html);
      if (mode === 'commit') {
        const next = html.replace(art.from, art.to);
        await client.query(
          `UPDATE cms_articles SET body = jsonb_set(body, '{html}', to_jsonb($1::text), false) WHERE id = $2`,
          [next, row.id]
        );
      }
      record('E', target, 'applied');
    }

    // ── Report ────────────────────────────────────────────────────────────────
    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-143-ndc-content-${mode}-${stamp}.json`);
    writeFileSync(file, JSON.stringify({ mode, generated: stamp, results, backups }, null, 2));

    const tally = results.reduce<Record<string, number>>((a, r) => {
      a[r.status] = (a[r.status] ?? 0) + 1;
      return a;
    }, {});

    for (const track of ['B', 'C', 'D', 'E']) {
      const rows = results.filter((r) => r.track === track);
      if (!rows.length) continue;
      console.log(`── Track ${track} ${'─'.repeat(60)}`);
      for (const r of rows) {
        console.log(`  ${r.status.padEnd(20)} ${r.target}${r.note ? `\n      ↳ ${r.note}` : ''}`);
      }
      console.log('');
    }
    console.log('SUMMARY:', JSON.stringify(tally));
    console.log(`targets: ${results.length}   backup rows staged: ${backups.length}`);
    console.log(`log: ${file}`);
    if (mode !== 'commit') console.log('\nNo changes were written. Re-run with `commit` to apply.');

    // A mismatch is not fatal — dev and staging legitimately hold different data
    // (Brief 142 §1.2) — but it must be visible in the deploy log.
    const misses = results.filter((r) => r.status !== 'applied' && r.status !== 'already-applied');
    if (misses.length) {
      console.log(`\nNOTE: ${misses.length} target(s) skipped. Listed above; not an error.`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
