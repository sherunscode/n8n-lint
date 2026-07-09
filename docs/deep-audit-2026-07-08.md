# Deep Audit - 2026-07-08

## Scope

Audited the She Runs Code `n8n-lint` repo at `C:\dev\Stars` and public GitHub
state for `sherunscode/n8n-lint`.

This audit verifies the current local MVP. It does not mark npm publication,
tags/releases, public launch posting, live REST validation, arbitrary custom
nested parameter semantics, marketplace publication, or hosted surfaces as
complete.

## Verdict

**CONDITIONAL GO for local MVP and public repo proof.**

**NO-GO for full public launch/release** until owner-gated release steps are
completed: npm publish, semver tag, GitHub release, launch posts, and any live
REST claims.

## Confirmed

- Git clean baseline before audit: `main` tracked `origin/main`.
- Latest public repo: `https://github.com/sherunscode/n8n-lint`.
- GitHub repo is public, Issues are enabled, Discussions are enabled, and topics
  include `n8n`, `cli`, `ci-cd`, `validation`, `github-actions`, and
  `workflow-automation`.
- GitHub Discussion #8 is live as the linked Q&A support/badge channel:
  `https://github.com/sherunscode/n8n-lint/discussions/8`.
- Three real starter issues exist and use `good first issue`.
- Follow-up documentation issues for JSON output, README failure output, and
  batch-check design were converted into repo docs after the initial audit.
- Batch mode is implemented for multiple files, directories, and globs, with
  skipped ordinary JSON files counted separately.
- Badge generation is implemented from real `check --json` output in markdown,
  JSON, and static SVG formats, including decaying last-verified green/yellow/red
  states.
- Multi-version schema matrix is implemented for pinned bundled artifacts:
  `n8n-nodes-base@2.29.6` and `n8n-nodes-base@2.30.0`.
- Human-gated repair mode is implemented for schema-proven unknown top-level
  parameters, emits patches by default, and requires `--apply --confirm` before
  mutating workflow files.
- GitHub Actions annotation output is implemented with `check --format github`.
- `tool.json`, issue-template routing, CI setup docs, and a pre-commit framework
  example exist without claiming npm publication.
- A composite GitHub Action exists at `action.yml`, writes a reviewer-facing job
  summary with a last-verified badge, verifies Node.js `>=18.18.0` plus npm
  before building, parses newline-delimited paths into a quoted bash array, is
  dogfooded by CI, and is checked by `npm run check:github-action`.
- The strategy checklist reconciliation is complete for the local-only
  `STRATEGY.md` repo-proof items when that ignored planning file is present:
  `npm run check:strategy-checklist` keeps proven boxes checked and confirms
  the remaining unchecked checklist boxes are owner-gated, external UI proof, or
  future live REST/release gates.
- Owner-review launch drafts exist under `docs/launch-drafts.md` and are based
  only on verified repo, CI, package, and benchmark proof.
- README embeds `docs/assets/readme-failure-demo.svg`, generated from real CLI
  failure output and checked by `npm run check:readme-demo`.
- Animated failure demo asset `docs/assets/animated-failure-demo.svg` is
  generated from real CLI failure output and checked by
  `npm run check:animated-demo`.
- Terminal output demo asset `docs/assets/terminal-output-demo.svg` is generated
  from real colored pass and fail CLI output and checked by
  `npm run check:terminal-output-demo`.
- Pre-commit rejection demo asset `docs/assets/precommit-rejection-demo.svg` is
  generated from an actual temporary Git commit rejected by the repo's real
  `.githooks/pre-commit` hook and checked by
  `npm run check:precommit-rejection-demo`.
- Matrix compatibility GIF `docs/assets/matrix-compatibility-demo.gif` is
  generated from real matrix CLI and JSON output and checked by
  `npm run check:matrix-gif`.
- Launch/social preview asset `docs/assets/social-preview.svg` is generated
  from the current benchmark report, bundled schema config, and canonical repo
  metadata, then checked by `npm run check:social-preview`.
- Architecture diagram asset `docs/assets/architecture.svg` is generated from
  package metadata, bundled schema config, and tool metadata, then checked by
  `npm run check:architecture-diagram`.
- Last-verified badge-state visual `docs/assets/last-verified-badges.svg` is
  generated from real CLI badge SVG output for green, yellow, and red decay
  states, then checked by `npm run check:last-verified-badges`.
