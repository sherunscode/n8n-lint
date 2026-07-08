# JSON Output Contract

`n8n-lint check <workflow.json> --json` emits one JSON object to stdout and
uses the process exit code as the CI gate.

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
