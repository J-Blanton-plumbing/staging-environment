/**
 * fix-brief-100-septic-language.ts — Brief 100: remove every reading of the
 * Knowledge Hub that implies J. Blanton Plumbing services, maintains or pumps
 * SEPTIC systems.
 *
 * ── WHY ─────────────────────────────────────────────────────────────────────
 * A prospect called sales to say the site "states that we pump out septic
 * systems". We do not. Six published articles carry copy that reads as a septic
 * OFFER rather than as background context — the worst of them hyperlinks the
 * word "pumping" straight into our own ejector-pump guide (id 168) and one
 * flatly says "a plumber can still retrieve it" about an item in a septic tank
 * (id 124). All six sit on pages carrying booking CTAs, so the CTA inherits the
 * claim.
 *
 * ── THE STANDING COPY RULE (all six edits) ──────────────────────────────────
 * Septic may appear as CONTEXT ("your line runs to the city sewer or a septic
 * tank"). It must never appear as a symptom we diagnose, a system we maintain,
 * or a service we perform.
 *
 * ── BRIEF REVISION 2026-09-21 12:32 — READ BEFORE TOUCHING THE COPY ─────────
 * The brief was revised after this script's first dev run, and the approved
 * wording for A.1–A.4 CHANGED. Two new hard rules drove it, and both are easy
 * to violate by "improving" a sentence:
 *
 *  1. NO LEGAL OR LICENSING CLAIMS. The first draft said septic pumping
 *     "requires a licensed septic contractor, not a plumber". Illinois does
 *     license septic pumping separately (IDPH, Private Sewage Disposal
 *     Licensing Act, 225 ILCS 225) — but A PLUMBING COMPANY MAY ALSO HOLD THAT
 *     LICENSE, so as an exclusivity claim it is simply false. The copy states
 *     what WE do and nothing about the customer's legal obligations.
 *  2. NO REFERRAL CLAUSE. No "you'll need a licensed septic contractor", no
 *     "that is specialized work", no pointing the reader at another provider.
 *
 * There are deliberately TWO approved forms; do not normalise them to one:
 *   - canonical, used verbatim in A.2:
 *       "J. Blanton Plumbing services municipal sewer and drain lines. We do
 *        not service, maintain, or pump septic systems."
 *   - em-dash variant, used in A.1/A.3/A.4 (note: no "maintain"):
 *       "J. Blanton Plumbing services municipal sewer and drain lines — we do
 *        not service or pump septic systems."
 *
 * ── THE COPY IS BLOCKED ON OPS SIGN-OFF ─────────────────────────────────────
 * The revised brief forbids running this against ANY environment, dev included,
 * until the service/ops manager has approved the scope statement in writing,
 * because the claim itself is still unverified (the only evidence is a customer
 * phone call relayed through sales). The pre-flight also has to settle three
 * edge cases — do we rod/jet/camera a lateral RUNNING TO a septic tank, service
 * an ejector pump in a septic home, or diagnose and refer out? If any answer is
 * yes, the flat denial is too broad and THE BRIEF gets revised, not this file:
 * do not improvise a narrower sentence here.
 *
 * NOTE FOR WHOEVER RUNS THIS NEXT: the dev database was written once, on
 * 2026-09-21 at 10:49, with the SUPERSEDED pre-revision wording. Dev therefore
 * matches neither the original live text nor the approved text, so a plain
 * re-run there is not enough — see "RE-RUNNING OVER A SUPERSEDED RUN" below.
 * Staging and production were never touched and take the approved copy in one
 * clean pass.
 *
 * ── RE-RUNNING OVER A SUPERSEDED RUN ────────────────────────────────────────
 * `--rollback` FIRST, then `commit`. The guards are exact-match against the
 * ORIGINAL live strings, which a superseded environment no longer has, so:
 *   - A.1/A.3/A.4 report `skipped-mismatch` (neither old nor new string present)
 *   - A.5/A.6 report `already-applied` (their copy did not change in the revision)
 *   - A.2 is the dangerous one: its guard looks for the NEW paragraph, does not
 *     find it, matches the anchor `<h2>`, and would insert the approved
 *     paragraph ALONGSIDE the superseded one.
 * The all-or-nothing gate catches this (3/6 accounted -> full rollback, nothing
 * written), which is exactly what it is for. Do NOT reach for `--allow-partial`
 * to force it through — that is the one flag that would let A.2 double up.
 *
 * ── SCOPE ───────────────────────────────────────────────────────────────────
 * Content only. Exactly six `cms_articles` rows: 67, 111, 116, 124, 131, 168.
 * Eleven other articles mention septic as neutral background and were reviewed
 * and cleared by Marketing — they are named in OUT_OF_SCOPE below so a reader of
 * this file can see they were considered, and the script can never reach them:
 * every statement names one id from TARGETS.
 *
 * ── WHAT ELSE THIS WRITES, AND WHY IT IS NOT SCOPE CREEP ────────────────────
 * Under Brief 159 an article's content lives in TWO places: the live render copy
 * `cms_articles.body.html`, and the `page_drafts` row that `is_published = true`
 * ("Version 1 — live"), which is the version model's source of truth. Verified
 * 2026-09-21 on dev: each of the six has exactly one such row and its
 * `content.body` is BYTE-IDENTICAL to the live HTML.
 *
 * Writing only `cms_articles` would leave the published version row holding the
 * septic wording, and:
 *   - `useDraftVersions.switchTo()` (Brief 159 Track C1) loads a version's STORED
 *     content into the editor form, so selecting "Version 1 — live" would put the
 *     septic text back on screen, and
 *   - `publishDraft()` → `updateArticleCmsContent()` writes that stored body
 *     straight back into `cms_articles`.
 * i.e. the fix would be one click from undoing itself. The CMS's own write path
 * never produces that drift, so keeping the pair in step is what the brief's
 * "preserve the write path's guarantees" rule MEANS for an article — not an
 * extra edit. The sync is still exact-match-guarded and still confined to the
 * six slugs, and `--no-sync-versions` turns it off if Marketing wants only the
 * render copy touched. NOTE: Brief 100's audit did not mention `page_drafts` at
 * all — see the implementation report, "Deviations".
 *
 * ── THE SANITIZER IS A GATE HERE, NOT A TRANSFORM ───────────────────────────
 * The brief requires the new content to go through `sanitizeCmsHtml`, the shared
 * Brief 73 allow-list the CMS write path uses. It ALSO requires that no inline
 * style change. Those two collide, because `CMS_ALLOWED_ATTRIBUTES` lists no
 * attributes for `p`/`h2`/`h3`/`li`, so the sanitizer STRIPS every `style="…"`
 * (measured, not assumed — see `--selftest`). Running a 10 KB article body
 * through it would rewrite the whole row, which is exactly what "content only"
 * forbids.
 *
 * So the sanitizer is applied to each new FRAGMENT as a validator: the fragment
 * is safe iff `sanitizeCmsHtml(fragment)` equals the fragment with its `style`
 * attributes removed. If they match, the allow-list would have dropped nothing
 * but styles — no disallowed tag, no disallowed attribute, no disallowed URL
 * scheme, no dropped text. If they differ the script ABORTS and prints the diff.
 * Stored HTML is therefore byte-controlled by this file and still provably
 * allow-list-clean. (It is also belt-and-braces: `src/app/knowledge-hub/[slug]/
 * page.tsx` sanitizes again on the RENDER path, which is why the stored inline
 * styles never reach a browser in the first place — article.css does the
 * styling. The brief's "match the neighbours' style string exactly" rule is
 * about keeping the stored row internally consistent for whoever edits it next,
 * and is followed to the byte.)
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 *  - DRY RUN by default; `commit` applies. In the pipeline (JBP_PIPELINE/CI) a
 *    run with neither flag REFUSES to start — scripts/lib/run-mode.ts.
 *  - BACKUP FIRST. Every target row's full `body` jsonb (and its paired draft
 *    content) is dumped to `scripts/backups/brief-100-septic-before.json` — in
 *    dry run too — AND, on commit, into `brief100_septic_backup`. The DB table is
 *    the one that matters on the deploy box, where the file is not retrievable.
 *  - EXACT MATCH, NEVER FUZZY. Never a blind replace on the substring "septic".
 *    A row is written only when its expected source string appears EXACTLY once.
 *    Anything else is skipped and reported: `already-applied` (the new wording is
 *    there), `skipped-mismatch` (0 or 2+ matches — an editor changed it),
 *    `skipped-missing-row`, `skipped-wrong-slug` (ids are not portable between
 *    databases; the slug is asserted, not trusted), `skipped-bad-body-shape`.
 *  - IDEMPOTENT. A second `commit` run reports 6 x already-applied and writes
 *    nothing, so this is safe to leave in the deploy pipeline permanently.
 *  - ALL OR NOTHING. The brief's hard rule: exactly 6 ids, or abort the
 *    transaction. `applied + already-applied` must equal 6 or everything rolls
 *    back. `--allow-partial` is the deliberate escape hatch for the case where
 *    Marketing has reviewed a mismatch and wants the other rows shipped anyway.
 *  - GUARDED WRITES. Every UPDATE names one id AND re-asserts the old value
 *    (`AND body->>'html' = $old`), so an editor save landing between the read and
 *    the write is skipped, never clobbered.
 *  - A tripped guard exits 0 with a loud banner, ON PURPOSE. deploy.yml runs this
 *    with `script_stop: true`; a non-zero exit would abort the build swap and the
 *    pm2 reload and turn a data question into an outage (the Brief 145 rule).
 *    Read the step output — silence is not "applied". The PIPELINE VERDICT line
 *    says which it was.
 *  - `--rollback` restores every value from `brief100_septic_backup`, guarded on
 *    the current value still being the one this script wrote.
 *
 * Usage — `-r tsconfig-paths/register` is REQUIRED (this imports the shared
 * sanitizer and changelog helper from `src/`, which resolve `@/…` aliases):
 *
 *   # what the allow-list would do to each fragment (no DB needed)
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/fix-brief-100-septic-language.ts --selftest
 *   # preview (no writes)
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/fix-brief-100-septic-language.ts
 *   # apply
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/fix-brief-100-septic-language.ts commit
 *   # undo
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/fix-brief-100-septic-language.ts --rollback
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Pool, PoolClient } from 'pg';
import { resolveRunMode, announceMode, verdict } from './lib/run-mode';
import { sanitizeCmsHtml } from '../src/lib/cms/sanitize';
import { writeChangelog } from '../src/lib/cms/changelog';

// ── env / pool (same pattern as seed-brief-143-article-464-sentence.ts) ─────
const env = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const get = (k: string) => {
  if (process.env[k]) return process.env[k] as string;
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const pool = new Pool({
  connectionString: get('DATABASE_URL') || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

const SCRIPT = 'fix-brief-100-septic-language';
const ARGV = process.argv.slice(2);
const SELFTEST = ARGV.includes('--selftest');
const ROLLBACK = ARGV.includes('--rollback');
const ALLOW_PARTIAL = ARGV.includes('--allow-partial');
const SYNC_VERSIONS = !ARGV.includes('--no-sync-versions');

const BACKUP_FILE = join(process.cwd(), 'scripts', 'backups', 'brief-100-septic-before.json');

/**
 * U+2014 EM DASH, written as an escape rather than a literal so that no editor,
 * terminal or git encoding step between here and the database can turn the
 * approved copy into a different character. Same reason the ASCII apostrophe in
 * `can't` (A.1) and `you'll` (A.2) is called out: article 168 stores a straight
 * U+0027 there and the brief says keep it, even though article 124's neighbours
 * use U+2019.
 */
