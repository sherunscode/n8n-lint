# Draft GitHub Release Notes - v0.1.0

Status: draft only. Do not publish, tag, or announce this release until the
owner approves npm publication, tag push, GitHub Release creation, and public
launch posts.

## Summary

`n8n-lint` v0.1.0 is the first n8nproof release from She Runs Code: a local CLI
and GitHub Action for checking n8n workflow JSON against compact schema
artifacts generated from n8n's own package metadata.

This release is built for the practical failure mode that static workflow
collections miss: stale node names, renamed credential types, dead parameters,
structured nested parameter drift, and stale trigger shapes showing up before a
workflow reaches production.

## What Is Included

- `n8n-lint check <workflow.json|directory|glob>` for single-file and batch
  validation.
- Artifact-backed schema checks from bundled `n8n-nodes-base@2.29.6` metadata.
- A pinned compatibility matrix artifact for `n8n-nodes-base@2.30.0`.
- Validation for workflow shape, bundled node type names, credential type names,
  top-level node parameters, structured nested collection/fixedCollection/filter
  parameter keys, and trigger graph/type-version shape.
- Stable human output, `--json` output, and GitHub Actions annotation output.
- Local status badges and decaying last-verified badges generated from real
  check output.
- Conservative `repair` mode that emits a diff by default and requires
  `--apply --confirm` before mutating a workflow file.
- A composite GitHub Action in `action.yml`, dogfooded by this repo's CI.
- Source-checkout and packed-tarball install proof before registry publication.

## Evidence

- Full quality gate: `npm run quality`.
- Package smoke proof: `npm run smoke:pack`.
- Package content proof: `npm run check:pack`.
- npm registry boundary proof: `npm run check:npm-registry-boundary`.
- Release-readiness proof: `npm run check:release-readiness`.
- Community proof: `npm run check:community` verifies live GitHub Discussion #8.
- Public README proof: `npm run check:github-rendered-readme` verifies the
  rendered GitHub README against public `main`.
- PR merge-gate proof:
  `docs/github-pr-merge-gate-proof.md` and
  `docs/assets/github-pr-merge-gate-proof.png`.
- Deep audit: `docs/deep-audit-2026-07-11.md`.

## Benchmark

The checked Zie619 benchmark is reproducible from
`docs/benchmark-zie619-report.json` and documented in
`docs/benchmark-zie619-report.md`.

- Benchmark source: `Zie619/n8n-workflows`.
- Source commit: `94007c1445d9258a7da116646b79473e7c7c3282`.
- JSON files discovered: 2,077.
- Workflow inputs checked: 2,066.
- Passed: 762.
- Failed: 1,304.
- Skipped non-workflow JSON: 11.

Benchmark proof phrase: 2,066 workflow inputs, 762 passed, 1,304 failed, 11
skipped.

The benchmark does not execute workflows and does not use live n8n REST
validation.

## Install After Owner Approval

Do not use these commands in public copy until npm publication has completed and
a clean-machine registry install proof has been recorded.

```bash
npx n8n-lint check workflow.json
```

Before publication, use the source-checkout and packed-tarball flows documented
in `README.md` and `docs/release-checklist.md`.

## Boundaries

This release does not claim:

- live REST schema validation;
- workflow execution;
- hosted SaaS;
- GitHub Marketplace listing;
- arbitrary custom nested parameter semantics;
- broad automatic repair of credential renames, node rewrites, trigger rewiring,
  or nested parameter-shape changes.

## Release Procedure

Before publishing this release body:

1. Get owner approval for npm publication, tag push, GitHub Release creation,
   and launch posts.
2. Run `npm ci`.
3. Run `npm run quality`.
4. Run `npm run check:npm-registry-boundary`.
5. Run `npm run check:release-notes`.
6. Publish `@n8nproof/core` first, then `n8n-lint`.
7. Verify a clean-machine registry-backed `npx n8n-lint check workflow.json`
   install.
8. Create the semver tag and GitHub Release only after the exact commit is
   green on public CI.

## Rollback

Prefer a patch release over unpublish. If a published version is unsafe or
misleading, deprecate the affected npm version with a clear replacement path,
open a public issue, update the GitHub Release notes, and re-run
`npm run quality` before shipping the patch.
