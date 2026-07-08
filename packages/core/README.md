# @n8nproof/core

Core validation library used by `n8n-lint`.

This package loads the checked-in compact n8n schema artifact and validates n8n
workflow JSON structure, node type names, credential type names, top-level node
parameter names, and trigger graph/type-version shape. It does not execute
workflows and does not claim live REST validation.

After npm publication, install the CLI package for normal use:

```bash
npm install n8n-lint
```

See the repository README for current supported commands, release gates, and
scope boundaries.