const EM = '—';

/** The inline style string every `<p>` in the two NEWER articles (111, 168) carries. */
const P_STYLE = 'font-family:NRegular;font-size:18px;line-height:1.8;color:#333;margin-bottom:13px;';

// ── the six edits ───────────────────────────────────────────────────────────
type Edit =
  | { kind: 'replace'; find: string; replace: string }
  | { kind: 'insert-before'; anchor: string; insert: string };

interface Target {
  /** Brief section. */
  ref: string;
  id: number;
  slug: string;
  /** One line for the deploy log / report. */
  summary: string;
  edit: Edit;
}

const TARGETS: Target[] = [
  {
    // A.1 — highest risk: a septic symptom whose "pumping" links into OUR guide.
    // The `<h3>3. Septic Tank Issues</h3>` heading above it is deliberately left
    // alone: the section headings are numbered 1–5 and removing one breaks the
    // sequence. The <a> is removed entirely and NOT re-pointed; "pumping" stays
    // as plain text.
    ref: 'A.1',
    id: 168,
    slug: 'sink-not-draining-but-pipes-clear-causes-fixes',
    summary: 'ejector-pump link removed from the septic paragraph + scope sentence added',
    edit: {
      kind: 'replace',
      find:
        `<p style="${P_STYLE}">Homes with septic systems can experience slow or stopped drainage ` +
        `if the tank is overdue for <a href="/45548-the-ultimate-guide-to-ejector-pump-maintenance-for-naperville-residents" ` +
        `style="color:#1560E6;">pumping</a>. Even a clear sink pipe can't drain properly when the ` +
        `septic system is full.</p>`,
      replace:
        `<p style="${P_STYLE}">Homes with septic systems can experience slow or stopped drainage ` +
        `if the tank is overdue for pumping. Even a clear sink pipe can't drain properly when the ` +
        `septic system is full. J. Blanton Plumbing services municipal sewer and drain lines ${EM} ` +
        `we do not service or pump septic systems.</p>`,
    },
  },
  {
    // A.2 — the #1 Google result for "septic" on our domain. The Septic System
    // section is legitimate educational content and it ranks, so it STAYS; one
    // scope paragraph is appended as its last element, i.e. immediately before
    // the next <h2>. The four existing septic sentences are not edited.
    ref: 'A.2',
    id: 111,
    slug: 'different-types-of-home-sewer-system',
    summary: 'scope paragraph appended to the end of the Septic System section',
    edit: {
      kind: 'insert-before',
      anchor:
        '<h2 style="font-family:IBold;font-size:32px;line-height:1.3;color:#0A1B2E;' +
        'margin-top:25px;margin-bottom:18px;">Why Understanding Your Sewer System Matters</h2>',
      insert:
        `<p style="${P_STYLE}"><strong>Note:</strong> J. Blanton Plumbing services municipal sewer ` +
        `and drain lines. We do not service, maintain, or pump septic systems.</p>`,
    },
  },
  {
    // A.3 — a maintenance pitch immediately above a "Do You Need Sewer Repair?"
    // CTA. Bare <p>, no inline style: this is one of the OLDER articles and its
    // paragraphs carry no style attribute. Do not add one. The article's other
    // septic sentences are descriptive, not offers, and the new sentence scopes
    // the section, so they stay.
    ref: 'A.3',
    id: 67,
    slug: '7-signs-of-main-sewer-line-problems',
    summary: 'septic maintenance sentence rewritten to scope it to what we service',
    edit: {
      kind: 'replace',
      find:
        '<p>Just like regular systems, septic systems need maintenance. ' +
        "If you don't take care of it properly, the septic system will fail.</p>",
      replace:
        `<p>Just like municipal systems, septic systems need maintenance. J. Blanton Plumbing ` +
        `services municipal sewer and drain lines ${EM} we do not service or pump septic systems.</p>`,
    },
  },
  {
    // A.4 — the most direct service claim on the site. Sentence text only: the
    // surrounding <li> and its <strong>Septic Tank:</strong> label are untouched,
    // as are the preceding sentences in that list item. The replacement contains
    // no apostrophe, so the article's curly-apostrophe convention is not at issue.
    ref: 'A.4',
    id: 124,
    slug: 'what-should-i-do-if-i-flushed-something-valuable-down-the-toilet',
    summary: 'retrieval sentence rewritten — "a plumber can still retrieve it" removed',
    edit: {
      kind: 'replace',
      find:
        'If your item found its way into the septic tank, a plumber can still retrieve it. ' +
        'However, it is a major undertaking that could cost you time and money.',
      replace:
        `If your item found its way into the septic tank, retrieving it is a major undertaking. ` +
        `J. Blanton Plumbing services municipal sewer and drain lines ${EM} we do not service or ` +
        `pump septic systems.`,
    },
  },
  {
    // A.5 — septic inside a bulleted scope-of-work list describing what OUR
    // plumbers do. One-word-scale fix; the other four bullets are unchanged and
    // the list is not reordered.
    ref: 'A.5',
    id: 131,
    slug: 'what-is-rough-in-plumbing',
    summary: 'septic removed from the rough-in scope-of-work bullet',
    edit: {
      kind: 'replace',
      find: '<li>Connecting drain lines to the sewer line or septic system</li>',
      replace: '<li>Connecting drain lines to the sewer line</li>',
    },
  },
  {
    // A.6 — a septic symptom on an article whose entire CTA is "call us now".
    // This is the article's ONLY septic mention, so no scope sentence is needed:
    // after this edit nothing septic-related remains on the page.
    ref: 'A.6',
    id: 116,
    slug: '5-signs-you-need-to-call-an-emergency-plumber',
    summary: 'septic removed from the backed-up-fixtures symptom line',
    edit: {
      kind: 'replace',
      find:
        'When you notice your toilet and fixtures clogging and backing up altogether, ' +
        'you may have a backed-up septic system or blocked sewer line.',
      replace:
        'When you notice your toilet and fixtures clogging and backing up altogether, ' +
        'you may have a blocked sewer or main line.',
    },
  },
];

