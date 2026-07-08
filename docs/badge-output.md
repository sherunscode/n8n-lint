# Badge Output

`n8n-lint badge <check-result.json>` turns real `check --json` output into a
static status badge or an age-decaying last-verified badge. It does not call a
hosted n8nproof service, upload workflow contents, or mutate workflow files.

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

Last-verified badge output:

```bash
n8n-lint badge n8n-lint-result.json --kind last-verified
```

## Options

| Option | Default | Description |
|---|---:|---|
| `--format markdown` | yes | Emits Shields-compatible badge markdown. |
| `--format json` | no | Emits the derived badge model. |
| `--format svg` | no | Emits static SVG markup. |
| `--label <text>` | `n8n-lint` | Sets the badge label. |
| `--kind status` | yes | Emits pass/fail status from the JSON `ok` and `summary` fields. |
| `--kind last-verified` | no | Emits a badge from `checkedAt`, the n8n package version, and the proof age. |
| `--as-of YYYY-MM-DD` | today | Makes last-verified age deterministic for docs/tests. |
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

## Last-Verified Rules

`--kind last-verified` reads `checkedAt` from the same check JSON and the
verified n8n package version from `packageInfo.version` or
`selection.packageVersion`. If the check result is failing, the badge is red and
reports `unverified`.

| Age | Badge message suffix | Color |
|---:|---|---|
| `0-30` days | `verified N days ago` | `brightgreen` |
| `31-90` days | `verified N days ago - recheck recommended` | `yellow` |
| `91+` days | `verified N days ago - stale, unverified` | `red` |

Checked examples:

```bash
n8n-lint badge examples/badge-last-verified-green.json --kind last-verified --as-of 2026-07-08
n8n-lint badge examples/badge-last-verified-yellow.json --kind last-verified --as-of 2026-07-08 --format json
n8n-lint badge examples/badge-last-verified-red.json --kind last-verified --as-of 2026-07-08 --format svg
```

The composite GitHub Action runs the same badge command against its temporary
JSON check result and includes the rendered Markdown badge in
`GITHUB_STEP_SUMMARY`.

`docs/assets/last-verified-badges.svg` is a generated visual proof of the
green, yellow, and red states. `npm run check:last-verified-badges` regenerates
those state badges from the built CLI and fails if the committed asset is stale.
