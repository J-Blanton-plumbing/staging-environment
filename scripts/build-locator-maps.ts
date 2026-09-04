/**
 * Brief 171, Track B — static region map images for the homepage store locator,
 * plus Track A3's geocoder.
 *
 * ⚠️ NOTHING CURRENTLY USES THE IMAGES THIS PRODUCES, and none are committed.
 *
 * The section shipped with a static greyscale map and a "Find an office" button
 * that created the Google embed on click, to satisfy Brief 171's Hard rule 4
 * (zero third-party requests before a click). Marketing dropped that on
 * 2026-09-03 once the saving was measured — the embed is `loading="lazy"` in the
 * last band before the footer, so it costs a Lighthouse run nothing and a real
 * visitor nothing until they scroll to it. `StoreLocatorPanel.tsx` now renders
 * the embed directly and the three generated WebP files were deleted rather than
 * left to ship as 375 KB of dead weight in `public/`.
 *
 * This script is KEPT because it is the whole cost of that decision being
 * reversible: `npm run build:locator-maps` regenerates
 * `public/images/locator/{chicagoland,all-regions,central-ohio}.webp` in one
 * command, and the Track A3 geocoder below is still the documented way to fill a
 * new office's coordinates. If you revert to click-to-load, run it and restore
 * the placeholder in the panel.
 *
 * ─── It was never part of the build, and must not become part of it ────────
 * It fetches ~40 tiles per image from tile.openstreetmap.org. Wiring a
 * third-party fetch into CI would both break offline builds and abuse a free
 * service. Run it by hand.
 *
 * ─── OpenStreetMap obligations, both of them ───────────────────────────────
 * 1. Tile usage policy: descriptive User-Agent, SEQUENTIAL requests with a
 *    delay, no bulk downloading. `MAX_TILES` hard-stops the script if a region's
 *    framing would need more than 64 tiles — the fix is a lower zoom, never a
 *    bigger fetch.
 * 2. ODbL attribution: `© OpenStreetMap contributors` is burned into the
 *    bottom-right of each image here AND rendered as visible text under the map
 *    panel by the component. Both, deliberately — the burned-in credit survives
 *    the image being saved or hotlinked, the DOM credit is selectable and
 *    machine-readable. Do not remove either.
 *
 * ─── Pins are data ─────────────────────────────────────────────────────────
 * Every pin position is computed from the office's `lat`/`lng` through the
 * standard Web Mercator projection (`project()` below), never placed by eye.
 * Offices closer than `PIN_MIN_GAP` px on screen are pushed apart by a few
 * pixels so the Chicago cluster stays countable — that nudge is applied to the
 * DRAWN position only and is capped at `maxShift`; no pin is ever moved to a
 * fabricated location.
 *
 * ─── The geocoder (Track A3) ───────────────────────────────────────────────
 * `joliet` and `columbus` had `lat: null, lng: null`. `geocode()` resolves an
 * address with NO API key and refuses to guess:
 *
 *   - Nominatim (OpenStreetMap) first, per the brief, at 1 request/second with a
 *     descriptive User-Agent. Only a HOUSE-LEVEL result is accepted
 *     (`place_rank >= 30`). A road- or city-level match is REJECTED, because
 *     Nominatim answers a house number it has never heard of with the centroid
 *     of the street — which for the Columbus office is ~1.5 km away and in a
 *     different ZIP. That is exactly the "wrong pin" the brief forbids writing.
 *   - The US Census Bureau geocoder (TIGER/Line, keyless) second, and only when
 *     Nominatim has no house-level match. It is an authoritative US
 *     address-range interpolator, which is precisely what OSM is missing here:
 *     OSM's Goodale Boulevard house numbers stop at 1280 and the office is 1387.
 *     Cross-checked on the address Nominatim COULD resolve — both sources agree
 *     on Joliet to 4 decimal places.
 *   - Anything outside the sanity bounding box for the record's state is
 *     rejected. If both sources fail, the script PRINTS THE ADDRESS AND EXITS
 *     NON-ZERO rather than writing a pin. There is no city-centroid fallback.
 *
 * Results are cached into all three copies of the office data — the
 * `FALLBACK_OFFICES` literal in `src/lib/cms/global-settings.ts`, `SEED_OFFICES`
 * in `scripts/migrate-global-settings.ts`, and the live `global_settings.offices`
 * row via `scripts/fix-brief-171-office-data.ts`. Once cached, the geocode path
 * is inert on a re-run: this script never needs the network for coordinates
 * again, only for tiles.
 *
 * Run:  npm run build:locator-maps
 */