/**
 * The eleven articles Marketing reviewed and cleared: septic appears only as
 * neutral background. Listed so the audit is legible from the code, and used by
 * the closing inventory to label each remaining hit. NEVER written.
 */
const OUT_OF_SCOPE = new Map<number, string>([
  [36, 'eight-things-you-should-never-flush-down-your-toilet'],
  [51, 'clogs-diy-efforts-and-the-drain-cleaning-techniques-plumbing-professionals-swear-by'],
  [61, 'why-is-your-sewer-line-backing-up-so-frequently'],
  [103, 'the-importance-of-sewer-repair-and-cleaning'],
  [123, 'importance-of-proper-water-pressure-in-your-home'],
  [132, 'how-to-clean-a-plumbing-vent'],
  [156, 'how-to-install-a-sewage-ejector-pump-in-your-basement'],
  [470, '45548-the-ultimate-guide-to-ejector-pump-maintenance-for-naperville-residents'],
  [471, '45548-top-eco-friendly-drain-cleaning-solutions-for-northbrook-homes'],
  [546, '45583-avoid-basement-floods-in-elgin-know-when-your-ejector-pump-needs-service'],
  [613, '45615-choosing-the-best-garbage-disposal-for-your-mchenry-kitchen-a-step-by-step-guide'],
]);

