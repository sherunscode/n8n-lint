# Pre-Commit Hook

The local hook runs the same deterministic quality gate used by CI.

```bash
git config core.hooksPath .githooks
```

After that, every commit runs:

```bash
npm run quality
```

The hook is intentionally local. Do not bypass it for changes that touch CLI
behavior, fixtures, schema artifact generation, or package metadata.

## pre-commit Framework Example

`examples/pre-commit-setup/.pre-commit-config.yaml` shows a source-checkout
example for the Python `pre-commit` framework. It uses the built local CLI and
does not claim npm registry installation.

After npm publication, consumer repositories can replace the local entry with a
registry-backed `npx n8n-lint check ...` command only after that install path has
been proven from a clean machine.
