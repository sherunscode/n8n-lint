# She Runs Code n8n-lint Launch Content Pack

Generated for ERL-37 on 2026-07-08 UTC / 2026-07-07 America/Chicago.

This pack is draft copy only. Do not post to X, GitHub Releases, npm, or any
external channel without owner approval. Do not claim npm publication,
registry-backed `npx` usage, live REST schema validation, workflow execution, or
public benchmark availability until those claims are true in public artifacts.

## Verification Snapshot

Evidence IDs used below:

| ID  | Evidence                                                | Status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | `README.md` and package READMEs in `C:\dev\Stars`       | Local repo states the current product is a local MVP, not published to npm, with CLI checks for workflow structure, node type names, credential type names, top-level node parameter names, structured nested collection/fixedCollection/filter parameter keys, and trigger graph/type-version shape.                                                                                                                                                                                                                           |
| E2  | `npm run quality` from `C:\dev\Stars`                   | Passed build, ESLint, Prettier format check, example check, bundled-schema check, schema-config check, type-hygiene check, pre-commit hook contract check, community-readiness check, release-readiness check, README demo check, metadata check, security hygiene check, README/CLI docs-contract check, package-content check, claims hygiene check, Markdown link check, executable exit-code contract, core fixture tests, CLI fixture tests, production dependency audit with 0 vulnerabilities, and packed-install smoke. |
| E3  | `npm run check:bundled-schema` inside `npm run quality` | Passed; reported `n8n-nodes-base@2.29.6`, 439 node types, 402 credential types, 437 parameterized node types, 437 nested-parameterized node types, and 106 trigger node types.                                                                                                                                                                                                                                                                                                                                                  |
| E4  | `npm pack --workspace packages/core --dry-run`          | Passed; package dry-run for `@n8nproof/core@0.0.0` listed 12 files: dist, schema artifacts, schema config, package metadata, README, and LICENSE.                                                                                                                                                                                                                                                                                                                                                                               |
| E5  | `npm pack --workspace packages/cli --dry-run`           | Passed; package dry-run for `n8n-lint@0.0.0` listed 6 files: dist, package metadata, README, and LICENSE.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| E6  | GitHub Actions for `sherunscode/n8n-lint`               | Use the README badge or Actions tab to verify the latest public `main` quality run before posting. Do not rely on a static run ID in launch copy; re-check after every pushed commit.                                                                                                                                                                                                                                                                                                                                           |
| E7  | `docs/benchmark-zie619-report.md`                       | Local benchmark report generated 2026-07-08T07:31:31.989Z from `Zie619/n8n-workflows` commit `94007c1445d9258a7da116646b79473e7c7c3282` using clean `n8n-lint` commit `de5675d758997ce917cb9eef48adee30577b48d0`: 2,077 JSON files discovered, 2,066 workflow inputs checked, 762 passed, 1,304 failed, 11 skipped.                                                                                                                                                                                                             |
| E8  | Public benchmark report URL                             | Use `https://github.com/sherunscode/n8n-lint/blob/main/docs/benchmark-zie619-report.md` after the benchmark-report commit is pushed. Re-check the URL before posting benchmark numbers.                                                                                                                                                                                                                                                                                                                                         |
| E9  | `docs/release-checklist.md`                             | npm publish, tags, GitHub release creation, and public posting remain owner-gated.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| E10 | `git remote -v`                                         | Canonical repo remote is `https://github.com/sherunscode/n8n-lint.git`.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

The benchmark report records the source SHA used for benchmark generation. For
launch posts, re-check current `main` CI and the public benchmark report URL
after every pushed commit.

## Launch Tweet

Postability: ready after owner approval for X access. This draft does not use
benchmark numbers or npm publication claims.

Draft:

```text
She Runs Code has a public repo for n8n-lint: a CLI that checks n8n workflow JSON structure, node types, credential types, top-level and structured nested parameters, and trigger shape before production.

CI is passing. npm publish is still owner-gated.

https://github.com/sherunscode/n8n-lint
```

Claim map:

| Claim                                                                                                                      | Evidence |
| -------------------------------------------------------------------------------------------------------------------------- | -------- |
| Public repo                                                                                                                | E10      |
| CLI checks workflow structure, node types, credential types, top-level and structured nested parameters, and trigger shape | E1, E2   |
| CI is passing                                                                                                              | E6       |
| npm publish is owner-gated                                                                                                 | E9       |

## Technical Thread

Postability: ready after owner approval for X access and a fresh public URL/CI
check. This thread uses public repo proof, CI proof, and the committed benchmark
report.

Draft:

```text
1/5
n8n-lint is a She Runs Code CLI for checking n8n workflow JSON before it reaches production.

Today it validates workflow structure, node type names, credential type names, top-level node parameters, structured nested collection/fixedCollection/filter parameter keys, and trigger graph/type-version shape from a compact bundled schema artifact.

Repo: https://github.com/sherunscode/n8n-lint
```