// ── the allow-list gate ─────────────────────────────────────────────────────
/** Remove every `style="…"` / `style='…'` attribute. */
function stripStyleAttributes(html: string): string {
  return html.replace(/\s+style="[^"]*"/g, '').replace(/\s+style='[^']*'/g, '');
}

/**
 * A fragment passes iff the shared Brief 73 allow-list would remove NOTHING from
 * it except inline styles. Any other difference — a dropped tag, a dropped
 * attribute, a rewritten URL, lost text — fails, and the caller aborts.
 */
function allowListCheck(fragment: string): { ok: boolean; sanitized: string; expected: string } {
  const sanitized = sanitizeCmsHtml(fragment);
  const expected = stripStyleAttributes(fragment);
  return { ok: sanitized === expected, sanitized, expected };
}

/** The new markup each target introduces — the thing the gate is run against. */
function newFragment(t: Target): string {
  return t.edit.kind === 'replace' ? t.edit.replace : t.edit.insert;
}

function selftest(): number {
  console.log('Brief 100 — allow-list self-test (no database touched)\n');
  let bad = 0;
  for (const t of TARGETS) {
    const frag = newFragment(t);
    const { ok, sanitized, expected } = allowListCheck(frag);
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${t.ref}  id ${t.id}  ${t.slug}`);
    console.log(`        fragment  : ${frag.length} chars`);
    console.log(`        sanitized : ${sanitized.length} chars (styles stripped by the allow-list)`);
    if (!ok) {
      bad++;
      console.log(`        expected  : ${JSON.stringify(expected)}`);
      console.log(`        got       : ${JSON.stringify(sanitized)}`);
    }
  }
  // The brief asks explicitly whether <strong> survives the sanitizer (A.2).
  const strong = sanitizeCmsHtml('<strong>Note:</strong>');
  console.log(`\n  <strong> survives sanitizeCmsHtml : ${strong === '<strong>Note:</strong>'} (${strong})`);
  console.log(
    `  inline style survives it          : ${
      sanitizeCmsHtml('<p style="color:#333;">x</p>') === '<p style="color:#333;">x</p>'
    }  <- why the sanitizer is a GATE here, not a transform`
  );
  console.log(`\n${bad === 0 ? 'All fragments are allow-list clean.' : `${bad} fragment(s) FAILED.`}`);
  return bad;
}

// ── planning ────────────────────────────────────────────────────────────────
type Status =
  | 'applied'
  | 'already-applied'
  | 'skipped-mismatch'
  | 'skipped-missing-row'
  | 'skipped-wrong-slug'
  | 'skipped-bad-body-shape';

interface Plan {
  target: Target;
  status: Status;
  note: string;
  /** Full pre-edit `body` jsonb, for the backup. */
  beforeBody: unknown;
  beforeHtml: string | null;
  afterHtml: string | null;
  /** The paired `is_published` page_drafts row, when it mirrors the live body. */
  draftId: number | null;
  draftNote: string;
}

function planEdit(html: string, edit: Edit): { status: Status; note: string; next: string | null } {
  if (edit.kind === 'replace') {
    const occ = html.split(edit.find).length - 1;
    const hasNew = html.includes(edit.replace);
    if (occ === 0 && hasNew) {
      return { status: 'already-applied', note: 'the approved wording is already in place', next: null };
    }
    if (occ !== 1) {
      return {
        status: 'skipped-mismatch',
        note:
          `expected exactly 1 occurrence of the approved source string, found ${occ} ` +
          '— left untouched (an editor has changed this row)',
        next: null,
      };
    }
    return { status: 'applied', note: '', next: html.replace(edit.find, edit.replace) };
  }
  // insert-before
  if (html.includes(edit.insert)) {
    return { status: 'already-applied', note: 'the scope paragraph is already in place', next: null };
  }
  const occ = html.split(edit.anchor).length - 1;
  if (occ !== 1) {
    return {
      status: 'skipped-mismatch',
      note:
        `expected exactly 1 occurrence of the anchor heading, found ${occ} ` +
        '— left untouched (an editor has changed this row)',
      next: null,
    };
  }
  return { status: 'applied', note: '', next: html.replace(edit.anchor, edit.insert + edit.anchor) };
}

async function buildPlan(client: PoolClient): Promise<Plan[]> {
  const plans: Plan[] = [];
  for (const target of TARGETS) {
    const res = await client.query<{
      id: number;
      slug: string;
      body: unknown;
      body_type: string;
      html: string | null;
    }>(
      `SELECT id, slug, body, jsonb_typeof(body) AS body_type, body->>'html' AS html
         FROM cms_articles WHERE id = $1 FOR UPDATE`,
      [target.id]
    );
    const row = res.rows[0];
    const base: Plan = {
      target,
      status: 'applied',
      note: '',
      beforeBody: null,
      beforeHtml: null,
      afterHtml: null,
      draftId: null,
      draftNote: '',
    };

    if (!row) {
      plans.push({
        ...base,
        status: 'skipped-missing-row',
        note: `no cms_articles row with id ${target.id} in this database`,
      });
      continue;
    }
    // Ids are not portable between databases the way slugs are (the Brief 143
    // lesson). If id N is some other article here, this is the wrong row.
    if (row.slug !== target.slug) {
      plans.push({
        ...base,
        status: 'skipped-wrong-slug',
        note: `id ${target.id} has slug "${row.slug}", expected "${target.slug}" — wrong row, left untouched`,
      });
      continue;
    }
    // The brief's hard rule: `body` is jsonb shaped {"html": "<...>"} despite the
    // column's `'[]'::jsonb` default. Verify at runtime; stop, do not guess.
    if (row.body_type !== 'object' || typeof row.html !== 'string') {
      plans.push({
        ...base,
        beforeBody: row.body,
        status: 'skipped-bad-body-shape',
        note:
          `body is jsonb_typeof="${row.body_type}" with ${row.html === null ? 'no' : 'a non-string'} ` +
          '`html` key — not the {"html": "…"} shape this brief edits. STOPPING on this row rather than guessing.',
      });
      continue;
    }

    const { status, note, next } = planEdit(row.html, target.edit);
    const plan: Plan = {
      ...base,
      status,
      note,
      beforeBody: row.body,
      beforeHtml: row.html,
      afterHtml: next,
    };

    // The paired Brief 159 published version row, matched on the PRE-EDIT body so
    // a version an editor has since changed is never overwritten.
    if (SYNC_VERSIONS) {
      const d = await client.query<{ id: number; version: number; label: string }>(
        `SELECT id, version, label FROM page_drafts
          WHERE page_type = 'article' AND page_slug = $1 AND is_published = true
            AND content->>'body' = $2
          FOR UPDATE`,
        [target.slug, row.html]
      );
      if (d.rowCount === 1) {
        plan.draftId = d.rows[0].id;
        plan.draftNote = `page_drafts #${d.rows[0].id} v${d.rows[0].version} "${d.rows[0].label}" mirrors the live body`;
      } else {
        const any = await client.query<{ n: string }>(
          `SELECT count(*)::text AS n FROM page_drafts
            WHERE page_type = 'article' AND page_slug = $1 AND is_published = true`,
          [target.slug]
        );
        plan.draftNote =
          `no published version row mirrors the pre-edit body (${any.rows[0].n} published version row(s) ` +
          'for this slug) — version row left untouched';
      }
    } else {
      plan.draftNote = 'version sync disabled (--no-sync-versions)';
    }
    plans.push(plan);
  }
  return plans;
}

