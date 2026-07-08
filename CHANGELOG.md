# Changelog

## 0.0.0 - Unreleased

- Added compact bundled n8n schema artifact generation from
  `n8n-nodes-base@2.29.6`.
- Made bundled schema validation the local CLI default.
- Added fixture-backed checks for unknown node and credential types.
- Added fixture-backed checks for dead top-level node parameters and stale
  trigger graph/type-version shapes.
- Added local quality gates, CI workflow, pre-commit hook, and project hygiene
  documents.
- Added a reproducible `Zie619/n8n-workflows` benchmark report with exact
  pass/fail and skipped-file counts.
- Added batch checks for multiple files, directories, and globs, including
  skipped-file accounting for ordinary JSON files.
- Added local badge generation from real `check --json` output in markdown,
  JSON, and static SVG formats.
- Added publishable package metadata, package README files, and an owner-gated
  npm release checklist.
