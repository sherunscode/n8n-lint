# Changelog

## 0.0.0 - Unreleased

- Added compact bundled n8n schema artifact generation from
  `n8n-nodes-base@2.29.6`.
- Made bundled schema validation the local CLI default.
- Added fixture-backed checks for unknown node and credential types.
- Added fixture-backed checks for dead top-level node parameters and stale
  trigger graph/type-version shapes.
- Added fixture-backed checks for structured nested
  collection/fixedCollection/filter parameter keys.
- Added local quality gates, CI workflow, pre-commit hook, and project hygiene
  documents.
- Added ESLint and Prettier gates to `npm run quality` and the public CI
  workflow.
- Added an executable security hygiene gate that verifies ignored secret/config
  paths, scans tracked public files for token patterns, and blocks bare API-key
  CLI options.
- Added a reproducible `Zie619/n8n-workflows` benchmark report with exact
  pass/fail and skipped-file counts.
- Refreshed the benchmark report after nested parameter-key validation changed
  the pass/fail counts.
- Added batch checks for multiple files, directories, and globs, including
  skipped-file accounting for ordinary JSON files.
- Added local badge generation from real `check --json` output in markdown,
  JSON, and static SVG formats.
- Added pinned two-version schema matrix support for `n8n-nodes-base@2.29.6`
  and `n8n-nodes-base@2.30.0`.
- Added human-gated repair patches for schema-proven unknown top-level
  parameters, with mutation blocked unless `--apply --confirm` is supplied.
- Added owner-review launch drafts grounded in the benchmark, CI, and package
  dry-run proof, without posting or claiming npm publication.
- Added GitHub Actions annotation output via `check --format github`.
- Added `tool.json`, issue-template routing, CI setup docs, and a pre-commit
  framework example.
- Added a composite GitHub Action and CI dogfood step without claiming
  Marketplace release.
- Added Markdown job summaries to the composite GitHub Action.
- Added executable packed-install smoke verification and included it in
  `npm run quality`.
- Added publishable package metadata, package README files, and an owner-gated
  npm release checklist.
