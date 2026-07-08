# n8n-lint

Validate n8n workflow JSON before it reaches production.

```bash
n8n-lint check workflow.json
```

Current verified behavior uses the bundled `n8n-nodes-base@2.29.6` compact
schema artifact. The CLI checks workflow JSON structure, node type names, and
credential type names. It does not execute workflows and does not claim live
REST validation.

See the repository README for full setup, packed-install smoke tests, benchmark
methodology, and release boundaries.
