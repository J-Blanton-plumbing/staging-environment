/**
 * Brief 97 (Track C) verification — proves the generalized registry's `pageTypes`
 * dimension resolves for a page type OTHER than sub-service, without touching any
 * template or the DB. Pure in-memory assertions against `block-catalogue.ts`
 * (the module has no DB import — this is why the script doesn't need one either).
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register scripts/verify-brief-97-page-type-registry.ts
 *
 * Exits non-zero on any failed assertion.
 */
import {
  BLOCK_CATALOGUE,
  ALL_BLOCKS,
  blockDefFor,
  insertableBlocksFor,
  INSERTABLE_BLOCKS,
} from '../src/lib/cms/block-catalogue';
import { SUB_SERVICE_BLOCK_ORDER } from '../src/lib/cms/sub-service-blocks';

let failures = 0;
function check(label: string, cond: boolean) {
  if (cond) {
    console.log(`  PASS  ${label}`);
  } else {
    console.log(`  FAIL  ${label}`);
    failures++;
  }
}

console.log('1. blockDefFor resolves faqAccordion for a non-sub-service page type (city-v2):');
const faqForCityV2 = blockDefFor('city-v2', 'faqAccordion');
check('returns a definition', !!faqForCityV2);
check('type is faqAccordion', faqForCityV2?.type === 'faqAccordion');
check('label is "FAQs"', faqForCityV2?.label === 'FAQs');
check('isInsertable', faqForCityV2?.isInsertable === true);
check('allowMultiple is false', faqForCityV2?.allowMultiple === false);
check('has a faqs repeater field', !!faqForCityV2?.fields.find((f) => f.key === 'faqs' && f.type === 'faqRepeater'));
check('pageTypes includes city-v2', !!faqForCityV2?.pageTypes.includes('city-v2'));

console.log('\n2. blockDefFor resolves faqAccordion for the other 3 city templates:');
for (const pt of ['city-local-office', 'city-coverage-area', 'city-service'] as const) {
  check(`resolves for ${pt}`, !!blockDefFor(pt, 'faqAccordion'));
}

console.log('\n3. blockDefFor correctly SCOPES OUT faqAccordion for sub-service (never wired there):');
check('sub-service + faqAccordion → undefined', blockDefFor('sub-service', 'faqAccordion') === undefined);

console.log('\n4. blockDefFor correctly scopes OUT city types for a sub-service-only block (map):');
check('city-v2 + map → undefined', blockDefFor('city-v2', 'map') === undefined);
check('sub-service + map → defined', !!blockDefFor('sub-service', 'map'));

console.log('\n5. insertableBlocksFor(\'city-v2\') includes the widened shared blocks:');
const cityV2Insertable = insertableBlocksFor('city-v2');
const cityV2Types = cityV2Insertable.map((b) => b.type).sort();
check('includes faqAccordion', cityV2Types.includes('faqAccordion'));
check('includes googleReviews', cityV2Types.includes('googleReviews'));
check('does NOT include tiktokFeed (city-v2 has no TikTok embed)', !cityV2Types.includes('tiktokFeed'));
check('does NOT include relatedArticles (city-v2 has no ArticleGrid)', !cityV2Types.includes('relatedArticles'));
check('does NOT include map (sub-service-only)', !cityV2Types.includes('map'));

console.log('\n6. Sub-service scope (default seed order untouched; insertable set = registry-scoped):');
// The old "total catalogue size" assertion was a maintenance trap: it hard-coded
// 11 and had been silently failing since Brief 99 (+8 City V2 types) and Brief
// 121 (+benefitsCard) — it measured the whole registry while claiming to guard
// SUB-SERVICE scope. Replaced with a check that actually expresses the invariant:
// every entry reachable through the sub-service-scoped exports must declare
// 'sub-service' in its pageTypes. Total registry size is free to grow.
check(
  'every sub-service-scoped entry really declares pageTypes: sub-service',
  INSERTABLE_BLOCKS.every((b) => b.pageTypes.includes('sub-service'))
);
check('SUB_SERVICE_BLOCK_ORDER still has 9 entries', SUB_SERVICE_BLOCK_ORDER.length === 9);
// Brief 139: `servicesMenu` is sub-service-insertable but deliberately NOT in
// SUB_SERVICE_BLOCK_ORDER (that array is the DEFAULT SEED order — putting an
// opt-in block there would auto-insert it on every un-migrated page). So the
// expected inserter set is the seed-order insertables PLUS the opt-in types,
// in ALL_BLOCKS canonical order.
const expectedInsertable = ALL_BLOCKS.filter(
  (b) => b.pageTypes.includes('sub-service') && b.isInsertable
).map((b) => b.type);
check(
  `INSERTABLE_BLOCKS is exactly the ${expectedInsertable.length} sub-service-insertable types, same order`,
  JSON.stringify(INSERTABLE_BLOCKS.map((b) => b.type)) === JSON.stringify(expectedInsertable),
);
check(
  'servicesMenu IS offered on sub-service (Brief 139)',
  INSERTABLE_BLOCKS.some((b) => (b.type as string) === 'servicesMenu')
);
check(
  'servicesMenu is absent from the default seed order (no page gains it automatically)',
  !(SUB_SERVICE_BLOCK_ORDER as string[]).includes('servicesMenu')
);
check(
  'faqAccordion is absent from INSERTABLE_BLOCKS (sub-service scope)',
  // `SubServiceBlockDefinition.type` statically excludes 'faqAccordion' already
  // (TS itself rejects a direct literal comparison) — cast to string to still
  // assert the runtime invariant explicitly.
  !INSERTABLE_BLOCKS.some((b) => (b.type as string) === 'faqAccordion')
);

console.log(failures === 0 ? `\nAll checks passed.` : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
