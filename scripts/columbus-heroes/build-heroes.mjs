/**
 * Columbus area hero images — map + boundary generator (Briefs 172, 173).
 *
 * Renders one hero per Ohio coverage area into
 *   public/images/columbus-heroes/hero_columbus_<area>.webp
 * and rewrites columbus-hero-manifest.csv from what the run actually did, so the
 * manifest can never drift from the images beside it.
 *
 * Base map: OpenStreetMap standard tiles (ODbL). Follows Brief 171 Track B's
 * tile policy verbatim — descriptive User-Agent, sequential requests with
 * TILE_DELAY_MS between them, a MAX_TILES hard stop (lower the zoom, never raise
 * the ceiling), and "© OpenStreetMap contributors" burned into every image.
 *
 * Boundaries: geo.json ships 114 exact municipal boundaries (US Census TIGER
 * 2019). The other 24 areas — Columbus neighborhoods and unincorporated hamlets
 * with no Census place record — are looked up once via Nominatim at run time; if
 * OSM has a polygon it is drawn, otherwise the map is centred on the place with
 * NO outline. Nothing is invented, and no neighbouring town's boundary is ever
 * substituted.
 *
 * Run:  node scripts/columbus-heroes/build-heroes.mjs --force
 * Flags: --only=dublin,hilliard   --force   --dry (no network, grey tiles)
 *
 * Re-runs are cheap: tiles are cached under .scripts-out/tile-cache (gitignored)
 * and existing outputs are skipped unless --force. Safe to Ctrl-C and restart.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const OUT = join(REPO, 'public', 'images', 'columbus-heroes');
const CACHE = join(REPO, '.scripts-out', 'tile-cache');
const UA = 'JBlantonPlumbing-hero-builder/1.0 (marketing@jblantonplumbing.com)';

/**
 * 1000px, quality 72 (Brief 173). The hero column is at most ~864 CSS px wide
 * (45% of a 1920 viewport), so 1000 covers desktop 1:1 with headroom. Measured
 * against the Brief 172 pilot: 1200/q84 put five of eight images over 250 KB
 * (worst 445 KB) as the LCP element; 1000/q72 lands them at 100–200 KB with no
 * visible difference at display size. SIZE_BUDGET_KB warns if that ever slips.
 */
const SIZE = 1000;
const WEBP_QUALITY = 72;
const SIZE_BUDGET_KB = 250;

const TILE = 256;
const TILE_DELAY_MS = 120;      // Brief 171's measured, policy-safe cadence
const MAX_TILES = 64;           // Brief 171's hard stop, not a throttle
const NOMINATIM_DELAY_MS = 1200;
const FILL = 0.66;              // fraction of the frame the boundary occupies
const ZOOM_MIN = 10, ZOOM_MAX = 16;
/**
 * The credit is inset, not corner-flush (Brief 172 finding). The hero is
 * `object-fit: cover` in a column that is narrower than it is tall between
 * ~1051px and ~1127px viewport width, which crops a corner-flush credit's tail.
 * 6% clears the worst measured crop with room to spare, at every breakpoint.
 */
const CREDIT_INSET = Math.round(SIZE * 0.06);

const args = process.argv.slice(2);
const only = (args.find(a => a.startsWith('--only=')) || '').split('=')[1]?.split(',').filter(Boolean);
const force = args.includes('--force');
const dry = args.includes('--dry');

const areas = JSON.parse(readFileSync(join(HERE, 'geo.json'), 'utf8'));
const badge = readFileSync(join(HERE, 'osm-credit.png'));

const sleep = ms => new Promise(r => setTimeout(r, ms));
let lastHit = 0;
async function polite(ms = TILE_DELAY_MS) {
  const wait = lastHit + ms - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit = Date.now();
}

/* ── Web Mercator ─────────────────────────────────────────────────────────── */
const world = z => TILE * 2 ** z;
const lon2x = (lon, z) => ((lon + 180) / 360) * world(z);
const lat2y = (lat, z) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * world(z);
};

