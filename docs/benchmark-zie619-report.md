# Zie619 n8n-workflows Benchmark Report

Generated: 2026-07-08T02:57:15.066Z

## Summary

| Field | Value |
|---|---:|
| Source repository | Zie619/n8n-workflows |
| Source commit | `94007c1445d9258a7da116646b79473e7c7c3282` |
| Source ref | `main` |
| Source dirty | false |
| JSON files discovered | 2077 |
| Input workflows | 2066 |
| Passed | 1703 |
| Failed | 363 |
| Skipped non-workflow JSON | 11 |
| Runtime | 295028.65 ms |

## Reproduce

```powershell
git clone --depth 1 https://github.com/Zie619/n8n-workflows.git C:/dev/_benchmarks/Zie619-n8n-workflows
git -C C:/dev/_benchmarks/Zie619-n8n-workflows checkout 94007c1445d9258a7da116646b79473e7c7c3282
npm ci
npm run build
npm run benchmark:zie619 -- C:\dev\_benchmarks\Zie619-n8n-workflows docs/benchmark-zie619-report.json
```

Report files:

- Markdown summary: `docs/benchmark-zie619-report.md`
- Raw JSON results: `docs/benchmark-zie619-report.json`

## Methodology

Discovers JSON files under workflowRoot, skips JSON that is not an n8n workflow object with a top-level nodes array, then runs n8n-lint check --json against each selected workflow using the bundled-n8n-package schema source. This benchmark does not execute workflows and does not use live n8n REST validation.

The current n8n-lint validator checks workflow JSON structure, bundled n8n node type names, and bundled credential type names. It does not execute workflows or claim live REST schema validation.

## Failure Categories

Failure categories are non-exclusive: one workflow can contribute to multiple categories.

| Code | Workflows | Issue occurrences |
|---|---:|---:|
| `workflow.credential_type_unknown` | 277 | 666 |
| `workflow.node_type_unknown` | 129 | 377 |

## Skipped JSON Categories

| Reason | Files |
|---|---:|
| `nodes_not_array` | 6 |
| `json_not_object` | 5 |
