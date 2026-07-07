# Contributing

`n8n-lint` is still a local MVP. Contributions should keep the scope narrow:
CLI validation, fixtures, tests, docs, and CI quality gates.

## Local Setup

```bash
npm ci
npm run build
npm run quality
```

## Development Loop

```bash
npm run generate:bundled-schema
npm run build
npm test
```

Use `npm run generate:bundled-schema` only when intentionally refreshing the
compact schema artifact from the pinned dev-time `n8n-nodes-base` package.

## Pull Requests

- Link an issue or explain the rationale.
- Add or update fixtures for validation behavior changes.
- Do not include secrets, workflow credentials, `.env` files, or local logs.
- Do not claim live REST validation, benchmark numbers, npm publication, or
  GitHub Action marketplace availability until those are proven by artifacts.
