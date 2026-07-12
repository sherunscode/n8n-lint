# n8n-lint Deep Hardening Audit - 2026-07-11

## Verdict

**GO for protected merge of repository hardening after all PR checks pass.**

**NO-GO for npm publication, tags, GitHub Releases, Marketplace submission,
or public launch posts.** The derived schema redistribution boundary requires
written n8n licensing confirmation and owner release approval. npm publish and
registry-backed `npx n8n-lint` remain unclaimed.

Open SEV-1: **0**. Confidence: **0.96** for repository behavior covered by
local executable proof; GitHub settings and post-merge status require remote
command evidence on the final commit.

## Scope

The audit reconciles CLI behavior, discovery, validation, output contracts,
schema generation, packaged Action behavior, tests, coverage, dependencies,
licensing, documentation, release automation, GitHub controls, and clean/public
checkout proof. `STRATEGY.md` and `RESEARCH.md` remain ignored local planning
inputs; tracked code and documentation are authoritative.

## Findings

| Severity | Verdict           | Finding and disposition                                                                                                                                                                      | Confidence |
| -------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------: |
| SEV-1    | CONFIRMED FIXED   | Multiple explicit inputs no longer silently skip malformed/non-workflow JSON. Explicit inputs fail; discovered ordinary JSON may skip.                                                       |       0.99 |
| SEV-2    | CONFIRMED FIXED   | Recursive discovery excludes dependency, VCS, output, coverage, and cache directories while preserving explicitly named files. Duplicate paths are removed and output remains deterministic. |       0.99 |
| SEV-2    | CONFIRMED FIXED   | Batch validation uses bounded concurrency with sorted results.                                                                                                                               |       0.97 |
| SEV-2    | CONFIRMED FIXED   | Unsupported command-specific flags now exit `2`; `--version` is implemented and version contracts are checked.                                                                               |       0.99 |
| SEV-2    | CONFIRMED FIXED   | The consumer Action is a committed packaged runtime with `runs.using: node24`; it performs one validation pass and does not install or compile the repository.                               |       0.98 |
| SEV-2    | CONFIRMED FIXED   | Vitest plus V8 coverage enforces 90% statements, lines, and functions and 85% branches across extracted CLI/core modules.                                                                    |       0.98 |
| SEV-2    | CONFIRMED FIXED   | `n8n-nodes-base` was removed from ordinary dependencies. Schema generation uses an isolated npm tarball extraction path without installing or executing upstream code.                       |       0.97 |
| SEV-1    | CONFIRMED BLOCKER | Derived schema artifacts are covered by an n8n Sustainable Use License notice. Original code remains MIT, but publication is blocked pending written n8n licensing confirmation.             |       0.98 |
| SEV-2    | CONFIRMED FIXED   | Quality is split into fast, local, remote, and release groups with named progress, time budgets, and process-tree termination.                                                               |       0.97 |

## Command Evidence

| Command evidence                                              | Result                                     | What it proves                                                                                                 |
| ------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `npm run verify:fast`                                         | PASS in 53.6 seconds during implementation | Build, lint, formatting, Vitest coverage, core executable tests, and CLI regressions fit the 90-second budget. |
| Adversarial explicit/discovered fixtures                      | PASS                                       | Explicit malformed/non-workflow JSON fails; discovered ordinary JSON skips.                                    |
| `node packages/cli/dist/bin.js check "**/*.json" --json`      | 27 relevant files in about 0.93 seconds    | Ignored traversal prevents the prior 4,266-file `node_modules` scan.                                           |
| `npm audit --omit=dev --audit-level=high`                     | PASS, 0 production vulnerabilities         | Production dependency boundary.                                                                                |
| `npm run check:github-action` and `npm run check:action-dist` | Required local gates                       | Packaged Node 24 Action contract and deterministic committed bundle.                                           |
| `npm run check:benchmark-report`                              | Required local gate                        | Benchmark Proof remains tied to committed reproducible data and does not claim workflow execution.             |
| `npm run check:github-pr-gate-proof`                          | Required remote gate                       | Existing protected-merge evidence remains linked at `docs/assets/github-pr-merge-gate-proof.png`.              |
| `npm run quality`                                             | PASS in 211.6 seconds                      | Full local gate completed within the five-minute budget.                                                       |
| `npm run quality:remote`                                      | PASS in 28.5 seconds                       | GitHub, npm, profile, social-preview, security, and branch-control reconciliation.                             |
| `npm run quality:release`                                     | Required after merge                       | Local, remote, clean-checkout, public-checkout, and release artifact proof within ten minutes.                 |
| `npm run check:clean-source-checkout`                          | PASS, 172 tracked files                    | Clean install, build, help, success/failure CLI paths, and packed-install smoke from staged repository truth.  |

## Benchmark Proof

`npm run check:benchmark-report` reconciles
`docs/benchmark-zie619-report.md` and `docs/benchmark-zie619-report.json` against
source commit `94007c1445d9258a7da116646b79473e7c7c3282`. The checked corpus contains
2,066 workflow inputs: 762 passed, 1,304 failed, and 11 skipped. These are
static validation results, not workflow execution results.

`npm run check:release-artifact-manifest` now verifies checksum manifest
generation for release proof tarballs, including package names, versions, byte
sizes, SHA-256 hashes, and the `check:release-artifact-manifest` gate.

`npm run check:release-workflow` now enforces `.github/workflows/release.yml` as
a read-only release proof workflow: package dry-runs, local tarball artifact
upload, no npm token, no npm publish, no tag push, and no GitHub Release
creation. The `check:release-workflow` gate is local and deterministic.

`npm run check:audit-report` now enforces the current audit date, findings,
evidence, confidence, and deterministic release verdict.

## GitHub Controls

Confirmed live: automatic branch deletion and update-branch support are
enabled; merge commits, Wiki, and unused Projects are disabled; Issues and
Discussions remain enabled; secret scanning, push protection, Dependabot
security updates, required `quality`, `action-smoke`, and CodeQL checks, and
admin enforcement are enabled. GitHub custom social preview configured in
repository settings uses `docs/assets/social-preview.png`; GraphQL confirms the
custom Open Graph image is active.

## Release Gates

- `npm run check:npm-registry-boundary` must prove both publishable package
  names return npm `E404` before any first release.
- `npm run check:live-rest-boundary` proves the live REST source boundary stays
  locked. Live REST schema validation remains unimplemented and unclaimed.
- The strategy checklist reconciliation remains honest: remaining unchecked
  checklist boxes are owner-gated, external UI proof, or future live
  REST/release gates.
- No npm package, tag, GitHub Release, Marketplace listing, or public post may
  be created by this hardening change.
- npm publication additionally requires written n8n licensing confirmation or
  replacement of bundled artifacts with user-side extraction.

## Final Gate

Merge is permitted only through a protected PR after local `quality`, remote
proof, cross-platform Action smoke, CodeQL, and secret review are green. The
post-merge task must run release proof, synchronize local `main` with
`origin/main`, delete the delivery branch, and leave an empty status.