```text
2/5
The schema source is intentionally bounded: `bundled-n8n-package`, generated from `n8n-nodes-base@2.29.6`.

Local verification reports 439 node types, 402 credential types, 437 parameterized node types, 437 nested-parameterized node types, and 106 trigger node types. It stores compact metadata only, not n8n runtime code or workflow data.
```

```text
3/5
The honesty boundary matters:

- not published to npm yet
- no registry-backed `npx` claim yet
- no workflow execution claim
- no live REST schema validation claim
- no arbitrary custom nested parameter-semantics claim

Those stay gated until release and endpoint proof exist.
```

```text
4/5
Public CI proof is live through the repo badge and Actions tab.

The quality path covers build, lint, format, example/schema checks, security hygiene, README/CLI docs-contract checks, package-content checks, claims hygiene checks, Markdown link checks, tests, and production dependency audit.

https://github.com/sherunscode/n8n-lint/actions
```

```text
5/5
The first public benchmark report is reproducible and bounded.

Against Zie619/n8n-workflows commit 94007c1445d9258a7da116646b79473e7c7c3282: 2,066 workflow inputs checked, 762 passed, 1,304 failed, 11 skipped.

https://github.com/sherunscode/n8n-lint/blob/main/docs/benchmark-zie619-report.md
```

Claim map:

| Claim                                                                                                                               | Evidence                       |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| CLI purpose and current checks                                                                                                      | E1, E2                         |
| Bundled schema source and package version                                                                                           | E1, E3                         |
| 439 node types, 402 credential types, 437 parameterized node types, 437 nested-parameterized node types, and 106 trigger node types | E3                             |
| No runtime code/workflow data in artifact                                                                                           | E1                             |
| npm, workflow execution, and live REST boundaries                                                                                   | E1, E9                         |
| Public CI run and covered gates                                                                                                     | E6, `.github/workflows/ci.yml` |
| Benchmark report URL must work before posting                                                                                       | E7, E8                         |

## Follow-Up Benchmark Post

Postability: ready after owner approval for X access and a fresh public URL
check for the benchmark report.

Draft:

```text
Benchmark follow-up for n8n-lint:

Against Zie619/n8n-workflows commit 94007c1445d9258a7da116646b79473e7c7c3282, the local report found 2,077 JSON files, checked 2,066 workflow inputs, passed 762, failed 1,304, and skipped 11 non-workflow JSON files.

Methodology: validates workflow structure, bundled node/credential type names, top-level node parameter names, structured nested collection/fixedCollection/filter parameter keys, and trigger graph/type-version shape. It does not execute workflows and does not claim live REST validation.

Report: https://github.com/sherunscode/n8n-lint/blob/main/docs/benchmark-zie619-report.md
Reproduce: `npm run benchmark:zie619 -- C:\dev\_benchmarks\Zie619-n8n-workflows docs/benchmark-zie619-report.json`
```

Claim map:

| Claim                                  | Evidence |
| -------------------------------------- | -------- |
| Source repository and commit           | E7       |
| 2,077 JSON files discovered            | E7       |
| 2,066 workflow inputs checked          | E7       |
| 762 passed, 1,304 failed, 11 skipped   | E7       |
| Methodology and non-execution boundary | E7       |
| Public report URL check                | E8       |

## GitHub README Improvement Idea

Idea: add a compact "Proof and Boundaries" section near the top of the README.

Suggested content:

```text
## Proof and Boundaries

- CI: latest public `main` run is linked from the badge and must be green before launch claims.
- Current install paths: source checkout and packed local tarball only until npm publication.
- Current validation: workflow structure, bundled n8n node type names, bundled credential type names, top-level node parameter names, structured nested collection/fixedCollection/filter parameter keys, and trigger graph/type-version shape.
- Not claimed yet: npm registry install, live REST schema validation, workflow execution, arbitrary custom nested parameter semantics, hosted SaaS, or marketplace.
- Benchmark: link `docs/benchmark-zie619-report.md` only after the report is committed, pushed, and public.
```

Why this helps:

- It prevents cold GitHub visitors from reading beyond the verified product
  surface.
- It gives launch posts a stable public proof target.
- It keeps growth copy honest while still making the repo look intentional.

Evidence: E1, E6, E7, E8, E9.

## Posting Checklist

Before any external post:

1. Confirm owner approval for the specific channel and text.
2. Re-check the public repo URL and latest CI run.
3. Do not include benchmark numbers unless the report URL is public and working.
4. Do not include npm or `npx` claims until publication is complete and verified.
5. Do not mention stars, followers, installs, traffic, or engagement unless a
   current source is attached.