// ── apply ───────────────────────────────────────────────────────────────────
async function apply(client: PoolClient, plans: Plan[]): Promise<{ rows: number; drafts: number }> {
  let rows = 0;
  let drafts = 0;
  for (const p of plans) {
    if (p.status !== 'applied' || p.afterHtml === null || p.beforeHtml === null) continue;
    const { target } = p;

    // Backup BEFORE the write, once per (table, id, path) across re-runs.
    const dup = await client.query(
      'SELECT 1 FROM brief100_septic_backup WHERE source_table = $1 AND source_id = $2 AND column_path = $3',
      ['cms_articles', target.id, 'body.html']
    );
    if (!dup.rowCount) {
      await client.query(
        `INSERT INTO brief100_septic_backup
           (brief_ref, source_table, source_id, source_slug, column_path, old_value, new_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [target.ref, 'cms_articles', target.id, target.slug, 'body.html', p.beforeHtml, p.afterHtml]
      );
    }

    // Targeted jsonb write: ONLY body.html changes. Every other key on `body` and
    // every other column on the row is untouched. `updated_at` moves on purpose —
    // /sitemap-articles.xml takes an article's <lastmod> from
    // COALESCE(updated_at, created_at), so bumping it is what asks Google to
    // re-crawl the corrected page. `updated_by` is deliberately NOT overwritten:
    // no cms_users row performed this edit, and blanking the last human editor
    // would destroy attribution. The page_changelog row below is the attribution.
    const res = await client.query(
      `UPDATE cms_articles
          SET body = jsonb_set(body, '{html}', to_jsonb($1::text), false),
              updated_at = NOW()
        WHERE id = $2 AND body->>'html' = $3`,
      [p.afterHtml, target.id, p.beforeHtml]
    );
    if ((res.rowCount ?? 0) !== 1) {
      throw new Error(
        `${target.ref} id ${target.id}: guarded UPDATE matched ${res.rowCount} rows, expected 1 ` +
          '— the row changed between the read and the write. Rolling back.'
      );
    }
    rows++;

    if (p.draftId !== null) {
      const dres = await client.query(
        `UPDATE page_drafts
            SET content = jsonb_set(content, '{body}', to_jsonb($1::text), false)
          WHERE id = $2 AND content->>'body' = $3`,
        [p.afterHtml, p.draftId, p.beforeHtml]
      );
      if ((dres.rowCount ?? 0) !== 1) {
        throw new Error(
          `${target.ref} id ${target.id}: guarded page_drafts UPDATE matched ${dres.rowCount} rows, ` +
            'expected 1. Rolling back.'
        );
      }
      const ddup = await client.query(
        'SELECT 1 FROM brief100_septic_backup WHERE source_table = $1 AND source_id = $2 AND column_path = $3',
        ['page_drafts', p.draftId, 'content.body']
      );
      if (!ddup.rowCount) {
        await client.query(
          `INSERT INTO brief100_septic_backup
             (brief_ref, source_table, source_id, source_slug, column_path, old_value, new_value)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [target.ref, 'page_drafts', p.draftId, target.slug, 'content.body', p.beforeHtml, p.afterHtml]
        );
      }
      drafts++;
    }

    // Audit trail. `cms_articles`'s own content-save route writes no changelog row
    // (only the city / service / emergency-plumbing PUTs and publish/unpublish do),
    // so this is the only record an admin can read back for an article. changed_by
    // is NULL — no CMS user made this edit — and the snapshot names the brief.
    await writeChangelog(client, 'article', target.slug, null, {
      source: 'brief-100-septic-language-cleanup',
      script: SCRIPT,
      ref: target.ref,
      summary: target.summary,
      change:
        target.edit.kind === 'replace'
          ? { kind: 'replace', find: target.edit.find, replace: target.edit.replace }
          : { kind: 'insert-before', anchor: target.edit.anchor, insert: target.edit.insert },
      body_length: { before: p.beforeHtml.length, after: p.afterHtml.length },
      version_row_synced: p.draftId,
    });
  }
  return { rows, drafts };
}

