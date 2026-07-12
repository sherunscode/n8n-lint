# Architecture

`n8n-lint` is a single-purpose TypeScript CLI plus a small core validation
library. The current local MVP is intentionally stateless and file-based.

The generated README diagram lives at `docs/assets/architecture.svg`. It is
rendered from `package.json`, `tool.json`, and
`packages/core/schema/bundled-n8n-package-config.json`, then checked by
`npm run check:architecture-diagram`.

## Packages

| Package                  | Role                                                      |
| ------------------------ | --------------------------------------------------------- |
| `@n8nproof/core`         | Loads schema snapshots and validates workflow JSON.       |
| `n8n-lint`               | CLI, argument, discovery, output, badge, and repair.      |
| `@n8nproof/action-build` | Build-only source for the packaged Node 24 GitHub Action. |

The root package is private and exists only to coordinate workspace scripts,
tests, and packaging.

## Runtime Flow

1. The CLI classifies each input as explicit or discovered, then resolves files
   from explicit paths, directories, and simple globs. Explicit malformed or
   non-workflow JSON fails; discovered ordinary JSON may be skipped.
2. Recursive discovery excludes `.git`, `node_modules`, `dist`, `coverage`,
   and common build/cache directories. An explicitly named file is never
   excluded by that traversal policy.
3. The selected schema source loads one schema snapshot, or matrix mode loads
   all pinned bundled snapshots.
4. The core validator checks structure, node type names, credential type names,
   top-level node parameter names, structured nested collection/fixedCollection/filter
   parameter keys, and trigger graph/type-version shape.
5. The CLI validates files with bounded concurrency, sorts results
   deterministically, and prints human, JSON, or GitHub output.
6. Optional badge generation consumes real `check --json` output and renders
   markdown, JSON, or static SVG.
7. Optional repair mode uses validator issues to emit a patch for safe,
   schema-proven fixes. It does not mutate files unless `--apply --confirm` is
   passed.
8. The process exit code becomes the CI/pre-commit gate.

## Schema Sources

| Source                | Status            | Purpose                                                                |
| --------------------- | ----------------- | ---------------------------------------------------------------------- |
| `bundled-n8n-package` | Current default   | Uses compact metadata generated from pinned `n8n-nodes-base` packages. |
| `local-placeholder`   | Test/adapter path | Structure-only validation with an explicit warning.                    |
| `live-rest`           | Research lane     | Exists as a non-claiming placeholder until endpoint proof exists.      |

Pinned bundled artifacts:

| Selector | Package                 | Artifact                                               |
| -------- | ----------------------- | ------------------------------------------------------ |
| `2.29.6` | `n8n-nodes-base@2.29.6` | `packages/core/schema/bundled-n8n-package.json`        |
| `2.30.0` | `n8n-nodes-base@2.30.0` | `packages/core/schema/bundled-n8n-package-2.30.0.json` |

Pinned package selections are centralized in
`packages/core/schema/bundled-n8n-package-config.json`. Both the runtime source
and `scripts/generate-bundled-schema.mjs` read from that config, and
`npm run check:schema-config` fails if the selected versions, artifact metadata,
or isolated generator contract drift. The generator downloads the pinned npm
tarball into a temporary directory and extracts metadata without installing or
executing the upstream package; `n8n-nodes-base` is not a root dependency.

The bundled artifact stores compact metadata only:

- node type names
- credential type names
- top-level node parameter names
- structured nested collection/fixedCollection/filter parameter paths
- trigger node type names

It does not bundle n8n runtime code, integration clients, workflow contents,
credentials, or API responses.

The generated schema artifacts are derived from `n8n-nodes-base` and retain
the upstream Sustainable Use License boundary documented in
`THIRD_PARTY_NOTICES.md` and `packages/core/LICENSE_N8N_SUSTAINABLE_USE.md`.
The repository's original code is MIT licensed; npm publication remains blocked
until written licensing confirmation is recorded.

## Packaged Action

`packages/action/src/index.ts` is bundled into the committed `action-dist/`
runtime. The consumer action uses `runs.using: node24`, contains the built CLI,
core runtime, schema artifacts, and third-party notices, and performs one
validation pass. CI rebuilds the Action and fails if its manifest or files are
stale. Consumer workflows do not install this workspace or compile source.

## Why Bundled Metadata First

The original product risk was whether a live n8n REST endpoint exposes enough
node schema detail for reliable CI validation. That remains a research lane.
The MVP therefore uses n8n's own published package metadata as the fallback
source rather than inventing a hand-maintained schema file.

This keeps the product honest:

- No live REST claim without endpoint proof.
- No live REST implementation without the threat-model gates in
  `docs/live-rest-threat-model.md`.
- No workflow execution claim.
- No hosted service or telemetry.
- No user credentials needed for the current local MVP.

## Output Contracts

- Human output is optimized for terminal and CI logs.
- JSON output is documented in `docs/json-output.md`.
- GitHub Actions annotation output is available with `check --format github`;
  it emits workflow commands for native PR annotations without changing exit
  codes.
- Exit codes are documented there as the automation contract.

## Agent Metadata

`tool.json` is a machine-readable summary of the current CLI commands,
capabilities, exit codes, verified claims, and non-claims. It is metadata for
agents, registries, and future tool discovery. It is not an MCP server and does
not add a hosted runtime surface.

## Repair Boundary

Human-gated repair builds on the same core validator instead of creating
separate detection logic. The current repair transform removes only
schema-proven unknown top-level node parameters. It does not rename credentials,
rewrite node types, rewire triggers, mutate nested parameter shapes, use live
REST schema data, or call model APIs.
