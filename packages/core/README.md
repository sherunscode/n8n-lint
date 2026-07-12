# @n8nproof/core

Core validation library used by `n8n-lint`.

Current repository state: this package is not published to npm yet. Use the
repository source checkout or the packed local tarball smoke path in the root
README until the owner-approved npm release and clean-machine registry proof
are complete.

This package loads checked-in compact n8n schema artifacts and validates n8n
workflow JSON structure, node type names, credential type names, top-level node
parameter names, structured nested collection/fixedCollection/filter parameter
keys, and trigger graph/type-version shape. Current pinned artifacts cover
`n8n-nodes-base@2.29.6` and `n8n-nodes-base@2.30.0`, with their selections
centralized in `schema/bundled-n8n-package-config.json`. It does not execute
workflows and does not claim live REST validation.

The schema artifacts are modified metadata derived from `n8n-nodes-base`.
Original repository code is MIT licensed; the derived artifacts retain the
n8n Sustainable Use License boundary. See `THIRD_PARTY_NOTICES.md` and
`LICENSE_N8N_SUSTAINABLE_USE.md`. npm publication is blocked pending written
n8n licensing confirmation.

After owner-approved npm publication, install the CLI package for normal use:

```bash
npm install n8n-lint
```

See the repository README for current supported commands, release gates, and
scope boundaries.