// ── closing inventory (the report's verification item #1) ───────────────────
async function septicInventory(client: PoolClient): Promise<void> {
  const res = await client.query<{ id: number; slug: string; status: string; html: string }>(
    `SELECT id, slug, status, body->>'html' AS html
       FROM cms_articles WHERE (body->>'html') ILIKE '%septic%' ORDER BY id`
  );
  const inScope = new Set(TARGETS.map((t) => t.id));
  console.log(`\n── Remaining "septic" occurrences in cms_articles.body.html ${'─'.repeat(18)}`);
  console.log(`   ${res.rowCount} article(s)\n`);
  for (const r of res.rows) {
    const label = inScope.has(r.id) ? 'EDITED  ' : OUT_OF_SCOPE.has(r.id) ? 'cleared ' : 'UNLISTED';
    const hits = (r.html.match(/septic/gi) ?? []).length;
    console.log(`  [${label}] id ${String(r.id).padStart(3)} ${r.slug}  (${hits} mention${hits === 1 ? '' : 's'})`);
    // One-line quote per occurrence, tags stripped, clipped to the sentence.
    // Two mentions inside one sentence (a heading immediately followed by the
    // sentence that repeats the word) resolve to the same span — print it once.
    const text = r.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    const re = /septic/gi;
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      const start = text.lastIndexOf('.', m.index) + 1;
      let end = text.indexOf('.', m.index + 6);
      if (end === -1) end = Math.min(text.length, m.index + 160);
      const quote = text.slice(start, end + 1).trim();
      if (seen.has(quote)) continue;
      seen.add(quote);
      console.log(`      "${quote}"`);
    }
  }
  const ex = await client.query<{ id: number; slug: string }>(
    `SELECT id, slug FROM cms_articles WHERE excerpt ILIKE '%septic%' ORDER BY id`
  );
  if (ex.rowCount) {
    console.log(`\n  also in cms_articles.excerpt (background context, not in this brief's scope):`);
    for (const r of ex.rows) console.log(`      id ${r.id} ${r.slug}`);
  }
}

