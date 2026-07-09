# CI Setup

`n8n-lint` supports CI-friendly output today, but the npm registry package is
not published yet. Until the owner approves npm publication, use source checkout
or packed local tarballs for verification.

## Current Repo Gate

This repository gates every push and pull request with:

```bash
npm ci
npm run quality
```

`npm run quality` currently runs build, ESLint, Prettier format check, example
validation, bundled-schema verification, metadata verification, security
hygiene verification, schema-config verification, type-hygiene verification,
pre-commit hook contract verification, community-readiness verification,
release-readiness verification, live REST boundary verification, launch-content
verification, benchmark-report verification, benchmark-dashboard verification,
batch benchmark output verification, GitHub Action contract verification,
GitHub PR gate proof verification, strategy-checklist verification, GitHub-rendered README
verification, GitHub profile verification, README demo verification, animated-demo verification,
terminal-output demo verification, precommit-rejection demo verification,
matrix-demo verification, matrix GIF verification, social-preview verification,
audit-report verification, status-doc
verification, README/CLI docs-contract verification, package-content
verification, claims hygiene verification, Markdown link verification, fixture
tests, the executable exit-code contract, the production dependency audit, and
the packed-install smoke test.

The public workflow is `.github/workflows/ci.yml`.

## Composite GitHub Action

The repo ships a composite action at `action.yml`. It builds the action runtime
from the checked-out action repository, then runs the CLI with
`--format github`. The action writes a GitHub job summary with the checked
paths, schema source, version selector, a decaying last-verified badge generated
from the same check JSON, and the last 200 lines of CLI output, while
preserving the CLI exit code as the merge gate.

Because the current composite action builds the checked-out action runtime, the
job must provide Node.js `>=18.18.0` and npm before `uses:
sherunscode/n8n-lint`. The examples below use `actions/setup-node`.

For the action's `paths` input, pass one path, directory, or glob per line. The
action intentionally parses newline-delimited values instead of splitting on
shell whitespace, so paths and globs are passed to the CLI as exact arguments.

Until an owner-approved semver tag exists, pin a commit SHA for external use
rather than relying on a moving branch:

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
      - uses: sherunscode/n8n-lint@<commit-sha>
        with:
          paths: |
            workflows/**/*.json
            examples/known-http-request-workflow.json
```

The project CI dogfoods the action against
`examples/known-http-request-workflow.json`, including the summary-writing path.
Marketplace listing and semver tag usage remain release gates.

## GitHub Annotation Output

Use `--format github` when running inside GitHub Actions to emit native
annotations:

```bash
node packages/cli/dist/bin.js check "examples/*.json" --format github
```

Failures are emitted as `::error` annotations, warnings as `::warning`
annotations, and skipped non-workflow JSON files as `::notice` annotations.
The composite action also writes a Markdown job summary for reviewers, including
the same `last verified` badge that can be rendered in a README.
Exit codes remain the same as normal check mode:

| Exit | Meaning                                                              |
| ---: | -------------------------------------------------------------------- |
|  `0` | All checked workflows passed.                                        |
|  `1` | At least one workflow failed validation or an input failed to parse. |
|  `2` | CLI usage error.                                                     |

Do not combine `--json` with `--format github`; those are separate automation
surfaces.

`npm run check:exit-codes` proves the built CLI preserves the `0`/`1`/`2`
contract for success, validation/input failures, and usage failures.

## Future Live REST Secret Handling

The current MVP does not read an n8n API key and does not expose live REST
schema validation. When a future live REST adapter is implemented and verified,
store credentials only as GitHub Actions encrypted secrets:

1. Open the consumer repository on GitHub.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Add `N8N_API_KEY` as a repository secret. Never put the token in workflow
   YAML, README snippets, issue comments, action inputs, or command arguments.
4. Put non-secret configuration such as `N8N_BASE_URL` in repository variables
   only after the endpoint and TLS behavior are verified.

Future workflow shape:

```yaml
name: n8n workflow live schema check

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
      - run: npx n8n-lint check "workflows/**/*.json" --format github
        env:
          N8N_BASE_URL: ${{ vars.N8N_BASE_URL }}
          N8N_API_KEY: ${{ secrets.N8N_API_KEY }}
```

This example is intentionally not part of the current verified install path.
Live REST validation remains blocked until endpoint proof, TLS failure behavior,
and API-key redaction are covered by executable tests. The required threat
model and release gates are documented in `docs/live-rest-threat-model.md`.

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
