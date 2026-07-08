# Roadmap

## Current Proof State

The local MVP is proven enough to sequence V1 work, but not enough to widen the
product into a hosted platform.

Verified:

- `n8n-lint check <workflow.json>` validates workflow structure.
- Bundled compact schema artifact rejects unknown node and credential types.
- Bundled compact schema artifact rejects unknown top-level node parameters and
  stale trigger graph/type-version shapes.
- CLI output truthfully labels `bundled-n8n-package` or `local-placeholder`.
- Local quality gates prove build, fixtures, tests, and production dependency
  audit status.
- Packed-package install smoke has proven the source checkout and local tarball
  path.
- The real `Zie619/n8n-workflows` benchmark report exists under `docs/`.
- Release readiness is prepared, with npm publish still behind an owner gate.

Still gated or unproven:

- npm publication and registry-backed `npx n8n-lint` docs.
- Owner-side GitHub mutations such as topics, tag pushes, and releases.
- Live REST schema validation from a running n8n instance.
- Deep nested parameter-shape validation beyond top-level bundled metadata.
- Hosted SaaS, dashboard, MCP server, marketplace, or a second product.

## V0 Launch Closure

Close these before claiming V1 publicly:

1. Resolve the npm publish approval path and publish only after owner approval.
2. Resolve public GitHub hardening: owner-approved push, repo topics, green CI,
   and README visibility.
3. Keep launch copy tied to checked-in command output, benchmark files, and
   release artifacts.

## V1 Backlog Sequence

### V1.1 Batch Check Improvements

Goal: make the CLI useful for real repositories before adding new surface area.

Scope:

- Accept directories, globs, and explicit file lists.
- Emit stable per-file summaries in human and JSON modes.
- Preserve predictable exit codes for CI.
- Add fixtures for mixed pass/fail/skipped inputs.

Gate:

- `npm run quality` passes.
- A temp-repo smoke proves batch mode with at least one passing workflow, one
  failing workflow, and one skipped non-workflow JSON file.

### V1.2 Badge Generator

Goal: let users publish a simple status signal without creating a hosted badge
service.

Scope:

- Generate markdown, JSON, or static SVG badge output from a local check result.
- Prefer deterministic local files or Shields-compatible static badge URLs.
- Do not create a hosted endpoint in V1.

Gate:

- Batch summary output is stable enough to feed the badge generator.
- README examples show only local/static badge workflows until a hosted service
  is explicitly approved.

### V1.3 Multi-Version Schema Matrix

Goal: check workflows against more than one pinned n8n schema artifact.

Scope:

- Generate compact artifacts for explicitly pinned n8n package versions.
- Add a CLI selector for one version or a matrix of versions.
- Report compatibility differences without claiming live REST coverage.

Gate:

- Each artifact has reproducible generation proof.
- Fixture coverage proves node and credential type differences across at least
  two pinned versions.

### V1.4 Human-Gated Auto-Repair

Goal: help users fix obvious drift while keeping humans in control.

Scope:

- Start with diff-only suggestions and patch files.
- Limit transforms to evidence-backed rename maps or safe structural fixes.
- Never mutate workflow files by default.
- Require explicit user confirmation before applying changes.

Gate:

- Rename evidence is backed by package metadata, fixtures, or benchmark failure
  analysis.
- Suggested patches round-trip through tests and keep workflow JSON valid.

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
