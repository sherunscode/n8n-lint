# Release Command Plan - v0.1.0

Status: dry-run command contract only.

This plan does not grant permission to publish, tag, create a GitHub Release, or
post launch copy. Use it only after the owner explicitly approves the exact
release version and channel.

## Release Facts

- Canonical repo: `https://github.com/sherunscode/n8n-lint`.
- Planned first public version: `0.1.0`.
- Planned tag: `v0.1.0`.
- Packages, in publish order:
  1. `@n8nproof/core`
  2. `n8n-lint`
- Release notes draft: `docs/release-notes-v0.1.0-draft.md`.
- Release checklist: `docs/release-checklist.md`.

The current source version may remain `0.0.0` until the owner-approved version
PR. Do not claim `0.1.0` is released until the npm registry, tag, GitHub
Release, and clean-machine install proof all exist.

## Hard Stops

Stop immediately if any of these are true:

- Owner approval for the exact release version is missing.
- `git status --short --branch` is not clean before publish.
- Local `HEAD` does not equal `origin/main` before publish.
- The latest required GitHub `quality` check is not green for the exact commit.
- `npm view @n8nproof/core version` or `npm view n8n-lint version` returns an
  existing version before the first public publish attempt.
- `npm run quality` fails.
- `npm run check:npm-registry-boundary`, `npm run check:release-readiness`,
  `npm run check:release-notes`, `npm run check:release-command-plan`, or
  `npm run check:release-workflow` fails.
- Any command asks for or prints a token, registry auth value, cookie, or `.env`
  value.

## Forbidden Commands

Do not run these in this release path:

```powershell
git push --tags
git tag -f v0.1.0
git push --force
npm config list
npm config get //registry.npmjs.org/:_authToken
gh release delete v0.1.0
```

Push only the single approved tag with `git push origin v0.1.0`.

## Phase 0 - Public State Check

Run these before preparing the release PR:

```powershell
git fetch origin
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
gh run list --repo sherunscode/n8n-lint --branch main --limit 5 --json databaseId,workflowName,status,conclusion,headSha,url
npm view @n8nproof/core version
npm view n8n-lint version
```

Expected first-release npm state: both package lookups return `E404`. If either
lookup returns a version, stop and reconcile ownership, package name, and
changelog state before continuing.

## Phase 1 - Version PR

Allowed mutations for the version PR:

- `packages/core/package.json`
- `packages/cli/package.json`
- `package-lock.json`
- `tool.json`
- `CHANGELOG.md`
- `docs/release-notes-v0.1.0-draft.md`
- Release/readiness docs only if their proof phrases need the new version

Required updates:

- Set both package versions to `0.1.0`.
- Set `packages/cli/package.json` dependency on `@n8nproof/core` to exact
  `0.1.0`.
- Set `tool.json` version to `0.1.0`.
- Move changelog content from `0.0.0 - Unreleased` to a dated `0.1.0` section,
  while preserving a new empty `Unreleased` section for future changes.
- Keep README install examples in pre-publication language until registry proof
  exists.

Required PR checks:

```powershell
npm ci
npm run quality
npm run check:npm-registry-boundary
npm run check:release-readiness
npm run check:release-notes
npm run check:release-command-plan
npm run smoke:pack
```

Merge only through a protected PR after `quality` and CodeQL pass.

## Phase 2 - Final Pre-Publish Check

Run from the clean, protected `main` commit that will be released:

```powershell
git fetch origin
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
gh run list --repo sherunscode/n8n-lint --branch main --limit 5 --json databaseId,workflowName,status,conclusion,headSha,url
npm ci
npm run quality
npm run check:npm-registry-boundary
npm run check:release-readiness
npm run check:release-notes
npm run check:release-command-plan
npm run check:release-workflow
npm run smoke:pack
npm pack --workspace packages/core --dry-run
npm pack --workspace packages/cli --dry-run
gh workflow run release.yml --repo sherunscode/n8n-lint --ref main
```

Confirm the `quality` run and CodeQL run both point to the exact `HEAD`.
The release proof workflow must complete without write permissions, npm tokens,
npm publish, tag push, or GitHub Release creation.

## Phase 3 - Owner-Approved npm Publish

Run only after owner approval for npm publish.

Do not print tokens, npm config values, environment variables, cookies, or
secret file contents.

```powershell
npm whoami
npm publish --workspace packages/core --access public
npm publish --workspace packages/cli
npm view @n8nproof/core@0.1.0 version
npm view n8n-lint@0.1.0 version
```

After both `npm view` commands return `0.1.0`, run a clean-machine registry
install smoke in a new temp directory:

```powershell
$smokeDir = Join-Path $env:TEMP ("n8n-lint-registry-smoke-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $smokeDir | Out-Null
Copy-Item examples/known-http-request-workflow.json (Join-Path $smokeDir "workflow.json")
Push-Location $smokeDir
npm init -y
npm install n8n-lint@0.1.0
npx n8n-lint check workflow.json
Pop-Location
```

Do not update README with registry-backed `npx` instructions until this smoke
passes.

## Phase 4 - Owner-Approved Tag And GitHub Release

Run only after both npm packages are published and the registry smoke passes.

```powershell
git tag v0.1.0
git push origin v0.1.0
gh release create v0.1.0 --repo sherunscode/n8n-lint --title "n8n-lint v0.1.0" --notes-file docs/release-notes-v0.1.0-draft.md
gh release view v0.1.0 --repo sherunscode/n8n-lint --json tagName,isDraft,isPrerelease,url
```

The tag must point to the same commit that passed final pre-publish `quality`
and CodeQL checks.

## Phase 5 - Post-Release PR

After npm and GitHub Release proof exists, open a separate PR to update public
docs:

- Add registry-backed install and `npx n8n-lint` instructions.
- Update release status and badges only from public proof.
- Remove `npm registry publication` from `tool.json.notClaimed` only after the
  registry package and clean-machine smoke are verified.
- Keep `live REST schema validation`, `workflow execution`, hosted SaaS, and
  Marketplace listing unclaimed until those are actually true.

Run:

```powershell
npm run quality
npm run check:claims
npm run check:github-rendered-readme
```

## Rollback

Prefer a patch release over unpublish.

If a package is unsafe after publication:

```powershell
npm deprecate n8n-lint@0.1.0 "Use the next patched version; v0.1.0 is deprecated after release validation found an issue."
npm deprecate @n8nproof/core@0.1.0 "Use the next patched version; v0.1.0 is deprecated after release validation found an issue."
```

Open a GitHub issue with the affected version, failure, mitigation, and the next
verification command. Do not delete the tag or GitHub Release unless the owner
explicitly approves that cleanup.
