# Roadmap

## Local MVP

- `n8n-lint check <workflow.json>` validates workflow structure.
- Bundled compact schema artifact rejects unknown node and credential types.
- CLI output truthfully labels `bundled-n8n-package` or `local-placeholder`.
- Local quality gates prove build, fixtures, tests, and production audit status.

## Next Validation Work

- Prove or reject live REST schema endpoint coverage against a disposable n8n
  instance.
- Add parameter-shape validation only when backed by fixture proof.
- Add trigger-shape validation only when backed by fixture proof.
- Add credential-shape validation beyond type existence only when backed by
  fixture proof.

## Owner-Gated Launch Work

- Create or connect the public `sherunscode/n8n-lint` repository.
- Publish the npm package after clean-machine verification.
- Run and publish a real Zie619 benchmark report.
- Draft public launch posts from verified artifacts only.