function bbox(rings) {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  for (const r of rings) for (const [x, y] of r) {
    if (x < x0) x0 = x; if (x > x1) x1 = x;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return [x0, y0, x1, y1];
}

/** Highest zoom at which the bbox still fits FILL of a SIZE-px square. */
function pickZoom([x0, y0, x1, y1]) {
  for (let z = ZOOM_MAX; z >= ZOOM_MIN; z--) {
    const w = lon2x(x1, z) - lon2x(x0, z);
    const h = lat2y(y0, z) - lat2y(y1, z);
    if (Math.max(w, h) <= SIZE * FILL) return z;
  }
  return ZOOM_MIN;
}

async function tile(z, x, y) {
  const n = 2 ** z;
  if (y < 0 || y >= n) return null;
  x = ((x % n) + n) % n;
  const file = join(CACHE, `${z}_${x}_${y}.png`);
  if (existsSync(file)) return readFileSync(file);
  if (dry) {
    return sharp({ create: { width: TILE, height: TILE, channels: 3, background: '#e8e2d8' } })
      .png().toBuffer();
  }
  await polite();
  const res = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`tile ${z}/${x}/${y} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(file, buf);
  return buf;
}

/** Nominatim lookup, for the areas with no shipped boundary. */
async function lookup(query) {
  if (dry) return null;
  await polite(NOMINATIM_DELAY_MS);
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) return null;
  const [hit] = await res.json();
  if (!hit) return null;
  const g = hit.geojson;
  let rings = [];
  if (g?.type === 'Polygon') rings = [g.coordinates[0]];
  else if (g?.type === 'MultiPolygon') rings = g.coordinates.map(p => p[0]);
  return { rings, center: [Number(hit.lon), Number(hit.lat)] };
}

async function build(area) {
  const dest = join(OUT, area.file);
  if (existsSync(dest) && !force) return { source: 'skip' };

  let rings = area.rings, center = null, source = 'census';
  if (!rings.length) {
    const hit = await lookup(area.query);
    if (hit?.rings.length) { rings = hit.rings; source = 'osm'; }
    else if (hit) { center = hit.center; source = 'centred'; }
    else return { source: 'nodata' };
  }

  const box = rings.length
    ? bbox(rings)
    : [center[0] - 0.02, center[1] - 0.015, center[0] + 0.02, center[1] + 0.015];
  const z = pickZoom(box);
  const cx = (lon2x(box[0], z) + lon2x(box[2], z)) / 2;
  const cy = (lat2y(box[1], z) + lat2y(box[3], z)) / 2;
  const left = cx - SIZE / 2, top = cy - SIZE / 2;

  const tx0 = Math.floor(left / TILE), ty0 = Math.floor(top / TILE);
  const tx1 = Math.floor((left + SIZE) / TILE), ty1 = Math.floor((top + SIZE) / TILE);
  const tileCount = (tx1 - tx0 + 1) * (ty1 - ty0 + 1);
  if (tileCount > MAX_TILES) throw new Error(`${tileCount} tiles > MAX_TILES (${MAX_TILES}) — lower the zoom`);

  const parts = [];
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const buf = await tile(z, tx, ty);
      if (buf) parts.push({ input: buf, left: (tx - tx0) * TILE, top: (ty - ty0) * TILE });
    }
  }

  const stitched = await sharp({
    create: {
      width: (tx1 - tx0 + 1) * TILE, height: (ty1 - ty0 + 1) * TILE,
      channels: 3, background: '#e8e2d8',
    },
  }).composite(parts).png().toBuffer();

  const map = await sharp(stitched)
    .extract({
      left: Math.round(left - tx0 * TILE), top: Math.round(top - ty0 * TILE),
      width: SIZE, height: SIZE,
    })
    .toBuffer();

  const credit = await sharp(badge).metadata();
  const layers = [{
    input: badge,
    left: SIZE - credit.width - CREDIT_INSET,
    top: SIZE - credit.height - CREDIT_INSET,
  }];

  if (rings.length) {
    const path = rings.map(r =>
      'M' + r.map(([lon, lat]) =>
        `${(lon2x(lon, z) - left).toFixed(1)},${(lat2y(lat, z) - top).toFixed(1)}`).join('L') + 'Z'
    ).join(' ');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}">
      <path d="${path}" fill="#bc0e0e" fill-opacity="0.22" stroke="#bc0e0e" stroke-width="6"
            stroke-linejoin="round" fill-rule="evenodd"/></svg>`;
    layers.unshift({ input: Buffer.from(svg) });
  }

  mkdirSync(OUT, { recursive: true });
  await sharp(map).composite(layers).webp({ quality: WEBP_QUALITY, effort: 5 }).toFile(dest);
  return { source, zoom: z, tiles: tileCount, kb: Math.round(statSync(dest).size / 1024) };
}

const SOURCE_LABEL = {
  census: 'exact municipal boundary (US Census TIGER 2019)',
  osm: 'boundary from OpenStreetMap',
  centred: 'map centred on the place, no boundary published',
  nodata: 'NOT GENERATED — no location found',
  skip: 'unchanged (already present)',
};

const todo = only ? areas.filter(a => only.includes(a.slug)) : areas;
const tally = {}, rows = [], heavy = [];

for (const [i, a] of todo.entries()) {
  const n = `${String(i + 1).padStart(3)}/${todo.length}`;
  try {
    const r = await build(a);
    tally[r.source] = (tally[r.source] || 0) + 1;
    if (r.kb > SIZE_BUDGET_KB) heavy.push(`${a.file} ${r.kb}KB`);
    rows.push({ ...a, ...r });
    console.log(`${n}  ${a.file.padEnd(42)} ${r.source.padEnd(8)}` +
      (r.zoom ? ` z${r.zoom}  ${String(r.tiles).padStart(2)} tiles  ${String(r.kb).padStart(3)} KB` : ''));
  } catch (e) {
    tally.error = (tally.error || 0) + 1;
    console.error(`${n}  ${a.file.padEnd(42)} FAILED: ${e.message}`);
  }
}

/* Manifest is rewritten from the run itself — only on a full run, so a
 * --only run can never leave it describing eight areas out of 138. */
if (!only && rows.length) {
  const csv = ['slug,name,county,kind,file,heroImage,map_source,zoom,kb']
    .concat(rows.map(r => [
      r.slug, `"${r.name}"`, r.county, r.kind, r.file,
      `/images/columbus-heroes/${r.file}`,
      `"${SOURCE_LABEL[r.source] ?? r.source}"`, r.zoom ?? '', r.kb ?? '',
    ].join(',')));
  writeFileSync(join(OUT, 'columbus-hero-manifest.csv'), csv.join('\n') + '\n');
  console.log('\nmanifest rewritten: columbus-hero-manifest.csv');
}

console.log('\n', tally);
if (heavy.length) console.warn(`\nOver ${SIZE_BUDGET_KB} KB (${heavy.length}):\n  ` + heavy.join('\n  '));