import { existsSync, mkdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import type { OverlayOptions } from 'sharp';
import { Pool } from 'pg';
import { formatOfficeAddress, type CmsOffice } from '../src/lib/cms/offices';

/* ── Config ────────────────────────────────────────────────────────────────── */

const OUT_DIR = path.join(process.cwd(), 'public', 'images', 'locator');
const WIDTH = 1080;
/**
 * SQUARE, not 4:3 — and the component's mobile aspect box is `aspect-square` to
 * match.
 *
 * The all-regions frame is the reason. Its office bounding box is TALLER than it
 * is wide in Mercator terms (about 0.758:1) while a 4:3 canvas is 1.333:1, so
 * fitting the box into 4:3 spent roughly two thirds of the width on empty
 * Missouri and Pennsylvania and the offices read as a small smudge in a big
 * frame. A square canvas reclaims that margin at the same zoom, with no extra
 * risk of `object-cover` clipping a pin. Chicagoland and Central Ohio get the
 * same treatment so all three masters share one aspect.
 */
const HEIGHT = 1080;
/**
 * WebP quality. Overridable with LOCATOR_WEBP_QUALITY so the size/legibility
 * trade-off can be re-measured without editing the file — see the note in the
 * Brief 171 report on why OSM's standard RASTER tiles cannot reach the brief's
 * ~40KB target at 1440x1080 (their label density is the cost, not the encoder).
 */
const WEBP_QUALITY = Number(process.env.LOCATOR_WEBP_QUALITY) || 55;
const TILE = 256;
/** Tile usage policy: a hard stop, not a throttle. Exceeded -> lower the zoom. */
const MAX_TILES = 64;
const TILE_DELAY_MS = 120;
const UA =
  'JBlantonPlumbingLocatorBuild/1.0 (+https://jblantonplumbing.com; marketing@jblantonplumbing.com)';

/** Brand palette — brand-rules.md. Carmine pin, Cream outline; no pure black anywhere. */
const CARMINE = '#BC0E0E';
const CREAM = '#F9F3EC';
const MIDNIGHT = '#0A1B2E';

const PIN_MIN_GAP = 26;
const ATTRIBUTION = '© OpenStreetMap contributors';

/** Very loose per-state boxes — a sanity check on a geocode, not a service area. */
const STATE_BOX: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  IL: { minLat: 36.9, maxLat: 42.6, minLng: -91.6, maxLng: -87.0 },
  OH: { minLat: 38.3, maxLat: 42.4, minLng: -85.0, maxLng: -80.5 },
};

interface RegionSpec {
  key: string;
  file: string;
  /** `undefined` -> fit the zoom to the offices' bounding box. A number pins it. */
  fixedZoom?: number;
  /** Pin the centre instead of using the office bounding box's midpoint. */
  fixedCenter?: { lat: number; lng: number };
  offices: CmsOffice[];
}

/* ── Web Mercator ──────────────────────────────────────────────────────────── */

/** lat/lng -> absolute pixel coordinates in the z-level world image. */
function project(lat: number, lng: number, z: number): { x: number; y: number } {
  const world = TILE * 2 ** z;
  const x = ((lng + 180) / 360) * world;
  const s = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * world;
  return { x, y };
}

/* ── Geocoding (Track A3) ──────────────────────────────────────────────────── */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function inStateBox(state: string, lat: number, lng: number): boolean {
  const box = STATE_BOX[state];
  if (!box) return true; // unknown state -> no box to check against; the caller reports it.
  return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
}

async function nominatim(address: string): Promise<{ lat: number; lng: number } | null> {
  await sleep(1100); // usage policy: max 1 request/second.
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&q=' +
    encodeURIComponent(address);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ lat: string; lon: string; place_rank?: number }>;
  // place_rank 30 == house/building. Anything coarser is the street or the city
  // centroid, i.e. the wrong-pin case the brief forbids writing.
  const hit = rows.find((r) => (r.place_rank ?? 0) >= 30);
  return hit ? { lat: Number(hit.lat), lng: Number(hit.lon) } : null;
}

async function censusGeocoder(address: string): Promise<{ lat: number; lng: number } | null> {
  const url =
    'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&format=json&address=' +
    encodeURIComponent(address);
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    result?: { addressMatches?: Array<{ coordinates: { x: number; y: number } }> };
  };
  const m = json.result?.addressMatches?.[0];
  return m ? { lat: m.coordinates.y, lng: m.coordinates.x } : null;
}

