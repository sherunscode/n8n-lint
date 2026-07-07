# Security

## Supported Versions

This project has not reached a public release yet. Security reports should
target the current `main` branch until versioned releases exist.

## Reporting

Open a private report through GitHub security advisories once the public repo is
available. Until then, contact the maintainer through the project owner channel.

## Secret Handling

- Do not pass n8n API keys as CLI arguments.
- Do not commit `.env`, workflow credentials, local logs, or screenshots that
  expose secrets.
- Current local MVP validation uses a compact bundled schema artifact and does
  not require an n8n API key.
- Future live REST validation must redact API keys from stdout, stderr, JSON
  output, logs, badges, and generated reports.
