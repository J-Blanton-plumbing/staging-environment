/**
 * Brief 141 QA — the `membershipComparison` normalizer + render edge cases that
 * the admin click-through would otherwise be the only way to reach.
 *
 * Covers the states an editor can produce that the seeded content never shows:
 * a check flipped OFF in the member column, a cross flipped ON in the
 * non-member column, a child row with no parent above it, an empty
 * subtitle/closing line/footnote, 1 and 3 price cards, >3 cards, rows with no
 * label, and malformed stored JSON. Every case must render without throwing and
 * with the right marks and hidden text.
 *
 * Pure and read-only: no DB, no network, no writes. Renders the real component
 * through react-dom/server.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/verify-brief-141-block-edge-cases.ts
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';

import MembershipComparison from '@/components/MembershipComparison';
import {
  normalizeMembershipComparisonData,
  normalizeMembershipComparisonInstance,
  staticNdcMembershipComparisonData,
  MEMBERSHIP_COMPARISON_MAX_PRICES,
  type MembershipComparisonData,
} from '@/lib/cms/membership-comparison';
import { normalizeNdcTemplateVariant } from '@/lib/cms/ndc-template-variant';
import { BLOCK_CATALOGUE, defaultDataFor, fieldsFor } from '@/lib/cms/block-catalogue';
import { NDC } from '@/lib/content/ndc';
import type { GlobalSettings } from '@/lib/cms/global-settings';

let failures = 0;
function check(ok: boolean, msg: string) {
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failures++;
}
function section(title: string) {
  console.log(`\n${title}`);
}

// Minimal settings stub — only the three price tokens matter here.
const settings = {
  phoneDisplay: '773-724-9272',
  ndcPrice: '$29.97',
  ndcPrice1yr: '$149',
  ndcPrice2yr: '$229',
} as unknown as GlobalSettings;

function render(data: MembershipComparisonData): string {
  return renderToStaticMarkup(
    createElement(MembershipComparison, { data, settings, involveMe: NDC.involveMe })
  );
}

function countOf(html: string, needle: string): number {
  return html.split(needle).length - 1;
}

// ── 1. normalizer edge cases ────────────────────────────────────────────────
section('Normalizer edge cases:');

const junk = normalizeMembershipComparisonData({
  rows: [
    { label: '', caveat: null, child: false, member: true, nonMember: false }, // dropped: no label
    { label: 'ORPHAN CHILD', child: true }, // child with no parent above it
    { label: 'MALFORMED BOOLS', member: 'yes', nonMember: 'no', child: 'maybe' },
    'not an object',
    null,
  ],
  prices: [
    { termLabel: '1 YEAR', amount: '{{ndc_price_1yr}}' },
    { termLabel: '2 YEARS', amount: '{{ndc_price_2yr}}' },
    { termLabel: '3 YEARS', amount: '$299' },
    { termLabel: '4 YEARS', amount: '$399' }, // over the cap
  ],
  subtitle: '',
  closingLine: '',
  priceFootnote: '',
  title: 42,
});
check(junk.rows.length === 2, `unlabelled + non-object rows dropped (kept ${junk.rows.length} of 5)`);
check(junk.rows[0].label === 'ORPHAN CHILD' && junk.rows[0].child === true, 'child row with no parent is kept, not dropped');
check(junk.rows[1].member === true && junk.rows[1].nonMember === false && junk.rows[1].child === false, 'malformed booleans fall back to member=true / nonMember=false / child=false');
check(junk.prices.length === MEMBERSHIP_COMPARISON_MAX_PRICES, `prices truncated to the cap of ${MEMBERSHIP_COMPARISON_MAX_PRICES} (got ${junk.prices.length})`);
check(junk.prices[0].buttonLabel === 'Join Today', 'missing buttonLabel defaults to "Join Today"');
check(junk.subtitle === null && junk.closingLine === null && junk.priceFootnote === null, 'empty strings normalize to null (→ hidden, not rendered blank)');
check(junk.title === NDC.comparison.title, `non-string title falls back to the approved value ("${junk.title}")`);

check(normalizeMembershipComparisonData(null).rows.length === 0, 'null data does not throw');
check(normalizeMembershipComparisonData('nonsense').prices.length === 0, 'string data does not throw');
check(normalizeMembershipComparisonInstance({ type: 'wrongType', id: 'x' }) === null, 'wrong block type → null (caller falls back to the static mapper)');
check(normalizeMembershipComparisonInstance({ type: 'membershipComparison', id: '' }) === null, 'empty id → null');

// ── 2. variant fallback ─────────────────────────────────────────────────────
section('Variant fallback:');
for (const [input, want] of [
  ['comparison', 'comparison'], ['classic', 'classic'],
  ['COMPARISON', 'classic'], ['', 'classic'], [undefined, 'classic'],
  [null, 'classic'], [123, 'classic'], [{}, 'classic'],
] as Array<[unknown, string]>) {
  const got = normalizeNdcTemplateVariant(input);
  check(got === want, `${JSON.stringify(input)} → "${got}"`);
}

// ── 3. no drift across the four call sites ──────────────────────────────────
section('Static mapper / registry defaultData parity (the "zero drift" claim):');
const staticData = JSON.stringify(staticNdcMembershipComparisonData());
const registryDefault = JSON.stringify(defaultDataFor('membershipComparison', 'no-drip-club'));
check(staticData === registryDefault, 'registry defaultData === staticNdcMembershipComparisonData()');
check(
  registryDefault !== JSON.stringify(BLOCK_CATALOGUE.membershipComparison.defaultData) ||
    defaultDataFor('membershipComparison', 'no-drip-club') !== BLOCK_CATALOGUE.membershipComparison.defaultData,
  'defaultDataFor returns a CLONE, so an editor cannot mutate the registry entry'
);
const fields = fieldsFor(BLOCK_CATALOGUE.membershipComparison, 'no-drip-club');
check(fields.length === 9, `9 editor fields registered (got ${fields.length})`);
const rowsField = fields.find((f) => f.key === 'rows');
const pricesField = fields.find((f) => f.key === 'prices');
check(rowsField?.type === 'comparisonRowRepeater', 'rows → comparisonRowRepeater');
check(pricesField?.type === 'priceCardRepeater', 'prices → priceCardRepeater');

// ── 4. render: the seeded content ───────────────────────────────────────────
section('Render — seeded content:');
const seeded = render(staticNdcMembershipComparisonData());
check(countOf(seeded, 'scope="row"') === 10, `10 <th scope="row"> (got ${countOf(seeded, 'scope="row"')})`);
check(countOf(seeded, 'scope="col"') === 3, `3 <th scope="col"> (got ${countOf(seeded, 'scope="col"')})`);
check(countOf(seeded, '>Included<') === 10 && countOf(seeded, '>Not included<') === 10, '10 Included + 10 Not included hidden alternatives');
check(countOf(seeded, 'ndc-mc-row-child') === 5, '5 child rows');
check(countOf(seeded, 'ndc-mc-caveat') === 2, '2 caveats (rows 9 and 10 only)');
check(seeded.includes('$149') && seeded.includes('$229'), 'both prices resolved from tokens');
check(!seeded.includes('{{'), 'no unresolved tokens');
check(countOf(seeded, 'ndc-mc-price-best') === 1, 'exactly one emphasized card');
check(seeded.includes('data-count="2"'), 'price grid data-count="2"');
check(!/<table[^>]*>[\s\S]*<h2/.test(seeded), '<h2> is NOT inside the <table>');

// ── 5. render: flipped cells ────────────────────────────────────────────────
section('Render — flipped cells (an editor can flip any cell):');
const flipped = render({
  ...staticNdcMembershipComparisonData(),
  rows: [
    { label: 'MEMBER OFF', caveat: null, child: false, member: false, nonMember: false },
    { label: 'BOTH ON', caveat: null, child: false, member: true, nonMember: true },
    { label: 'ONLY NON-MEMBER', caveat: null, child: false, member: false, nonMember: true },
  ],
});
check(countOf(flipped, '>Included<') === 3, `3 Included across the flipped matrix (got ${countOf(flipped, '>Included<')})`);
check(countOf(flipped, '>Not included<') === 3, `3 Not included (got ${countOf(flipped, '>Not included<')})`);
check(countOf(flipped, 'ndc-mc-icon-cross') === 3 && countOf(flipped, 'ndc-mc-icon-check') === 3, '3 crosses + 3 checks rendered');

// ── 6. render: orphan child, and everything optional emptied ────────────────
section('Render — orphan child row + all optional fields empty:');
const minimal = render({
  label: null,
  title: 'MEMBERSHIP BENEFITS',
  subtitle: null,
  memberColumnLabel: 'NO DRIP CLUB',
  nonMemberColumnLabel: 'NON MEMBER',
  rows: [{ label: 'ORPHAN CHILD FIRST', caveat: null, child: true, member: true, nonMember: false }],
  closingLine: null,
  prices: [],
  priceFootnote: null,
});
check(minimal.includes('ndc-mc-row-child'), 'orphan child renders indented, no crash');
check(!minimal.includes('ndc-mc-subtitle'), 'empty subtitle omitted entirely');
check(!minimal.includes('ndc-mc-closing'), 'empty closing line omitted entirely');
check(!minimal.includes('ndc-mc-footnote'), 'empty footnote omitted entirely');
check(!minimal.includes('ndc-mc-prices'), 'zero price cards omits the grid entirely');
check(minimal.includes('<table'), 'the table still renders');

// ── 7. render: 1 and 3 price cards ──────────────────────────────────────────
section('Render — 1 and 3 price cards (the grid must derive from the count):');
const base = staticNdcMembershipComparisonData();
const one = render({ ...base, prices: [base.prices[0]] });
check(one.includes('data-count="1"'), 'one card → data-count="1"');
const three = render({
  ...base,
  prices: [...base.prices, { termLabel: '3 YEARS', amount: '$299', buttonLabel: 'Join Today', emphasized: false }],
});
check(three.includes('data-count="3"'), 'three cards → data-count="3"');
check(countOf(three, 'ndc-mc-price-best') === 1, 'still exactly one emphasized card');
check(countOf(three, 'involveme_popup') === 3, 'all three cards wired to the involve.me popup');
check(countOf(three, 'data-project="no-drip-club"') === 3, 'all three use the EXISTING no-drip-club project');

// ── 8. no inline styles / no runtime syntax in any rendered variation ───────
section('Cross-cutting output hygiene (every variation above):');
for (const [name, html] of [['seeded', seeded], ['flipped', flipped], ['minimal', minimal], ['three-card', three]] as Array<[string, string]>) {
  check(!html.includes('style="'), `${name}: zero inline style= attributes`);
  check(!/#000000|#000"/i.test(html), `${name}: no pure black`);
  check(!/bestBorder|<sc-|style-hover|x-dc|helmet|support\.js/.test(html), `${name}: no Claude Design runtime syntax`);
  check(countOf(html, 'aria-hidden="true"') >= 1, `${name}: mark SVGs carry aria-hidden`);
}

console.log(failures === 0 ? '\n✓ ALL CHECKS PASSED' : `\n✗ ${failures} CHECK(S) FAILED`);
if (failures > 0) process.exitCode = 1;
