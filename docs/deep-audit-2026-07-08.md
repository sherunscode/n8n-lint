# Deep Audit - 2026-07-08

## Scope

Audited the She Runs Code `n8n-lint` repo at `C:\dev\Stars` and public GitHub
state for `sherunscode/n8n-lint`.

This audit verifies the current local MVP. It does not mark npm publication,
tags/releases, public launch posting, live REST validation, deep nested
parameter validation, marketplace publication, or hosted surfaces as complete.

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
- A composite GitHub Action exists at `action.yml` and is dogfooded by CI.
- Owner-review launch drafts exist under `docs/launch-drafts.md` and are based
  only on verified repo, CI, package, and benchmark proof.
- Architecture and support/rollback docs exist for the current MVP.
- Dependabot is configured for npm and GitHub Actions.
- CodeQL is configured for JavaScript/TypeScript analysis.
- npm package name `n8n-lint` returned registry `E404`, so it was not already
  published at audit time.
- `n8n@2.29.7` still resolves to `n8n-nodes-base@2.29.6` and
  `n8n-workflow@2.29.2`.
- `npm run quality` passed: build, example check, bundled-schema check, core
  fixture tests, CLI fixture tests, and production dependency audit.
- Package dry-runs reviewed:
  - `@n8nproof/core@0.0.0`: 11 files, 57.2 kB package, includes `dist` and
    compact schema artifacts only.
  - `n8n-lint@0.0.0`: 6 files, 15.6 kB package, includes `dist` only plus
    package metadata, README, and LICENSE.
- Fresh temp-project tarball install passed with `npx n8n-lint check
  workflow.json`.
- Secret-pattern scan found no OpenAI, GitHub, Anthropic, Gemini, or Cloudflare
  token pattern in tracked public surfaces.
- Stale-claim scan found no old benchmark numbers, fake-growth language,
  invalid old GitHub owner path, or public-report placeholders.
- `git diff --check` passed.

## Validator Proof

Current checked behavior:

- Workflow structure validation.
- Unknown node type detection.
- Unknown or renamed credential type detection.
- Unknown or dead top-level node parameter detection.
- Stale trigger graph/type-version shape detection.
- Stable `--json` output mode.
- GitHub annotation output with native `::error`, `::warning`, and `::notice`
  commands.
- Composite GitHub Action path that runs `check --format github`.
- Batch human and JSON output with stable summary counts.
- Local badge generation from checked JSON output.
- Matrix human and JSON output with per-version summaries and compatibility
  differences.
- Repair human and JSON output for schema-proven unknown top-level parameters,
  with non-repairable failures kept blocked.
- `docs/json-output.md` documents the current JSON output contract.
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
- `examples/failing-stale-trigger-shape.json`
- `examples/not-a-workflow.json`
- `examples/badge-batch-result.json`
- `examples/matrix-2-30-parameter-workflow.json`

## Benchmark Proof

Clean rerun completed against `Zie619/n8n-workflows`.

- Benchmark source commit:
  `94007c1445d9258a7da116646b79473e7c7c3282`
- Benchmark source dirty: `false`
- n8n-lint source commit used for benchmark:
  `f3107548492c598600b213968defc634616c5115`
- n8n-lint source dirty: `false`
- JSON files discovered: 2,077
- Workflow inputs checked: 2,066
- Passed: 766
- Failed: 1,300
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
- Deep nested parameter-shape validation beyond top-level bundled metadata.
- README GIF/screenshots and social preview image.
- Public X, Reddit, HN, or n8n forum launch posts.
- Broader repair transforms for credential renames, node rewrites, trigger
  rewiring, and nested parameter-shape changes.

## Requirement Decision

The repo is production-shaped for a local MVP and public proof repo. It is not
yet a full release or public launch. Public claims must continue to use the
README boundaries and benchmark report exactly.
