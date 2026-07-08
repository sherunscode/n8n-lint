# CI Setup

`n8n-lint` supports CI-friendly output today, but the npm registry package is
not published yet. Until the owner approves npm publication, use source checkout
or packed local tarballs for verification.

## Current Repo Gate

This repository gates every push and pull request with:

```bash
npm ci
npm run build
npm run check:example
npm run check:bundled-schema
npm test
npm run audit:prod
```

The public workflow is `.github/workflows/ci.yml`.

## GitHub Annotation Output

Use `--format github` when running inside GitHub Actions to emit native
annotations:

```bash
node packages/cli/dist/bin.js check "examples/*.json" --format github
```

Failures are emitted as `::error` annotations, warnings as `::warning`
annotations, and skipped non-workflow JSON files as `::notice` annotations.
Exit codes remain the same as normal check mode:

| Exit | Meaning |
|---:|---|
| `0` | All checked workflows passed. |
| `1` | At least one workflow failed validation or an input failed to parse. |
| `2` | CLI usage error. |

Do not combine `--json` with `--format github`; those are separate automation
surfaces.

## Consumer Workflow After npm Publish

After owner-approved npm publication and clean-machine registry proof, consumer
repositories can use a workflow shaped like this:

```yaml
name: n8n workflow check

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  n8n-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7.0.0
      - uses: actions/setup-node@v6.4.0
        with:
          node-version: 22
      - run: npx n8n-lint check "workflows/**/*.json" --format github
```

Do not publish this as a guaranteed install path until the package is actually
available from the npm registry.

## Current Source-Checkout Pattern

For this repository, source checkout remains the verified path:

```yaml
name: n8n workflow check

on:
  pull_request:

jobs:
  n8n-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7.0.0
      - uses: actions/setup-node@v6.4.0
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: node packages/cli/dist/bin.js check "examples/*.json" --format github
```
