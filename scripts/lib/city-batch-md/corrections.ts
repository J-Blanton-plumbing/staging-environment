/**
 * Brief 212 (Track C3) — the corrections file (`briefs/brief-212-corrections.json` shape):
 *
 *   { "corrections": [ { id, city, severity, files: [path…], find, replace, why } ],
 *     "reviewRemovals": [ { id, city, files: [path…], removeReviewByName, why } ],
 *     "hubReviewOverrides": { "<City Name>": { h2, intro, rating, ratingSub, items: [ {name, url, text} ×3 ] } } }
 *
 * (Brief 216: or a bare array of `{ id, file, find, replace, reason }` — see `loadCorrections`.)
 *
 * `files` are relative to the batch's source folder (the `--source` directory). A correction replaces EVERY occurrence of
 * `find` in each listed file (visible copy AND schema blocks) and FAILS the run when `find` is missing
 * from any listed file. Applied to the raw MD text before parsing. Review removals are applied by the
 * service parser (the named review must exist on each listed page).
 */
import fs from 'fs';
import path from 'path';

export interface Correction {
  id: string;
  city?: string;
  severity?: string;
  files: string[];
  find: string;
  replace: string;
  why?: string;
  /** Self-test only: the find may be absent from some listed files (Brief 209's "any of these clauses"). */
  optional?: boolean;
}
export interface ReviewRemoval {
  id: string;
  city?: string;
  files: string[];
  removeReviewByName: string;
  why?: string;
}
export interface HubReviewOverride {
  h2: string;
  intro: string;
  rating: string;
  ratingSub: string;
  items: Array<{ name: string; url: string | null; text: string }>;
}
export interface CorrectionsFile {
  corrections: Correction[];
  reviewRemovals?: ReviewRemoval[];
  hubReviewOverrides?: Record<string, HubReviewOverride>;
}

/**
 * Brief 216: the Batch 3 file is a bare array of `{ id, file, find, replace, reason }` (one file per
 * entry). It is read as the same shape: `file` → `files: [file]`, `reason` → `why`.
 */
type BareCorrection = { id: string; file?: string; files?: string[]; find: string; replace: string; reason?: string; why?: string };

export function loadCorrections(file: string | undefined): CorrectionsFile {
  if (!file) return { corrections: [], reviewRemovals: [], hubReviewOverrides: {} };
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as CorrectionsFile | BareCorrection[];
  if (Array.isArray(raw)) {
    const corrections: Correction[] = raw.map((c) => ({ id: c.id, files: c.files ?? (c.file ? [c.file] : []), find: c.find, replace: c.replace, why: c.why ?? c.reason }));
    return { corrections, reviewRemovals: [], hubReviewOverrides: {} };
  }
  const j = raw;
  return { corrections: j.corrections ?? [], reviewRemovals: j.reviewRemovals ?? [], hubReviewOverrides: j.hubReviewOverrides ?? {} };
}

/**
 * Brief 216 global rule G1: `/no-drip-club/` → `/no-drip-club` in every link of every MD (the site's
 * slashless URL; Brief 212 C107–C116 did the same one file at a time). Applied to the raw text after
 * the corrections, before parsing. Returns the count per file.
 */
export function applyG1(texts: Map<string, string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [f, t] of texts) {
    const n = t.split('](/no-drip-club/)').length - 1;
    if (n) {
      texts.set(f, t.split('](/no-drip-club/)').join('](/no-drip-club)'));
      counts.set(f, n);
    }
  }
  return counts;
}

const norm = (p: string) => p.replace(/\\/g, '/').replace(/^\.\//, '');

export interface Applied {
  id: string;
  file: string;
  count: number;
}

/**
 * Read every source file once, apply the corrections, and return the corrected texts (by relative
 * path) plus a per-correction count. Missing finds are returned as `errors` (the run fails on any).
 */
export function applyCorrections(sourceDir: string, relFiles: string[], c: CorrectionsFile): { texts: Map<string, string>; applied: Applied[]; errors: string[] } {
  const texts = new Map<string, string>();
  for (const f of relFiles) texts.set(norm(f), fs.readFileSync(path.join(sourceDir, f), 'utf8').replace(/\r\n/g, '\n'));
  const applied: Applied[] = [];
  const errors: string[] = [];
  for (const k of c.corrections) {
    for (const f of k.files.map(norm)) {
      const t = texts.get(f);
      if (t === undefined) {
        if (!k.optional) errors.push(`${k.id}: file not in this run: ${f}`);
        continue;
      }
      const count = t.split(k.find).length - 1;
      if (count === 0) {
        if (!k.optional) errors.push(`${k.id}: "${k.find.slice(0, 80)}" not found in ${f}`);
        continue;
      }
      texts.set(f, t.split(k.find).join(k.replace));
      applied.push({ id: k.id, file: f, count });
    }
  }
  return { texts, applied, errors };
}
