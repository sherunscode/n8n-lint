# JSON Output Contract

`n8n-lint check <workflow.json> --json` emits one JSON object to stdout and
uses the process exit code as the CI gate. When `check` receives multiple
inputs, a directory, or a glob, it emits the batch JSON object documented below.
When `--n8n-version=matrix` is used, it emits the matrix JSON object documented
below. `n8n-lint repair <workflow.json> --json` emits the repair JSON object
documented below.

GitHub Actions annotations are a separate output mode: use
`check --format github`, not `--json`, when native PR annotations are desired.
The CLI rejects `--json --format github` because those are separate contracts.

This contract documents the current local MVP. It does not claim npm registry
installation, live REST schema validation, workflow execution, or hosted
service behavior.

## Top-Level Fields

| Field | Type | Description |
|---|---|---|
| `filePath` | `string` | The workflow file path passed to the CLI. |
| `ok` | `boolean` | `true` when no `error` severity issues are present. |
| `checkedAt` | `string` | ISO timestamp for the validation run. |
| `source` | `string` | Schema source used by the run. Current CLI values are `bundled-n8n-package` and `local-placeholder`. |
| `issues` | `array` | Validation issues and warnings. Empty only when no errors or warnings were emitted. |

## Issue Fields

| Field | Type | Description |
|---|---|---|
| `severity` | `"error"` or `"warning"` | Errors fail the run. Warnings are informational. |
| `code` | `string` | Stable issue code for CI filtering. |
| `message` | `string` | Human-readable explanation. Do not parse this as a stable API. |
| `path` | `string` | JSONPath-like location in the workflow document, or `$` for whole-document messages. |

## Exit Codes

| Exit | Meaning |
|---:|---|
| `0` | Workflow passed validation. |
| `1` | Workflow failed validation or the file could not be read/parsed. |
| `2` | CLI usage error, such as an unknown flag or missing command. |

## Example

```bash
node packages/cli/dist/bin.js check examples/failing-dead-parameter.json --json
```

Representative output:

```json
{
  "filePath": "examples/failing-dead-parameter.json",
  "ok": false,
  "checkedAt": "2026-07-08T00:00:00.000Z",
  "source": "bundled-n8n-package",
  "issues": [
    {
      "severity": "error",
      "code": "workflow.node_parameter_unknown",
      "message": "Unknown or dead parameter \"notARealParameter\" for node type \"n8n-nodes-base.httpRequest\".",
      "path": "$.nodes[0].parameters.notARealParameter"
    },
    {
      "severity": "warning",
      "code": "schema_source.warning",
      "message": "Bundled n8n package metadata is loaded from a compact checked-in artifact; this is not live REST validation.",
      "path": "$"
    }
  ]
}
```

`checkedAt` changes on each run. The message text can improve in future minor
versions, but `severity`, `code`, and `path` are the intended fields for
automation.

## Batch JSON

Batch mode runs when `check` receives multiple inputs, a directory, or a glob.
The top-level object adds a summary and per-file results:

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
      "filePath": "examples/known-http-request-workflow.json",
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
      "filePath": "examples/failing-dead-parameter.json",
      "status": "failed",
      "ok": false,
      "issues": [
        {
          "severity": "error",
          "code": "workflow.node_parameter_unknown",
          "message": "Unknown or dead parameter \"notARealParameter\" for node type \"n8n-nodes-base.httpRequest\".",
          "path": "$.nodes[0].parameters.notARealParameter"
        }
      ]
    },
    {
      "filePath": "examples/not-a-workflow.json",
      "status": "skipped",
      "ok": true,
      "reason": "nodes_missing"
    }
  ]
}
```

Batch statuses:

| Status | Meaning |
|---|---|
| `passed` | File is an n8n workflow and has no `error` severity issues. |
| `failed` | File is an n8n workflow and has one or more `error` severity issues. |
| `skipped` | File is valid JSON but is not an n8n workflow object with a top-level `nodes` array. |
| `error` | File could not be read, parsed, or resolved. |

Skipped files do not fail the run. Failed workflows and read/parse/input errors
produce exit code `1`.

## Matrix JSON

Matrix mode runs every pinned bundled schema artifact and reports per-version
results plus compatibility differences:

```json
{
  "ok": false,
  "checkedAt": "2026-07-08T00:00:00.000Z",
  "source": "bundled-n8n-package",
  "versions": [
    {
      "packageVersion": "2.29.6",
      "ok": false,
      "packageInfo": {
        "name": "n8n-nodes-base",
        "version": "2.29.6"
      },
      "summary": {
        "totalFiles": 1,
        "workflows": 1,
        "passed": 0,
        "failed": 1,
        "skipped": 0,
        "errors": 0
      },
      "results": []
    },
    {
      "packageVersion": "2.30.0",
      "ok": true,
      "packageInfo": {
        "name": "n8n-nodes-base",
        "version": "2.30.0"
      },
      "summary": {
        "totalFiles": 1,
        "workflows": 1,
        "passed": 1,
        "failed": 0,
        "skipped": 0,
        "errors": 0
      },
      "results": []
    }
  ],
  "differences": [
    {
      "filePath": "examples/matrix-2-30-parameter-workflow.json",
      "statusByVersion": {
        "2.29.6": "failed",
        "2.30.0": "passed"
      },
      "errorSignaturesByVersion": {
        "2.29.6": [
          "workflow.node_parameter_unknown:$.nodes[0].parameters.clearWarning"
        ],
        "2.30.0": []
      }
    }
  ]
}
```

Matrix `ok` is `true` only when every pinned version passes. `differences`
contains files whose status or error signatures differ across versions.

## Repair JSON

Repair mode emits a conservative change model. It is diff-only by default; the
`applied` field is `true` only when the caller used `--apply --confirm`.

```json
{
  "ok": true,
  "filePath": "examples/failing-dead-parameter.json",
  "applied": false,
  "changes": [
    {
      "code": "remove_unknown_parameter",
      "path": "$.nodes[0].parameters.notARealParameter",
      "message": "Remove unknown top-level parameter \"notARealParameter\"."
    }
  ],
  "remainingIssues": []
}
```

Current repair codes:

| Code | Meaning |
|---|---|
| `remove_unknown_parameter` | Remove a top-level node parameter that the selected bundled schema artifact does not recognize for that node type. |

Repair exits `0` only when the repaired workflow validates with no remaining
errors. It exits `1` when no repairable changes exist for a failing workflow or
when remaining validation errors persist. It exits `2` for usage errors such as
`--apply` without `--confirm`.