- Launch content pack and drafts are evidence-mapped, owner-gated,
  real-growth-only, benchmark-aligned, and checked by
  `npm run check:launch-content`.
- Benchmark report artifacts are reconciled from raw JSON to Markdown,
  README/audit/launch references, failure-category math, and non-execution/live
  REST boundaries by `npm run check:benchmark-report`.
- Benchmark dashboard asset `docs/assets/benchmark-dashboard.svg` is generated
  from the checked `Zie619/n8n-workflows` benchmark JSON and checked by
  `npm run check:benchmark-dashboard`.
- Batch benchmark output asset `docs/assets/batch-benchmark-output.svg` is
  generated from the checked `Zie619/n8n-workflows` benchmark JSON and checked
  by `npm run check:batch-benchmark-output`.
- GitHub PR gate proof `docs/github-pr-merge-gate-proof.md` records a real
  GitHub PR checks-tab screenshot at
  `docs/assets/github-pr-merge-gate-proof.png` and is checked by
  `npm run check:github-pr-gate-proof` against public PR/run metadata. The
  proof-only PR #6 had a failed required `quality` job, successful CodeQL run,
  protected `BLOCKED` merge state, closed PR state, deleted proof branch, and
  `main` branch protection requiring `quality` for everyone with admin bypass
  disabled.
- Architecture and support/rollback docs exist for the current MVP.
- Dependabot is configured for npm and GitHub Actions.
- CodeQL is configured for JavaScript/TypeScript analysis.
- both publishable package names return npm `E404`: `@n8nproof/core` and
  `n8n-lint` were not already published at audit time.
- `n8n@2.29.7` still resolves to `n8n-nodes-base@2.29.6` and
  `n8n-workflow@2.29.2`.
- `npm run quality` passed: build, ESLint, Prettier format check, example
  check, bundled-schema check, `check:schema-config`, `check:type-hygiene`,
  `check:cli-output`, `check:precommit`, `check:community`,
  `check:precommit-rejection-demo`, `check:npm-registry-boundary`,
  `check:release-readiness`, `check:release-notes`, `check:release-command-plan`,
  `check:live-rest-boundary`, `check:launch-content`, `check:benchmark-report`,
  `check:benchmark-dashboard`, `check:batch-benchmark-output`,
  `check:github-action`, `check:github-pr-gate-proof`,
  `check:strategy-checklist`, `check:github-rendered-readme`,
  `check:github-profile`, `check:readme-demo`, `check:animated-demo`,
  `check:terminal-output-demo`, `check:matrix-demo`, `check:matrix-gif`,
  `check:social-preview`, `check:architecture-diagram`, `check:last-verified-badges`, `check:audit-report`, `check:status-docs`,
  `check:metadata`, `check:security`, `check:package-readmes`, `check:docs`, `check:pack`,
  `check:claims`, `check:links`,
  `check:exit-codes`, core fixture tests, CLI fixture tests, production
  dependency audit, and packed-install smoke.
- Package dry-runs reviewed:
  - `@n8nproof/core@0.0.0`: 12 files, 206.1 kB package, includes `dist`,
    `schema`, package metadata, README, and LICENSE only.
  - `n8n-lint@0.0.0`: 6 files, 19.2 kB package, includes `dist` only plus
    package metadata, README, and LICENSE.
- Fresh temp-project tarball install is automated by `npm run smoke:pack` and
  passed with `npx n8n-lint check workflow.json`.
- Secret-pattern scan found no OpenAI, GitHub, Anthropic, Gemini, Cloudflare, or
  n8n token pattern in tracked public surfaces.
- `npm run check:security` now enforces ignored local secret/config files, public
  token-pattern scanning, and no bare API-key CLI option.
- `npm run check:package-readmes` now enforces that the package README files
  shipped in tarballs preserve package names, current command surfaces, current
  validation scope, the pre-publication install boundary, and
  no-workflow-execution/no-live-REST boundaries.
- `npm run check:docs` now enforces README `--help` parity with the built CLI
  and documentation for every help-exposed CLI flag.
- `npm run check:pack` now enforces expected package file lists, forbidden-path
  exclusions, no bundled dependencies, and package size ceilings.
- `npm run check:claims` now enforces the current-truth strategy banner and
  blocks old owner paths, placeholder launch URLs, and present-tense live REST
  claims outside the strategy-history boundary.
- `npm run check:links` now enforces tracked Markdown local link and anchor
  integrity.
