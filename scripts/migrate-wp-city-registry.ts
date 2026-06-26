/**
 * Brief 50 — Track C: City Registry Completion
 *
 * Uses the city_pages table (populated by Track B) as the authoritative
 * source of city slugs, then adds any missing from the static registry.
 * Re-reads the XML only to look up the gbp office for new slugs.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/migrate-wp-city-registry.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { Pool } from 'pg';

const XML_PATH =
  'C:/Users/marke/OneDrive/Documents/Claude/Projects/JBP Web Migration/jblantonplumbing.WordPress.2026-06-26.xml';

const REGISTRY_PATH = path.join(process.cwd(), 'src/lib/content/cities/index.ts');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:jbp@localhost:5432/jbp_cms',
});

// Map from WordPress GBP display name → office key
const GBP_TO_OFFICE: Record<string, string> = {
  'Elgin': 'elgin',
  'McHenry': 'mchenry',
  'Arlington Heights': 'arlington-heights',
  'Northbrook': 'northbrook',
  'Hinsdale': 'hinsdale',
  'Naperville': 'naperville',
  'Evanston': 'evanston',
  'Algonquin': 'algonquin',
  'Geneva': 'geneva',
  'Chicago Lincoln Park': 'chicago-lincoln-park',
  'Lincoln Park': 'chicago-lincoln-park',
  'Ravenswood': 'ravenswood',
};

// Cities excluded per brief
const EXCLUDED = new Set(['northbrook', 'elmhurst']);

// ── XML helpers ──────────────────────────────────────────────────────────────

function extractTag(xml: string, tag: string): string {
  const escaped = tag.replace(':', '\\:').replace('/', '\\/');
  const cdataRe = new RegExp(`<${escaped}><!\\[CDATA\\[[\\s\\S]*?\\]\\]></${escaped}>`);
  const cdataMatch = cdataRe.exec(xml);
  if (cdataMatch) {
    return cdataMatch[0].replace(/^.*?<!\[CDATA\[/, '').replace(/\]\]>.*$/, '');
  }
  const plainRe = new RegExp(`<${escaped}>([\\s\\S]*?)</${escaped}>`);
  const m = plainRe.exec(xml);
  return m ? m[1] : '';
}

function getPostMeta(itemXml: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const blocks = itemXml.split('</wp:postmeta>');
  for (const block of blocks) {
    const keyMatch = block.match(/<wp:meta_key>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/wp:meta_key>/);
    const valMatch = block.match(/<wp:meta_value>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/wp:meta_value>/);
    if (keyMatch && valMatch) {
      const key = keyMatch[1].trim();
      if (!key.startsWith('_')) meta[key] = valMatch[1].trim();
    }
  }
  return meta;
}

async function parseItems(xmlPath: string, onItem: (xml: string) => Promise<void>): Promise<void> {
  const stream = fs.createReadStream(xmlPath, { encoding: 'utf8', highWaterMark: 1024 * 1024 });
  let buffer = '';
  for await (const chunk of stream) {
    buffer += chunk;
    while (true) {
      const start = buffer.indexOf('<item>');
      if (start === -1) { buffer = buffer.length > 200 ? buffer.slice(-200) : buffer; break; }
      const end = buffer.indexOf('</item>', start);
      if (end === -1) break;
      await onItem(buffer.substring(start, end + 7));
      buffer = buffer.slice(end + 7);
    }
  }
}

// ── Registry slug extraction ─────────────────────────────────────────────────

function getExistingRegistrySlugs(source: string): Set<string> {
  const slugs = new Set<string>();
  const re = /'([a-z0-9][a-z0-9-]+)'/g;
  let m;
  while ((m = re.exec(source)) !== null) slugs.add(m[1]);
  return slugs;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Track C — City registry completion starting…');
  const client = await pool.connect();

  // Step 1: Get authoritative city slug list from city_pages DB table
  const r = await client.query(`SELECT city_slug FROM city_pages ORDER BY city_slug`);
  const dbCitySlugs = new Set<string>(r.rows.map((row: { city_slug: string }) => row.city_slug));
  client.release();
  await pool.end();
  console.log(`DB city_pages has ${dbCitySlugs.size} slugs`);

  // Step 2: Read registry and extract known slugs
  const registrySource = fs.readFileSync(REGISTRY_PATH, 'utf8');
  const existingSlugs = getExistingRegistrySlugs(registrySource);

  // Step 3: Determine which city slugs are missing from the registry
  const missingSlugs = new Set<string>();
  for (const slug of dbCitySlugs) {
    if (!existingSlugs.has(slug) && !EXCLUDED.has(slug)) {
      missingSlugs.add(slug);
    }
  }
  console.log(`Missing from registry: ${missingSlugs.size}`);

  if (missingSlugs.size === 0) {
    console.log('Registry is already complete.');
    return;
  }

  // Step 4: Scan XML to get gbp → office for missing slugs
  const slugToOffice = new Map<string, string>();
  console.log('Scanning XML for office assignments…');

  await parseItems(XML_PATH, async (itemXml) => {
    const postType = extractTag(itemXml, 'wp:post_type');
    if (postType !== 'page') return;
    const slug = extractTag(itemXml, 'wp:post_name');
    if (!missingSlugs.has(slug)) return;

    const meta = getPostMeta(itemXml);
    const gbp = meta['gbp'] || '';
    const office = GBP_TO_OFFICE[gbp] || 'ravenswood';
    slugToOffice.set(slug, office);
  });

  // For any slug not found in XML, default to ravenswood
  for (const slug of missingSlugs) {
    if (!slugToOffice.has(slug)) slugToOffice.set(slug, 'ravenswood');
  }

  // Step 5: Group by office
  const byOffice = new Map<string, string[]>();
  for (const [slug, office] of slugToOffice) {
    if (!byOffice.has(office)) byOffice.set(office, []);
    byOffice.get(office)!.push(slug);
  }

  // Step 6: Build insertion block
  const insertLines: string[] = [
    '',
    '// ── Cities imported from WordPress XML export (brief-50, Track C) ──────────',
  ];
  for (const [office, slugs] of byOffice) {
    const sorted = slugs.slice().sort();
    const list = sorted.map((s) => `'${s}'`).join(', ');
    insertLines.push(`assignOffice('${office}', [${list}]);`);
  }

  const insertionBlock = insertLines.join('\n');

  // Step 7: Insert after last existing assignOffice call
  const marker = `assignOffice('chicago-lincoln-park', ['chicago-lincoln-park']);`;
  if (!registrySource.includes(marker)) {
    console.error('ERROR: Could not find insertion marker in registry file.');
    process.exit(1);
  }

  const insertIdx = registrySource.indexOf(marker) + marker.length;
  const newSource =
    registrySource.slice(0, insertIdx) + insertionBlock + registrySource.slice(insertIdx);

  fs.writeFileSync(REGISTRY_PATH, newSource, 'utf8');

  console.log(`\nRegistry updated. New entries by office:`);
  for (const [office, slugs] of byOffice) {
    console.log(`  ${office} (${slugs.length}): ${slugs.slice().sort().join(', ')}`);
  }

  // Step 8: Build to verify
  console.log('\nRunning npm run build to verify…');
  try {
    const output = execSync('npm run build 2>&1', {
      cwd: process.cwd(),
      timeout: 300000,
      encoding: 'utf8',
    });
    const lines = output.split('\n').filter((l) => l.trim());
    console.log('\nBuild output (last 20 lines):');
    lines.slice(-20).forEach((l) => console.log(' ', l));
    console.log('\n✓ Build succeeded');
  } catch (e: unknown) {
    const out = (e as { stdout?: string; stderr?: string }).stdout || String(e);
    console.error('Build FAILED. Output:');
    out.split('\n').slice(-30).forEach((l: string) => console.error(' ', l));
    process.exit(1);
  }

  console.log('\n── Summary ─────────────────────────────────────────────────');
  console.log(`  DB city slugs          : ${dbCitySlugs.size}`);
  console.log(`  Already in registry    : ${dbCitySlugs.size - missingSlugs.size}`);
  console.log(`  New entries added      : ${missingSlugs.size}`);
  console.log(`  Excluded (held)        : ${[...dbCitySlugs].filter((s) => EXCLUDED.has(s)).length}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
