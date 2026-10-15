/**
 * Brief 212 (Track C3) — the corrections file (`briefs/brief-212-corrections.json` shape):
 *
 *   { "corrections": [ { id, city, severity, files: [path…], find, replace, why } ],
 *     "reviewRemovals": [ { id, city, files: [path…], removeReviewByName, why } ],
 *     "hubReviewOverrides": { "<City Name>": { h2, intro, rating, ratingSub, items: [ {name, url, text} ×3 ] } } }
 *
 * `files` are relative to the batch's `_source` folder. A correction replaces EVERY occurrence of
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

export function loadCorrections(file: string | undefined): CorrectionsFile {
  if (!file) return { corrections: [], reviewRemovals: [], hubReviewOverrides: {} };
  const j = JSON.parse(fs.readFileSync(file, 'utf8')) as CorrectionsFile;
  return { corrections: j.corrections ?? [], reviewRemovals: j.reviewRemovals ?? [], hubReviewOverrides: j.hubReviewOverrides ?? {} };
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