- `npm run check:exit-codes` now enforces built-CLI exit codes for success,
  schema failure, invalid JSON/read failures, batch input failures, and usage
  errors. Live REST/network failures remain unclaimed until a live REST source
  ships.
- `npm run check:schema-config` now enforces one pinned bundled-schema selection
  config shared by the runtime and generator, with artifacts and root generator
  dependency reconciled against that config.
- `npm run check:type-hygiene` now enforces strict TypeScript settings and
  blocks `any` or TypeScript suppression directives in the validation core.
- `npm run check:cli-output` now enforces interactive color semantics,
  `NO_COLOR` override behavior, piped plain text, JSON no-color safety, GitHub
  annotation no-color safety, final human-summary ordering, final JSON summary
  fields, and warning summary counts.
- `npm run check:precommit` now enforces the local Git hook's executable mode,
  quiet success path, failure exit-code propagation, and failure-output replay.
- `npm run check:precommit-rejection-demo` now enforces that the pre-commit
  rejection proof SVG is generated from an actual temporary Git commit rejected
  by the repo's real `.githooks/pre-commit` hook.
- `npm run check:community` now enforces issue/PR template fields, contribution
  setup, 72-hour triage target, code-of-conduct presence, security contact plus
  API-key boundaries, and live GitHub Discussion #8 support/badge channel
  proof without npm-publish, live-REST, or workflow-execution claims.
- `npm run check:npm-registry-boundary` now proves the pre-publication boundary
  by checking the npm registry for both publishable package names,
  `@n8nproof/core` and `n8n-lint`, and requiring both to return `E404` while
  `tool.json` still lists npm registry publication as not claimed.
- `npm run check:release-readiness` now enforces package-version alignment,
  pre-release npm boundaries, owner-gated publish/tag/release/posting language,
  and rollback/support documentation.
- `npm run check:release-notes` now enforces that
  `docs/release-notes-v0.1.0-draft.md` is a substantive, owner-gated draft
  GitHub Release body aligned to current benchmark counts, quality proof,
  publish order, rollback boundaries, and current non-claims.
- `npm run check:release-command-plan` now enforces that
  `docs/release-command-plan-v0.1.0.md` is a dry-run command contract for the
  owner-gated v0.1.0 release path, including public-state preflight commands,
  version-PR mutation boundaries, final pre-publish checks, publish order,
  registry smoke, single approved tag creation, forbidden commands, and
  rollback boundaries.
- `npm run check:live-rest-boundary` now enforces that the live REST source
  boundary stays locked: public CLI help exposes only verified local sources,
  the internal placeholder stays unimplemented, API-key material is not echoed,
  docs keep live REST schema validation unclaimed until endpoint proof exists,
  and future GitHub Actions examples use encrypted `secrets.N8N_API_KEY`
  wiring instead of plaintext workflow YAML values. It also enforces
  `docs/live-rest-threat-model.md`, including fail-closed TLS, cross-origin
  redirect, wrong-host, API-key redaction, no-workflow-execution, and endpoint
  proof gates for any future adapter.
- `npm run check:launch-content` now enforces that launch copy is owner-gated,
  real-growth-only, evidence-mapped, benchmark-aligned, and free of unsupported
  npm, `npx`, workflow-execution, live REST, and engagement claims.
- `npm run check:benchmark-report` now enforces raw benchmark JSON totals,
  failure-category math, relative result paths, Markdown render parity,
  README/audit/launch proof phrases, and non-execution/live REST boundaries.
- `npm run check:benchmark-dashboard` now enforces that the benchmark dashboard
  SVG is generated from the checked `Zie619/n8n-workflows` report and keeps
  pass, fail, skipped, and failure-category counts aligned.
- `npm run check:batch-benchmark-output` now enforces that the full-repo batch
  benchmark output SVG is generated from the checked `Zie619/n8n-workflows`
  report and keeps discovered JSON, selected workflow, pass, fail, skipped,
  failure-category, and no-execution/live-REST boundary text aligned.
- `npm run check:github-action` now enforces composite action metadata, safe
  paths array expansion, `--format github` invocation, job-summary output, CI
  dogfooding, tool metadata, and Marketplace non-claim boundaries.
- `npm run check:github-pr-gate-proof` now enforces that the PR merge-gate
  screenshot is a real PNG asset backed by public GitHub metadata for proof-only
  PR #6, including failed required `quality`, successful CodeQL, protected
  `BLOCKED` merge state, closed PR state, deleted proof branch cleanup, and
  `main` branch protection requiring `quality` with admin bypass disabled.
