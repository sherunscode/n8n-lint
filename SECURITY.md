# Security

## Supported Versions

This project has not reached a public release yet. Security reports should
target the current `main` branch until versioned releases exist.

## Reporting

Open a private report through GitHub security advisories if available. If that
path is unavailable, contact `ashley@sherunscode.com`.

## Secret Handling

- Do not pass n8n API keys as CLI arguments.
- Do not commit `.env`, workflow credentials, local logs, or screenshots that
  expose secrets.
- Do not commit `.n8nlintrc.json` or `.n8n-lint.local.json`; both are ignored
  for future local instance configuration.
- Current local MVP validation uses a compact bundled schema artifact and does
  not require an n8n API key.
- Future live REST validation must redact API keys from stdout, stderr, JSON
  output, logs, badges, and generated reports.
- Future GitHub Actions usage must read n8n API keys from encrypted
  `secrets.N8N_API_KEY`, never from plaintext workflow YAML, command arguments,
  action inputs, or checked-in config.
