#!/usr/bin/env node
'use strict';

const fs = require('fs');

/**
 * Parse markdown headings from content.
 * Supports ATX (#) and setext (===/---) headings.
 * Ignores headings inside code blocks.
 *
 * @param {string} content - Markdown content
 * @param {object} options - { maxDepth, minDepth }
 * @returns {Array<{level, text, line}>}
 */
function parseHeadings(content, options = {}) {
  const { maxDepth = 6, minDepth = 1 } = options;
  const headings = [];
  const lines = content.split('\n');
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track fenced code blocks
    if (/^\s*(```|~~~)/.test(line)) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    // ATX headings: # Heading, ## Heading, etc.
    const atx = line.match(/^(#{1,6})\s+(.+?)(?:\s+#+\s*)?$/);
    if (atx) {
      const level = atx[1].length;
      if (level >= minDepth && level <= maxDepth) {
        headings.push({ level, text: atx[2].trim(), line: i + 1 });
      }
      continue;
    }

    // Setext headings (text followed by === for H1 or --- for H2)
    if (i + 1 < lines.length && line.trim() && !line.startsWith('#')) {
      const next = lines[i + 1];
      if (/^(=+)\s*$/.test(next)) {
        if (1 >= minDepth && 1 <= maxDepth) {
          headings.push({ level: 1, text: line.trim(), line: i + 1 });
        }
      } else if (/^(-{2,})\s*$/.test(next)) {
        // H2 setext — but not a horizontal rule like --- or - - -
        if (2 >= minDepth && 2 <= maxDepth) {
          headings.push({ level: 2, text: line.trim(), line: i + 1 });
        }
      }
    }
  }

  return headings;
}

/**
 * Convert heading text to a URL-safe slug.
 * Strips markdown formatting (bold, italic, code, links, HTML).
 *
 * @param {string} text - Heading text
 * @param {string} convention - 'github' | 'gitlab' | 'bitbucket'
 * @returns {string}
 */
function slugify(text, convention = 'github') {
  let s = text.trim();

  // Strip inline code
  s = s.replace(/`([^`]+)`/g, '$1');
  // Strip bold/italic
  s = s.replace(/\*\*([^*]+)\*\*/g, '$1');
  s = s.replace(/\*([^*]+)\*/g, '$1');
  s = s.replace(/__([^_]+)__/g, '$1');
  s = s.replace(/_([^_]+)_/g, '$1');
  // Strip links — keep text
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  s = s.replace(/\[([^\]]*)\]\[[^\]]*\]/g, '$1');
  // Strip HTML tags
  s = s.replace(/<[^>]+>/g, '');

  if (convention === 'bitbucket') {
    s = s.toLowerCase();
    s = s.replace(/[^a-z0-9\s_:-]/g, '');
    s = s.replace(/\s+/g, '-');
    s = s.replace(/-+/g, '-');
    return s.replace(/^-|-$/g, '');
  }

  // GitHub / GitLab
  s = s.toLowerCase();
  s = s.replace(/[^\w\s-]/g, '');
  s = s.replace(/\s+/g, '-');
  s = s.replace(/-+/g, '-');
  return s.replace(/^-|-$/g, '');
}

/**
 * Resolve duplicate slug conflicts by appending -1, -2, etc.
 * (Matches GitHub's behavior.)
 *
 * @param {Array} headings - Output of parseHeadings
 * @param {string} convention
 * @returns {Array} headings with `slug` field added
 */
function resolveSlugs(headings, convention = 'github') {
  const seen = {};
  return headings.map(h => {
    let slug = slugify(h.text, convention);
    if (seen[slug] !== undefined) {
      seen[slug]++;
      slug = `${slug}-${seen[slug]}`;
    } else {
      seen[slug] = 0;
    }
    return { ...h, slug };
  });
}

/**
 * Generate a markdown table of contents.
 *
 * @param {Array} headings - Output of parseHeadings
 * @param {object} options
 * @returns {string}
 */
function generateToc(headings, options = {}) {
  const {
    bullet = '-',
    indent = '  ',
    slugConvention = 'github',
    title,
    maxDepth = 6,
    minDepth = 1,
  } = options;

  const filtered = headings.filter(h => h.level >= minDepth && h.level <= maxDepth);
  if (filtered.length === 0) return title ? title : '';

  const withSlugs = resolveSlugs(filtered, slugConvention);
  const baseDepth = Math.min(...withSlugs.map(h => h.level));
  const lines = [];

  if (title) {
    lines.push(title, '');
  }

  for (const h of withSlugs) {
    const pad = indent.repeat(h.level - baseDepth);
    lines.push(`${pad}${bullet} [${h.text}](#${h.slug})`);
  }

  return lines.join('\n');
}

/**
 * Insert or replace a TOC between marker comments in a markdown file.
 *
 * @param {string} content - Original markdown
 * @param {string} toc - Generated TOC text
 * @param {object} options - { startMarker, endMarker, afterFirstHeading }
 * @returns {string}
 */
function insertToc(content, toc, options = {}) {
  const {
    startMarker = '<!-- toc -->',
    endMarker = '<!-- tocstop -->',
    afterFirstHeading = true,
  } = options;

  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  // Replace existing TOC
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const before = content.substring(0, startIdx + startMarker.length);
    const after = content.substring(endIdx);
    return `${before}\n\n${toc}\n\n${after}`;
  }

  // Insert after first heading
  if (afterFirstHeading) {
    const lines = content.split('\n');
    const headings = parseHeadings(content);
    if (headings.length > 0) {
      const insertAfter = headings[0].line; // 1-indexed
      const before = lines.slice(0, insertAfter).join('\n');
      const after = lines.slice(insertAfter).join('\n');
      return `${before}\n\n${startMarker}\n\n${toc}\n\n${endMarker}\n\n${after}`;
    }
  }

  // Prepend
  return `${startMarker}\n\n${toc}\n\n${endMarker}\n\n${content}`;
}

