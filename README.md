# n8n-lint

[![CI](https://github.com/sherunscode/n8n-lint/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/sherunscode/n8n-lint/actions/workflows/ci.yml)

Validate n8n workflow JSON before it reaches production.

`n8n-lint` is the first n8nproof tool from She Runs Code. It exists because
production n8n workflows can fail from stale node names, renamed credential
types, and schema drift that static template collections do not catch.

This repository is still a local MVP. It is not published to npm yet and does
not claim live REST schema validation yet. Today the verified paths are a source
checkout, a packed local tarball install, and a reproducible local benchmark
report against `Zie619/n8n-workflows`; registry-backed `npx n8n-lint` usage
will only be documented after npm publication.

## What Works Now

- `check <workflow.json>` CLI command.
- Workflow structure validation.
- Compact bundled schema artifact generated from `n8n-nodes-base@2.29.6`, the
  package selected by the current `n8n@2.29.7` dependency set.
- Unknown node type detection.
- Unknown credential type detection.
- JSON output mode for CI tooling.
- Local quality gates for build, fixtures, tests, and production dependency
  audit.
- Packed-package install smoke test for the publishable core and CLI workspaces.
- Reproducible `Zie619/n8n-workflows` benchmark report with exact pass/fail and
  skipped-file counts.

## Quickstart

From a fresh checkout:

```bash
npm ci
npm run build
node packages/cli/dist/bin.js check examples/known-http-request-workflow.json
```

Expected result:

```text
PASS examples/known-http-request-workflow.json
Schema source: bundled-n8n-package
WARN schema_source.warning: Bundled n8n package metadata is loaded from a compact checked-in artifact; this is not live REST validation.
```

## CLI

```bash
n8n-lint check <workflow.json> [--source bundled-n8n-package|local-placeholder] [--json]
```

| Option | Default | Description |
|---|---:|---|
| `--source bundled-n8n-package` | yes | Uses the checked-in compact schema artifact. |
| `--source local-placeholder` | no | Structure-only validation for adapter testing. |
| `--json` | no | Emits a stable JSON result object and exits non-zero on validation errors. |

Local development currently runs the built CLI directly:

```bash
node packages/cli/dist/bin.js check examples/failing-unknown-node.json
node packages/cli/dist/bin.js check examples/failing-unknown-credential.json --json
```

Before publish, test the install shape from packed local packages:

```bash
PACK_DIR="$(mktemp -d)"
npm run build
npm pack --workspace packages/core --pack-destination "$PACK_DIR"
npm pack --workspace packages/cli --pack-destination "$PACK_DIR"

SMOKE_DIR="$(mktemp -d)"
cp examples/known-http-request-workflow.json "$SMOKE_DIR/workflow.json"
cd "$SMOKE_DIR"
npm init -y
npm install "$PACK_DIR"/n8nproof-core-0.0.0.tgz "$PACK_DIR"/n8n-lint-0.0.0.tgz
npx n8n-lint check workflow.json
```

Expected result:

```text
PASS workflow.json
Schema source: bundled-n8n-package
WARN schema_source.warning: Bundled n8n package metadata is loaded from a compact checked-in artifact; this is not live REST validation.
```

## Developer Checks

```bash
npm run build
npm run check:example
npm run check:bundled-schema
npm test
npm run audit:prod
```

Run everything:

```bash
npm run quality
```

`npm run audit:prod` uses `npm audit --omit=dev --audit-level=high` so the
shipping dependency gate stays clean. The pinned `n8n-nodes-base` package is a
dev-time generator input only; it is not a runtime dependency of the core or CLI
packages.

## Release Gate

The publishable workspaces are `@n8nproof/core` and `n8n-lint`. The CLI depends
on the core package at the same exact version, so publish `@n8nproof/core`
first and `n8n-lint` second after owner approval.

See `docs/release-checklist.md` for versioning, npm auth, provenance, tag,
GitHub release, fresh-install smoke, and rollback steps. Actual npm publish,
GitHub tag push, and GitHub release creation remain owner-gated.

## Schema Artifact

Refresh the compact schema artifact only when intentionally changing the pinned
n8n package version:

```bash
npm run generate:bundled-schema
```

The generated file is `packages/core/schema/bundled-n8n-package.json`. It
stores node and credential type names only. It does not bundle n8n runtime code,
integration clients, credentials, or workflow data.

## Pre-Commit

```bash
git config core.hooksPath .githooks
```

See `docs/pre-commit.md`.

## Benchmark Report

The real `Zie619/n8n-workflows` benchmark report is checked in at
`docs/benchmark-zie619-report.md`, with raw per-workflow results in
`docs/benchmark-zie619-report.json`.

Current report, generated from `Zie619/n8n-workflows` commit
`94007c1445d9258a7da116646b79473e7c7c3282`:

- JSON files discovered: 2,077.
- Input workflows checked: 2,066.
- Passed: 1,703.
- Failed: 363.
- Skipped non-workflow JSON files: 11.

The benchmark uses the bundled `n8n-nodes-base@2.29.6` schema artifact. It does
not execute workflows and does not claim live REST validation.

```bash
npm run benchmark:zie619 -- <path-to-Zie619-n8n-workflows> docs/benchmark-zie619-report.json
```

Do not publish benchmark claims unless they match the generated report and
reproducible command output exactly.

## Scope Boundaries

MVP scope:

- CLI check command.
- Pre-commit hook.
- GitHub Action quality gate.
- Fixture-backed validation behavior.
- Honest docs and benchmark harness.

Not MVP scope:

- MCP server.
- Hosted SaaS or dashboard.
- Marketplace.
- npm publish without owner approval and clean-machine verification.
- Registry-backed `npx n8n-lint` instructions before npm publication.
- Live REST schema validation without endpoint proof from a running n8n
  instance.
