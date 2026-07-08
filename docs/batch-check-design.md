# Batch Check

Batch mode is implemented in the CLI. It runs when `check` receives multiple
inputs, a directory, or a glob. Single-file `check <workflow.json>` behavior is
preserved.

## Goal

Make `n8n-lint` useful for repositories that contain many workflow JSON files
without adding a hosted service, dashboard, marketplace, or registry.

## Inputs

Batch mode accepts:

- Explicit file paths.
- Directory paths, scanned recursively for `.json` files.
- Glob patterns, resolved by the CLI in a deterministic order.

The command preserves single-file behavior for `check <workflow.json>`.

Examples:

```bash
n8n-lint check workflows/
n8n-lint check "workflows/**/*.json"
n8n-lint check workflows/a.json workflows/b.json package.json
```

## File Classification

Each `.json` file becomes one of:

| Status    | Meaning                                                                        |
| --------- | ------------------------------------------------------------------------------ |
| `passed`  | File is an n8n workflow and has no `error` severity issues.                    |
| `failed`  | File is an n8n workflow and has one or more `error` severity issues.           |
| `skipped` | File is JSON but is not an n8n workflow object with a top-level `nodes` array. |
| `error`   | File could not be read or parsed.                                              |

Skipped files are counted and reported, not treated as validation failures by
default. Parse/read/input errors fail the run.

## Human Output

Human output is quiet enough for CI logs:

```text
PASS workflows/passing.json
FAIL workflows/dead-parameter.json
  ERROR workflow.node_parameter_unknown $.nodes[0].parameters.oldName
SKIP package.json

Summary: 1 passed, 1 failed, 2 warnings, 1 skipped, 0 errors
```

The final summary line must always be printed last. The warning count is the
total number of warning-severity issues across checked workflow files.

## JSON Output

Batch JSON keeps the per-file issue objects intact and adds `summary` as the
final top-level field:

```json
{
  "ok": false,
  "checkedAt": "2026-07-08T00:00:00.000Z",
  "source": "bundled-n8n-package",
  "results": [
    {
      "filePath": "workflows/passing.json",
      "status": "passed",
      "ok": true,
      "issues": [
        {
          "severity": "warning",
          "code": "schema_source.warning",
          "message": "Bundled n8n package metadata is loaded from a compact checked-in artifact; this is not live REST validation.",
          "path": "$"
        }
      ]
    },
    {
      "filePath": "workflows/dead-parameter.json",
      "status": "failed",
      "ok": false,
      "issues": [
        {
          "severity": "error",
          "code": "workflow.node_parameter_unknown",
          "message": "Unknown or dead parameter \"oldName\" for node type \"n8n-nodes-base.httpRequest\".",
          "path": "$.nodes[0].parameters.oldName"
        },
        {
          "severity": "warning",
          "code": "schema_source.warning",
          "message": "Bundled n8n package metadata is loaded from a compact checked-in artifact; this is not live REST validation.",
          "path": "$"
        }
      ]
    },
    {
      "filePath": "package.json",
      "status": "skipped",
      "reason": "nodes_missing"
    }
  ],
  "summary": {
    "totalFiles": 3,
    "workflows": 2,
    "passed": 1,
    "failed": 1,
    "warnings": 2,
    "skipped": 1,
    "errors": 0
  }
}
```

## Exit Codes

| Exit | Meaning                                                                              |
| ---: | ------------------------------------------------------------------------------------ |
|  `0` | All discovered workflows passed; skipped files are allowed.                          |
|  `1` | One or more workflows failed validation, or one or more files had read/parse errors. |
|  `2` | CLI usage or configuration error.                                                    |

## Non-Goals

- Do not mutate workflow files.
- Do not call live n8n REST endpoints unless the live adapter has separate,
  owner-approved proof.
- Do not send telemetry or upload workflow contents.

## Verified Gates

- `npm run test:cli` covers mixed explicit inputs, JSON summary output, and glob
  skip behavior.
- `npm run check:cli-output` proves warning counts and final summary ordering
  for human and JSON output.
- `npm run quality` runs the batch fixture checks through the normal CI gate.
