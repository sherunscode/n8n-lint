# Release Checklist

Use this checklist before any public npm release of `n8n-lint`.

## Scope

Publish readiness covers two npm packages from this workspace:

- `@n8nproof/core`
- `n8n-lint`

The CLI package depends on `@n8nproof/core` at the same exact version, so publish
`@n8nproof/core` first and `n8n-lint` second.

## Owner Gates

- Do not run `npm publish`, create a GitHub release, push tags, or post launch
  copy without owner approval.
- Confirm npm auth only after owner approval. Do not print tokens or config
  values.
- If publish happens from GitHub Actions, prefer npm provenance through OIDC.
  If publish happens locally, record that provenance was not attached.

## Versioning

1. Choose the release version, usually `0.1.0` for the first public release.
2. Update `packages/core/package.json`, `packages/cli/package.json`, and the
   `@n8nproof/core` dependency in `packages/cli/package.json` to the same exact
   version.
3. Update `package-lock.json`.
4. Update `CHANGELOG.md` with the release date and verified artifacts.
5. Update `docs/release-notes-v0.1.0-draft.md` or create the matching release
   draft for the chosen version, then run `npm run check:release-notes`.
6. Update `docs/release-command-plan-v0.1.0.md` or create the matching command
   plan for the chosen version. Run `npm run check:release-command-plan` before
   publish approval.
7. Ensure README examples do not claim registry-backed `npx` usage until after
   publication is complete.

## Local Gates

Run from `C:\dev\Stars`:

```powershell
npm ci
npm run quality
npm run check:release-readiness
npm run check:release-notes
npm run check:release-command-plan
npm run smoke:pack
npm pack --workspace packages/core --dry-run
npm pack --workspace packages/cli --dry-run
```

Inspect the dry-run output. The core package should include only `dist`,
`schema`, `package.json`, `README.md`, and `LICENSE`; the schema directory
should contain the checked-in compact artifacts and
`bundled-n8n-package-config.json` for the pinned n8n versions. The CLI package
should include only `dist`, `package.json`, `README.md`, and `LICENSE`. No
`.env`, logs, local reports, `node_modules`, or strategy/research documents
belong in either tarball.

Before release, run the repair fixture path and confirm it stays human-gated:

```powershell
node packages/cli/dist/bin.js repair examples/failing-dead-parameter.json
node packages/cli/dist/bin.js repair examples/failing-dead-parameter.json --apply
```

The first command should print a patch without mutating the fixture. The second
command should fail with exit code `2` because `--confirm` was not supplied.

## Fresh Install Smoke

The automated smoke command is the primary fresh-install proof:

```powershell
npm run smoke:pack
```

It creates tarballs in a temp directory, installs both into a fresh temp project,
and runs `npx n8n-lint check workflow.json`.

Manual equivalent:

```powershell
$packDir = Join-Path $env:TEMP ("n8n-lint-pack-" + [guid]::NewGuid())
$smokeDir = Join-Path $env:TEMP ("n8n-lint-smoke-" + [guid]::NewGuid())
New-Item -ItemType Directory -Path $packDir, $smokeDir | Out-Null
npm run build
npm pack --workspace packages/core --pack-destination $packDir
npm pack --workspace packages/cli --pack-destination $packDir
Copy-Item examples/known-http-request-workflow.json (Join-Path $smokeDir "workflow.json")
Push-Location $smokeDir
npm init -y
npm install (Join-Path $packDir "n8nproof-core-*.tgz") (Join-Path $packDir "n8n-lint-*.tgz")
npx n8n-lint check workflow.json
Pop-Location
```

Expected result:

```text
PASS workflow.json
Schema source: bundled-n8n-package
WARN schema_source.warning: Bundled n8n package metadata is loaded from a compact checked-in artifact; this is not live REST validation.
```

## Publish Commands

Run only after owner approval and a final clean gate:

```powershell
npm publish --workspace packages/core --access public
npm publish --workspace packages/cli
```

If publishing through an approved GitHub Actions release workflow with npm OIDC
configured, use `--provenance`.

## Tags And Release

1. Confirm CI is green for the exact commit.
2. Create a signed or normal tag matching the release version, for example
   `v0.1.0`.
3. Push the tag only after owner approval.
4. Create GitHub release notes from `CHANGELOG.md`, including quality, pack,
   fresh-install, checked draft release notes, and benchmark artifact links.

## Rollback

- Prefer a patch release over unpublish.
- If a published version is unsafe or misleading, use `npm deprecate` with a
  clear replacement version.
- Document the failure, affected version, mitigation, and next verification
  command in the GitHub release notes and issue thread.