// ── CLI ──────────────────────────────────────────────────────────────

function showHelp() {
  console.log(`Usage: mdtoc [options] <file...>

Generate a table of contents from markdown headings.

Options:
  -m, --max-depth <n>     Maximum heading depth (default: 6)
      --min-depth <n>     Minimum heading depth (default: 1)
  -b, --bullet <char>     Bullet character (default: -)
      --slug <type>       Slug convention: github|gitlab|bitbucket (default: github)
      --title <text>      Add a title above the TOC
      --json              Output headings as JSON
  -i, --insert            Insert TOC into file (between markers)
      --stdout            With -i, print to stdout instead of writing file
  -h, --help              Show this help

When no file is given, reads from stdin.

Examples:
  mdtoc README.md
  mdtoc -m 3 README.md
  mdtoc --json README.md
  mdtoc -i README.md
  cat README.md | mdtoc
`);
}

function parseArgs(argv) {
  const opts = {
    maxDepth: 6,
    minDepth: 1,
    bullet: '-',
    slugConvention: 'github',
    jsonOutput: false,
    insertMode: false,
    writeToStdout: false,
    title: undefined,
    files: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-m': case '--max-depth': opts.maxDepth = parseInt(argv[++i], 10); break;
      case '--min-depth': opts.minDepth = parseInt(argv[++i], 10); break;
      case '-b': case '--bullet': opts.bullet = argv[++i]; break;
      case '--slug': opts.slugConvention = argv[++i]; break;
      case '--title': opts.title = argv[++i]; break;
      case '--json': opts.jsonOutput = true; break;
      case '-i': case '--insert': opts.insertMode = true; break;
      case '--stdout': opts.writeToStdout = true; break;
      case '-h': case '--help': showHelp(); process.exit(0);
      default:
        if (!a.startsWith('-')) opts.files.push(a);
        else { console.error(`Unknown option: ${a}`); process.exit(1); }
    }
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  function processContent(content) {
    const headings = parseHeadings(content, { maxDepth: opts.maxDepth, minDepth: opts.minDepth });

    if (opts.jsonOutput) return JSON.stringify(headings, null, 2);

    const toc = generateToc(headings, {
      bullet: opts.bullet,
      slugConvention: opts.slugConvention,
      title: opts.title,
      maxDepth: opts.maxDepth,
      minDepth: opts.minDepth,
    });

    if (opts.insertMode) {
      const updated = insertToc(content, toc);
      return updated;
    }

    return toc;
  }

  if (opts.files.length === 0) {
    // stdin
    let buf = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', c => buf += c);
    process.stdin.on('end', () => {
      if (opts.insertMode && opts.files.length === 0) {
        // Can't insert without a file, just print TOC
        const headings = parseHeadings(buf, opts);
        console.log(generateToc(headings, opts));
      } else {
        console.log(processContent(buf));
      }
    });
  } else {
    for (const file of opts.files) {
      const content = fs.readFileSync(file, 'utf8');
      const result = processContent(content);
      if (opts.insertMode && !opts.writeToStdout) {
        fs.writeFileSync(file, result);
      } else {
        console.log(result);
      }
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseHeadings, slugify, resolveSlugs, generateToc, insertToc };
