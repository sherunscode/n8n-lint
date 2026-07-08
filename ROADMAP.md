# Roadmap

## Current Proof State

The local MVP is proven enough to sequence V1 work, but not enough to widen the
product into a hosted platform.

Verified:

- `n8n-lint check <workflow.json>` validates workflow structure.
- Bundled compact schema artifact rejects unknown node and credential types.
- Bundled compact schema artifact rejects unknown top-level node parameters,
  structured nested collection/fixedCollection/filter parameter keys, and stale
  trigger graph/type-version shapes.
- CLI output truthfully labels `bundled-n8n-package` or `local-placeholder`.
- GitHub Actions annotation output is available through `--format github`.
- Local quality gates prove build, lint, format, fixtures, metadata, security
  hygiene, schema-config integrity, type hygiene, pre-commit hook behavior,
  README/CLI docs contract, package contents, claims hygiene, Markdown link
  integrity, executable exit-code behavior, tests, and production dependency
  audit status.
- Packed-package install smoke has proven the source checkout and local tarball
  path, and `npm run smoke:pack` now enforces it in quality checks.
- The real `Zie619/n8n-workflows` benchmark report exists under `docs/`.
- Release readiness is prepared, with npm publish still behind an owner gate.
- Batch mode accepts multiple files, directories, and globs, with skipped
  ordinary JSON files reported separately.
- Badge generation emits markdown, JSON, or static SVG from real `check --json`
  output without adding a hosted badge service.
- Multi-version matrix checks pinned bundled artifacts for
  `n8n-nodes-base@2.29.6` and `n8n-nodes-base@2.30.0`.
- Repair mode emits human-gated patches for schema-proven unknown top-level
  parameters and requires `--apply --confirm` before mutation.
- Machine-readable `tool.json`, issue-template routing, CI setup docs, and a
  pre-commit framework example exist without claiming npm publication.
- Composite GitHub Action exists at `action.yml`, writes job summaries, and is
  dogfooded by CI.

Still gated or unproven:

- npm publication and registry-backed `npx n8n-lint` docs.
- Owner-side GitHub mutations such as tag pushes and releases.
- GitHub Action Marketplace listing.
- Live REST schema validation from a running n8n instance.
- Arbitrary custom nested parameter semantics beyond the bundled structured
  collection/fixedCollection/filter metadata.
- Hosted SaaS, dashboard, MCP server, marketplace, or a second product.

## V0 Launch Closure

Close these before claiming V1 publicly:

1. Resolve the npm publish approval path and publish only after owner approval.
2. Keep public GitHub hardening current: pushed `main`, repo topics, green CI,
   CodeQL, action dogfooding, README visibility, and evidence-backed docs.
3. Keep launch copy tied to checked-in command output, benchmark files, and
   release artifacts.

## V1 Backlog Sequence

### V1.1 Batch Check Improvements - Done Locally

Goal: make the CLI useful for real repositories before adding new surface area.

Scope:

- Accepts directories, globs, and explicit file lists.
- Emits stable per-file summaries in human and JSON modes.
- Preserves predictable exit codes for CI.
- Includes fixtures for mixed pass/fail/skipped inputs.

Gate:

- `npm run quality` passes.
- `npm run test:cli` proves batch mode with at least one passing workflow, one
  failing workflow, and one skipped non-workflow JSON file.

### V1.2 Badge Generator - Done Locally

Goal: let users publish a simple status signal without creating a hosted badge
service.

Scope:

- Generates markdown, JSON, or static SVG badge output from a local check
  result.
- Uses deterministic local files or Shields-compatible static badge URLs.
- Does not create a hosted endpoint in V1.

Gate:

- Batch summary output is stable enough to feed the badge generator.
- README examples show only local/static badge workflows until a hosted service
  is explicitly approved.
- `npm run test:cli` proves markdown, JSON, and SVG badge output.

### V1.3 Multi-Version Schema Matrix - Done Locally

Goal: check workflows against more than one pinned n8n schema artifact.

Scope:

- Generates compact artifacts for explicitly pinned n8n package versions.
- Adds a CLI selector for one version or a matrix of versions.
- Reports compatibility differences without claiming live REST coverage.

Gate:

- Each artifact has reproducible generation proof through
  `npm run generate:bundled-schema` and `npm run check:bundled-schema`.
- Fixture coverage proves a top-level parameter difference across two pinned
  versions: `dataTable.clearWarning` is absent from 2.29.6 and present in
  2.30.0.
- Fixture coverage proves structured nested parameter-key validation with
  `examples/failing-nested-dead-parameter.json`.

### V1.4 Human-Gated Auto-Repair - Done Locally

Goal: help users fix obvious drift while keeping humans in control.

Scope:

- Starts with diff-only suggestions and patch files.
- Limits the first transform to removing schema-proven unknown top-level
  parameters.
- Never mutates workflow files by default.
- Requires `--apply --confirm` before applying changes.

Gate:

- Fixture coverage proves diff output, JSON output, non-repairable failure
  handling, confirmation gating, and temp-copy apply behavior.
- Suggested patches round-trip through validation and keep workflow JSON valid.

## Validation Research Lane

Live REST schema validation remains a research lane, not V1 product scope, until
a disposable or owner-approved n8n instance proves endpoint coverage with
command output. If proven, add it as a separate source adapter with explicit
warnings and fixtures. If rejected, keep bundled package artifacts as the
primary schema source.

## Deferred Scope

Do not start these before traction and owner approval:

- Hosted SaaS or dashboard.
- MCP server.
- Marketplace listing.
- Paid services or paid model/API dependencies.
- A second repository or second n8nproof product.

Minimum traction signal before revisiting deferred scope:

- npm package published and installable.
- Public GitHub README and CI are current.
- At least one real external issue, star/fork/install signal, or user workflow
  feedback item exists.
- The owner explicitly approves the next product surface.

## Owner Gates

- npm publish, GitHub tags/releases, GitHub push, public launch posts, and paid
  services require owner approval.
- Public claims must stay backed by code, tests, benchmarks, screenshots,
  release artifacts, or reproducible command output.