- `npm run check:strategy-checklist` now enforces that `STRATEGY.md` marks only
  repo-proven checklist boxes as complete, including final human/JSON summary
  proof, and leaves owner-gated, external UI, and future live REST/release
  checklist boxes unchecked.
- `npm run check:github-rendered-readme` now verifies the public
  GitHub-rendered repo page, README body, checked image assets, local README
  links, and absence of escaped raw image/SVG markup against public `main`.
- `npm run check:github-profile` now verifies the public She Runs Code
  organization profile features `n8n-lint` as flagship, links the canonical
  repo, preserves n8nproof positioning, and includes real-growth rules plus
  email/X contact details.
- `npm run check:readme-demo` now enforces that the README SVG demo is generated
  from a real failing CLI command and matches the current output.
- `npm run check:animated-demo` now enforces that the animated failure demo SVG
  is generated from a real failing CLI command, includes the dead-parameter
  failure, and preserves the live REST non-claim warning.
- `npm run check:terminal-output-demo` now enforces that the terminal output
  proof SVG is generated from real colored pass and fail CLI commands, includes
  dead-parameter line-level detail, and preserves the live REST non-claim
  warning.
- `npm run check:matrix-demo` now enforces that the matrix compatibility proof
  SVG is generated from real matrix CLI and JSON output, including the
  `clearWarning` difference that fails under `n8n-nodes-base@2.29.6` and
  passes under `n8n-nodes-base@2.30.0`.
- `npm run check:matrix-gif` now enforces that the animated matrix GIF is
  generated from real matrix CLI and JSON output, including the `clearWarning`
  difference that fails under `n8n-nodes-base@2.29.6` and passes under
  `n8n-nodes-base@2.30.0`.
- `npm run check:social-preview` now enforces that the launch/social preview SVG
  is generated from the current benchmark report, bundled schema config, and
  canonical repo metadata while preserving npm and live REST non-claim
  boundaries.
- `npm run check:architecture-diagram` now enforces that the architecture SVG is
  generated from package metadata, bundled schema config, and tool metadata
  while preserving the live REST non-claim boundary.
- `npm run check:last-verified-badges` now enforces that the badge-state SVG is
  generated from real CLI last-verified badge output for green, yellow, and red
  decay states.
- `npm run check:audit-report` now enforces that this audit report retains the
  conditional/no-go verdicts, current package dry-run counts, quality gate list,
  owner-gated remaining items, and README demo proof.
- `npm run check:status-docs` now enforces that local build-loop status notes
  stay ignored and, when present, are clearly marked historical with a pointer
  back to this current audit.
- Stale-claim scan found no old benchmark numbers, fake-growth language,
  invalid old GitHub owner path, or public-report placeholders.
- `git diff --check` passed.

## Validator Proof

Current checked behavior:

- Workflow structure validation.
- Unknown node type detection.
- Unknown or renamed credential type detection.
- Unknown or dead top-level node parameter detection.
- Unknown or dead structured nested parameter-key detection for bundled
  collection, fixedCollection, and filter metadata.
- Stale trigger graph/type-version shape detection.
- Stable `--json` output mode.
- GitHub annotation output with native `::error`, `::warning`, and `::notice`
  commands.
- Composite GitHub Action path that verifies the Node/npm runtime, runs
  `check --format github`, uses newline-safe path parsing, and writes a
  Markdown job summary.
- GitHub Action contract check for action metadata, Node/npm runtime preflight,
  newline-safe paths handling, `--format github` invocation, last-verified badge
  summary output, CI dogfooding, tool metadata, and Marketplace non-claim
  boundaries.
- Single-file and batch human/JSON output with final summary counts, including
  warning totals.
- Local badge generation from checked JSON output, including age-decaying
  last-verified badge output.
- Matrix human and JSON output with per-version summaries, aggregate final
  summary counts, and compatibility differences.
- Repair human and JSON output for schema-proven unknown top-level parameters,
  with non-repairable failures kept blocked.
- `docs/json-output.md` documents the current JSON output contract.
- `docs/exit-codes.md` documents the current exit-code contract and the live
  REST/network non-claim.
- `packages/core/schema/bundled-n8n-package-config.json` is the pinned
  bundled-schema selection source of truth.
- `docs/batch-check-design.md` documents batch behavior and proof gates.
- `docs/ci-setup.md` documents GitHub annotation output and CI setup paths.
- `docs/ci-setup.md` documents future live REST API-key handling through
  GitHub Actions encrypted secrets while preserving the current live REST
  non-claim.