const round4 = (n: number) => Math.round(n * 1e4) / 1e4;

async function geocode(o: CmsOffice): Promise<{ lat: number; lng: number }> {
  const address = formatOfficeAddress(o);
  const sources: Array<[string, (a: string) => Promise<{ lat: number; lng: number } | null>]> = [
    ['nominatim', nominatim],
    ['us-census', censusGeocoder],
  ];
  for (const [label, fn] of sources) {
    const hit = await fn(address);
    if (!hit) {
      console.log(`      ${label}: no house-level match`);
      continue;
    }
    if (!inStateBox(o.state, hit.lat, hit.lng)) {
      console.log(
        `      ${label}: REJECTED ${hit.lat},${hit.lng} — outside the ${o.state} sanity box`
      );
      continue;
    }
    const lat = round4(hit.lat);
    const lng = round4(hit.lng);
    console.log(`      ${label}: ${lat}, ${lng}  OK`);
    return { lat, lng };
  }
  throw new Error(
    `GEOCODE FAILED for office "${o.slug}".\n` +
      `  Address: ${address}\n` +
      `  Neither Nominatim nor the US Census geocoder returned a house-level point inside ${o.state}.\n` +
      `  Supply lat/lng by hand (from the office's Google Business Profile) rather than letting this\n` +
      `  script guess — a city centroid on a store locator is a wrong pin, not a rough pin.`
  );
}

/* ── Tiles ─────────────────────────────────────────────────────────────────── */

async function fetchTile(z: number, x: number, y: number): Promise<Buffer | null> {
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) {
    console.log(`      tile ${z}/${x}/${y}: HTTP ${res.status} — left blank`);
    return null;
  }
  return Buffer.from(await res.arrayBuffer());
}

/* ── Framing ───────────────────────────────────────────────────────────────── */

interface Frame {
  zoom: number;
  /** Absolute world-pixel coordinate of the image's top-left corner. */
  originX: number;
  originY: number;
}

/**
 * Largest zoom at which the padded bounding box still fits inside WIDTH x HEIGHT.
 * A single-point region has no box to fit, so those pass `fixedZoom` instead.
 */
function fitZoom(offices: CmsOffice[], padFraction = 0.08): number {
  const lats = offices.map((o) => o.lat as number);
  const lngs = offices.map((o) => o.lng as number);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lngSpan = Math.max(...lngs) - Math.min(...lngs);
  const padLat = latSpan * padFraction;
  const padLng = lngSpan * padFraction;
  for (let z = 16; z >= 3; z--) {
    const a = project(Math.max(...lats) + padLat, Math.min(...lngs) - padLng, z);
    const b = project(Math.min(...lats) - padLat, Math.max(...lngs) + padLng, z);
    if (b.x - a.x <= WIDTH && b.y - a.y <= HEIGHT) return z;
  }
  return 3;
}

function frameFor(spec: RegionSpec): Frame {
  const zoom = spec.fixedZoom ?? fitZoom(spec.offices);
  /* `fixedCenter` exists so an image can be pinned to the SAME centre the Google
     embed uses, which is the whole point of the all-regions placeholder: the
     visitor clicks and gets the same view, live. Without it the centre is the
     middle of the office bounding box, which is close but not identical and
     makes the swap visibly shift. */
  const c = spec.fixedCenter
    ? project(spec.fixedCenter.lat, spec.fixedCenter.lng, zoom)
    : (() => {
        const pts = spec.offices.map((o) => project(o.lat as number, o.lng as number, zoom));
        return {
          x: (Math.min(...pts.map((p) => p.x)) + Math.max(...pts.map((p) => p.x))) / 2,
          y: (Math.min(...pts.map((p) => p.y)) + Math.max(...pts.map((p) => p.y))) / 2,
        };
      })();
  return { zoom, originX: c.x - WIDTH / 2, originY: c.y - HEIGHT / 2 };
}

/* ── Pins ──────────────────────────────────────────────────────────────────── */

/**
 * Push overlapping pins apart, a couple of pixels at a time, so a cluster stays
 * countable. Bounded by `maxShift` — a pin can be nudged for legibility, never
 * relocated. Nothing here changes the underlying lat/lng.
 */
