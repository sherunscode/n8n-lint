# Live REST Threat Model

Current status: live REST schema validation is not implemented and is not
claimed. The public CLI exposes only `bundled-n8n-package` and
`local-placeholder` sources. This document is a gate for a future live REST
adapter, not permission to advertise one.

## Assets

- n8n API keys and session-equivalent credentials.
- Workflow JSON under validation.
- CI logs, job summaries, badges, and generated reports.
- The configured n8n base URL and any schema endpoint responses.

## Current Safe State

- The shipped CLI does not contact an n8n instance.
- The shipped CLI does not require, parse, or accept an n8n API key.
- The internal `live-rest` source fails closed when the base URL is blank.
- The internal `live-rest` source rejects invalid URLs, non-HTTPS URLs, and
  credentials embedded in the URL before returning a placeholder snapshot.
- HTTPS URLs are required before the placeholder returns a snapshot.
- Credentials in the URL are rejected before endpoint probing exists.
- The internal placeholder does not echo provided API-key material.
- `npm run check:live-rest-boundary` keeps `live-rest` out of public CLI help
  until endpoint proof and network safety tests exist.

## Threats

| Threat | Required behavior before live REST can ship |
| --- | --- |
| Wrong base URL | Fail closed on unexpected status, unexpected content type, parse failure, timeout, or missing schema fields. Do not fall back to guessed schema data. |
| Spoofed or attacker-controlled host | Show the resolved origin in human output, never log the API key, and require the user/CI config to choose the base URL explicitly. |
| TLS/certificate failure | Fail closed by default. Do not use `rejectUnauthorized: false` or equivalent default behavior. Any future insecure test mode must be explicit, noisy, and unavailable by default in CI examples. |
| Redirect to another host | Do not send Authorization headers across redirects. Cross-origin redirects must fail closed. |
| Plain HTTP endpoint | Reject by default outside an explicit local-development mode. Do not document HTTP for production or CI usage. |
| API-key leakage | API keys must come from environment variables or encrypted CI secrets, never bare CLI arguments, action inputs, README snippets, issue comments, badges, JSON output, or checked-in config. |
| Overbroad API access | Document minimum read-only schema/workflow scope before release. Do not require credentials that can execute workflows or mutate data. |
| Workflow execution side effect | Live REST schema validation must not execute workflows, fire triggers, call webhooks, activate workflows, or write credentials. |

## Future Implementation Gates

Before exposing `--source live-rest`, all of these must pass in executable
tests:

1. Blank `N8N_BASE_URL` fails closed with the documented message.
2. HTTP URLs fail closed by default.
3. Credentials embedded in the URL fail closed before any request is made.
4. TLS/certificate errors fail closed by default.
5. Cross-origin redirects do not receive Authorization headers.
6. Wrong host or wrong endpoint responses fail closed without guessed schema
   data.
7. Timeouts fail closed and do not print credential material.
8. API keys are accepted only from environment variables or encrypted CI
   secrets.
9. Human, JSON, GitHub annotation, badge, and generated-report outputs redact
   all credential values.
10. Endpoint proof exists from a local or owner-approved n8n instance and records
   the exact n8n version, endpoint paths, response shapes, and commands used.
11. README, SECURITY.md, CI docs, release checklist, and launch drafts all keep
    live REST claims disabled until the proof artifacts are committed.

## Release Rule

Live REST remains a future research lane until the implementation gates above
are met. If any gate is missing, the release verdict stays NO-GO for live REST
claims and the public CLI source list must remain unchanged.
