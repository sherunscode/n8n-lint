# Architecture

`n8n-lint` is a single-purpose TypeScript CLI plus a small core validation
library. The current local MVP is intentionally stateless and file-based.

## Packages

| Package | Role |
|---|---|
| `@n8nproof/core` | Loads schema snapshots and validates workflow JSON. |
| `n8n-lint` | CLI wrapper around the core validator. |

The root package is private and exists only to coordinate workspace scripts,
tests, and packaging.

## Runtime Flow

1. The CLI reads one workflow JSON file, or resolves a batch of files from
   explicit paths, directories, and simple globs.
2. The selected schema source loads one schema snapshot, or matrix mode loads
   all pinned bundled snapshots.
3. The core validator checks structure, node type names, credential type names,
   top-level node parameter names, and trigger graph/type-version shape.
4. The CLI prints human or JSON output.
5. Optional badge generation consumes real `check --json` output and renders
   markdown, JSON, or static SVG.
6. Optional repair mode uses validator issues to emit a patch for safe,
   schema-proven fixes. It does not mutate files unless `--apply --confirm` is
   passed.
7. The process exit code becomes the CI/pre-commit gate.

## Schema Sources

| Source | Status | Purpose |
|---|---|---|
| `bundled-n8n-package` | Current default | Uses compact metadata generated from pinned `n8n-nodes-base` packages. |
| `local-placeholder` | Test/adapter path | Structure-only validation with an explicit warning. |
| `live-rest` | Research lane | Exists as a non-claiming placeholder until endpoint proof exists. |

Pinned bundled artifacts:

| Selector | Package | Artifact |
|---|---|---|
| `2.29.6` | `n8n-nodes-base@2.29.6` | `packages/core/schema/bundled-n8n-package.json` |
| `2.30.0` | `n8n-nodes-base@2.30.0` | `packages/core/schema/bundled-n8n-package-2.30.0.json` |

The bundled artifact stores compact metadata only:

- node type names
- credential type names
- top-level node parameter names
- trigger node type names

It does not bundle n8n runtime code, integration clients, workflow contents,
credentials, or API responses.

## Why Bundled Metadata First

The original product risk was whether a live n8n REST endpoint exposes enough
node schema detail for reliable CI validation. That remains a research lane.
The MVP therefore uses n8n's own published package metadata as the fallback
source rather than inventing a hand-maintained schema file.

This keeps the product honest:

- No live REST claim without endpoint proof.
- No workflow execution claim.
- No hosted service or telemetry.
- No user credentials needed for the current local MVP.

## Output Contracts

- Human output is optimized for terminal and CI logs.
- JSON output is documented in `docs/json-output.md`.
- Exit codes are documented there as the automation contract.

## Repair Boundary

Human-gated repair builds on the same core validator instead of creating
separate detection logic. The current repair transform removes only
schema-proven unknown top-level node parameters. It does not rename credentials,
rewrite node types, rewire triggers, infer nested parameter shapes, use live
REST schema data, or call model APIs.
