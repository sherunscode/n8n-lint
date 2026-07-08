# Batch Check Design Notes

This is the V1.1 design note for future batch-check mode. It is not implemented
in the current local MVP.

## Goal

Make `n8n-lint` useful for repositories that contain many workflow JSON files
without adding a hosted service, dashboard, marketplace, or registry.

## Inputs

Future batch mode should accept:

- Explicit file paths.
- Directory paths, scanned recursively for `.json` files.
- Glob patterns, resolved by the CLI in a deterministic order.

The command should preserve single-file behavior for `check <workflow.json>`.
Batch mode can be a separate command or an explicit flag, but it must not make
single-file checks slower or noisier.

## File Classification

Each `.json` file should become one of:

| Status | Meaning |
|---|---|
| `passed` | File is an n8n workflow and has no `error` severity issues. |
| `failed` | File is an n8n workflow and has one or more `error` severity issues. |
| `skipped` | File is JSON but is not an n8n workflow object with a top-level `nodes` array. |
| `error` | File could not be read or parsed. |

Skipped files should be counted and reported, not treated as validation
failures by default. Parse/read errors should fail the run.

## Human Output

Human output should be quiet enough for CI logs:

```text
PASS workflows/passing.json
FAIL workflows/dead-parameter.json
  ERROR workflow.node_parameter_unknown $.nodes[0].parameters.oldName
SKIP package.json

Summary: 1 passed, 1 failed, 1 skipped, 0 errors
```

The final summary line must always be printed last.

## JSON Output

Batch JSON should keep the single-file issue object intact and add a summary:

```json
{
  "ok": false,
  "checkedAt": "2026-07-08T00:00:00.000Z",
  "source": "bundled-n8n-package",
  "summary": {
    "totalFiles": 3,
    "workflows": 2,
    "passed": 1,
    "failed": 1,
    "skipped": 1,
    "errors": 0
  },
  "results": [
    {
      "filePath": "workflows/passing.json",
      "status": "passed",
      "ok": true,
      "issues": []
    },
    {
      "filePath": "workflows/dead-parameter.json",
      "status": "failed",
      "ok": false,
      "issues": []
    },
    {
      "filePath": "package.json",
      "status": "skipped",
      "reason": "nodes_missing"
    }
  ]
}
```

## Exit Codes

| Exit | Meaning |
|---:|---|
| `0` | All discovered workflows passed; skipped files are allowed. |
| `1` | One or more workflows failed validation, or one or more files had read/parse errors. |
| `2` | CLI usage or configuration error. |

## Non-Goals

- Do not implement badge generation as part of batch mode.
- Do not mutate workflow files.
- Do not call live n8n REST endpoints unless the live adapter has separate,
  owner-approved proof.
- Do not send telemetry or upload workflow contents.
