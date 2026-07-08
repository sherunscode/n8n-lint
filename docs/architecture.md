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
2. The selected schema source loads a schema snapshot.
3. The core validator checks structure, node type names, credential type names,
   top-level node parameter names, and trigger graph/type-version shape.
4. The CLI prints human or JSON output.
5. Optional badge generation consumes real `check --json` output and renders
   markdown, JSON, or static SVG.
6. The process exit code becomes the CI/pre-commit gate.

## Schema Sources

| Source | Status | Purpose |
|---|---|---|
| `bundled-n8n-package` | Current default | Uses compact metadata generated from `n8n-nodes-base@2.29.6`. |
| `local-placeholder` | Test/adapter path | Structure-only validation with an explicit warning. |
| `live-rest` | Research lane | Exists as a non-claiming placeholder until endpoint proof exists. |

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

## Future Boundaries

Multi-version schema matrices and human-gated repair are V1+ work. They should
build on the same core validator and batch summary shape instead of creating
separate validation logic.