function separate(points: Array<{ x: number; y: number }>, minGap = PIN_MIN_GAP, maxShift = 20) {
  const home = points.map((p) => ({ ...p }));
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[j].x - points[i].x;
        const dy = points[j].y - points[i].y;
        const d = Math.hypot(dx, dy) || 0.001;
        if (d >= minGap) continue;
        const push = (minGap - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        points[i].x -= ux * push;
        points[i].y -= uy * push;
        points[j].x += ux * push;
        points[j].y += uy * push;
        moved = true;
      }
    }
    // Re-anchor: never let the accumulated nudge exceed maxShift from the real spot.
    for (let i = 0; i < points.length; i++) {
      const dx = points[i].x - home[i].x;
      const dy = points[i].y - home[i].y;
      const d = Math.hypot(dx, dy);
      if (d > maxShift) {
        points[i].x = home[i].x + (dx / d) * maxShift;
        points[i].y = home[i].y + (dy / d) * maxShift;
      }
    }
    if (!moved) break;
  }
  return points;
}

/**
 * One teardrop pin: Carmine fill, Cream stroke.
 *
 * Sized up from r9/22px to r13/32px along with the move to a 1080px square
 * canvas. Both changes serve the same complaint — at the all-regions zoom the
 * offices have to be small on the ground, so the pins have to be big on the
 * page or the company reads as smaller than it is.
 */
function pinSvg(x: number, y: number): string {
  const r = 13;
  const tipY = y + 30;
  return (
    `<path d="M ${x} ${tipY} C ${x - r * 1.15} ${y + r * 0.7}, ${x - r} ${y - r * 0.55}, ${x} ${y - r} ` +
    `C ${x + r} ${y - r * 0.55}, ${x + r * 1.15} ${y + r * 0.7}, ${x} ${tipY} Z" ` +
    `fill="${CARMINE}" stroke="${CREAM}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<circle cx="${x}" cy="${y - 1}" r="4.5" fill="${CREAM}"/>`
  );
}

/* ── Render ────────────────────────────────────────────────────────────────── */

