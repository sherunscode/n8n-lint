# Schema Matrix

`n8n-lint` can validate against more than one pinned bundled n8n schema
artifact without calling a live n8n instance.

## Pinned Artifacts

| n8n version selector | Reference package | Schema artifact |
|---|---|---|
| `2.29.6` | `n8n@2.29.7` -> `n8n-nodes-base@2.29.6` | `packages/core/schema/bundled-n8n-package.json` |
| `2.30.0` | `n8n@2.30.0` -> `n8n-nodes-base@2.30.0` | `packages/core/schema/bundled-n8n-package-2.30.0.json` |

The artifacts are compact metadata snapshots. They store node type names,
credential type names, top-level node parameter names, and trigger node type
names. They do not bundle n8n runtime code, workflow contents, credentials, or
API responses.

## Commands

Check one pinned version:

```bash
n8n-lint check workflow.json --n8n-version=2.30.0
```

Run the matrix:

```bash
n8n-lint check workflow.json --n8n-version=matrix
```

JSON output:

```bash
n8n-lint check workflow.json --n8n-version=matrix --json
```

## Difference Proof

`examples/matrix-2-30-parameter-workflow.json` uses
`n8n-nodes-base.dataTable` parameter `clearWarning`.

That parameter is absent from `n8n-nodes-base@2.29.6` and present in
`n8n-nodes-base@2.30.0`, so the fixture proves that matrix mode reports a real
compatibility difference:

```text
MATRIX n8n-nodes-base@2.29.6: FAIL
MATRIX n8n-nodes-base@2.30.0: PASS
DIFF examples/matrix-2-30-parameter-workflow.json: 2.29.6=failed, 2.30.0=passed
```

## Regeneration

Regenerate all pinned artifacts:

```bash
npm run generate:bundled-schema
```

Regenerate one pinned artifact:

```bash
node scripts/generate-bundled-schema.mjs --package-version=2.30.0
```

Adding or upgrading schema artifacts must be a reviewed change that includes:

- the generated compact artifact,
- updated selection metadata,
- fixture proof for any claimed compatibility difference,
- `npm run check:bundled-schema`, and
- `npm run quality`.
