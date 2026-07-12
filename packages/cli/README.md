# n8n-lint

Validate n8n workflow JSON before it reaches production.

Current repository state: this package is not published to npm yet. Use the
repository source checkout or the packed local tarball smoke path in the root
README until the owner-approved npm release and clean-machine registry proof
are complete.

```bash
n8n-lint check workflow.json
n8n-lint check workflow.json --format github
n8n-lint check workflows/ "examples/*.json"
n8n-lint check workflow.json --n8n-version=matrix
n8n-lint repair workflow.json --output fix.patch
n8n-lint badge n8n-lint-result.json --format svg --output badge.svg
n8n-lint badge n8n-lint-result.json --kind last-verified
```

Current verified behavior uses the bundled `n8n-nodes-base@2.29.6` compact
schema artifact. The CLI checks workflow JSON structure, node type names,
credential type names, top-level node parameter names, structured nested
collection/fixedCollection/filter parameter keys, and trigger graph/type-version
shape. It also supports GitHub Actions annotations, action job summaries, batch
checks for multiple files, directories, simple globs, a pinned two-version
schema matrix, local pass/fail badge output, and decaying last-verified badge
output from real `check --json` results. Repair mode is diff-only by default
and currently removes only schema-proven unknown top-level parameters; applying
a repair requires both `--apply` and `--confirm`. It does not execute workflows
and does not claim live REST validation.

See the repository README for full setup, packed-install smoke tests, benchmark
methodology, and release boundaries.

The repository also includes a packaged Node 24 GitHub Action at the repo root.
Consumer jobs do not install or compile this workspace. The Action is
dogfooded across Linux, Windows, and macOS, while semver tag usage and
Marketplace listing remain release-gated.
