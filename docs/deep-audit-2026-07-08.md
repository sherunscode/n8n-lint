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
- Three real starter issues exist and use `good first issue`.
- Follow-up documentation issues for JSON output, README failure output, and
  batch-check design were converted into repo docs after the initial audit.
- Batch mode is implemented for multiple files, directories, and globs, with
  skipped ordinary JSON files counted separately.
- Badge generation is implemented from real `check --json` output in markdown,
  JSON, and static SVG formats.
- Multi-version schema matrix is implemented for pinned bundled artifacts:
  `n8n-nodes-base@2.29.6` and `n8n-nodes-base@2.30.0`.
- Human-gated repair mode is implemented for schema-proven unknown top-level
  parameters, emits patches by default, and requires `--apply --confirm` before
  mutating workflow files.
- GitHub Actions annotation output is implemented with `check --format github`.
- `tool.json`, issue-template routing, CI setup docs, and a pre-commit framework
  example exist without claiming npm publication.
- A composite GitHub Action exists at `action.yml`, writes a reviewer-facing job
  summary, and is dogfooded by CI.
- Owner-review launch drafts exist under `docs/launch-drafts.md` and are based
  only on verified repo, CI, package, and benchmark proof.
- README embeds `docs/assets/readme-failure-demo.svg`, generated from real CLI
  failure output and checked by `npm run check:readme-demo`.
- Animated failure demo asset `docs/assets/animated-failure-demo.svg` is
  generated from real CLI failure output and checked by
  `npm run check:animated-demo`.
- Launch/social preview asset `docs/assets/social-preview.svg` is generated
  from the current benchmark report, bundled schema config, and canonical repo
  metadata, then checked by `npm run check:social-preview`.
- Architecture and support/rollback docs exist for the current MVP.
- Dependabot is configured for npm and GitHub Actions.
- CodeQL is configured for JavaScript/TypeScript analysis.
- npm package name `n8n-lint` returned registry `E404`, so it was not already
  published at audit time.
- `n8n@2.29.7` still resolves to `n8n-nodes-base@2.29.6` and
  `n8n-workflow@2.29.2`.
- `npm run quality` passed: build, ESLint, Prettier format check, example
  check, bundled-schema check, `check:schema-config`, `check:type-hygiene`,
  `check:precommit`, `check:community`, `check:release-readiness`,
  `check:readme-demo`, `check:animated-demo`, `check:social-preview`,
  `check:audit-report`, `check:status-docs`, `check:metadata`,
  `check:security`, `check:docs`, `check:pack`, `check:claims`, `check:links`,
  `check:exit-codes`, core fixture tests, CLI fixture tests, production
  dependency audit, and packed-install smoke.
- Package dry-runs reviewed:
  - `@n8nproof/core@0.0.0`: 12 files, 205.9 kB package, includes `dist`,
    `schema`, package metadata, README, and LICENSE only.
  - `n8n-lint@0.0.0`: 6 files, 15.7 kB package, includes `dist` only plus
    package metadata, README, and LICENSE.
- Fresh temp-project tarball install is automated by `npm run smoke:pack` and
  passed with `npx n8n-lint check workflow.json`.
- Secret-pattern scan found no OpenAI, GitHub, Anthropic, Gemini, Cloudflare, or
  n8n token pattern in tracked public surfaces.
- `npm run check:security` now enforces ignored local secret/config files, public
  token-pattern scanning, and no bare API-key CLI option.
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
- `npm run check:precommit` now enforces the local Git hook's executable mode,
  quiet success path, failure exit-code propagation, and failure-output replay.
- `npm run check:community` now enforces issue/PR template fields, contribution
  setup, 72-hour triage target, code-of-conduct presence, and security contact
  plus API-key boundaries.
- `npm run check:release-readiness` now enforces package-version alignment,
  pre-release npm boundaries, owner-gated publish/tag/release/posting language,
  and rollback/support documentation.
- `npm run check:readme-demo` now enforces that the README SVG demo is generated
  from a real failing CLI command and matches the current output.
- `npm run check:animated-demo` now enforces that the animated failure demo SVG
  is generated from a real failing CLI command, includes the dead-parameter
  failure, and preserves the live REST non-claim warning.
- `npm run check:social-preview` now enforces that the launch/social preview SVG
  is generated from the current benchmark report, bundled schema config, and
  canonical repo metadata while preserving npm and live REST non-claim
  boundaries.
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
- Composite GitHub Action path that runs `check --format github` and writes a
  Markdown job summary.
- Batch human and JSON output with stable summary counts.
- Local badge generation from checked JSON output.
- Matrix human and JSON output with per-version summaries and compatibility
  differences.
- Repair human and JSON output for schema-proven unknown top-level parameters,
  with non-repairable failures kept blocked.
- `docs/json-output.md` documents the current JSON output contract.
- `docs/exit-codes.md` documents the current exit-code contract and the live
  REST/network non-claim.
- `packages/core/schema/bundled-n8n-package-config.json` is the pinned
  bundled-schema selection source of truth.
- `docs/batch-check-design.md` documents batch behavior and proof gates.
- `docs/ci-setup.md` documents GitHub annotation output and CI setup paths.
- `docs/badge-output.md` documents badge formats and status rules.
- `docs/schema-matrix.md` documents pinned schema artifacts and matrix behavior.
- `docs/repair.md` documents diff-only repair behavior and apply confirmation
  rules.
- `docs/launch-drafts.md` contains unposted launch copy with owner-review and
  no-npm-claim gates.

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

Report artifacts:

- `docs/benchmark-zie619-report.md`
- `docs/benchmark-zie619-report.json`

## Remaining Gates

These are intentionally not complete:

- npm publish and registry-backed `npx n8n-lint`.
- Semver tag and GitHub release.
- GitHub Action Marketplace listing.
- Live REST schema validation.
- Arbitrary custom nested parameter semantics beyond bundled structured
  collection/fixedCollection/filter metadata.
- Additional video/GIF captures beyond the checked README, animated demo, and
  social preview SVG assets.
- Public X, Reddit, HN, or n8n forum launch posts.
- Broader repair transforms for credential renames, node rewrites, trigger
  rewiring, and nested parameter-shape changes.

## Requirement Decision

The repo is production-shaped for a local MVP and public proof repo. It is not
yet a full release or public launch. Public claims must continue to use the
README boundaries and benchmark report exactly.
