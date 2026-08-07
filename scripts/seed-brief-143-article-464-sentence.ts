/**
 * Brief 143 follow-up — article id 464, the one sentence Brief 143 stopped on.
 *
 * Brief 143 rewrote every live string describing the old No Drip Club offer
 * EXCEPT one: the closing sentence of article 464. Its approved replacement
 * fragment began with a leading `with` that could not be substituted into the
 * surrounding sentence without either duplicating the clause or breaking the
 * grammar, so Track E's own rule — stop and report rather than rewrite signed-off
 * copy — applied and the row was left alone. See the Brief 143 report §5.
 *
 * That left `guaranteeing service within 24 hours` rendering on a published page:
 * the single live-rendering contradiction Brief 143 knowingly left standing.
 *
 * ── The decision (approved 2026-08-07) ───────────────────────────────────────
 * The marketing lead approved a full replacement sentence rather than a fragment.
 * Four changes vs. the Brief 143 fragment, all explicitly signed off:
 *   1. the `guaranteeing service within 24 hours` clause is REMOVED — VIP
 *      scheduling is no longer time-qualified under the annual offer;
 *   2. the fragment's leading `with` is DROPPED, which is what made the original
 *      substitution ungrammatical;
 *   3. `VIP Priority Scheduling` is lowercased to `VIP priority scheduling`, per
 *      the approved string;
 *   4. the trailing `*` is DELETED. Brief 143 §5 established it is an ORPHANED
 *      footnote marker — the article contains exactly one asterisk and no
 *      footnote line anywhere in the body. It was copied from the classic
 *      benefits card's `*10% discount up to $500 per job…` note without the note.
 *      The annual offer has no discount footnote (Brief 141), so the marker now
 *      points at nothing that exists and is removed rather than re-pointed.
 *
 * The sentence below is transcribed VERBATIM from that approval. The em dash is
 * U+2014 and the apostrophe in `you'll` is a straight U+0027 — matching how the
 * row stores it today, even though the same paragraph uses U+2019 elsewhere
 * (`home’s`, `Don’t`). That inconsistency is in the source data; do not "tidy" it,
 * or the exact-match guard below stops matching.
 *
 * ── Safety ───────────────────────────────────────────────────────────────────
 * Identical guarantees to scripts/seed-brief-143-ndc-offer-content.ts, whose
 * Track E this continues:
 *
 * SAFE BY DEFAULT: dry run unless invoked with `commit`.
 *
 * BACKUP-FIRST: the row's current `body.html` is copied into
 * `brief143_ndc_content_backup` — the same table Brief 143 used, so one restore
 * path covers the whole offer rewrite — AND to a timestamped JSON file under
 * `scripts/backups/`. The DB table is the one that matters on the deploy box,
 * where the JSON file is not easily retrievable. Brief 143 skipped this row, so
 * it writes a new backup row rather than colliding with an existing one.
 *
 * EXACT MATCH, NEVER FUZZY: the write happens only when the approved old
 * sentence appears in `body.html` exactly once. Anything else is reported and
 * skipped:
 *   - the approved new sentence is already there → `already-applied`
 *   - 0 or 2+ occurrences of the old sentence    → `skipped-mismatch`
 *     (an editor changed it; this script must not clobber that)
 *   - no row with id 464 in this database        → `skipped-missing-row`
 * Re-running is therefore a no-op, which is what makes it safe to leave in the
 * deploy pipeline permanently, and safe on dev and staging alike — Brief 142
 * proved those two hold different data.
 *
 *   # preview (no writes):
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-brief-143-article-464-sentence.ts
 *   # apply:
 *   npx ts-node --project tsconfig.scripts.json scripts/seed-brief-143-article-464-sentence.ts commit
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';
import { resolveRunMode, announceMode } from './lib/run-mode';

const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

// Brief 147 (Track A): one shared rule for apply-vs-preview. Still dry-run by
// default at a terminal — but a PIPELINE run (JBP_PIPELINE/CI set) with no
// explicit `commit` or `--dry-run` now exits NON-ZERO instead of quietly
// previewing and letting the deploy report success. That silent-no-op path is
// how the Brief 146 content port shipped an empty page. See scripts/lib/run-mode.ts.
const SCRIPT = 'seed-brief-143-article-464-sentence';
const mode = resolveRunMode(SCRIPT);

/** The article, identified by id AND slug — the slug is asserted, not trusted. */
const ARTICLE_ID = 464;
const ARTICLE_SLUG =
  '45546-how-to-solve-hot-water-shortages-an-algonquin-guide-to-water-heater-repairs';

