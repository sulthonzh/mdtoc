# Changelog

## v1.1.0 — 2026-06-19

### Fixed
- **Setext heading insertion bug**: `insertToc` could split a setext heading (e.g., `Title\n===`) from its underline when inserting after the first heading. Now correctly detects setext headings and inserts after the underline line.
- **Setext underline with leading spaces**: CommonMark allows 0–3 leading spaces before the `===`/`---` underline. Updated regex from `^(=+)` to `^ {0,3}(=+)` to match the spec.

### Added
- `--version` / `-V` flag to print the version number.
- `exports` field in `package.json` for clean ESM/CJS interop.
- `prepublishOnly` script to run tests before publishing.
- CHANGELOG.md (this file).
- 13 new tests (47 → 60 total): setext leading spaces (1/2/3/4), insertToc setext integrity, image slug, nested bold+italic slug, bitbucket slug convention, generateToc title+empty, generateToc minDepth filter, version semver check, API stability, complex mixed document, closing hashes.

## v1.0.0 — 2026-06-17

### Initial Release
- ATX (`#`) and setext (`===`/`---`) heading parsing.
- Code block aware (skips `#` inside fenced code blocks).
- Three slug conventions: GitHub, GitLab, Bitbucket.
- Duplicate slug resolution (GitHub-compatible `-1`, `-2` suffixes).
- Markdown TOC generation with configurable bullets, indentation, depth, and title.
- In-place insertion between `<!-- toc -->` / `<!-- tocstop -->` markers.
- Stdin and file input support.
- Zero dependencies, Node 14+ compatible.
- 47 tests covering all functionality and edge cases.
