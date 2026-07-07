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
