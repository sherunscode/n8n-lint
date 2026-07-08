# n8n-lint

Validate n8n workflow JSON before it reaches production.

```bash
n8n-lint check workflow.json
n8n-lint check workflows/ "examples/*.json"
n8n-lint check workflow.json --n8n-version=matrix
n8n-lint badge n8n-lint-result.json --format svg --output badge.svg
```

Current verified behavior uses the bundled `n8n-nodes-base@2.29.6` compact
schema artifact. The CLI checks workflow JSON structure, node type names,
credential type names, top-level node parameter names, and trigger
graph/type-version shape. It also supports batch checks for multiple files,
directories, simple globs, a pinned two-version schema matrix, and local badge
output from real `check --json` results. It does not execute workflows and does
not claim live REST validation.

See the repository README for full setup, packed-install smoke tests, benchmark
methodology, and release boundaries.
