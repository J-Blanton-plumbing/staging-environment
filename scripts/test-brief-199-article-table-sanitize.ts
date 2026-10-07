/**
 * Brief 199 (Track B2) — unit tests for table support in article bodies.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/test-brief-199-article-table-sanitize.ts
 *
 * Exits 1 on the first failed assertion. No DB, no network.
 */
import assert from 'node:assert/strict';
import {
  CMS_ALLOWED_TAGS,
  sanitizeArticleBodyHtml,
  sanitizeCmsHtml,
  sanitizeCmsInlineHtml,
  renderCmsBlock,
} from '../src/lib/cms/sanitize';
import { buildV2Body } from '../src/lib/cms/article-v2-body';
import type { GlobalSettings } from '../src/lib/cms/global-settings';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

const CLEAN =
  '<table><thead><tr><th scope="col">Neighborhood</th><th scope="col">Housing age</th></tr></thead>' +
  '<tbody><tr><td>Grandview Heights</td><td><a href="https://data.census.gov/x" rel="noopener noreferrer">1,798 of 4,238</a></td></tr>' +
  '<tr><th scope="row">German Village</th><td>1840 to 1914</td></tr></tbody></table>';

console.log('Brief 199 — article-body table sanitizer');

test('a clean table survives byte-identical', () => {
  assert.equal(sanitizeArticleBodyHtml(CLEAN), CLEAN);
});

test('caption survives', () => {
  const t = '<table><caption>Housing age</caption><tbody><tr><td>x</td></tr></tbody></table>';
  assert.equal(sanitizeArticleBodyHtml(t), t);
});

test('style / onclick / class / width / border / colspan / rowspan are stripped from table elements', () => {
  const dirty =
    '<table style="color:red" class="t" width="100" border="1" onclick="x()"><thead><tr style="a" class="r">' +
    '<th scope="col" style="b" class="h" colspan="2" onclick="y()">A</th></tr></thead>' +
    '<tbody><tr><td rowspan="2" class="c" style="c" onmouseover="z()">B</td></tr></tbody></table>';
  assert.equal(
    sanitizeArticleBodyHtml(dirty),
    '<table><thead><tr><th scope="col">A</th></tr></thead><tbody><tr><td>B</td></tr></tbody></table>'
  );
});

test('scope keeps only col / row', () => {
  assert.equal(sanitizeArticleBodyHtml('<table><tbody><tr><th scope="rowgroup">A</th><th scope="javascript:x">B</th></tr></tbody></table>'),
    '<table><tbody><tr><th>A</th><th>B</th></tr></tbody></table>');
  assert.equal(sanitizeArticleBodyHtml('<table><tbody><tr><td scope="col">A</td></tr></tbody></table>'),
    '<table><tbody><tr><td>A</td></tr></tbody></table>');
});

test('<script> inside a cell is stripped WITH its contents', () => {
  assert.equal(
    sanitizeArticleBodyHtml('<table><tbody><tr><td>ok<script>alert(1)</script><img src="x" onerror="alert(2)"></td></tr></tbody></table>'),
    '<table><tbody><tr><td>ok<img src="x" /></td></tr></tbody></table>'
  );
});

test('links in cells keep the normal <a> rules (rel added, javascript: dropped)', () => {
  assert.equal(
    sanitizeArticleBodyHtml('<table><tbody><tr><td><a href="https://e.x/" onclick="x()">a</a> <a href="javascript:alert(1)">b</a></td></tr></tbody></table>'),
    '<table><tbody><tr><td><a href="https://e.x/" rel="noopener noreferrer">a</a> <a rel="noopener noreferrer">b</a></td></tr></tbody></table>'
  );
});

test('everything outside tables is exactly sanitizeCmsHtml', () => {
  const body =
    '<h2>T</h2><p>a <strong>b</strong> <a href="/x" target="_blank">c</a></p><ul><li>d</li></ul>' +
    '<figure><img src="/i.webp" alt="x" width="1" height="2" loading="lazy" style="x"><figcaption>c</figcaption></figure>' +
    '<script>bad()</script><iframe src="x"></iframe><div class="k" id="q">z</div>';
  assert.equal(sanitizeArticleBodyHtml(body), sanitizeCmsHtml(body));
});

test('CMS_ALLOWED_TAGS (every non-article field) still has no table tags', () => {
  for (const t of ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption']) assert.ok(!CMS_ALLOWED_TAGS.includes(t), t);
});

test('non-article fields still strip <table> (sanitizeCmsHtml, inline, block render)', () => {
  assert.ok(!/<(table|thead|tbody|tr|th|td|caption)\b/.test(sanitizeCmsHtml(CLEAN)));
  assert.ok(!/<(table|thead|tbody|tr|th|td|caption)\b/.test(sanitizeCmsInlineHtml(CLEAN)));
  assert.ok(!/<(table|thead|tbody|tr|th|td|caption)\b/.test(renderCmsBlock(CLEAN, {} as GlobalSettings)));
});

test('Article V2 render keeps the table; H2 ids and TOC unaffected', () => {
  const v2 = buildV2Body(`<p>Intro</p><h2>Ages</h2><p>Here:</p>${CLEAN}<p>After</p>`);
  const html = v2.sections.flatMap((s) => s.parts).map((p) => (p.kind === 'html' ? p.html : '')).join('');
  assert.ok(html.includes(CLEAN));
  assert.deepEqual(v2.toc, [{ id: 'ages', label: 'Ages' }]);
});

console.log(`\n${passed} passed`);
