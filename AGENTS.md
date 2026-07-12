# AGENTS.md - n8n-lint execution contract

This repository is the public `sherunscode/n8n-lint` project. Before changing
files, verify that `git remote get-url origin` resolves to that repository and
that the worktree is not on `main`.

## Safety

- Never print or persist environment-variable values, tokens, npm credentials,
  workflow credentials, or private workflow JSON.
- Never dump the complete environment. Check secret presence by variable name
  only when a task requires it.
- Never publish npm packages, push tags, create GitHub Releases, submit a
  Marketplace listing, or publish social posts without explicit owner approval.
- Keep live REST validation disabled until endpoint, TLS, redirect, hostname,
  and credential-redaction gates are implemented and proven.
- Treat npm publication as blocked until the n8n-derived schema redistribution
  model has written upstream or legal approval.

## Engineering

- Preserve the public CLI, JSON output, exit-code, package, and GitHub Action
  contracts unless the change explicitly updates and tests them.
- Add regression tests for every behavior change. Run `npm run verify:fast`
  before committing and `npm run quality` before opening a pull request.
- Run `npm run quality:release` only for main/release verification because it
  performs network-backed checks and clean public checkouts.
- Do not invent benchmark, compatibility, release, install, star, or usage
  claims. Public claims require reproducible artifacts or live API proof.
- Keep `STRATEGY.md` and `RESEARCH.md` local and ignored. Sanitized executable
  truth belongs in tracked README and docs files.

## Git

- Use `codex/` branches and exact-file staging; never use `git add -A`.
- Do not bypass protected checks or force-push `main`.
- Finish with a clean worktree synchronized to `origin/main`.
