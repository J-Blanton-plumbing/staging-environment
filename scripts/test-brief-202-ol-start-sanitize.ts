/**
 * Brief 202 (Track A2) — unit tests for `start` on <ol> in article bodies.
 *
 *   npx ts-node --project tsconfig.scripts.json -r tsconfig-paths/register \
 *     scripts/test-brief-202-ol-start-sanitize.ts
 *
 * Exits 1 on the first failed assertion. No DB, no network.
 */
import assert from 'node:assert/strict';
import { sanitizeArticleBodyHtml, sanitizeCmsHtml, sanitizeCmsInlineHtml } from '../src/lib/cms/sanitize';
import { buildV2Body } from '../src/lib/cms/article-v2-body';

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}
const LI = '<li><strong>Find the indoor shutoff valve.</strong> Most older outdoor faucets…</li>';

console.log('Brief 202 — <ol start> in article bodies');

test('start="3" on <ol> is kept, byte-identical', () => {
  const h = `<ol start="3">${LI}</ol>`;
  assert.equal(sanitizeArticleBodyHtml(h), h);
});
test('large but sane values are kept (start="12", start="99999")', () => {
  for (const v of ['12', '99999']) assert.equal(sanitizeArticleBodyHtml(`<ol start="${v}"><li>a</li></ol>`), `<ol start="${v}"><li>a</li></ol>`);
});
test('bad values are dropped, the list is kept: -1, 0, x, 3.5, 03, " 3", 100000, empty, javascript:', () => {
  for (const v of ['-1', '0', 'x', '3.5', '03', ' 3', '100000', '', 'javascript:alert(1)']) {
    assert.equal(sanitizeArticleBodyHtml(`<ol start="${v}"><li>a</li></ol>`), '<ol><li>a</li></ol>', `start=${JSON.stringify(v)}`);
  }
});
test('an attribute break-out attempt keeps only the valid start: start="3" onclick="x" → start="3"', () => {
  assert.equal(sanitizeArticleBodyHtml('<ol start="3" onclick="x"><li>a</li></ol>'), '<ol start="3"><li>a</li></ol>');
  assert.equal(sanitizeArticleBodyHtml('<ol start="3 onclick=x"><li>a</li></ol>'), '<ol><li>a</li></ol>');
});
test('start on any other tag is stripped (ul, li, p, h2, h3, table)', () => {
  assert.equal(sanitizeArticleBodyHtml('<ul start="3"><li start="3">a</li></ul>'), '<ul><li>a</li></ul>');
  assert.equal(sanitizeArticleBodyHtml('<p start="3">a</p><h2 start="3">b</h2><h3 start="3">c</h3>'), '<p>a</p><h2>b</h2><h3>c</h3>');
  assert.equal(sanitizeArticleBodyHtml('<table start="3"><tbody><tr><td>x</td></tr></tbody></table>'), '<table><tbody><tr><td>x</td></tr></tbody></table>');
});
test('no other <ol> attribute rides along (type, reversed, class, style, onclick)', () => {
  assert.equal(sanitizeArticleBodyHtml('<ol start="3" type="a" reversed class="x" style="color:red" onclick="x()"><li>a</li></ol>'), '<ol start="3"><li>a</li></ol>');
});
test('<h3> survives the article-body sanitizer (Track B change 5)', () => {
  const h = '<h3>Where Is the Shut-Off Valve for an Outdoor Spigot?</h3>';
  assert.equal(sanitizeArticleBodyHtml(h), h);
});
test('non-article fields are NOT widened: sanitizeCmsHtml and the inline subset still strip start', () => {
  assert.equal(sanitizeCmsHtml('<ol start="3"><li>a</li></ol>'), '<ol><li>a</li></ol>');
  assert.ok(!/start=/.test(sanitizeCmsInlineHtml('<ol start="3"><li>a</li></ol>')));
});
test('Article V2 render keeps <ol start="3"> after an H3, inside its H2 section', () => {
  const v2 = buildV2Body(`<h2>How Do You Winterize an Outdoor Faucet or Spigot?</h2><p>Intro</p><h3>Where?</h3><ol start="3">${LI}</ol><p>After</p>`);
  const html = v2.sections.flatMap((s) => s.parts).map((p) => (p.kind === 'html' ? p.html : '')).join('');
  assert.ok(html.includes(`<h3>Where?</h3><ol start="3">${LI}</ol>`));
  assert.deepEqual(v2.toc, [{ id: 'how-do-you-winterize-an-outdoor-faucet-or-spigot', label: 'How Do You Winterize an Outdoor Faucet or Spigot?' }]);
});

console.log(`\n${passed} passed`);
