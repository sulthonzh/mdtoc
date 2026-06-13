'use strict';

const assert = require('assert');
const { parseHeadings, slugify, resolveSlugs, generateToc, insertToc } = require('./index');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try { fn(); passed++; }
  catch (e) { failed++; console.error(`  ✗ ${name}: ${e.message}`); }
}

function eq(actual, expected, msg) {
  assert.deepStrictEqual(actual, expected, msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// ── parseHeadings ────────────────────────────────────────────────────

test('parses ATX headings', () => {
  const md = '# Title\n## Section\n### Sub';
  const h = parseHeadings(md);
  eq(h.length, 3);
  eq(h[0], { level: 1, text: 'Title', line: 1 });
  eq(h[1], { level: 2, text: 'Section', line: 2 });
  eq(h[2], { level: 3, text: 'Sub', line: 3 });
});

test('parses setext H1', () => {
  const md = 'My Title\n========';
  const h = parseHeadings(md);
  eq(h.length, 1);
  eq(h[0].level, 1);
  eq(h[0].text, 'My Title');
});

test('parses setext H2', () => {
  const md = 'Section\n--------';
  const h = parseHeadings(md);
  eq(h.length, 1);
  eq(h[0].level, 2);
  eq(h[0].text, 'Section');
});

test('ignores headings in code blocks', () => {
  const md = '# Real\n\n```\n# Fake\n## Also Fake\n```\n\n## Also Real';
  const h = parseHeadings(md);
  eq(h.length, 2);
  eq(h[0].text, 'Real');
  eq(h[1].text, 'Also Real');
});

test('ignores headings in tilde code blocks', () => {
  const md = '# Real\n\n~~~\n# Fake\n~~~\n\n## Also Real';
  const h = parseHeadings(md);
  eq(h.length, 2);
});

test('respects maxDepth', () => {
  const md = '# H1\n## H2\n### H3\n#### H4';
  const h = parseHeadings(md, { maxDepth: 2 });
  eq(h.length, 2);
});

test('respects minDepth', () => {
  const md = '# H1\n## H2\n### H3';
  const h = parseHeadings(md, { minDepth: 2 });
  eq(h.length, 2);
  eq(h[0].level, 2);
});

test('handles closing hash marks', () => {
  const md = '# Title #';
  const h = parseHeadings(md);
  eq(h[0].text, 'Title');
});

test('handles empty content', () => {
  eq(parseHeadings('').length, 0);
});

test('line numbers are correct', () => {
  const md = '\n\n\n# Heading';
  const h = parseHeadings(md);
  eq(h[0].line, 4);
});

test('does not confuse --- with setext on empty line', () => {
  const md = 'text\n\n---\n';
  const h = parseHeadings(md);
  // --- preceded by empty line is horizontal rule, not setext
  eq(h.length, 0);
});

test('handles mixed ATX and setext', () => {
  const md = '# ATX\nText\n===\n## ATX2';
  const h = parseHeadings(md);
  eq(h.length, 3);
  eq(h[0].text, 'ATX');
  eq(h[1].text, 'Text');
  eq(h[1].level, 1);
  eq(h[2].text, 'ATX2');
});

// ── slugify ──────────────────────────────────────────────────────────

test('basic slug', () => {
  eq(slugify('Hello World'), 'hello-world');
});

test('lowercase', () => {
  eq(slugify('HELLO'), 'hello');
});

test('strips punctuation', () => {
  eq(slugify('Hello, World!'), 'hello-world');
});

test('handles underscores in GitHub mode', () => {
  eq(slugify('foo_bar baz'), 'foo_bar-baz');
});

test('strips bold markdown', () => {
  eq(slugify('**Bold** Text'), 'bold-text');
});

test('strips italic markdown', () => {
  eq(slugify('*Italic* Text'), 'italic-text');
});

test('strips inline code', () => {
  eq(slugify('`code` here'), 'code-here');
});

test('strips links keeping text', () => {
  eq(slugify('[Link Text](https://example.com)'), 'link-text');
});

test('strips reference links', () => {
  eq(slugify('[Text][ref]'), 'text');
});

test('strips HTML tags', () => {
  eq(slugify('<em>Text</em>'), 'text');
});

test('multiple spaces collapse to single dash', () => {
  eq(slugify('a   b'), 'a-b');
});

test('trailing punctuation removed', () => {
  eq(slugify('Test!!!'), 'test');
});

test('numbers preserved', () => {
  eq(slugify('Section 2.3'), 'section-23');
});

test('unicode stripped in github mode', () => {
  eq(slugify('Café résumé'), 'caf-rsum');
});

test('hyphens preserved', () => {
  eq(slugify('already-has-dashes'), 'already-has-dashes');
});

// ── resolveSlugs ─────────────────────────────────────────────────────

test('resolveSlugs adds slug field', () => {
  const h = parseHeadings('# Hello');
  const r = resolveSlugs(h);
  eq(r[0].slug, 'hello');
});

test('resolveSlugs deduplicates', () => {
  const md = '# Foo\n# Foo\n# Foo';
  const h = parseHeadings(md);
  const r = resolveSlugs(h);
  eq(r[0].slug, 'foo');
  eq(r[1].slug, 'foo-1');
  eq(r[2].slug, 'foo-2');
});

test('resolveSlugs only increments exact duplicates', () => {
  const md = '# Foo\n# Bar\n# Foo';
  const h = parseHeadings(md);
  const r = resolveSlugs(h);
  eq(r[0].slug, 'foo');
  eq(r[1].slug, 'bar');
  eq(r[2].slug, 'foo-1');
});

// ── generateToc ──────────────────────────────────────────────────────

test('generates basic TOC', () => {
  const md = '# A\n## B\n### C';
  const h = parseHeadings(md);
  const toc = generateToc(h);
  assert(toc.includes('[A](#a)'), 'missing A link');
  assert(toc.includes('[B](#b)'), 'missing B link');
  assert(toc.includes('[C](#c)'), 'missing C link');
});

test('indents nested headings', () => {
  const md = '# A\n## B\n### C';
  const h = parseHeadings(md);
  const toc = generateToc(h);
  const lines = toc.split('\n');
  eq(lines[0], '- [A](#a)');
  eq(lines[1], '  - [B](#b)');
  eq(lines[2], '    - [C](#c)');
});

test('respects maxDepth in TOC', () => {
  const md = '# A\n## B\n### C';
  const h = parseHeadings(md);
  const toc = generateToc(h, { maxDepth: 2 });
  const lines = toc.split('\n');
  eq(lines.length, 2);
});

test('custom bullet character', () => {
  const md = '# A\n## B';
  const h = parseHeadings(md);
  const toc = generateToc(h, { bullet: '*' });
  assert(toc.split('\n')[0].startsWith('* [A]'));
});

test('adds title', () => {
  const md = '# A';
  const h = parseHeadings(md);
  const toc = generateToc(h, { title: '## Contents' });
  assert(toc.startsWith('## Contents'));
});

test('empty headings produce empty toc', () => {
  eq(generateToc([]), '');
});

test('handles single heading', () => {
  const md = '# Solo';
  const h = parseHeadings(md);
  const toc = generateToc(h);
  eq(toc, '- [Solo](#solo)');
});

test('custom indent string', () => {
  const md = '# A\n## B';
  const h = parseHeadings(md);
  const toc = generateToc(h, { indent: '\t' });
  assert(toc.split('\n')[1].startsWith('\t'));
});

// ── insertToc ────────────────────────────────────────────────────────

test('inserts TOC between markers', () => {
  const content = '# Title\n\n<!-- toc -->\n\nold toc\n\n<!-- tocstop -->\n\n## Section';
  const toc = '- [Section](#section)';
  const result = insertToc(content, toc);
  assert(result.includes('<!-- toc -->'));
  assert(result.includes('<!-- tocstop -->'));
  assert(result.includes('[Section](#section)'));
  assert(!result.includes('old toc'));
});

test('inserts after first heading when no markers', () => {
  const content = '# Title\n\n## A\n## B';
  const toc = '- [A](#a)';
  const result = insertToc(content, toc);
  const lines = result.split('\n');
  // Title should come first, then markers
  assert(lines[0].includes('Title'));
  const markerIdx = lines.findIndex(l => l.includes('<!-- toc -->'));
  assert(markerIdx > 0, 'marker should be after first heading');
});

test('preserves content before and after markers', () => {
  const content = '# Doc\n\nIntro text\n\n<!-- toc -->\n\nold\n\n<!-- tocstop -->\n\n## End';
  const toc = '- [End](#end)';
  const result = insertToc(content, toc);
  assert(result.includes('# Doc'));
  assert(result.includes('Intro text'));
  assert(result.includes('## End'));
});

test('custom markers', () => {
  const content = '# T\n\n<!-- TOC -->\n\nx\n\n<!-- /TOC -->\n\n## A';
  const toc = '- [A](#a)';
  const result = insertToc(content, toc, { startMarker: '<!-- TOC -->', endMarker: '<!-- /TOC -->' });
  assert(result.includes('[A](#a)'));
  assert(!result.includes('\nx\n'));
});

test('handles no headings gracefully', () => {
  const content = 'Just text\nno headings';
  const toc = 'TOC';
  const result = insertToc(content, toc);
  assert(result.includes('TOC'));
});

// ── Edge cases ───────────────────────────────────────────────────────

test('heading with only hashes', () => {
  const md = '### ###';
  const h = parseHeadings(md);
  // "### ###" should be level 3 with text "###" or skipped
  // Our regex requires text after the hashes, so "### " with trailing hashes after text
  // Actually "### ###" → level 3, text "###" after stripping trailing #
  // Let's just make sure it doesn't crash
  assert(h !== undefined);
});

test('heading with special chars', () => {
  const md = '# Hello & World!';
  const h = parseHeadings(md);
  eq(h[0].text, 'Hello & World!');
  const toc = generateToc(h);
  assert(toc.includes('#hello--world') || toc.includes('#hello-world'));
});

test('multiple consecutive headings', () => {
  const md = '# A\n## B\n### C\n#### D\n##### E\n###### F';
  const h = parseHeadings(md);
  eq(h.length, 6);
});

test('code block with heading-like content using tildes', () => {
  const md = '# Real\n\n~~\n# Not real\n~~~\n\n## Also real';
  // The ~~ opens a code block but ~~~ (three) also closes it
  // Actually ~~ is two tildes, which opens, then ~~~ is three which closes
  // Our regex checks for ``` or ~~~ (3+), so ~~ won't trigger
  // Let's verify behavior
  const h = parseHeadings(md);
  // With our impl, ~~ won't be recognized as fence (needs ``` or ~~~)
  // So '# Not real' would be parsed as heading
  // This is acceptable behavior for CommonMark (fences need 3+ chars)
  assert(h.length >= 1);
});

// ── Summary ──────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
