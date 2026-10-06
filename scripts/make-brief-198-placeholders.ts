/**
 * Brief 198 — the five "PHOTO PLACEHOLDER" graphics for the hose bib & irrigation
 * fall checklist draft article (`seed-brief-198-hose-bib-fall-checklist.ts`).
 *
 * They are deliberately, obviously temporary: Cream background, a 4 px dashed
 * Cerulean inset border, a Midnight camera outline, "PHOTO PLACEHOLDER" and the
 * shot Marketing still needs. No logo, no Carmine, no photo. Marketing replaces
 * each one in /admin (hero field + body <img>) before publishing.
 *
 * 1100 × 654 = the Brief 195 Highland Park hero (jbp-van-residential-street-1100.webp),
 * so the hero frame and the body figures keep the proportions real photos will have.
 * Text is a plain sans-serif: sharp's SVG renderer can only use installed system
 * fonts, and the site's Industry/Nunito files are not installed on the machine.
 *
 * Regenerate (overwrites the five files):
 *   npx ts-node --project tsconfig.scripts.json scripts/make-brief-198-placeholders.ts
 */
import { mkdirSync } from 'fs';
import path from 'path';
import sharp from 'sharp';

const OUT = path.join(process.cwd(), 'public/images/knowledge-hub/hose-bib-fall-checklist');
const W = 1100;
const H = 654;
const CREAM = '#F9F3EC';
const CERULEAN = '#1560E6';
const MIDNIGHT = '#0A1B2E';
const FONT = 'Arial, Helvetica, sans-serif';
/** The V2 hero frame is 3:2 with object-fit: cover, which crops ~60 px off each side of an
 *  1100 × 654 image — so the dashed border sits 82 px in from the sides to stay visible there. */
const INSET_X = 82;

const SHOTS: Array<[file: string, shot: string]> = [
  ['placeholder-hero.webp', 'Hero: outdoor hose bib, hose disconnected'],
  ['placeholder-indoor-shutoff-valve.webp', 'Indoor shutoff valve for an outdoor faucet, in a basement'],
  ['placeholder-frost-free-hose-bib.webp', 'Frost-free hose bib (sillcock), exterior or cutaway'],
  ['placeholder-irrigation-blowout.webp', 'Technician blowing out a sprinkler zone with a compressor'],
  ['placeholder-backflow-preventer.webp', 'Backflow preventer assembly next to a house'],
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Greedy word wrap — long shot descriptions take two centred lines. */
function wrap(text: string, max = 40): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > max) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}

function svg(shot: string): string {
  const lines = wrap(shot);
  const cx = W / 2;
  // Camera outline, centred above the text.
  const camY = 140;
  const camera = `
    <g fill="none" stroke="${MIDNIGHT}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round">
      <path d="M ${cx - 80} ${camY + 30} h 38 l 16 -26 h 52 l 16 26 h 38 a 12 12 0 0 1 12 12 v 104 a 12 12 0 0 1 -12 12 h -160 a 12 12 0 0 1 -12 -12 v -104 a 12 12 0 0 1 12 -12 z"/>
      <circle cx="${cx}" cy="${camY + 92}" r="36"/>
      <circle cx="${cx + 58}" cy="${camY + 56}" r="4" fill="${MIDNIGHT}"/>
    </g>`;
  const firstLineY = 448;
  const text = lines
    .map((l, i) => `<text x="${cx}" y="${firstLineY + i * 44}" text-anchor="middle" font-family="${FONT}" font-size="34" fill="${MIDNIGHT}">${esc(l)}</text>`)
    .join('\n    ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="${CREAM}"/>
    <rect x="${INSET_X}" y="22" width="${W - 2 * INSET_X}" height="${H - 44}" fill="none" stroke="${CERULEAN}" stroke-width="4" stroke-dasharray="18 12"/>
    ${camera}
    <text x="${cx}" y="388" text-anchor="middle" font-family="${FONT}" font-size="58" font-weight="700" letter-spacing="4" fill="${MIDNIGHT}">PHOTO PLACEHOLDER</text>
    ${text}
  </svg>`;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const [file, shot] of SHOTS) {
    const out = path.join(OUT, file);
    const info = await sharp(Buffer.from(svg(shot))).webp({ quality: 90 }).toFile(out);
    console.log(`${file}: ${info.width}×${info.height}, ${info.size} bytes`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
