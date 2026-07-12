# Third-Party Notices

## n8n schema metadata

Files under `packages/core/schema/` named `bundled-n8n-package*.json` are
compact, modified metadata artifacts generated from the `nodes.json` and
`credentials.json` files distributed in `n8n-nodes-base` versions 2.29.6 and
2.30.0.

The generated artifacts contain node identifiers, credential identifiers,
parameter names and paths, and trigger classifications. They do not contain the
n8n runtime, workflow execution code, credentials, or customer data.

The upstream material is copyright n8n GmbH and is made available under the
n8n Sustainable Use License. That license applies to the derived schema
artifacts and is reproduced in
`packages/core/LICENSE_N8N_SUSTAINABLE_USE.md`. The repository's MIT license
applies only to original n8n-lint code and documentation; it does not relicense
upstream n8n material.

The artifacts have been modified by She Runs Code through deterministic
extraction, normalization, deduplication, sorting, qualification of node type
names, and removal of runtime implementation details.

`n8n`, related product names, and associated marks belong to their respective
owners. n8n-lint is an independent project and is not affiliated with or endorsed by n8n GmbH.

Public npm distribution remains blocked until the maintainer receives written
licensing confirmation or replaces bundled artifacts with user-side extraction.
