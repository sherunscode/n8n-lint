# n8n-lint Schema Source Decision

Date: 2026-07-07

## Decision

Use a bundled-package schema source as the primary Week 1 fallback while keeping
the live REST source behind an explicit probe interface.

The public n8n API/docs are useful for workflow CRUD and credential-schema
lookups, but they do not provide enough confirmed public REST coverage for full
node parameter metadata, renamed parameters, trigger-shape drift, and credential
type compatibility. The CLI must not claim live schema validation until endpoint
coverage is proven by a running n8n instance and reproducible command output.

## Evidence

- Official n8n API docs: https://docs.n8n.io/connect/n8n-api/
- Official n8n node docs list a "Get credential schema" operation and workflow
  operations through the n8n node, but not a public full node-parameter schema
  endpoint: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.n8n/
- npm package availability:
  - `npm view n8n version dist-tags --json` -> latest/stable `2.29.7`, next/rc `2.30.0`
  - `npm view n8n@2.29.7 dependencies.n8n-nodes-base dependencies.n8n-workflow --json` -> `n8n-nodes-base@2.29.6`, `n8n-workflow@2.29.2`
  - `npm view n8n-nodes-base@2.29.6 dependencies.n8n-workflow version --json` -> version `2.29.6`, `n8n-workflow@2.29.2`
  - `npm view n8n-nodes-base version dist-tags --json` still reports `latest` `2.15.1` while `stable` is `2.28.4`, so the package pin follows the current `n8n` dependency set instead of the ambiguous `n8n-nodes-base` dist-tags.
- Local Docker status:
  - `docker --version` -> Docker version `29.6.1`
  - `docker ps` -> blocked because Docker Desktop Linux engine is not running
- Current CLI verification:
  - `npm run build` -> PASS
  - `npm run check:example` -> PASS with `Schema source: local-placeholder` and the live-validation-not-implemented warning
  - `node.exe packages/cli/dist/bin.js check examples/failing-missing-nodes.json` -> expected failure with exit code `1`
- Bundled metadata verification:
  - Runtime source: `bundled-n8n-package`
  - Package: `n8n-nodes-base@2.29.6`, pinned exactly in `packages/core/package.json`
  - Transitive workflow package: `n8n-workflow@2.29.2`
  - Metadata files: `n8n-nodes-base/dist/types/nodes.json` and `n8n-nodes-base/dist/types/credentials.json`
  - `npm run check:bundled-schema` -> PASS; fixture resolves `n8n-nodes-base.httpRequest` and `httpHeaderAuth`

## Implementation Implication

ERL-31 added a bundled schema loader that read metadata from n8n's own published
packages into a stable internal shape:

- package identity and metadata-file paths
- sorted node metadata
- sorted credential metadata
- compatibility arrays for node type and credential type names

ERL-32 replaced runtime package loading with a compact checked-in schema
artifact at `packages/core/schema/bundled-n8n-package.json`. The artifact stores
only node type and credential type names generated from
`n8n-nodes-base@2.29.6`; it does not ship the full n8n runtime dependency tree.

The CLI default is now `bundled-n8n-package`. It enforces:

- unknown node type detection
- unknown credential type detection
- truthful schema-source output in human and JSON modes

`scripts/check-bundled-schema.mjs`, `scripts/check-core-validation.mjs`, and
`scripts/check-cli-fixtures.mjs` prove the artifact and CLI behavior against
positive and negative fixtures. The live REST source remains a separate adapter
and must stay labeled unproven until a local or owner-approved n8n instance
confirms endpoint behavior.

## Blockers

- Docker daemon is not running locally, so this pass did not run a live n8n
  container.
- No owner-provided live n8n API key was used or required.
- Full `npm audit` still reports dev-only findings through the pinned
  `n8n-nodes-base` generator input.
- `npm audit --omit=dev --audit-level=high` reports `found 0 vulnerabilities`
  for shipping dependencies after ERL-32.
