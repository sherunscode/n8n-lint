# Zie619 n8n-workflows Benchmark Report

Generated: 2026-07-08T07:34:51.126Z

## Summary

| Field | Value |
|---|---:|
| Source repository | Zie619/n8n-workflows |
| Source commit | `94007c1445d9258a7da116646b79473e7c7c3282` |
| Source ref | `main` |
| Source dirty | false |
| n8n-lint commit | `de5675d758997ce917cb9eef48adee30577b48d0` |
| n8n-lint ref | `main` |
| n8n-lint dirty | false |
| JSON files discovered | 2077 |
| Input workflows | 2066 |
| Passed | 762 |
| Failed | 1304 |
| Skipped non-workflow JSON | 11 |
| Runtime | 199136.53 ms |

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
- Dashboard SVG: `docs/assets/benchmark-dashboard.svg`

![Generated n8n-lint Zie619 benchmark dashboard](assets/benchmark-dashboard.svg)

## Methodology

Discovers JSON files under workflowRoot, skips JSON that is not an n8n workflow object with a top-level nodes array, then runs n8n-lint check --json against each selected workflow using the bundled-n8n-package schema source. It validates workflow structure, bundled node and credential type names, top-level node parameter names, structured nested collection/fixedCollection parameter keys, and trigger graph/type-version shape. This benchmark does not execute workflows and does not use live n8n REST validation.

The current n8n-lint validator checks workflow JSON structure, bundled n8n node type names, bundled credential type names, top-level node parameter names, structured nested collection/fixedCollection parameter keys, and trigger graph/type-version shape. It does not execute workflows or claim live REST schema validation.

## Failure Categories

Failure categories are non-exclusive: one workflow can contribute to multiple categories.

| Code | Workflows | Issue occurrences |
|---|---:|---:|
| `workflow.node_parameter_unknown` | 1088 | 2218 |
| `workflow.credential_type_unknown` | 277 | 666 |
| `workflow.node_type_unknown` | 129 | 377 |
| `workflow.node_parameter_nested_unknown` | 5 | 14 |

## Skipped JSON Categories

| Reason | Files |
|---|---:|
| `nodes_not_array` | 6 |
| `json_not_object` | 5 |
