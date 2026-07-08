# Exit Code Contract

`n8n-lint` uses process exit codes as the CI and pre-commit gate.

| Exit | Meaning |
| ---: | ------- |
|  `0` | The requested operation completed successfully. For `check`, every checked workflow passed. |
|  `1` | A workflow failed validation, an input could not be read or parsed, a batch input produced an error, a badge input was invalid, or a repair could not produce a clean workflow. |
|  `2` | CLI usage error, such as a missing command, unknown option, conflicting output modes, or `repair --apply` without `--confirm`. |

`npm run check:exit-codes` proves this contract with the built CLI. The gate
currently covers:

- passing workflow validation
- schema mismatch failure
- invalid JSON failure
- missing input failure
- unmatched batch glob failure
- missing command usage failure
- unknown option usage failure
- conflicting `check --json --format github` output modes
- `repair --apply` without `--confirm`

The current MVP does not ship live REST schema validation, so there is no
network-source failure mode to prove yet. Any future live REST schema source
must extend `npm run check:exit-codes` before the README, launch copy, or release
notes may claim network-backed validation.
