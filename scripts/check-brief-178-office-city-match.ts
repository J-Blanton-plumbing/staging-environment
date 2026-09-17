/**
 * Brief 178, Track D1 — does every CMS office claim the town a human would
 * expect, and does any town have two offices fighting over it?
 *
 * ─── What this protects ────────────────────────────────────────────────────
 * Brief 178 made "which office serves this town" follow `global_settings.offices`
 * instead of the hardcoded `cityToOffice` map: an office whose `slug` is a
 * registry city slug claims that city, and failing that an office whose `city`
 * field slugifies to one does. That is a rule with no UI — nothing in
 * /admin/global-settings tells the person typing that a slug of `tinley-park-il`
 * routes differently from `tinley-park`, and nothing tells them that a second
 * office in an already-covered town is ambiguous.
 *
 * So this prints, for every office, which registry city it claims and BY WHICH
 * RULE, and flags the three things worth a human's attention:
 *
 *   • an office matching NO registry city — it will never be found by a city
 *     search, only by the locator's office-name matching (Track B1). Information,
 *     not a failure: a brand-new office in a town the registry does not list yet
 *     is a perfectly ordinary state, and failing on it would block every deploy.
 *
 *   • TWO offices claiming the same town — the one case the resolver cannot
 *     answer. It degrades to the old map rather than guessing (see
 *     `resolveOfficeSlug`), so nothing breaks, but somebody should decide.
 *
 *   • every city whose CMS answer now differs from `cityToOffice` — the intended
 *     overrides. Read this list on every run; it is the whole behaviour change.
 *
 * ─── Why it is NOT in deploy.yml, deliberately ─────────────────────────────
 * It reads LIVE CMS data. A legitimate Marketing edit — adding the nineteenth
 * office an hour before a release — could make it exit non-zero and block a
 * deploy of unrelated code. That is the exact failure mode the Brief 171 report's
 * guard-trip note describes and the Brief 145/171 fix scripts exit 0 for. This is
 * a `npm run check:brief-178` a human runs after adding an office, not a gate.
 *
 * Exit codes:  0 = fine (including unmatched offices)   1 = collision   2 = error
 *
 * Run:  npm run check:brief-178
 */
import { existsSync, readFileSync } from 'fs';
import { Pool } from 'pg';
import type { CmsOffice } from '../src/lib/cms/offices';
import {
  CITY_REGISTRY,
  getOfficeKey,
  officeCitySlug,
  resolveOfficeOverrides,
  resolveOfficeSlug,
} from '../src/lib/content/cities/index';