async function renderRegion(spec: RegionSpec): Promise<void> {
  console.log(`\n-- ${spec.key} — ${spec.offices.length} office(s)`);
  const frame = frameFor(spec);
  console.log(
    `   zoom ${frame.zoom}, origin ${Math.round(frame.originX)},${Math.round(frame.originY)}`
  );

  const x0 = Math.floor(frame.originX / TILE);
  const y0 = Math.floor(frame.originY / TILE);
  const x1 = Math.floor((frame.originX + WIDTH) / TILE);
  const y1 = Math.floor((frame.originY + HEIGHT) / TILE);
  const count = (x1 - x0 + 1) * (y1 - y0 + 1);
  if (count > MAX_TILES) {
    throw new Error(
      `${spec.key}: framing needs ${count} tiles (cap ${MAX_TILES}). Reduce the zoom; do not raise the cap.`
    );
  }
  console.log(`   ${count} tile(s) at ${TILE}px`);

  const composites: OverlayOptions[] = [];
  const max = 2 ** frame.zoom;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (ty < 0 || ty >= max) continue;
      const wrapped = ((tx % max) + max) % max;
      const buf = await fetchTile(frame.zoom, wrapped, ty);
      await sleep(TILE_DELAY_MS); // sequential, with a delay — tile usage policy.
      if (!buf) continue;
      composites.push({
        input: buf,
        left: Math.round(tx * TILE - frame.originX),
        top: Math.round(ty * TILE - frame.originY),
      });
    }
  }

  /*
   * Greyscale the BASEMAP, then draw the pins on top in colour.
   *
   * Two reasons, in order of importance:
   *
   * 1. It has to read as the same map the visitor gets after the click. The
   *    Google embed that replaces this image is a muted, near-neutral basemap;
   *    OSM's standard style is not — it ships saturated orange motorways, green
   *    parkland and blue water, so the colour version made the click look like a
   *    jump to a different map of a different place. Desaturating closes that
   *    gap without an API key, which Hard rule 4 forbids.
   * 2. A neutral basemap is what lets the Carmine pins be the only saturated
   *    thing in the frame. On the colour tiles a Carmine pin sat on an orange
   *    motorway and disappeared.
   *
   * `linear(0.82, 34)` after `greyscale()` compresses contrast and lifts the
   * black point, which is what turns "grey OSM" into the light, airy grey that
   * reads as a basemap rather than a photocopy. The pin/credit SVG is composited
   * AFTER this, so Carmine, Cream and Midnight all survive at full saturation.
   *
   * Side effect worth knowing: desaturated tiles compress far better, so this
   * also cut both files by roughly two thirds. See the size note further down.
   */
  const mosaic = await sharp({
    create: { width: WIDTH, height: HEIGHT, channels: 3, background: CREAM },
  })
    .composite(composites)
    .png()
    .toBuffer();

  /*
   * THREE PASSES, and the split is not incidental — sharp applies the base
   * image's colour operations BEFORE layering `composite()` inputs, so
   * `.composite(tiles).greyscale()` desaturates the blank canvas and leaves the
   * tiles in full colour. The tiles have to be materialised first (`mosaic`),
   * desaturated in their own pass (`tiled`), and only then can the pin overlay
   * go on top in colour.
   *
   * `toColourspace('srgb')` matters too: `greyscale()` alone yields a
   * single-channel image, and compositing Carmine onto that throws the hue
   * away. This puts the three channels back so the overlay survives.
   */
  const tiled = await sharp(mosaic)
    .greyscale()
    // Compress contrast and lift the black point. This is what turns "grey OSM"
    // into the light, airy grey that reads as a basemap rather than a photocopy.
    .linear(0.82, 34)
    .toColourspace('srgb')
    .png()
    .toBuffer();

  const drawn = separate(
    spec.offices.map((o) => {
      const p = project(o.lat as number, o.lng as number, frame.zoom);
      return { x: p.x - frame.originX, y: p.y - frame.originY };
    })
  );

  const credit =
    `<rect x="${WIDTH - 262}" y="${HEIGHT - 32}" width="252" height="24" rx="4" ` +
    `fill="${CREAM}" fill-opacity="0.9"/>` +
    `<text x="${WIDTH - 16}" y="${HEIGHT - 15}" text-anchor="end" ` +
    `font-family="Nunito, Arial, Helvetica, sans-serif" font-size="13" fill="${MIDNIGHT}">` +
    `${ATTRIBUTION}</text>`;

  const overlay = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">` +
      drawn.map((p) => pinSvg(Math.round(p.x), Math.round(p.y))).join('') +
      credit +
      `</svg>`
  );

  const out = path.join(OUT_DIR, spec.file);
  await sharp(tiled)
    .composite([{ input: overlay }])
    .webp({ quality: WEBP_QUALITY, effort: 6 })
    .toFile(out);

  const size = statSync(out).size;
  console.log(
    `   -> ${path.relative(process.cwd(), out)}  ${WIDTH}x${HEIGHT} WebP q${WEBP_QUALITY}  ${(size / 1024).toFixed(1)} KB`
  );
  if (size > 80 * 1024) {
    /* MEASURED, 2026-09-03: 80KB is not reachable at 1440x1080 from OSM's
       STANDARD raster tiles. What costs the bytes is their LABEL AND ROAD
       DETAIL, not colour and not the encoder, and every lever has been tried:

         colour, q80 ......... 242 / 352 KB
         colour, q55 ......... 150 / 225 KB
         greyscale, q55 ...... 107 / 158 KB   <- shipped
         greyscale, q35 ....... 90 / 132 KB   (labels going soft, saves ~17%)
         WebP lossless ..... 1428 /1986 KB    (6-9x WORSE on this content)
         64-colour palette ... 150 / 221 KB   (no help)

       The greyscale pass was done for the LOOK (matching the Google embed that
       replaces the image); the ~30% it also saved is a side effect, not the
       reason. Dropping quality further trades legible street labels for very
       little, so q55 stands.

       Next's image optimizer is what makes the remainder fine in practice: at
       the 828px width this slot actually requests, the delivered payloads are
       well under the source, lazily, below the fold, and only the region
       matching the current selection is fetched at all. Getting the SOURCE under
       80KB needs a lower-detail tile style or half the dimensions — both are
       decisions, not tuning, and 1440px is already below the device pixels a 2x
       desktop display asks for. See the Brief 171 report. */
    console.log(`   ! over 80KB (${(size / 1024).toFixed(1)}KB) — see the note in this script before chasing it.`);
  }
}

/* ── Office data ───────────────────────────────────────────────────────────── */

/**
 * The offices, read from `global_settings.offices` — the SOURCE OF TRUTH.
 *
 * Deliberately the DB and not the `FALLBACK_OFFICES` literal in
 * `src/lib/cms/global-settings.ts`, for two reasons. One: that module imports
 * `react`'s `cache`, whose type declaration lives in `@types/react/canary.d.ts`
 * and is unreachable under `tsconfig.scripts.json`'s `moduleResolution: node` —
 * importing it from a ts-node script is a compile error, not a style choice.
 * Two: the DB row is what the running site renders, so generating the images
 * from it means the pins can never be drawn from data the site has moved past.
 *
 * Fails loudly rather than falling back: a map silently rendered from stale
 * defaults is worse than no map, because nothing about the image says so.
 */