// ── rollback ────────────────────────────────────────────────────────────────
async function rollback(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const log = await client.query<{
      id: number;
      source_table: string;
      source_id: number;
      column_path: string;
      old_value: string;
      new_value: string;
    }>(
      `SELECT id, source_table, source_id, column_path, old_value, new_value
         FROM brief100_septic_backup ORDER BY id DESC`
    );
    if (!log.rowCount) {
      console.log('brief100_septic_backup is empty — nothing to roll back.');
      await client.query('COMMIT');
      return;
    }
    let restored = 0;
    let skipped = 0;
    for (const r of log.rows) {
      const q =
        r.source_table === 'cms_articles'
          ? `UPDATE cms_articles
                SET body = jsonb_set(body, '{html}', to_jsonb($1::text), false), updated_at = NOW()
              WHERE id = $2 AND body->>'html' = $3`
          : `UPDATE page_drafts
                SET content = jsonb_set(content, '{body}', to_jsonb($1::text), false)
              WHERE id = $2 AND content->>'body' = $3`;
      const res = await client.query(q, [r.old_value, r.source_id, r.new_value]);
      if (res.rowCount === 1) restored++;
      else {
        skipped++;
        console.log(
          `  ! ${r.source_table}#${r.source_id} ${r.column_path}: value has changed since the fix — left in place`
        );
      }
    }
    await client.query('DELETE FROM brief100_septic_backup');
    await client.query('COMMIT');
    console.log(`rollback: restored ${restored} value(s), skipped ${skipped}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  if (SELFTEST) {
    const bad = selftest();
    await pool.end();
    process.exit(bad === 0 ? 0 : 1);
  }
  if (ROLLBACK) {
    try {
      await rollback();
    } finally {
      await pool.end();
    }
    return;
  }

  const mode = resolveRunMode(SCRIPT, ARGV);
  announceMode(SCRIPT, mode);

  // The allow-list gate runs FIRST, before any row is read. A fragment the shared
  // sanitizer would alter beyond stripping styles never reaches the database.
  const unsafe = TARGETS.filter((t) => !allowListCheck(newFragment(t)).ok);
  if (unsafe.length) {
    console.error('ABORT — these replacement fragments are not allow-list clean:');
    for (const t of unsafe) {
      const { sanitized, expected } = allowListCheck(newFragment(t));
      console.error(
        `  ${t.ref} id ${t.id}\n    expected: ${JSON.stringify(expected)}\n    got     : ${JSON.stringify(sanitized)}`
      );
    }
    verdict(SCRIPT, 'FAILED', 'a replacement fragment failed the sanitizeCmsHtml allow-list gate');
    await pool.end();
    process.exit(1);
  }
  console.log(
    `allow-list gate: all ${TARGETS.length} replacement fragments are clean ` +
      '(sanitizeCmsHtml drops nothing from them but inline styles)\n'
  );

  const client = await pool.connect();
  let committed = false;
  let guardTripped = false;
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS brief100_septic_backup (
        id            SERIAL PRIMARY KEY,
        brief_ref     TEXT NOT NULL,
        source_table  TEXT NOT NULL,
        source_id     INTEGER NOT NULL,
        source_slug   TEXT,
        column_path   TEXT NOT NULL,
        old_value     TEXT NOT NULL,
        new_value     TEXT NOT NULL,
        backed_up_at  TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);

    const plans = await buildPlan(client);

    // ── BACKUP FIRST — written in dry run too; it is a pre-state dump. ──────
    //
    // The named file is WRITE-ONCE. This script stays in deploy.yml and re-runs
    // on every deploy, and by then the rows hold the NEW copy — so overwriting
    // would quietly replace the pre-edit snapshot with a post-edit one and
    // destroy the only file-based record of what the articles used to say. A
    // later run that would actually change something writes a timestamped
    // sidecar instead; a pure no-op writes nothing. `brief100_septic_backup` is
    // the authoritative record either way (it survives on the deploy box, where
    // this file does not).
    mkdirSync(join(process.cwd(), 'scripts', 'backups'), { recursive: true });
    const willChange = plans.some((p) => p.status === 'applied');
    const snapshotPath = !existsSync(BACKUP_FILE)
      ? BACKUP_FILE
      : willChange
        ? BACKUP_FILE.replace(/\.json$/, `-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
        : null;
    if (snapshotPath === null) {
      console.log(`pre-edit snapshot: ${BACKUP_FILE} already exists and this run changes nothing — left intact\n`);
    } else {
      writeFileSync(
        snapshotPath,
        JSON.stringify(
          {
            brief: 'brief-100-septic-language-cleanup',
            script: SCRIPT,
            generated: new Date().toISOString(),
            mode,
            database: (get('DATABASE_URL') || '').replace(/:\/\/[^@]*@/, '://***@'),
            note:
              'Pre-edit snapshot of every row this script may write. `body` is the FULL jsonb value ' +
              'from cms_articles; `draft_id` names the paired Brief 159 published version row, whose ' +
              'content.body was byte-identical to body.html at snapshot time.',
            rows: plans.map((p) => ({
              ref: p.target.ref,
              id: p.target.id,
              slug: p.target.slug,
              planned_status: p.status,
              note: p.note,
              body: p.beforeBody,
              draft_id: p.draftId,
              draft_note: p.draftNote,
            })),
          },
          null,
          2
        ) + '\n',
        'utf8'
      );
      console.log(`pre-edit snapshot written to ${snapshotPath}\n`);
    }

    // ── report the plan ─────────────────────────────────────────────────────
    console.log(`── Plan ${'─'.repeat(64)}`);
    for (const p of plans) {
      console.log(
        `  ${p.status.padEnd(22)} ${p.target.ref}  id ${String(p.target.id).padStart(3)}  ${p.target.slug}`
      );
      console.log(`        ${p.target.summary}`);
      if (p.beforeHtml && p.afterHtml) {
        console.log(`        body.html ${p.beforeHtml.length} → ${p.afterHtml.length} chars`);
      }
      if (p.draftNote) console.log(`        ${p.draftNote}`);
      if (p.note) console.log(`        ↳ ${p.note}`);
    }

    const applied = plans.filter((p) => p.status === 'applied');
    const already = plans.filter((p) => p.status === 'already-applied');
    const bad = plans.filter((p) => p.status !== 'applied' && p.status !== 'already-applied');
    const accounted = applied.length + already.length;

    // ── the brief's hard rule: exactly 6, or abort the transaction ──────────
    if (accounted !== TARGETS.length && !ALLOW_PARTIAL) {
      await client.query('ROLLBACK');
      guardTripped = true;
      console.log('');
      console.log('!'.repeat(72));
      console.log(`${SCRIPT}: ABORTED — ${accounted}/${TARGETS.length} target rows accounted for.`);
      console.log('');
      console.log("Brief 100's hard rule is exactly 6 rows or none: this transaction has been");
      console.log('ROLLED BACK and NOTHING was written. The rows that did not match:');
      for (const p of bad) {
        console.log(`   ${p.target.ref} id ${p.target.id} ${p.target.slug}: ${p.status} — ${p.note}`);
      }
      console.log('');
      console.log('This is normal when dev, staging and production hold different content.');
      console.log(`The pre-edit snapshot is at ${BACKUP_FILE}.`);
      console.log('Review the mismatch with Marketing, then either update the expected source');
      console.log('string in this script or re-run with --allow-partial to ship the rest.');
      console.log('');
      console.log('Exiting 0 ON PURPOSE: deploy.yml runs this with script_stop, and a non-zero');
      console.log('exit here would abort the build swap and the pm2 reload — turning a content');
      console.log('question into an outage (the Brief 145 rule). This is NOT "applied".');
      console.log('!'.repeat(72));
      verdict(
        SCRIPT,
        'NOT-APPLIED (guard tripped)',
        `${accounted}/${TARGETS.length} rows matched; transaction rolled back`
      );
      return;
    }

    if (mode === 'commit') {
      const counts = await apply(client, plans);

      // ── post-write verification, inside the transaction ───────────────────
      const ids = new Set<number>();
      for (const p of plans) {
        if (p.status !== 'applied' && p.status !== 'already-applied') continue;
        const res = await client.query<{ html: string }>(
          `SELECT body->>'html' AS html FROM cms_articles WHERE id = $1`,
          [p.target.id]
        );
        const html = res.rows[0]?.html ?? '';
        const e = p.target.edit;
        const goneOk = e.kind === 'replace' ? !html.includes(e.find) : true;
        const presentOk = html.includes(newFragment(p.target));
        if (!goneOk || !presentOk) {
          throw new Error(
            `${p.target.ref} id ${p.target.id}: post-write verification failed ` +
              `(old string gone: ${goneOk}, new string present: ${presentOk}). Rolling back.`
          );
        }
        ids.add(p.target.id);
      }
      // The brief's assertion, stated as an assertion.
      const expectedIds = TARGETS.map((t) => t.id)
        .sort((a, b) => a - b)
        .join(',');
      const seenIds = [...ids].sort((a, b) => a - b).join(',');
      if (seenIds !== expectedIds) {
        throw new Error(
          `verified id set ${seenIds} != the 6 ids this brief authorises (${expectedIds}). Rolling back.`
        );
      }
      if (counts.rows > TARGETS.length) {
        throw new Error(
          `wrote ${counts.rows} rows, more than the ${TARGETS.length} this brief authorises. Rolling back.`
        );
      }

      await client.query('COMMIT');
      committed = true;
      console.log(
        `\nCOMMITTED. cms_articles rows written: ${counts.rows} (${already.length} already applied). ` +
          `page_drafts published-version rows synced: ${counts.drafts}.`
      );
      console.log(`Verified: the 6 authorised ids are ${expectedIds} and no other row was written.`);
      verdict(
        SCRIPT,
        counts.rows === 0 ? 'ALREADY-APPLIED' : 'APPLIED',
        `${counts.rows} article row(s), ${counts.drafts} version row(s)`
      );
    } else {
      await client.query('ROLLBACK');
      console.log(
        `\nDRY RUN — nothing written. ${applied.length} row(s) would change, ${already.length} already applied.`
      );
      console.log('Re-run with `commit` to apply.');
    }
  } catch (err) {
    if (!committed && !guardTripped) await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    try {
      await septicInventory(client);
    } catch {
      /* the inventory is a report aid; never let it mask the real outcome */
    }
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('FAILED:', e);
  process.exit(1);
});