- `docs/live-rest-threat-model.md` documents future live REST threat handling
  and implementation gates without claiming live REST is built.
- The public GitHub-rendered README page is checked by
  `npm run check:github-rendered-readme`.
- The public She Runs Code organization profile is checked by
  `npm run check:github-profile`.
- `docs/assets/architecture.svg` provides a generated architecture diagram for
  the README.
- `docs/assets/benchmark-dashboard.svg` provides a generated benchmark
  dashboard for the README and launch content.
- `docs/assets/batch-benchmark-output.svg` provides generated full-repo batch
  benchmark output proof for the README and launch content.
- `docs/assets/github-pr-merge-gate-proof.png` provides a real GitHub PR
  checks-tab screenshot with a failed `quality` job and public run metadata in
  `docs/github-pr-merge-gate-proof.md`.
- `docs/assets/terminal-output-demo.svg` provides generated pass/fail terminal
  output proof for the README.
- `docs/assets/precommit-rejection-demo.svg` provides generated pre-commit
  rejection proof for the README.
- `docs/assets/matrix-compatibility-demo.svg` provides generated matrix
  compatibility proof for the README and `docs/schema-matrix.md`.
- `docs/assets/matrix-compatibility-demo.gif` provides animated matrix
  compatibility proof for the README and `docs/schema-matrix.md`.
- `docs/assets/last-verified-badges.svg` provides generated green/yellow/red
  last-verified badge-state proof for the README.
- `docs/badge-output.md` documents badge formats and status rules.
- `docs/schema-matrix.md` documents pinned schema artifacts and matrix behavior.
- `docs/repair.md` documents diff-only repair behavior and apply confirmation
  rules.
- `docs/launch-drafts.md` contains unposted launch copy with owner-review and
  no-npm-claim gates.
- `docs/release-command-plan-v0.1.0.md` contains the owner-gated dry-run command
  contract for public-state checks, package publish order, registry smoke,
  single approved tag creation, GitHub Release creation, and rollback.

Fixture coverage includes:

- `examples/known-http-request-workflow.json`
- `examples/failing-missing-nodes.json`
- `examples/failing-unknown-node.json`
- `examples/failing-unknown-credential.json`
- `examples/failing-dead-parameter.json`
- `examples/failing-nested-dead-parameter.json`
- `examples/failing-stale-trigger-shape.json`
- `examples/not-a-workflow.json`
- `examples/badge-batch-result.json`
- `examples/badge-last-verified-green.json`
- `examples/badge-last-verified-yellow.json`
- `examples/badge-last-verified-red.json`
- `examples/matrix-2-30-parameter-workflow.json`

## Benchmark Proof

Rerun completed against `Zie619/n8n-workflows`.

- Benchmark source commit:
  `94007c1445d9258a7da116646b79473e7c7c3282`
- Benchmark source dirty: `false`
- n8n-lint source commit used for benchmark:
  `de5675d758997ce917cb9eef48adee30577b48d0`
- n8n-lint source dirty: `false`
- JSON files discovered: 2,077
- Workflow inputs checked: 2,066
- Passed: 762
- Failed: 1,304
- Skipped non-workflow JSON: 11

Benchmark proof phrase: 2,066 workflow inputs, 762 passed, 1,304 failed, 11
skipped.

Report artifacts:

- `docs/benchmark-zie619-report.md`
- `docs/benchmark-zie619-report.json`

## Remaining Gates

These are intentionally not complete:

- npm publish and registry-backed `npx n8n-lint`.
- Semver tag and GitHub release.
- Publishing the checked draft release notes as an actual GitHub Release.
- GitHub Action Marketplace listing.
- Live REST schema validation.
- Arbitrary custom nested parameter semantics beyond bundled structured
  collection/fixedCollection/filter metadata.
- Additional video captures beyond the checked README, animated demo, terminal
  output, pre-commit rejection, matrix compatibility SVG/GIF, social preview,
  architecture SVG, and last-verified badge-state SVG assets.
- Public X, Reddit, HN, or n8n forum launch posts.
- Broader repair transforms for credential renames, node rewrites, trigger
  rewiring, and nested parameter-shape changes.

## Requirement Decision

The repo is production-shaped for a local MVP and public proof repo. It is not
yet a full release or public launch. Public claims must continue to use the
README boundaries and benchmark report exactly.
