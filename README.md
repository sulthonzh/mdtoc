# mdtoc

Generate a table of contents from markdown files. Zero dependencies.

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
- **`slugify(text, convention?)`** — Convert heading text to anchor slug. Strips markdown formatting.
- **`resolveSlugs(headings, convention?)`** — Add `slug` field with duplicate resolution (foo, foo-1, foo-2).
- **`generateToc(headings, opts?)`** — Render TOC string with indentation.
- **`insertToc(content, toc, opts?)`** — Insert/replace TOC between markers in a file.

## Features

- ATX and setext heading support
- Code block aware (doesn't parse `#` inside ```` ``` ````)
- Duplicate slug resolution (GitHub-compatible)
- Three slug conventions
- Stdin + file input
- In-place insertion with markers
- Zero dependencies

## License

MIT
