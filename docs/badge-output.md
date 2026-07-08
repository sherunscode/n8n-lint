# Badge Output

`n8n-lint badge <check-result.json>` turns real `check --json` output into a
static status badge. It does not call a hosted n8nproof service, upload
workflow contents, or mutate workflow files.

## Inputs

Use a JSON file emitted by:

```bash
n8n-lint check workflows/ --json > n8n-lint-result.json
```

The input must contain the top-level `ok` field. If it also contains a batch
`summary`, the badge message is derived from real pass/fail/error counts.

## Formats

Markdown is the default:

```bash
n8n-lint badge n8n-lint-result.json
```

Example:

```markdown
![n8n-lint: 1 passing](https://img.shields.io/badge/n8n--lint-1_passing-brightgreen)
```

JSON output:

```bash
n8n-lint badge n8n-lint-result.json --format json
```

Static SVG output:

```bash
n8n-lint badge n8n-lint-result.json --format svg --output n8n-lint-badge.svg
```

## Options

| Option | Default | Description |
|---|---:|---|
| `--format markdown` | yes | Emits Shields-compatible badge markdown. |
| `--format json` | no | Emits the derived badge model. |
| `--format svg` | no | Emits static SVG markup. |
| `--label <text>` | `n8n-lint` | Sets the badge label. |
| `--output <file>` | stdout | Writes the rendered badge to a file. |

## Status Rules

| Input status | Badge message | Color |
|---|---|---|
| Single-file `ok: true` | `passing` | `brightgreen` |
| Single-file `ok: false` | `failing` | `red` |
| Batch `ok: true` | `<passed> passing` | `brightgreen` |
| Batch `ok: false` | `<failed + errors> failing` | `red` |

Skipped files do not make the badge fail. They are preserved in the source JSON
summary for users that need full detail.
