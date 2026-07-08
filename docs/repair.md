# Repair Mode

`n8n-lint repair` is a human-gated repair assistant for obvious workflow drift.
It is intentionally conservative: it emits a patch by default and only mutates a
workflow file when the caller passes both `--apply` and `--confirm`.

## Current Supported Repair

The current repair surface handles one evidence-backed case:

- remove unknown top-level node parameters reported as
  `workflow.node_parameter_unknown`

This repair is safe because the validator has already proven that the parameter
is not present in the selected bundled n8n schema artifact for that node type.

## Usage

Preview a patch on stdout:

```bash
node packages/cli/dist/bin.js repair examples/failing-dead-parameter.json
```

Write a patch file without changing the workflow:

```bash
node packages/cli/dist/bin.js repair workflow.json --output fix.patch
```

Emit machine-readable repair output:

```bash
node packages/cli/dist/bin.js repair workflow.json --json
```

Apply the repair only after explicit confirmation:

```bash
node packages/cli/dist/bin.js repair workflow.json --apply --confirm
```

`--apply` without `--confirm` exits with code `2`.

## Version Selection

Repair uses the same bundled schema selector as `check`:

```bash
node packages/cli/dist/bin.js repair workflow.json --n8n-version=2.30.0
```

Matrix repair is deliberately blocked. Use `check --n8n-version=matrix` first
to understand compatibility differences, then choose one target version for a
repair run.

## Non-Goals

Repair does not currently:

- rename credentials
- rewrite node types
- rewire trigger connections
- infer nested parameter shapes
- use live REST schema data
- call model APIs
- apply changes without explicit confirmation

Future repair transforms must be backed by package metadata, fixtures, benchmark
failure analysis, or another reproducible evidence source before they are added.