async function readOffices(): Promise<CmsOffice[]> {
  const envFile = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : '';
  const url =
    process.env.DATABASE_URL ||
    (envFile.match(/^DATABASE_URL=(.*)$/m) || [])[1]?.trim() ||
    '';
  if (!url) {
    throw new Error(
      'No DATABASE_URL (env or .env.local). This script reads the offices from ' +
        'global_settings.offices — set it and re-run.'
    );
  }
  const pool = new Pool({ connectionString: url });
  try {
    const res = await pool.query('SELECT offices FROM global_settings WHERE id = 1');
    const offices = res.rows[0]?.offices;
    if (!Array.isArray(offices) || offices.length === 0) {
      throw new Error('global_settings.offices is missing or empty — refusing to render.');
    }
    return offices as CmsOffice[];
  } finally {
    await pool.end();
  }
}

/* ── Main ──────────────────────────────────────────────────────────────────── */

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const offices: CmsOffice[] = await readOffices();

  // Track A3 — fill any missing coordinates, loudly.
  const missing = offices.filter((o) => o.lat === null || o.lng === null);
  if (missing.length === 0) {
    console.log(
      `Coordinates: all ${offices.length} offices already have lat/lng (cached in the source files).`
    );
  } else {
    console.log(`Coordinates: ${missing.length} office(s) need geocoding.`);
    for (const o of missing) {
      console.log(`   ${o.slug} — ${formatOfficeAddress(o)}`);
      const { lat, lng } = await geocode(o);
      o.lat = lat;
      o.lng = lng;
    }
    console.log('\n! CACHE THESE. Paste the values above into FALLBACK_OFFICES (src/lib/cms/');
    console.log('  global-settings.ts), SEED_OFFICES (scripts/migrate-global-settings.ts) and the');
    console.log('  DB patch (scripts/fix-brief-171-office-data.ts) so this network call never');
    console.log('  needs to happen again.');
  }

  /* Region membership is DERIVED, exactly as `locator.ts` derives it for the UI.
     A slug list here would silently drop the 16th office out of both images. */
  const specs: RegionSpec[] = [
    {
      key: 'chicagoland',
      file: 'chicagoland.webp',
      offices: offices.filter((o) => o.state !== 'OH'),
    },
    {
      /*
       * The DEFAULT placeholder: every office, both regions, framed on exactly
       * the centre and zoom the Google embed opens at (see LOCATOR_ALL_OFFICES
       * in src/lib/content/locator.ts — keep the three numbers in sync). That is
       * the point of it: the greyscale image and the live map behind the
       * "Find an office" button are the same view, so the click reveals detail
       * and interactivity rather than jumping somewhere else.
       *
       * The 14 Chicagoland offices necessarily overlap into a cluster at z7 —
       * they span about 60x97px at this scale. That is not a defect: it is what
       * Google's own render of the same area looks like, and it reads as "a lot
       * of offices here, one over there", which is the message.
       */
      key: 'all-regions',
      file: 'all-regions.webp',
      fixedZoom: 7,
      fixedCenter: { lat: 41.0, lng: -85.35 },
      offices,
    },
    {
      key: 'central-ohio',
      file: 'central-ohio.webp',
      // A single point has no bounding box to fit, so the zoom is chosen rather
      // than computed: z12 puts the whole I-270 outerbelt, downtown and the
      // Scioto in frame, which is what makes the image read as Central Ohio
      // rather than as a street corner.
      fixedZoom: 12,
      offices: offices.filter((o) => o.state === 'OH'),
    },
  ];

  for (const spec of specs) {
    if (spec.offices.length === 0) {
      throw new Error(`${spec.key}: no offices matched — check the state values.`);
    }
    if (spec.offices.some((o) => o.lat === null || o.lng === null)) {
      throw new Error(`${spec.key}: an office still has no coordinates. Refusing to render.`);
    }
    await renderRegion(spec);
  }

  console.log('\nDone. Commit both WebP files — they are the artifact, the script is not.');
}

main().catch((e) => {
  console.error(`\nFAILED: ${e.message}`);
  process.exit(1);
});