const FROM =
  "As a member, you'll receive VIP Priority Scheduling, guaranteeing service within 24 hours, " +
  'along with a 10% discount on services and equipment*—all with no emergency fees, trip charges, ' +
  'or after-hours and holiday fees.';

const TO =
  "As a member, you'll receive VIP priority scheduling, along with a 10% discount on services " +
  'and equipment—all with no emergency fees, trip charges, or after-hours and holiday fees.';

type Status = 'applied' | 'already-applied' | 'skipped-mismatch' | 'skipped-missing-row';

async function main() {
  const client = await pool.connect();
  let status: Status;
  let note = '';
  let backup: Record<string, unknown> | null = null;

  try {
    announceMode(SCRIPT, mode);

    // Same backup table as Brief 143. Created here too so this script stands on
    // its own if it is ever run before, or without, the Brief 143 migration.
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

    const res = await client.query<{ id: number; slug: string; body: any }>(
      'SELECT id, slug, body FROM cms_articles WHERE id = $1',
      [ARTICLE_ID]
    );
    const row = res.rows[0];

    if (!row) {
      status = 'skipped-missing-row';
      note = `no cms_articles row with id ${ARTICLE_ID} in this database`;
    } else if (row.slug !== ARTICLE_SLUG) {
      // Ids are not portable between databases the way slugs are. If id 464 is
      // some other article here, this is the wrong row and must not be written.
      status = 'skipped-mismatch';
      note = `id ${ARTICLE_ID} has slug "${row.slug}", expected "${ARTICLE_SLUG}" — wrong row, left untouched`;
    } else {
      const html: string | null = typeof row.body?.html === 'string' ? row.body.html : null;
      if (html === null) {
        status = 'skipped-mismatch';
        note = 'body has no string `html` key';
      } else {
        const occurrences = html.split(FROM).length - 1;
        const hasNew = html.includes(TO);

        if (hasNew && occurrences === 0) {
          status = 'already-applied';
          note = 'the approved sentence is already in place';
        } else if (occurrences !== 1) {
          status = 'skipped-mismatch';
          note =
            `expected exactly 1 occurrence of the approved old sentence, found ${occurrences} — ` +
            'left untouched (an editor has changed this row)';
        } else {
          backup = {
            table: 'cms_articles',
            id: row.id,
            slug: row.slug,
            path: 'body.html',
            old_value: html,
          };

          if (mode === 'commit') {
            // Backup first, and only once per (table,id,path) across re-runs.
            const dup = await client.query(
              'SELECT 1 FROM brief143_ndc_content_backup WHERE source_table=$1 AND source_id=$2 AND column_path=$3',
              ['cms_articles', row.id, 'body.html']
            );
            if (!dup.rowCount) {
              await client.query(
                `INSERT INTO brief143_ndc_content_backup
                   (source_table, source_id, source_slug, column_path, old_value)
                 VALUES ($1,$2,$3,$4,$5)`,
                ['cms_articles', row.id, row.slug, 'body.html', html]
              );
            }

            // Targeted JSONB write — only body.html changes. Every other key on
            // `body` (and every other column on the row) is untouched, and the
            // rest of the HTML, including the <a href="/no-drip-club"> link that
            // opens this same paragraph, is preserved byte-for-byte.
            const next = html.replace(FROM, TO);
            await client.query(
              `UPDATE cms_articles
                  SET body = jsonb_set(body, '{html}', to_jsonb($1::text), false)
                WHERE id = $2`,
              [next, row.id]
            );
          }
          status = 'applied';
        }
      }
    }

    // ── Report ────────────────────────────────────────────────────────────────
    const dir = join(process.cwd(), 'scripts', 'backups');
    mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = join(dir, `brief-143-article-464-${mode}-${stamp}.json`);
    writeFileSync(
      file,
      JSON.stringify(
        { mode, generated: stamp, article_id: ARTICLE_ID, slug: ARTICLE_SLUG, status, note, backup },
        null,
        2
      )
    );

    console.log(`── Article ${ARTICLE_ID} ${'─'.repeat(52)}`);
    console.log(`  ${status.padEnd(20)} cms_articles.body.html [id ${ARTICLE_ID}]`);
    if (note) console.log(`      ↳ ${note}`);
    console.log('');
    console.log(`backup rows staged: ${backup ? 1 : 0}`);
    console.log(`log: ${file}`);
    if (mode !== 'commit') console.log('\nNo changes were written. Re-run with `commit` to apply.');

    // A skip is not fatal — dev and staging legitimately hold different data
    // (Brief 142 §1.2) — but it must be visible in the deploy log.
    if (status !== 'applied' && status !== 'already-applied') {
      console.log(`\nNOTE: target skipped (${status}). Listed above; not an error.`);
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