/** Same `.env.local` reader the Brief 171 data scripts use — no dotenv dependency. */
const envFile = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
const envVar = (k: string) =>
  process.env[k] || (envFile.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim() || '';

const SCRIPT = 'check-brief-178-office-city-match';

/**
 * One greppable outcome line, the shape `scripts/lib/run-mode.ts` prints.
 *
 * Hand-written rather than calling `verdict()` because that helper's `Verdict`
 * union is APPLIED / NOT-APPLIED / FAILED — the vocabulary of a script that
 * WRITES. This one only reads, so widening a union shared by ten deploy scripts
 * to describe a checker would be the tail wagging the dog. The line shape is
 * identical, so `grep 'PIPELINE VERDICT:'` still finds it.
 */
function verdictLine(outcome: string, detail = ''): void {
  console.log(`PIPELINE VERDICT: ${SCRIPT} — ${outcome}${detail ? ` — ${detail}` : ''}`);
}

interface RawOffice {
  slug?: unknown;
  name?: unknown;
  city?: unknown;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');

async function main(): Promise<void> {
  const url = envVar('DATABASE_URL');
  if (!url) {
    console.error('FAIL  DATABASE_URL is not set (checked the environment and .env.local).');
    verdictLine('ERROR', 'no DATABASE_URL');
    process.exit(2);
  }

  const pool = new Pool({ connectionString: url });
  let offices: RawOffice[];
  try {
    const res = await pool.query('SELECT offices FROM global_settings WHERE id = 1');
    if (res.rows.length === 0) {
      console.error('FAIL  global_settings has no row with id = 1.');
      verdictLine('ERROR', 'no global_settings row');
      process.exit(2);
    }
    const raw = res.rows[0].offices;
    if (!Array.isArray(raw)) {
      console.error('FAIL  global_settings.offices is not an array.');
      verdictLine('ERROR', 'offices is not an array');
      process.exit(2);
    }
    offices = raw as RawOffice[];
  } finally {
    await pool.end();
  }

  /* The resolvers take `CmsOffice[]`; this is a JSONB column, so the records are
     only shaped like that by convention. Cast once, here, rather than at every
     call — the resolvers are written to survive a malformed record (Hard rule 2),
     which is part of what this check exercises. */
  const cms = offices as unknown as CmsOffice[];

  const registry = new Set(CITY_REGISTRY.map((c) => c.slug));
  const cityName = new Map(CITY_REGISTRY.map((c) => [c.slug, c.name]));
  console.log(
    `Read ${offices.length} office record(s) from global_settings.offices, ` +
      `against ${registry.size} registry cities.\n`
  );

  /* ── Per-office: which city, by which rule ───────────────────────────────
     `resolveOfficeSlug` is the live rule; this asks it rather than
     re-implementing it, so the report cannot describe behaviour the site does
     not have. `officeCitySlug` is the resolver's own normalizer, exported for
     exactly this. */
  const unmatched: string[] = [];
  const rows: string[][] = [['OFFICE SLUG', 'NAME', 'CLAIMS CITY', 'BY RULE']];

  for (const o of offices) {
    const slug = str(o.slug);
    const trimmed = slug.trim();
    const name = str(o.name) || '(no name)';
    const cityKey = officeCitySlug(str(o.city));

    let claim = '';
    let rule = 'none';
    if (trimmed && registry.has(trimmed) && resolveOfficeSlug(trimmed, cms) === slug) {
      claim = trimmed;
      rule = 'exact slug';
    } else if (cityKey && registry.has(cityKey) && resolveOfficeSlug(cityKey, cms) === slug) {
      claim = cityKey;
      rule = 'normalized city';
    }

    if (!claim) {
      unmatched.push(`${slug || '(blank slug)'} — ${name}`);
      rows.push([slug || '(blank)', name, '—', 'none']);
    } else {
      rows.push([slug, name, `${claim} (${cityName.get(claim) ?? '?'})`, rule]);
    }
  }

  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  console.log('── Office → registry city ' + '─'.repeat(52));
  rows.forEach((r, i) => {
    console.log('  ' + r.map((cell, i2) => cell.padEnd(widths[i2])).join('  ').trimEnd());
    if (i === 0) console.log('  ' + widths.map((w) => '-'.repeat(w)).join('  '));
  });

  /* ── Collisions ──────────────────────────────────────────────────────────
     Two kinds. A duplicate SLUG is two records for one office and is always
     wrong. A duplicate TOWN NAME is only wrong when it leaves a registry city
     that nobody can claim: two branches in one city, each already claiming its
     own registry slug, is the normal shape of a metro (Chicago Lincoln Park and
     Chicago Ravenswood) and must not turn this check permanently red. */
  const bySlug = new Map<string, string[]>();
  const byTown = new Map<string, string[]>();
  for (const o of offices) {
    const slug = str(o.slug).trim();
    if (slug) bySlug.set(slug, [...(bySlug.get(slug) ?? []), str(o.slug)]);
    const town = officeCitySlug(str(o.city));
    if (town) byTown.set(town, [...(byTown.get(town) ?? []), str(o.slug) || '(blank slug)']);
  }

  const slugDupes = Array.from(bySlug.entries()).filter(([, v]) => v.length > 1);
  const townDupes = Array.from(byTown.entries()).filter(([, v]) => v.length > 1);
  /* A town collision matters when the town IS a registry city (so a real page's
     routing is at stake) and at least one of the colliding offices has not
     already claimed a registry city of its own. */
  const blocking = townDupes.filter(([town, slugs]) => {
    if (!registry.has(town)) return false;
    return slugs.some((s) => !registry.has(s.trim()));
  });

  console.log('\n── Collisions ' + '─'.repeat(64));
  if (!slugDupes.length && !townDupes.length) {
    console.log('  none — every office has a unique slug and a unique town.');
  }
  for (const [slug, list] of slugDupes) {
    console.log(`  DUPLICATE SLUG   ${slug} — ${list.length} records. One office, two rows.`);
  }
  for (const [town, slugs] of townDupes) {
    const isRegistryCity = registry.has(town);
    const isBlocking = blocking.some(([t]) => t === town);
    console.log(
      `  ${isBlocking ? 'COLLISION' : 'NOTE     '}  town "${town}" is named by ${slugs.length} offices: ${slugs.join(', ')}`
    );
    if (isRegistryCity && !isBlocking) {
      console.log(
        `             /${town} is a registry city that NOBODY can claim by name, so it keeps ` +
          `its cityToOffice answer (${getOfficeKey(town)}).`
      );
      console.log(
        '             Not a failure: each of those offices already claims its own registry city by exact slug.'
      );
    } else if (!isRegistryCity) {
      console.log(`             "${town}" is not a registry city, so nothing routes by it.`);
    }
  }

  /* ── Overrides: every city whose answer changed ──────────────────────────── */
  const overrides = resolveOfficeOverrides(cms);
  const entries = Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b));
  console.log(`\n── Overrides (CMS answer ≠ cityToOffice): ${entries.length} ` + '─'.repeat(30));
  if (!entries.length) console.log('  none — every registry city still resolves to its static office.');
  /* The office slug is JSON-quoted because it is a raw CMS value: the live
     Hanover Park record's slug is "/hanover-park", leading slash and all, and an
     unquoted arrow would read as a path. */
  const cityCol = Math.max(0, ...entries.map(([c]) => c.length)) + 1;
  const oldCol = Math.max(0, ...entries.map(([c]) => getOfficeKey(c).length));
  for (const [city, office] of entries) {
    console.log(
      `  /${city}`.padEnd(cityCol + 3) +
        `${getOfficeKey(city).padEnd(oldCol)}  →  ${JSON.stringify(office)}`
    );
  }

  /* ── Unmatched offices ───────────────────────────────────────────────────── */
  console.log(`\n── Offices matching no registry city: ${unmatched.length} ` + '─'.repeat(33));
  if (!unmatched.length) console.log('  none — every office claims a registry city.');
  for (const u of unmatched) console.log(`  ${u}`);
  if (unmatched.length) {
    console.log(
      '\n  These are findable in the locator by their own name/town/ZIP (Track B1) but no\n' +
        '  city search reaches them. Usually means the town has no registry entry yet, or\n' +
        '  the office slug is a typo. Information, not a failure.'
    );
  }

  console.log('');
  if (blocking.length) {
    verdictLine(
      'COLLISION',
      `${blocking.length} town(s) claimed by two offices; ${entries.length} override(s), ${unmatched.length} unmatched`
    );
    console.log(
      '\nExiting 1. Routing for the town(s) above is unresolved — the resolver keeps the old\n' +
        'answer rather than guessing, so nothing is broken, but a human has to decide which\n' +
        'office owns that page (or fix the duplicate record in /admin/global-settings).'
    );
    process.exit(1);
  }
  if (slugDupes.length) {
    verdictLine('COLLISION', `${slugDupes.length} duplicate office slug(s)`);
    console.log('\nExiting 1. Two records share one slug — delete the duplicate in /admin/global-settings.');
    process.exit(1);
  }
  verdictLine('OK', `${entries.length} override(s), ${unmatched.length} unmatched, no collisions`);
}

main().catch((e) => {
  console.error('FAILED:', e instanceof Error ? e.message : String(e));
  verdictLine('ERROR', e instanceof Error ? e.message : String(e));
  process.exit(2);
});
