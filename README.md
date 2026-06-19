# mdtoc

Generate a table of contents from markdown files — zero dependencies, one file, every heading.

## Why

Every README needs a TOC. Copy-pasting anchors by hand is tedious. Existing tools pull in dozens of dependencies for what's essentially regex + string formatting.

`mdtoc` does one thing: read your headings, generate anchored links, output a clean TOC. No deps, no config files, no fluff.

## Install

```bash
npm install -g mdtoc
```

Or just use it directly:

```bash
npx mdtoc README.md
```

## Quick Start

```bash
$ mdtoc README.md
- [Installation](#installation)
- [Usage](#usage)
  - [Basic](#basic)
  - [Advanced](#advanced)
- [Contributing](#contributing)
```

## Real-World Examples

### 1. Pre-commit TOC check (CI gate)

Keep your README TOC in sync without manual effort:

```bash
# In a pre-commit hook or CI step:
mdtoc -i README.md
git diff --exit-code README.md || (echo "TOC is stale — run 'mdtoc -i README.md'" && exit 1)
```

This inserts (or updates) the TOC between markers, then fails if anything changed — catching stale TOCs before they ship.

### 2. Multi-file documentation site

Generate TOCs for every doc in your `docs/` folder in one command:

```bash
$ mdtoc -i docs/getting-started.md docs/api-reference.md docs/troubleshooting.md
```

Each file gets its TOC updated in place. Use `--max-depth 3` to keep TOCs compact for long docs:

```bash
$ mdtoc -i -m 3 docs/*.md
```

### 3. Programmatic TOC for a static site generator

Use the API to build a sidebar navigation from your markdown content:

```js
const { parseHeadings, generateToc } = require('mdtoc');
const fs = require('fs');

const markdown = fs.readFileSync('guide.md', 'utf8');
const headings = parseHeadings(markdown, { maxDepth: 3 });

// Generate HTML sidebar from headings
const sidebar = headings.map(h => {
  const indent = '  '.repeat(h.level - 1);
  const slug = h.text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
  return `${indent}<a href="#${slug}">${h.text}</a>`;
}).join('\n');

console.log(sidebar);
```

## Usage

### Generate a TOC

```bash
$ mdtoc README.md
- [Installation](#installation)
- [Usage](#usage)
  - [Basic](#basic)
  - [Advanced](#advanced)
- [Contributing](#contributing)
```

### Pipe from stdin

```bash
cat README.md | mdtoc
```

### Insert TOC into a file

```bash
mdtoc -i README.md
```

This adds TOC between `<!-- toc -->` and `<!-- tocstop -->` markers. If markers don't exist, they're inserted after the first heading. Re-running updates the TOC in place.

### Limit depth

```bash
$ mdtoc -m 3 README.md   # Only h1-h3
```

### JSON output

```bash
$ mdtoc --json README.md
[
  { "level": 1, "text": "Installation", "line": 1 },
  { "level": 2, "text": "Basic", "line": 5 }
]
```

### Custom bullet and title

```bash
$ mdtoc -b '*' --title '## Contents' README.md
## Contents

* [Intro](#intro)
* [Setup](#setup)
```

### Different slug conventions

```bash
$ mdtoc --slug gitlab README.md    # GitLab-style anchors
$ mdtoc --slug bitbucket README.md # Bitbucket-style anchors
```

## Options

| Flag | Default | Description |
|------|---------|-------------|
| `-m, --max-depth <n>` | 6 | Maximum heading level |
| `--min-depth <n>` | 1 | Minimum heading level |
| `-b, --bullet <char>` | `-` | Bullet character |
| `--slug <type>` | github | Slug convention: `github`, `gitlab`, `bitbucket` |
| `--title <text>` | — | Title above TOC |
| `--json` | off | Output headings as JSON |
| `-i, --insert` | off | Insert/update TOC in file |
| `--stdout` | off | With `-i`, print instead of writing |
| `-V, --version` | — | Print version number |
| `-h, --help` | — | Show help |

## API

```js
const { parseHeadings, slugify, generateToc, insertToc } = require('mdtoc');

const headings = parseHeadings('# Hello\n## World');
// [{ level: 1, text: 'Hello', line: 1 }, { level: 2, text: 'World', line: 2 }]

const toc = generateToc(headings);
// - [Hello](#hello)
//   - [World](#world)

const updated = insertToc(markdownContent, toc);
// Inserts between <!-- toc --> markers or after first heading
```

### Functions

- **`parseHeadings(content, opts?)`** — Extract headings. Supports ATX (`#`) and setext (`===`/`---`). Skips code blocks. Returns `[{ level, text, line }]`.
- **`slugify(text, convention?)`** — Convert heading text to anchor slug. Strips markdown formatting (bold, italic, code, links, images, HTML). Supports `github`, `gitlab`, `bitbucket` conventions.
- **`resolveSlugs(headings, convention?)`** — Add `slug` field with duplicate resolution (foo, foo-1, foo-2).
- **`generateToc(headings, opts?)`** — Render TOC string with indentation. Options: bullet, indent, slugConvention, title, maxDepth, minDepth.
- **`insertToc(content, toc, opts?)`** — Insert/replace TOC between markers in a file. Correctly handles setext headings.

## How It Compares

| Feature | mdtoc | doctoc | markdown-toc | GitHub auto-TOC |
|---------|-------|--------|--------------|-----------------|
| Zero dependencies | ✅ | ❌ (12+ deps) | ❌ (15+ deps) | N/A |
| Works offline | ✅ | ✅ | ✅ | ❌ |
| Setext heading support | ✅ | ❌ | ❌ | ❌ |
| Multiple slug conventions | ✅ (3) | ❌ | ❌ | GitHub only |
| Programmatic API | ✅ | ❌ | ✅ | ❌ |
| Code-block aware | ✅ | ✅ | ✅ | ✅ |
| Stdin support | ✅ | ❌ | ❌ | ❌ |
| In-place insertion | ✅ | ✅ | ❌ | ✅ |
| Install size | ~8 KB | ~500 KB | ~200 KB | 0 |

## Features

- ATX (`#`) and setext (`===`/`---`) heading support
- CommonMark-compliant setext underline detection (0–3 leading spaces)
- Code block aware (doesn't parse `#` inside ` ``` ` or `~~~`)
- Duplicate slug resolution (GitHub-compatible)
- Three slug conventions: GitHub, GitLab, Bitbucket
- Stdin + file input (supports multiple files)
- In-place insertion with markers
- Strip markdown formatting in slugs (bold, italic, code, links, images, HTML)
- Zero dependencies, single file

## License

MIT
