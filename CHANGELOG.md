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
- Added an executable package README gate that verifies the README files shipped
  in publishable tarballs preserve package names, command surfaces,
  pre-publication install boundaries, and current non-claims.
- Hardened the GitHub-rendered README verifier so CI uses authenticated repository
  content checks for local README image and link targets instead of rate-limited
  raw asset probes.
- Hardened the composite GitHub Action `paths` input so multiple paths use
  newline-delimited exact arguments instead of shell whitespace splitting.
- Added a composite GitHub Action runtime preflight for Node.js `>=18.18.0` and
  npm, with docs requiring `actions/setup-node` in consumer workflows.
- Hardened the internal live REST placeholder so blank, invalid, non-HTTPS, and
  credential-bearing base URLs fail closed before endpoint probing exists.
- Hardened the She Runs Code GitHub profile verifier so CI reads the profile
  README through authenticated GitHub API content checks when available.
- Added an executable docs contract gate that compares the README `--help`
  block against the built CLI and verifies every help-exposed CLI flag is
  documented.
- Hardened the docs contract gate so README install commands stay limited to
  the source-checkout and packed-tarball smoke paths before npm publication.
- Added an executable package-content gate that fails if publishable tarballs
  include unexpected files, forbidden paths, bundled dependencies, or size
  regressions.
- Added an executable claims hygiene gate that blocks old owner paths,
  placeholder launch URLs, and present-tense live REST claims outside the
  strategy-history boundary.
- Added an executable Markdown link gate that verifies tracked local
  Markdown links, image targets, and heading anchors.
- Added an executable exit-code gate that proves the built CLI exits `0` for
  success, `1` for validation/input failures, and `2` for usage errors.
- Added a shared bundled-schema selection config plus an executable config gate
  so runtime schema loading and artifact generation cannot drift apart.
- Added an executable type-hygiene gate for strict TypeScript settings and the
  validation core's no-`any`/no-suppression rule.
- Added an executable CLI output contract gate for interactive colors,
  `NO_COLOR`, piped plain text, JSON safety, GitHub annotation safety, and batch
  final-summary ordering.
- Added an executable pre-commit hook contract gate for quiet success output,
  loud failure output, exit-code propagation, and executable hook mode.
- Added an executable community-readiness gate for issue templates, PR template,
  contribution docs, code of conduct, security contact/API-key boundaries, and
  live GitHub Discussion #8 support/badge channel proof.
- Added an executable npm registry boundary gate that verifies both publishable
  package names still return `E404` before any owner-approved public release.
- Added an executable release-readiness gate for package-version alignment,
  owner-gated publish/tag/release/posting language, and rollback/support docs.
- Added a checked draft GitHub Release note for v0.1.0 plus an executable gate
  that reconciles it against owner gates, benchmark counts, release proof, and
  current non-claims.
- Added a checked v0.1.0 release command plan plus an executable gate that
  proves the owner-gated publish, single-tag release, registry smoke, forbidden
  command, and rollback path stays deterministic before public launch.
- Added an executable live REST boundary gate that keeps live validation
  unclaimed, blocks public CLI exposure, and proves the internal placeholder
  does not echo API-key material, while enforcing encrypted GitHub Actions
  secret examples for future live REST credentials.
- Added a live REST threat model plus executable boundary checks for future
  fail-closed TLS, cross-origin redirect, wrong-host, API-key redaction,
  no-execution, and endpoint-proof gates.
- Added an executable launch-content gate that ties public copy to owner gates,
  real-growth rules, benchmark proof, and current non-claims.
- Added an executable benchmark-report gate that reconciles the raw JSON,
  Markdown report, README/audit/launch references, failure-category math, and
  non-execution/live REST boundaries.
- Added a generated benchmark dashboard SVG plus an executable gate that keeps
  pass, fail, skipped, and failure-category counts aligned to the real
  `Zie619/n8n-workflows` report.
- Added a generated full-repo batch benchmark output SVG plus an executable
  gate that keeps discovered JSON, selected workflow, pass, fail, skipped, and
  boundary text aligned to the real `Zie619/n8n-workflows` report.
- Added an executable GitHub Action gate and hardened action path handling with
  a quoted bash array before invoking the CLI.
- Added a real GitHub PR checks-tab screenshot proof plus an executable gate
  that validates proof-only PR #6, failed required `quality`, successful CodeQL,
  protected `BLOCKED` merge state, closed PR state, deleted proof branch
  cleanup, and `main` branch protection requiring `quality` for everyone with
  admin bypass disabled through public GitHub metadata.
- Hardened the PR merge-gate proof checker to use `GITHUB_TOKEN` for
  authenticated GitHub API reads when available, so CI keeps live proof without
  relying on unauthenticated public rate limits.
- Added an executable strategy-checklist gate that reconciles `STRATEGY.md`
  checklist status against repo proof while keeping owner/external/future gates
  unchecked.
- Added an executable GitHub-rendered README gate that checks the public repo
  page, rendered README body, image assets, and local links against public
  `main`.
- Added an executable GitHub profile gate that verifies the She Runs Code
  organization profile features `n8n-lint` as the flagship and preserves
  contact plus real-growth proof rules.
- Added a generated README failure-demo SVG plus an executable demo gate that
  proves it still matches real CLI output.
- Added a generated animated failure-demo SVG plus an executable demo gate that
  proves it still matches real CLI output and preserves the live REST boundary.
- Added a generated terminal-output SVG plus an executable demo gate that proves
  it still matches real colored pass and fail CLI output.
- Added a generated pre-commit rejection SVG plus an executable demo gate that
  proves the repo hook rejects an actual temporary Git commit on quality failure.
- Added a generated matrix compatibility SVG plus an executable demo gate that
  proves real matrix CLI and JSON output fail under `n8n-nodes-base@2.29.6` and
  pass under `n8n-nodes-base@2.30.0` for the checked fixture.
- Added a deterministic matrix compatibility GIF plus an executable gate that
  generates it from the same real matrix CLI and JSON output.
- Added a generated social-preview SVG plus an executable visual proof gate that
  ties it to the current benchmark, schema config, and repo metadata.
- Added a generated architecture SVG plus an executable visual proof gate that
  ties it to package metadata, schema config, and tool metadata.
- Added an executable deep-audit report gate that catches stale package counts,
  missing quality gates, and missing owner-gated release blockers.
- Added an executable status-doc gate that keeps local build-loop status notes
  ignored and clearly marked as historical evidence when present.
- Added a reproducible `Zie619/n8n-workflows` benchmark report with exact
  pass/fail and skipped-file counts.
- Refreshed the benchmark report after nested parameter-key validation changed
  the pass/fail counts.
- Added batch checks for multiple files, directories, and globs, including
  skipped-file accounting for ordinary JSON files.
- Added local badge generation from real `check --json` output in markdown,
  JSON, and static SVG formats.
- Added decaying last-verified badge generation from real `check --json` output,
  including green/yellow/red proof states and GitHub Action summary rendering.
- Added a generated README badge-state SVG plus an executable visual proof gate
  that renders green, yellow, and red last-verified badges from real CLI output.
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
