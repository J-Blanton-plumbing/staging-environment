/**
 * Brief 212 (Track C) — reading the copy MDs: `## N. NAME` sections and their `| Field | Content |`
 * tables. Pure string handling; no knowledge of hubs or service pages.
 */

export interface Section {
  /** The heading text after "## " (e.g. "3. WHEN TO CALL FOR DRAIN CLEANING (split)"). */
  heading: string;
  /** Its number ("3"), or '' for an unnumbered section (META DATA, SCHEMA …). */
  num: string;
  /** The heading without the number. */
  title: string;
  body: string;
}

export function sections(md: string): Section[] {
  const text = md.replace(/\r\n/g, '\n');
  const parts = text.split(/\n(?=## )/);
  const out: Section[] = [];
  for (const p of parts) {
    if (!p.startsWith('## ')) continue;
    const nl = p.indexOf('\n');
    const heading = (nl < 0 ? p.slice(3) : p.slice(3, nl)).trim();
    const m = heading.match(/^(\d+)\.\s+(.*)$/);
    out.push({ heading, num: m ? m[1] : '', title: m ? m[2] : heading, body: nl < 0 ? '' : p.slice(nl + 1) });
  }
  return out;
}

/** Split one markdown table row into cells, honouring `\|` escapes. */
export function cells(line: string): string[] {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  const out: string[] = [];
  let cur = '';
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '\\' && inner[i + 1] === '|') {
      cur += '|';
      i++;
    } else if (inner[i] === '|') {
      out.push(cur.trim());
      cur = '';
    } else cur += inner[i];
  }
  out.push(cur.trim());
  return out;
}

const isSeparator = (line: string) => /^\|?\s*:?-{3,}/.test(line.trim()) && /^[|\s:-]+$/.test(line.trim());

/** Every table in a section body: header cells + data rows. */
export function tables(body: string): Array<{ head: string[]; rows: string[][] }> {
  const lines = body.split('\n');
  const out: Array<{ head: string[]; rows: string[][] }> = [];
  let i = 0;
  while (i < lines.length) {
    if (lines[i].trim().startsWith('|') && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      const head = cells(lines[i]);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]));
      out.push({ head, rows });
    } else i++;
  }
  return out;
}

/** The `| Field | Content |` table of a section as an ordered list of [label, content]. */
export function fields(body: string): Array<[string, string]> {
  const t = tables(body).find((x) => x.head.length === 2 && /^(field|item|card)$/i.test(x.head[0]));
  return t ? t.rows.map((r) => [r[0], r[1] ?? ''] as [string, string]) : [];
}

export function field(rows: Array<[string, string]>, label: string): string | undefined {
  return rows.find(([k]) => k === label)?.[1];
}

/** `[label](href)` markup check helpers for the importer's own parsing. */
export const LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;
export function links(text: string): Array<{ label: string; href: string }> {
  const out: Array<{ label: string; href: string }> = [];
  const re = new RegExp(LINK_RE.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push({ label: m[1], href: m[2] });
  return out;
}
export const plain = (t: string) => t.replace(new RegExp(LINK_RE.source, 'g'), '$1');

/** The ```json blocks of a SCHEMA section, parsed. */
export function jsonBlocks(body: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const re = /```json\s*\n([\s\S]*?)\n```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    try {
      out.push(JSON.parse(m[1]));
    } catch {
      /* a malformed block is reported by the caller when it needs it */
    }
  }
  return out;
}

/** Strip a trailing "(NN chars)" count. */
export const stripCount = (s: string) => s.replace(/\s*\(\d+\s*chars?\)\s*$/i, '').trim();
/** "**Question?**" → "Question?" */
export const unbold = (s: string) => s.replace(/^\*\*(.*)\*\*$/, '$1').trim();
